// ── Modal API endpoint ────────────────────────────────────────────────────────
// After running `modal deploy cosmic_horror.py`, paste the generate_web URL here
const MODAL_ENDPOINT = '/generate';

function getPromptForObject(name) {
    const n = name.toLowerCase();
    if (n.includes('black hole'))   return 'supermassive black hole with glowing accretion disk, event horizon, gravitational lensing';
    if (n.includes('comet'))        return 'rogue comet streaking through deep space, icy nucleus, solar wind tail';
    if (n.includes('asteroid'))     return 'asteroid field, rocky debris, deep space, ancient solar system remnants';
    if (n.includes('merged') || n.includes('supergalaxy')) return 'two galaxies merging into one massive elliptical galaxy, tidal streams of stars';
    if (n.includes('colliding'))    return 'two galaxies colliding, gravitational tidal forces, stellar streams, cosmic collision';
    if (n.includes('star dust') || n.includes('nebula')) return 'glowing stellar nebula, cosmic gas clouds, star formation region, pillar of creation';
    if (n.includes('planet'))       return 'alien exoplanet with rings and moons, distant solar system, gas giant atmosphere';
    if (n.includes('failed galaxy'))return 'irregular dwarf galaxy, failed galaxy formation, dark matter filaments';
    if (n.includes('bright star'))  return 'massive blue supergiant star, stellar corona, intense radiation, stellar flares';
    return 'deep space phenomenon, cosmic void, ancient light from the edge of the universe';
}
// ─────────────────────────────────────────────────────────────────────────────

const starCanvas = document.getElementById('starfield');
const starCtx = starCanvas.getContext('2d');
const dustCanvas = document.getElementById('dustfield');
const dustCtx = dustCanvas.getContext('2d');

let width, height;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    starCanvas.width = width;
    starCanvas.height = height;
    dustCanvas.width = width;
    dustCanvas.height = height;
}

window.addEventListener('resize', resize);
resize();

// Starfield Generator
const stars = [];
const numStars = 800;

for (let i = 0; i < numStars; i++) {
    stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5,
        alpha: Math.random(),
        speed: Math.random() * 0.05 + 0.01
    });
}

function drawStars() {
    starCtx.clearRect(0, 0, width, height);
    starCtx.fillStyle = '#fff';

    for (let star of stars) {
        starCtx.globalAlpha = star.alpha;
        starCtx.beginPath();
        starCtx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        starCtx.fill();

        // Twinkle effect (stationary, bright background stars)
        star.alpha += (Math.random() - 0.5) * 0.05;
        if (star.alpha < 0.2) star.alpha = 0.2;
        if (star.alpha > 1) star.alpha = 1;
    }
}

// Mouse tracking for dynamic dust
let mouseX = -1000;
let mouseY = -1000;

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});
window.addEventListener('mouseout', () => {
    mouseX = -1000;
    mouseY = -1000;
});

// Dynamic Reacive Nebula Dust (Localized Cloud)
let dustParticles = [];

function initDust() {
    dustParticles = [];
    const numDustParticles = 120; // Denser cloud
    const arms = 2; // Two main spiral arms
    const maxRadius = Math.min(width, height) * 0.35; // 35% of the screen

    for (let i = 0; i < numDustParticles; i++) {
        // Vibrant hues matching Image: lots of light purples, pinks, deep blues
        const hue = Math.random() > 0.4 ? Math.random() * 40 + 270 : Math.random() * 40 + 200; // Pinks/Purples dominant

        // Spiral Math (Archimedes Spiral)
        const armIndex = i % arms;
        const angleOffset = (Math.PI * 2 / arms) * armIndex;
        // Distribute more particles near center, fewer at edges (using square root)
        const distanceRatio = Math.sqrt(Math.random());
        const distance = distanceRatio * maxRadius;

        // The angle increases as distance increases (forming the spiral)
        const twist = 3.5; // How tight the spiral is wrapped
        const angle = angleOffset + (distanceRatio * Math.PI * twist);

        // Add some random scatter (thickness of the arm)
        const scatter = (1 - distanceRatio) * 60 + 20; // more organized at edge, messy in middle
        const scatterX = (Math.random() - 0.5) * scatter;
        const scatterY = (Math.random() - 0.5) * scatter;

        let originX = width / 2 + Math.cos(angle) * distance + scatterX;
        let originY = height / 2 + Math.sin(angle) * distance + scatterY;

        // Make central particles much brighter/whiter (like the galactic core in image)
        const isCore = distanceRatio < 0.2;
        const radiusSize = isCore ? Math.random() * 100 + 150 : Math.random() * 200 + 80;

        dustParticles.push({
            originX: originX,
            originY: originY,
            x: originX,
            y: originY,
            radius: radiusSize,
            hue: hue,
            isCore: isCore,
            angle: Math.random() * Math.PI * 2, // for slow ambient orbit effect around anchor
            orbitSpeed: (Math.random() - 0.5) * 0.002,
            dx: 0,
            dy: 0
        });
    }
}
initDust(); // Call initially

// Handle resize fluidly
window.addEventListener('resize', () => {
    initDust();
});

function drawDust() {
    dustCtx.clearRect(0, 0, width, height);
    dustCtx.globalCompositeOperation = 'screen'; // Crucial for vibrant light blending

    for (let p of dustParticles) {
        // Simple orbiting to make the cloud slowly shift
        p.angle += p.orbitSpeed;
        let targetX = p.originX + Math.cos(p.angle) * 70;
        let targetY = p.originY + Math.sin(p.angle) * 70;

        // Apply dynamic disturbance velocity
        p.x += p.dx;
        p.y += p.dy;

        // Spring force pulling back to target (keeps it localized)
        p.dx += (targetX - p.x) * 0.002;
        p.dy += (targetY - p.y) * 0.002;

        p.dx *= 0.95; // Less friction for more fluid sliding
        p.dy *= 0.95;

        // Mouse disturbance physics (Cloud pushing effect)
        let distX = p.x - mouseX;
        let distY = p.y - mouseY;
        let dist = Math.sqrt(distX * distX + distY * distY);
        let maxDist = 300; // Radius of cursor disturbance

        if (dist > 0 && dist < maxDist) {
            let force = (maxDist - dist) / maxDist;
            p.dx += (distX / dist) * force * 2.5; // Stronger push away from cursor
            p.dy += (distY / dist) * force * 2.5;
        }

        const gradient = dustCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);

        if (p.isCore) {
            // Hot white/yellow core
            gradient.addColorStop(0, `hsla(40, 100%, 85%, 0.4)`);
            gradient.addColorStop(0.3, `hsla(${p.hue}, 100%, 75%, 0.15)`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
            // Soft arm clouds
            gradient.addColorStop(0, `hsla(${p.hue}, 100%, 75%, 0.15)`);
            gradient.addColorStop(0.5, `hsla(${p.hue}, 100%, 55%, 0.05)`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }

        dustCtx.fillStyle = gradient;
        dustCtx.beginPath();
        dustCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        dustCtx.fill();
    }
}

function animate() {
    drawStars();
    drawDust();
    requestAnimationFrame(animate);
}

animate();

// Interactive Objects Logic
const objectsContainer = document.getElementById('interactive-objects');

function makeKeyboardInteractive(element, label, activate) {
    element.setAttribute('role', 'button');
    element.setAttribute('tabindex', '0');
    element.setAttribute('aria-label', `Generate an image for ${label}`);
    element.addEventListener('click', activate);
    element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            activate();
        }
    });
}

// Helper to create objects
function spawnObject(type, name, image, size, x, y, extraClass = '') {
    const el = document.createElement('div');
    el.className = `space-object type-${type} ${extraClass}`;
    el.style.left = typeof x === 'number' ? `${x}%` : x;
    el.style.top = typeof y === 'number' ? `${y}%` : y;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.dataset.name = name;

    if (image) {
        const img = document.createElement('img');
        img.src = image;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '50%';
        img.style.objectFit = 'cover';
        img.style.pointerEvents = 'none';
        el.appendChild(img);
    }

    makeKeyboardInteractive(el, name, () => openModal({ name }));

    objectsContainer.appendChild(el);
}

// 1. Invisible Dynamic Nebula Hot Zones
spawnObject('nebula-zone', 'Dynamic Star Dust Cluster', null, 300, '30%', '40%');
spawnObject('nebula-zone', 'Ambient Deep Nebula', null, 250, '70%', '60%');

// 2. True Colliding Galaxies (Javascript Animation)
function spawnCollidingGalaxies(i, startX, startY) {
    const container = document.createElement('div');
    container.className = 'galaxy-collision-system space-object';
    container.style.left = `${startX}%`;
    container.style.top = `${startY}%`;
    // We make the container 0x0 so rotation is exactly centered
    container.style.width = '0px';
    container.style.height = '0px';

    const core1 = document.createElement('div');
    core1.className = 'galaxy-colliding-core';
    core1.style.animationDuration = `${1 + Math.random()}s`;

    const core2 = document.createElement('div');
    core2.className = 'galaxy-colliding-core';
    core2.style.animationDuration = `${1 + Math.random()}s`;

    const flash = document.createElement('div');
    flash.className = 'galaxy-collision-flash';

    container.appendChild(core1);
    container.appendChild(core2);
    container.appendChild(flash);
    objectsContainer.appendChild(container);

    let angle = Math.random() * Math.PI * 2;
    let radius = 45 + Math.random() * 15; // varying start distances
    // Very different starting spinning speeds per pair
    let speed = 0.005 + Math.random() * 0.025;
    let isCollided = false;
    let mergedName = `Merged Supergalaxy ${i + 1}`;

    // Unique physics constants per galaxy pair
    let radiusDecay = 0.03 + Math.random() * 0.04;
    // Vastly different acceleration rates
    let speedAccel = 0.0002 + Math.random() * 0.0008;

    // Add clickable listener that only works post-collision (or let it work anytime for convenience)
    container.addEventListener('click', () => {
        if (isCollided) {
            openModal({ name: mergedName });
        } else {
            openModal({ name: `Colliding Cluster ${i + 1}` });
        }
    });

    // JS Physics Loop for this specific collision
    function animateCollision() {
        if (isCollided) return;

        angle += speed;
        // Dramatic acceleration and visible closing-in
        radius -= radiusDecay; // visibly shrink radius 
        speed += speedAccel; // rapidly increase spin speed as they fall inward

        if (radius <= 0) {
            // Collision event!
            isCollided = true;
            core1.style.display = 'none';
            core2.style.display = 'none';

            // Flash of light
            flash.style.opacity = '1';
            flash.style.transform = 'translate(-50%, -50%) scale(1)';

            // Spawn merged galaxy core after flash
            setTimeout(() => {
                flash.style.opacity = '0';
                const merged = document.createElement('div');
                merged.className = 'galaxy-merged-core';
                container.appendChild(merged);
                container.dataset.name = mergedName;
            }, 300); // 300ms flash

            return; // stop physics loop
        }

        // Apply polar coordinates
        let x1 = Math.cos(angle) * radius;
        let y1 = Math.sin(angle) * radius;

        let x2 = Math.cos(angle + Math.PI) * radius; // 180 degrees offset
        let y2 = Math.sin(angle + Math.PI) * radius;

        core1.style.transform = `translate(${x1}px, ${y1}px)`;
        core2.style.transform = `translate(${x2}px, ${y2}px)`;

        requestAnimationFrame(animateCollision);
    }

    // Start the collision loop immediately
    requestAnimationFrame(animateCollision);
}

for (let i = 0; i < 3; i++) {
    spawnCollidingGalaxies(i, Math.random() * 80 + 10, Math.random() * 80 + 10);
}

// 3. Multiple scattered CSS-rendered planets
for (let i = 0; i < 12; i++) {
    // Sized between 15px and 35px to be clearly larger than stars
    spawnObject('planet', `Exoplanet System ${i + 1}`, null, Math.random() * 20 + 15, Math.random() * 100, Math.random() * 100);
}

// 4. Subtle, pure CSS black holes (no images)
for (let i = 0; i < 4; i++) {
    // Pass null for image, increase size to 30-60 so the light ring is visible
    spawnObject('blackhole', `Distant Black Hole ${i + 1}`, null, Math.random() * 30 + 30, Math.random() * 100, Math.random() * 100);
}

// 5. Tiny distant failed galaxies
for (let i = 0; i < 6; i++) {
    spawnObject('failed', `Failed Galaxy Formation ${i + 1}`, null, Math.random() * 60 + 30, Math.random() * 100, Math.random() * 100);
}

// 5.5. Clickable Larger Bright Stars
for (let i = 0; i < 15; i++) {
    spawnObject('clickable-star', `Bright Star ${i + 1}`, null, Math.random() * 4 + 3, Math.random() * 100, Math.random() * 100);
}

// 6. Asteroid System
const asteroids = [];
for (let i = 0; i < 15; i++) {
    const el = document.createElement('div');
    // Removed .space-object so it doesn't get 0.3 opacity default
    el.className = 'asteroid';
    const size = Math.random() * 8 + 8; // Slightly larger (8px to 16px)
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.dataset.name = `Asteroid Fragment ${i}`;

    let x = Math.random() * window.innerWidth;
    let y = Math.random() * window.innerHeight;
    let dx = (Math.random() - 0.5) * 1.5;
    let dy = (Math.random() - 0.5) * 1.5;

    el.addEventListener('click', () => {
        openModal({ name: `Asteroid Fragment ${i}` });
    });

    objectsContainer.appendChild(el);
    asteroids.push({ el, x, y, dx, dy });
}

function animateAsteroids() {
    asteroids.forEach(a => {
        a.x += a.dx;
        a.y += a.dy;

        // Wrap around screen
        if (a.x < -20) a.x = window.innerWidth + 20;
        if (a.x > window.innerWidth + 20) a.x = -20;
        if (a.y < -20) a.y = window.innerHeight + 20;
        if (a.y > window.innerHeight + 20) a.y = -20;

        a.el.style.transform = `translate(${a.x}px, ${a.y}px)`;
    });
    requestAnimationFrame(animateAsteroids);
}
animateAsteroids();

// 7. Zipping Comets with Math Vectors
const cometContainer = document.getElementById('interactive-objects');
function spawnComet() {
    const el = document.createElement('div');
    el.className = 'comet';
    el.dataset.name = 'Rogue Comet';

    // Start position (off-screen left/right randomly)
    let isLeftToRight = Math.random() > 0.5;
    let startX = isLeftToRight ? -100 : window.innerWidth + 100;
    let startY = Math.random() * window.innerHeight;

    // End position (opposite horizontal, random vertical)
    let endX = isLeftToRight ? window.innerWidth + 100 : -100;
    let endY = startY + (Math.random() * 800 - 400);

    // Calculate traversal angle
    let dx = endX - startX;
    let dy = endY - startY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Initial State: Position via translate, set rotation, hidden
    el.style.transform = `translate(${startX}px, ${startY}px) rotate(${angle}deg)`;
    el.style.opacity = '0';

    el.addEventListener('click', () => {
        openModal({ name: 'Rogue Comet' });
    });

    cometContainer.appendChild(el);

    // Force browser reflow to register initial transform
    void el.offsetWidth;

    // Apply Transition for movement
    el.style.transition = 'transform 3.5s linear, opacity 0.5s ease';

    // Final State: fade in and translate to end position
    el.style.opacity = '1';
    el.style.transform = `translate(${endX}px, ${endY}px) rotate(${angle}deg)`;

    // Fade out near the end
    setTimeout(() => {
        el.style.opacity = '0';
    }, 3000);

    // Remove from DOM
    setTimeout(() => {
        if (cometContainer.contains(el)) cometContainer.removeChild(el);
    }, 3500);
}

// Spawn a comet every 8 to 15 seconds
function scheduleComet() {
    setTimeout(() => {
        spawnComet();
        scheduleComet();
    }, Math.random() * 7000 + 8000);
}
scheduleComet();

// Modal Interaction
const modal = document.getElementById('generation-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-title');
const modalStatus = document.getElementById('modal-status');
const loader = document.querySelector('.loader');
const resultContainer = document.getElementById('result-container');
const modelOutput = document.getElementById('model-output');
let previouslyFocused = null;

const STATUS_MESSAGES = [
    'Gathering stellar mass and light data...',
    'Initializing diffusion process...',
    'Diffusing particles into formation...',
    'Applying cosmic horror aesthetics...',
    'Enhancing visual resolution...',
    'Rendering deep space phenomena...',
    'Almost there...',
];

async function openModal(obj) {
    previouslyFocused = document.activeElement;
    modal.inert = false;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    loader.style.display = 'flex';
    modelOutput.replaceChildren();
    modelOutput.style.aspectRatio = '16 / 9';
    closeModalBtn.focus();

    const prompt = getPromptForObject(obj.name);
    modalTitle.textContent = `Diffusing: ${obj.name}`;
    modalStatus.textContent = STATUS_MESSAGES[0];

    let msgIdx = 0;
    const statusInterval = setInterval(() => {
        msgIdx = (msgIdx + 1) % STATUS_MESSAGES.length;
        modalStatus.textContent = STATUS_MESSAGES[msgIdx];
    }, 4000);

    try {
        const url = `${MODAL_ENDPOINT}?prompt=${encodeURIComponent(prompt)}`;
        const response = await fetch(url);
        clearInterval(statusInterval);

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        const img = document.createElement('img');
        img.src = `data:image/png;base64,${data.image}`;
        img.style.cssText = 'width:100%;border-radius:12px;display:block;';
        modelOutput.style.aspectRatio = '1';
        modelOutput.appendChild(img);

        loader.style.display = 'none';
        modalStatus.textContent = `Generated: ${obj.name}`;
        resultContainer.classList.remove('hidden');
    } catch (err) {
        clearInterval(statusInterval);
        loader.style.display = 'none';
        modalStatus.textContent = 'Generation could not be completed.';
        modelOutput.textContent = err.message;
        console.error('Modal API error:', err);
        resultContainer.classList.remove('hidden');
    }
}

function closeGenerationModal() {
    modal.classList.add('hidden');
    modal.inert = true;
    modal.setAttribute('aria-hidden', 'true');
    if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
    }
}

closeModalBtn.addEventListener('click', closeGenerationModal);

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeGenerationModal();
    }
});

// Intro Screen Logic
const introScreen = document.getElementById('intro-screen');
const enterBtn = document.getElementById('enter-universe-btn');

enterBtn.addEventListener('click', () => {
    introScreen.classList.add('hidden');
    introScreen.inert = true;
});
