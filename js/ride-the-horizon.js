import {
  biomeLength,
  lerp,
  easeInOut,
  getBiome,
  gradientColor,
  lerpColor,
  ColorCache,
  createMemoryFragment,
} from "./game-core.js";

const canvas = document.getElementById("horizon-canvas");
const memoriesContainer = document.getElementById("memories");
const toggleSoundButton = document.getElementById("toggle-sound");

if (!canvas || !memoriesContainer || !toggleSoundButton) {
  throw new Error("Ride the Horizon failed to initialise required DOM elements");
}

const ctx = canvas.getContext("2d", { alpha: true });
if (!ctx) {
  throw new Error("Unable to create 2D context for Ride the Horizon");
}

let width = 0;
let height = 0;
let pixelRatio = window.devicePixelRatio || 1;

const pedals = {
  pressed: false,
  left: false,
  right: false,
};

const settings = {
  baseSpeed: 0.8,
  boostSpeed: 3.6,
  worldScroll: 0,
  time: 0,
};

const colorCache = new ColorCache();

const watercolorBrushes = Array.from({ length: 24 }, () => ({
  x: Math.random(),
  y: Math.random(),
  radius: 40 + Math.random() * 160,
  speed: 0.0005 + Math.random() * 0.0014,
  hue: Math.random() * 360,
  offset: Math.random() * Math.PI * 2,
}));

const parallaxLayers = [
  { depth: 0.15, blobs: [] },
  { depth: 0.3, blobs: [] },
  { depth: 0.55, blobs: [] },
];

const memoryFragments = [];

function updatePixelRatio() {
  pixelRatio = window.devicePixelRatio || 1;
}

function resize() {
  updatePixelRatio();
  width = canvas.width = Math.floor(window.innerWidth * pixelRatio);
  height = canvas.height = Math.floor(window.innerHeight * pixelRatio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  generateParallaxBlobs();
}

window.addEventListener("resize", resize);

function generateParallaxBlobs() {
  parallaxLayers.forEach((layer) => {
    layer.blobs = Array.from({ length: 14 }, () => ({
      x: Math.random() * (width / pixelRatio + 600),
      y: Math.random() * (height / pixelRatio),
      r: 80 + Math.random() * 220,
      hueShift: (Math.random() - 0.5) * 50,
      alpha: 0.08 + Math.random() * 0.08,
    }));
  });
}

const bike = {
  x: 220,
  y: () => height / pixelRatio - 140,
  speed: 0,
  targetSpeed: 0,
  lean: 0,
  wobble: 0,
};

class AmbientSound {
  constructor() {
    this.active = false;
    this.context = null;
    this.gain = null;
    this.noise = null;
    this.filter = null;
  }

  async toggle() {
    if (this.active) {
      this.stop();
      return;
    }
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.gain = this.context.createGain();
      this.filter = this.context.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 1100;
      this.gain.gain.value = 0.0001;
      this.gain.connect(this.context.destination);
      this.filter.connect(this.gain);
      this.createNoise();
    }
    await this.context.resume();
    this.active = true;
    toggleSoundButton.textContent = "Disable sound";
    toggleSoundButton.setAttribute("aria-pressed", "true");
    this.fadeTo(0.18);
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this.fadeTo(0.0001);
    toggleSoundButton.textContent = "Enable sound";
    toggleSoundButton.setAttribute("aria-pressed", "false");
  }

  fadeTo(value) {
    if (!this.gain || !this.context) return;
    const now = this.context.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, value), now + 1.4);
  }

  createNoise() {
    if (!this.context || !this.filter) return;
    const bufferSize = 2 * this.context.sampleRate;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noise = this.context.createBufferSource();
    this.noise.buffer = buffer;
    this.noise.loop = true;
    this.noise.connect(this.filter);
    this.noise.start(0);
  }

  update(speedFactor) {
    if (!this.active || !this.filter || !this.context) return;
    const base = 600 + speedFactor * 1100;
    this.filter.frequency.setTargetAtTime(base, this.context.currentTime, 0.4);
  }
}

const ambientSound = new AmbientSound();

toggleSoundButton.addEventListener("click", () => {
  ambientSound.toggle();
});

function handleKey(e, pressed) {
  if (e.repeat) return;
  switch (e.code) {
    case "Space":
      pedals.pressed = pressed;
      break;
    case "ArrowLeft":
    case "KeyA":
      pedals.left = pressed;
      break;
    case "ArrowRight":
    case "KeyD":
      pedals.right = pressed;
      break;
    default:
  }
}

document.addEventListener("keydown", (e) => handleKey(e, true));
document.addEventListener("keyup", (e) => handleKey(e, false));

function renderWatercolorBackdrop(progress) {
  const { current, next, blend } = getBiome(progress);
  const easing = easeInOut(blend);
  const blendedSky = current.sky.map((color, index) =>
    lerpColor(color, next.sky[index % next.sky.length], easing, colorCache)
  );
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height / pixelRatio);
  const stops = 6;
  for (let i = 0; i < stops; i += 1) {
    const t = i / (stops - 1);
    const color = gradientColor(blendedSky, t, colorCache);
    gradient.addColorStop(t, color);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width / pixelRatio, canvas.height / pixelRatio);
}

function drawParallax(progress) {
  const { current, next, blend } = getBiome(progress);
  const easing = easeInOut(blend);
  parallaxLayers.forEach((layer, index) => {
    const depth = layer.depth;
    ctx.save();
    ctx.globalAlpha = 0.8 - depth * 0.8;
    const baseColor = lerpColor(
      current.horizon[index % current.horizon.length],
      next.horizon[index % next.horizon.length],
      easing,
      colorCache
    );
    layer.blobs.forEach((blob) => {
      const offset = (settings.worldScroll * depth) % (width / pixelRatio + 600);
      let x = blob.x - offset;
      if (x < -blob.r) {
        blob.x = width / pixelRatio + Math.random() * 600;
        blob.y = Math.random() * (height / pixelRatio);
        x = blob.x - offset;
      }
      ctx.beginPath();
      ctx.fillStyle = baseColor;
      ctx.globalAlpha = blob.alpha;
      ctx.ellipse(x, blob.y, blob.r, blob.r * 0.75, Math.sin(blob.hueShift), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  });
}

function drawWatercolorMist(progress) {
  const { current, next, blend } = getBiome(progress);
  const easing = easeInOut(blend);
  ctx.save();
  watercolorBrushes.forEach((brush, index) => {
    brush.offset += brush.speed;
    const x = (brush.x * width) / pixelRatio + Math.sin(brush.offset + index) * 90;
    const y = (brush.y * height) / pixelRatio + Math.cos(brush.offset * 0.8) * 90;
    const radius = brush.radius * (1 + Math.sin(brush.offset * 0.5) * 0.15);
    const hueColor = lerpColor(
      current.accents[index % current.accents.length],
      next.accents[index % next.accents.length],
      easing,
      colorCache
    );
    const { r, g, b } = colorCache.get(hueColor);
    const alpha = 0.04 + Math.sin(brush.offset) * 0.015;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(alpha, 0.02)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.7, brush.offset, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function updateBike(delta) {
  const desired = pedals.pressed ? settings.boostSpeed : settings.baseSpeed;
  bike.targetSpeed = desired + (pedals.right ? 1.2 : 0) - (pedals.left ? 0.8 : 0);
  bike.speed = lerp(bike.speed, bike.targetSpeed, 0.05);
  bike.speed = Math.max(0.2, Math.min(bike.speed, 6));

  const leanTarget = pedals.right ? 1 : pedals.left ? -1 : 0;
  bike.lean = lerp(bike.lean, leanTarget, 0.03);
  bike.wobble += delta * 0.003 + bike.speed * 0.001;
  settings.worldScroll += bike.speed * 16 * delta;
}

function drawBike() {
  const ground = bike.y();
  const wobble = Math.sin(bike.wobble) * 3;
  const bikeColor = "rgba(25, 35, 60, 0.9)";

  ctx.save();
  ctx.translate(bike.x, ground + wobble);
  ctx.scale(1.1 + bike.speed * 0.02, 1.1 + bike.speed * 0.02);
  ctx.rotate((bike.lean * Math.PI) / 32);

  ctx.strokeStyle = bikeColor;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.ellipse(-40, 0, 36, 36, 0, 0, Math.PI * 2);
  ctx.ellipse(40, 0, 36, 36, 0, 0, Math.PI * 2);
  ctx.moveTo(-8, -20);
  ctx.lineTo(0, -60);
  ctx.lineTo(12, -20);
  ctx.lineTo(-26, -12);
  ctx.moveTo(-8, -20);
  ctx.lineTo(38, -14);
  ctx.moveTo(0, -60);
  ctx.lineTo(0, -110);
  ctx.stroke();

  ctx.fillStyle = "rgba(25, 35, 60, 0.85)";
  ctx.beginPath();
  ctx.ellipse(0, -118, 26, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function updateMemories(distance) {
  memoryFragments.forEach((fragment) => {
    if (fragment.collected) return;
    if (distance > fragment.triggerAt - 40 && bike.speed < 1.5) {
      fragment.collected = true;
      const entry = document.createElement("div");
      entry.className = "memory";
      entry.innerHTML = `<strong>${fragment.biome}:</strong> ${fragment.text}`;
      memoriesContainer.appendChild(entry);
      memoriesContainer.scrollTop = memoriesContainer.scrollHeight;
    }
  });
}

function drawGround(progress) {
  const { current, next, blend } = getBiome(progress);
  const easing = easeInOut(blend);
  const gradient = ctx.createLinearGradient(0, bike.y() - 20, 0, height / pixelRatio);
  gradient.addColorStop(0, lerpColor(current.horizon[0], next.horizon[0], easing, colorCache));
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, bike.y() - 20, width / pixelRatio, height / pixelRatio);

  ctx.save();
  ctx.translate(0, bike.y() + 12);
  const baseY = 0;
  ctx.strokeStyle = "rgba(25, 35, 60, 0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= width / pixelRatio; x += 12) {
    const noise = Math.sin((x + settings.worldScroll * 0.1) * 0.02) * 4;
    ctx.lineTo(x, baseY + noise);
  }
  ctx.stroke();
  ctx.restore();
}

function drawGlyphs(progress) {
  const { current, next, blend } = getBiome(progress);
  const easing = easeInOut(blend);
  ctx.save();
  ctx.globalAlpha = 0.3;
  const accent = lerpColor(
    current.accents[1 % current.accents.length],
    next.accents[1 % next.accents.length],
    easing,
    colorCache
  );
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([6, 12]);
  const distance = settings.worldScroll * 0.05;
  for (let i = 0; i < 5; i += 1) {
    const x = i * 240 - (distance % 240) + width / pixelRatio - 300;
    ctx.beginPath();
    ctx.moveTo(x, bike.y() - 120);
    ctx.quadraticCurveTo(
      x + 40 * Math.sin(distance * 0.1 + i),
      bike.y() - 160,
      x + 80,
      bike.y() - 120
    );
    ctx.stroke();
  }
  ctx.restore();
}

let lastTime = performance.now();

function frame(time) {
  const delta = Math.min(1, (time - lastTime) / 16.66);
  lastTime = time;
  settings.time += delta;

  updateBike(delta);
  const progress = settings.worldScroll / biomeLength;

  renderWatercolorBackdrop(progress);
  drawParallax(progress);
  drawWatercolorMist(progress);
  drawGround(progress);
  drawGlyphs(progress);
  drawBike();

  updateMemories(settings.worldScroll);
  ambientSound.update(bike.speed / settings.boostSpeed);

  requestAnimationFrame(frame);
}

function seedMemories() {
  for (let i = 1; i < 50; i += 1) {
    const distance = i * (biomeLength / 2) + Math.random() * 400;
    memoryFragments.push(createMemoryFragment(distance));
  }
}

resize();
seedMemories();
requestAnimationFrame(frame);

const introMemory = document.createElement("div");
introMemory.className = "memory";
introMemory.innerHTML =
  "<strong>Departure:</strong> The road hums quietly, waiting for your first pedal.";
memoriesContainer.appendChild(introMemory);
