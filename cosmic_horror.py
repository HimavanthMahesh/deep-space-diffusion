import modal
import io
import os

app = modal.App("cosmic-horror-sdxl")

# Container image with all dependencies for training + inference
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "transformers",
        "accelerate",
        "safetensors",
        "torch",
        "torchvision",
        "xformers",
        "bitsandbytes",
        "Pillow",
        "ftfy",
        "tensorboard",
        "datasets",
        "peft",            # Required for Dreambooth LoRA
        "prodigyopt",      # Adaptive optimizer for Dreambooth
        "fastapi[standard]",
    )
    .run_commands(
        # Install diffusers from source (required by the training script)
        "pip install -q https://github.com/huggingface/diffusers/archive/refs/heads/main.tar.gz",
        # Download the official Dreambooth SDXL training script from HuggingFace
        "python -c \"import urllib.request; urllib.request.urlretrieve('https://raw.githubusercontent.com/huggingface/diffusers/main/examples/dreambooth/train_dreambooth_lora_sdxl.py', '/train_dreambooth_lora_sdxl.py')\"",
    )
)

# Volumes for caching and persistence
model_volume = modal.Volume.from_name("sdxl-model-cache", create_if_missing=True)
dataset_volume = modal.Volume.from_name("cosmic-dataset", create_if_missing=True)
output_volume = modal.Volume.from_name("cosmic-finetuned-model", create_if_missing=True)

MODEL_CACHE = "/cache"
DATASET_PATH = "/dataset"
OUTPUT_PATH = "/output"

# Categories from the ESA Hubble dataset most relevant to cosmic horror
COSMIC_HORROR_CATEGORIES = [
    "Nebulae",
    "Galaxies",
    "Quasars and Black Holes",
    "Cosmology",
    "Star Clusters",
]

# The trigger word the model will learn to associate with your cosmic imagery
INSTANCE_PROMPT = "cosmichorror, scientifically accurate space photograph, hubble telescope"


# ─────────────────────────────────────────────
# STEP 1: Prepare the dataset
# ─────────────────────────────────────────────
@app.function(
    image=image,
    volumes={DATASET_PATH: dataset_volume},
    secrets=[modal.Secret.from_name("huggingface")],
    timeout=3600,
    memory=8192,
)
def prepare_dataset():
    """
    Downloads the ESA Hubble dataset from HuggingFace and saves
    filtered images + captions to the Modal volume.
    """
    from datasets import load_dataset
    import os

    print("Loading ESA Hubble dataset from HuggingFace...")
    dataset = load_dataset("Supermaxman/esa-hubble", split="train")

    # Filter to cosmic horror relevant categories
    filtered = [
        item for item in dataset
        if item.get("Category") in COSMIC_HORROR_CATEGORIES
    ]
    print(f"Filtered down to {len(filtered)} images from {len(dataset)} total")

    # Create output directory — imgs/ contains only .jpg files for the training script
    images_dir = f"{DATASET_PATH}/images/imgs"
    os.makedirs(images_dir, exist_ok=True)

    saved = 0
    for item in filtered:
        try:
            image = item["image"]           # PIL Image
            description = item["text"]      # Scientific description
            item_id = item["id"]

            # Skip very small images (poor training signal)
            if image.width < 512 or image.height < 512:
                continue

            # Resize to 1024x1024 for SDXL compatibility
            image = image.resize((1024, 1024))

            # Save image
            img_path = f"{images_dir}/{item_id}.jpg"
            image.save(img_path, "JPEG", quality=95)

            # Save caption alongside image (same filename, .txt extension)
            # Dreambooth prepends the instance prompt automatically,
            # but we also embed the scientific description for richer training
            caption = f"{INSTANCE_PROMPT}, {description[:300]}"
            caption_path = f"{images_dir}/{item_id}.txt"
            with open(caption_path, "w") as f:
                f.write(caption)

            saved += 1

        except Exception as e:
            print(f"Skipping {item.get('id', '?')}: {e}")
            continue

    dataset_volume.commit()
    print(f"Dataset ready: {saved} images saved to {images_dir}")
    return saved


# ─────────────────────────────────────────────
# STEP 2: Fine-tune SDXL with Dreambooth LoRA
# ─────────────────────────────────────────────
@app.function(
    gpu="A100",       # A100 required for Dreambooth training
    image=image,
    volumes={
        MODEL_CACHE: model_volume,
        DATASET_PATH: dataset_volume,
        OUTPUT_PATH: output_volume,
    },
    timeout=18000,    # 5 hour timeout
    memory=40960,     # 40GB RAM
)
def train():
    """
    Fine-tunes SDXL on the prepared ESA Hubble dataset using
    Dreambooth LoRA. Saves the trained LoRA adapter to the output volume.
    """
    import subprocess
    import os

    import shutil
    old_dir = f"{DATASET_PATH}/images"
    images_dir = f"{DATASET_PATH}/images/imgs"
    os.makedirs(images_dir, exist_ok=True)

    # Move any .jpg files from old flat layout into imgs/ subdirectory
    for f in os.listdir(old_dir):
        if f.endswith(".jpg"):
            shutil.move(os.path.join(old_dir, f), os.path.join(images_dir, f))

    # Verify dataset is ready
    image_files = [f for f in os.listdir(images_dir) if f.endswith(".jpg")]
    print(f"Found {len(image_files)} training images")

    if len(image_files) < 10:
        raise RuntimeError("Not enough images! Run prepare_dataset() first.")

    cmd = [
        "accelerate", "launch",
        "--mixed_precision=fp16",
        "/train_dreambooth_lora_sdxl.py",

        # Base model
        "--pretrained_model_name_or_path=stabilityai/stable-diffusion-xl-base-1.0",
        "--pretrained_vae_model_name_or_path=madebyollin/sdxl-vae-fp16-fix",

        # Dataset
        f"--instance_data_dir={images_dir}",
        f"--instance_prompt={INSTANCE_PROMPT}",

        # Output
        f"--output_dir={OUTPUT_PATH}",
        "--cache_dir=" + MODEL_CACHE,

        # Training hyperparameters
        "--resolution=1024",
        "--train_batch_size=1",
        "--gradient_accumulation_steps=4",
        "--num_train_epochs=2",
        "--max_train_steps=500",
        "--learning_rate=1e-4",
        "--lr_scheduler=cosine",
        "--lr_warmup_steps=100",

        # LoRA settings
        "--rank=16",              # LoRA rank — higher = more expressive but larger file

        # Memory optimizations
        "--gradient_checkpointing",
        "--use_8bit_adam",
        "--mixed_precision=fp16",
        "--enable_xformers_memory_efficient_attention",

        # Validation during training (generates a sample image every N steps)
        "--validation_prompt=cosmichorror, a black hole consuming a star, scientifically accurate, hubble telescope",
        "--validation_epochs=1",
        "--num_validation_images=2",

        # Logging
        "--report_to=tensorboard",
    ]

    print("Starting Dreambooth LoRA training...")
    print(f"Command: {' '.join(cmd)}")

    result = subprocess.run(cmd, capture_output=False, text=True)

    if result.returncode != 0:
        raise RuntimeError(f"Training failed with return code {result.returncode}")

    output_volume.commit()
    print(f"Training complete! LoRA adapter saved to {OUTPUT_PATH}")


# ─────────────────────────────────────────────
# STEP 3: Generate images with the fine-tuned model
# ─────────────────────────────────────────────
@app.cls(
    gpu="A10G",       # Back to A10G for cheaper inference
    image=image,
    volumes={
        MODEL_CACHE: model_volume,
        OUTPUT_PATH: output_volume,
    },
    timeout=600,
)
class CosmicHorrorGenerator:
    @modal.enter()
    def load_model(self):
        from diffusers import StableDiffusionXLPipeline
        from peft import PeftModel
        import torch

        print("Loading base SDXL model...")
        self.pipe = StableDiffusionXLPipeline.from_pretrained(
            "stabilityai/stable-diffusion-xl-base-1.0",
            torch_dtype=torch.float16,
            variant="fp16",
            use_safetensors=True,
            cache_dir=MODEL_CACHE,
        )

        print("Loading fine-tuned LoRA weights...")
        self.pipe.load_lora_weights(OUTPUT_PATH)
        self.pipe.to("cuda")
        print("Model ready!")

    @modal.method()
    def generate(self, prompt: str, steps: int = 30, guidance_scale: float = 7.5):
        import io

        # Always prepend the trigger word
        full_prompt = f"cosmichorror, {prompt}, scientifically accurate, hubble telescope, photorealistic"
        negative_prompt = "cartoon, fantasy, painting, illustration, low quality, blurry, cheerful, colorful, unrealistic"

        print(f"Generating: {full_prompt}")

        image = self.pipe(
            prompt=full_prompt,
            negative_prompt=negative_prompt,
            num_inference_steps=steps,
            guidance_scale=guidance_scale,
            width=1024,
            height=1024,
        ).images[0]

        buf = io.BytesIO()
        image.save(buf, format="PNG")
        return buf.getvalue()

    @modal.fastapi_endpoint()
    def generate_web(self, prompt: str = "deep space nebula"):
        import base64, io
        from fastapi.responses import JSONResponse

        full_prompt = f"cosmichorror, {prompt}, scientifically accurate, hubble telescope, photorealistic"
        negative_prompt = "cartoon, fantasy, painting, illustration, low quality, blurry, cheerful, colorful, unrealistic"

        image = self.pipe(
            prompt=full_prompt,
            negative_prompt=negative_prompt,
            num_inference_steps=30,
            guidance_scale=7.5,
            width=1024,
            height=1024,
        ).images[0]

        buf = io.BytesIO()
        image.save(buf, format="PNG")
        return JSONResponse(
            content={"image": base64.b64encode(buf.getvalue()).decode()},
            headers={"Access-Control-Allow-Origin": "*"},
        )


# ─────────────────────────────────────────────
# Local entrypoint — controls which step to run
# ─────────────────────────────────────────────
@app.local_entrypoint()
def main(
    mode: str = "train",
    prompt: str = "two neutron stars colliding, kilonova explosion, gold being forged",
):
    if mode == "prepare":
        print("Step 1: Preparing dataset...")
        count = prepare_dataset.remote()
        print(f"Done! {count} images ready for training.")

    elif mode == "train":
        print("Step 2: Starting Dreambooth fine-tuning...")
        train.remote()
        print("Training complete!")

    elif mode == "generate":
        print(f"Step 3: Generating image for prompt: '{prompt}'")
        generator = CosmicHorrorGenerator()
        img_bytes = generator.generate.remote(prompt)

        filename = f"output_{prompt[:30].replace(' ', '_')}.png"
        with open(filename, "wb") as f:
            f.write(img_bytes)
        print(f"Saved to {filename}")

    else:
        print(f"Unknown mode: {mode}. Use 'prepare', 'train', or 'generate'.")
