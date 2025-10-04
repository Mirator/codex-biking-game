export const biomes = [
  {
    name: "Aurora Fields",
    sky: ["#f4ede4", "#f7d9d4", "#c5e3f6"],
    horizon: ["#d7c0ae", "#9ad0ec"],
    accents: ["#ffb5a7", "#84a59d", "#f6bd60"],
    memory: "A paper crane drifted beside you for miles.",
  },
  {
    name: "Opal Forest",
    sky: ["#fef6fb", "#e3f2f1", "#d0e6a5"],
    horizon: ["#91c4c4", "#c4d7b2"],
    accents: ["#adf7b6", "#ffcbf2", "#cddafd"],
    memory: "You hummed a forgotten lullaby and the trees harmonised.",
  },
  {
    name: "Solstice Coast",
    sky: ["#fce7c3", "#f8d8be", "#d9f1ff"],
    horizon: ["#f7a9a8", "#8ecae6"],
    accents: ["#ffafcc", "#cdb4db", "#a2d2ff"],
    memory: "Tidal bells rang softly from a sunken tower.",
  },
  {
    name: "Celestial Steppe",
    sky: ["#f7f0ff", "#d2d0fe", "#c0e8f9"],
    horizon: ["#cdb4db", "#bde0fe"],
    accents: ["#ffc8dd", "#a0c4ff", "#b9fbc0"],
    memory: "Constellations rearranged to mirror your heartbeat.",
  },
];

export const memoryLibrary = [
  "A quiet laugh echoed through the grasses.",
  "Someone waved from a hill made of folded letters.",
  "Rain painted silver ripples across the path.",
  "You rode past a river of lanterns that never went out.",
  "The wind carried a promise to return someday.",
  "Petals followed, spelling your name in cursive arcs.",
  "An old friend left a lantern at the crossroads.",
  "Clouds opened like pages in a storybook.",
];

export const biomeLength = 2800;

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function easeInOut(t) {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5
    ? 2 * clamped * clamped
    : -1 + (4 - 2 * clamped) * clamped;
}

export function normaliseProgress(progress, total) {
  if (!Number.isFinite(progress)) {
    throw new TypeError("Progress must be a finite number");
  }
  const wrapped = ((progress % total) + total) % total;
  const index = Math.floor(wrapped);
  return { index, blend: wrapped - index };
}

export function getBiome(progress, list = biomes) {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Biome list must contain at least one biome");
  }
  const { index, blend } = normaliseProgress(progress, list.length);
  const next = (index + 1) % list.length;
  return { current: list[index], next: list[next], blend };
}

export class ColorCache {
  constructor(parser = parseColor) {
    this.parser = parser;
    this.cache = new Map();
  }

  get(color) {
    if (!this.cache.has(color)) {
      this.cache.set(color, this.parser(color));
    }
    return this.cache.get(color);
  }
}

export function parseHexColor(hex) {
  let value = hex.slice(1);
  if (![3, 6].includes(value.length)) {
    throw new Error(`Unsupported hex color: ${hex}`);
  }
  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }
  const int = Number.parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

export function parseRgbColor(color) {
  const match = color
    .replace(/rgba?\(/, "")
    .replace(/\)/, "")
    .split(",")
    .map((component) => Number.parseFloat(component.trim()));
  if (match.length < 3 || match.some((value) => Number.isNaN(value))) {
    throw new Error(`Unsupported rgb color: ${color}`);
  }
  return { r: match[0], g: match[1], b: match[2] };
}

export function parseColor(color) {
  if (typeof color !== "string" || color.length === 0) {
    throw new TypeError("Color must be a non-empty string");
  }
  if (color.startsWith("#")) {
    return parseHexColor(color);
  }
  if (color.startsWith("rgb")) {
    return parseRgbColor(color);
  }

  if (typeof document === "undefined" || typeof getComputedStyle === "undefined") {
    throw new Error("Named color parsing requires a DOM environment");
  }

  const temp = document.createElement("span");
  temp.style.color = color;
  document.body.appendChild(temp);
  const computed = getComputedStyle(temp).color;
  temp.remove();
  return parseColor(computed);
}

export function lerpColor(colorA, colorB, t, cache) {
  const colourCache = cache ?? new ColorCache();
  const a = colourCache.get(colorA);
  const b = colourCache.get(colorB);
  return `rgb(${Math.round(lerp(a.r, b.r, t))}, ${Math.round(lerp(a.g, b.g, t))}, ${Math.round(
    lerp(a.b, b.b, t)
  )})`;
}

export function gradientColor(colors, t, cache) {
  if (!Array.isArray(colors) || colors.length === 0) {
    throw new Error("Gradient requires at least one color");
  }
  if (colors.length === 1) {
    return colors[0];
  }
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (colors.length - 1);
  const index = Math.floor(scaled);
  const blend = scaled - index;
  const colourCache = cache ?? new ColorCache();
  const a = colourCache.get(colors[index]);
  const b = colourCache.get(colors[Math.min(colors.length - 1, index + 1)]);
  return `rgb(${Math.round(lerp(a.r, b.r, blend))}, ${Math.round(lerp(a.g, b.g, blend))}, ${Math.round(
    lerp(a.b, b.b, blend)
  )})`;
}

export function createMemoryFragment(
  distance,
  {
    rng = Math.random,
    library = memoryLibrary,
    biomeList = biomes,
    length = biomeLength,
  } = {}
) {
  if (!Number.isFinite(distance)) {
    throw new TypeError("Distance must be a finite number");
  }
  if (typeof rng !== "function") {
    throw new TypeError("rng must be a function");
  }
  if (!Array.isArray(library) || library.length === 0) {
    throw new Error("Memory library must contain at least one entry");
  }
  if (!Array.isArray(biomeList) || biomeList.length === 0) {
    throw new Error("Biome list must contain at least one biome");
  }
  if (!Number.isFinite(length) || length <= 0) {
    throw new TypeError("Biome length must be a positive number");
  }

  const biomeIndex = Math.floor(distance / length) % biomeList.length;
  const biome = biomeList[(biomeIndex + biomeList.length) % biomeList.length];
  const textIndex = Math.floor(rng() * library.length) % library.length;
  const idNonce = Math.max(rng(), Number.EPSILON).toString(16).slice(2);
  return {
    id: `${distance}-${idNonce}`,
    biome: biome.name,
    text: library[textIndex],
    triggerAt: distance,
    collected: false,
  };
}
