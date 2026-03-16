# Deep Space Diffusion

An interactive cosmic experience that lets you drift through space and generate AI images of celestial objects — black holes, comets, galaxy collisions, and more — using a custom fine-tuned diffusion model trained on real ESA Hubble telescope imagery.

Built at HackIllinois 2026.

## Demo

Click any celestial object in the interactive starfield to trigger the model and generate a unique astronomical image.

## How It Works

1. **Dataset** — Curated 1,800+ images from a raw set of 2,700+ ESA Hubble photographs, filtering by resolution and adding prompt captions
2. **Training** — Fine-tuned Stable Diffusion XL using Dreambooth LoRA on Modal's GPU cloud infrastructure (500 steps)
3. **Inference** — Trained model is deployed as a live REST API endpoint on Modal
4. **Frontend** — Interactive animated starfield built with HTML/CSS/JS; each clickable object maps to a contextual prompt sent to the model

## Tech Stack

- [Stable Diffusion XL](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0) + Dreambooth LoRA
- [Modal](https://modal.com) — serverless GPU training and inference
- [Diffusers](https://github.com/huggingface/diffusers) — model training and inference pipeline
- Vanilla HTML/CSS/JS frontend
- Python proxy server (CORS handling)

## Setup

### Prerequisites

- Python 3.10+
- A [Modal](https://modal.com) account with a deployed endpoint

### Run Locally

```bash
pip install modal diffusers torch transformers accelerate
modal deploy cosmic_horror.py
python3 server.py
```

Then open `http://localhost:8080` in your browser.

## Dataset

Images sourced from the [ESA Hubble Space Telescope archive](https://esahubble.org/images/). All images are used for research and educational purposes.

## Team

Built at HackIllinois 2026.
