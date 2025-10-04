import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  biomes,
  memoryLibrary,
  biomeLength,
  lerp,
  easeInOut,
  normaliseProgress,
  getBiome,
  parseHexColor,
  parseRgbColor,
  parseColor,
  gradientColor,
  lerpColor,
  ColorCache,
  createMemoryFragment,
} from '../js/game-core.js';

describe('math helpers', () => {
  test('lerp interpolates linearly', () => {
    assert.equal(lerp(0, 10, 0.25), 2.5);
  });

  test('easeInOut clamps to range', () => {
    assert.equal(easeInOut(-1), 0);
    assert.equal(easeInOut(0), 0);
    assert.equal(easeInOut(1), 1);
    assert.equal(easeInOut(2), 1);
  });

  test('normaliseProgress wraps negative values', () => {
    const { index, blend } = normaliseProgress(-0.25, 4);
    assert.equal(index, 3);
    assert.equal(Number(blend.toFixed(2)), 0.75);
  });
});

describe('biome traversal', () => {
  test('getBiome cycles through list', () => {
    const { current, next, blend } = getBiome(2.4);
    assert.equal(current.name, biomes[2].name);
    assert.equal(next.name, biomes[3].name);
    assert.equal(Number(blend.toFixed(2)), 0.4);
  });

  test('getBiome handles large progress values', () => {
    const { current, next } = getBiome(14.1);
    const expectedIndex = Math.floor(((14.1 % biomes.length) + biomes.length) % biomes.length);
    assert.equal(current.name, biomes[expectedIndex].name);
    assert.equal(next.name, biomes[(expectedIndex + 1) % biomes.length].name);
  });
});

describe('color utilities', () => {
  const cache = new ColorCache();

  test('parseHexColor supports shorthand', () => {
    assert.deepEqual(parseHexColor('#0f8'), { r: 0, g: 255, b: 136 });
  });

  test('parseRgbColor extracts components', () => {
    assert.deepEqual(parseRgbColor('rgb(10, 20, 30)'), { r: 10, g: 20, b: 30 });
  });

  test('parseColor rejects empty strings', () => {
    assert.throws(() => parseColor(''), { name: 'TypeError' });
  });

  test('gradientColor interpolates between values', () => {
    const colour = gradientColor(['#000000', '#ffffff'], 0.5, cache);
    assert.equal(colour, 'rgb(128, 128, 128)');
  });

  test('gradientColor clamps out-of-range t', () => {
    const colour = gradientColor(['#123456', '#abcdef'], 9, cache);
    assert.equal(colour, 'rgb(171, 205, 239)');
  });

  test('lerpColor blends using cache', () => {
    const colour = lerpColor('#000000', '#ffffff', 0.25, cache);
    assert.equal(colour, 'rgb(64, 64, 64)');
  });
});

describe('memory fragments', () => {
  test('createMemoryFragment picks biome and text deterministically', () => {
    const sequence = [0.1, 0.9, 0.3];
    let pointer = 0;
    const rng = () => {
      const value = sequence[pointer % sequence.length];
      pointer += 1;
      return value;
    };
    const distance = biomeLength * 1.5; // second biome when wrapping
    const fragment = createMemoryFragment(distance, {
      rng,
      library: memoryLibrary,
      biomeList: biomes,
      length: biomeLength,
    });
    assert.equal(fragment.biome, biomes[1].name);
    assert.equal(fragment.text, memoryLibrary[Math.floor(sequence[0] * memoryLibrary.length)]);
    assert.equal(fragment.collected, false);
    assert.equal(fragment.triggerAt, distance);
    assert.match(fragment.id, new RegExp(`^${distance}-[0-9a-f]+$`));
  });

  test('createMemoryFragment validates input', () => {
    assert.throws(() => createMemoryFragment(Number.NaN), { name: 'TypeError' });
  });
});
