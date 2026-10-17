import { seededRandom } from './random';
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Coherent seeded fields: no global state and no coordinate-dependent random consumption. */
export function noise(seed: number, x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), sx = smooth(x - ix), sy = smooth(y - iy);
  const value = (a: number, b: number) => seededRandom(seed ^ Math.imul(a, 374761393) ^ Math.imul(b, 668265263))();
  const a = value(ix, iy) * (1 - sx) + value(ix + 1, iy) * sx;
  const b = value(ix, iy + 1) * (1 - sx) + value(ix + 1, iy + 1) * sx;
  return a * (1 - sy) + b * sy;
}
export function landscape(seed: number, x: number, y: number): number {
  return noise(seed, x / 27, y / 27) * .55 + noise(seed + 101, x / 11, y / 11) * .3 + noise(seed + 207, x / 4, y / 4) * .15;
}
