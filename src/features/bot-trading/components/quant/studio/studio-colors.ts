/**
 * Colour helpers for the Strategy Studio views. Colours come from theme tokens read through
 * hidden probe elements, so light and dark (Noir) themes need no separate palette.
 *
 * Results use one diverging ramp everywhere, matching the bots page's tone classes: gains in
 * the action pink, losses in blue, and a neutral grey at zero. Ramps blend in OKLab so equal
 * steps look equal.
 */
export type Rgb = [number, number, number];

/** The three stops of the result ramp, in sRGB 0…1. */
export interface DivergingPalette {
  up: Rgb;
  zero: Rgb;
  down: Rgb;
}

/**
 * Parse a browser-resolved colour: `#rgb`, `#rrggbb`, `rgb()`/`rgba()` or `color(srgb …)`
 * (how browsers report `color-mix`). Returns sRGB channels in 0…1, or null.
 */
export function parseCssColor(value: string): Rgb | null {
  const text = value.trim();
  const hex = text.match(/^#([a-f\d]{3}|[a-f\d]{6})$/i)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex;
    return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16) / 255) as Rgb;
  }
  const rgb = text.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (rgb) {
    const channels = rgb.slice(1, 4).map((channel) => Number(channel) / 255);
    return channels.every((channel) => Number.isFinite(channel) && channel >= 0 && channel <= 1)
      ? (channels as Rgb)
      : null;
  }
  const srgb = text.match(/^color\(\s*srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)/i);
  if (srgb) {
    const channels = srgb.slice(1, 4).map(Number);
    return channels.every((channel) => Number.isFinite(channel))
      ? (channels.map((channel) => Math.min(1, Math.max(0, channel))) as Rgb)
      : null;
  }
  return null;
}

/** Read a probe element's computed `color`, falling back when it is missing or unparsable. */
export function readProbe(element: HTMLElement | null | undefined, fallback: Rgb): Rgb {
  if (!element || typeof getComputedStyle === 'undefined') return fallback;
  return parseCssColor(getComputedStyle(element).color) ?? fallback;
}

const linear = (channel: number) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
const gamma = (channel: number) =>
  channel <= 0.0031308 ? channel * 12.92 : 1.055 * Math.max(0, channel) ** (1 / 2.4) - 0.055;

function toOklab([r, g, b]: Rgb): Rgb {
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]: Rgb): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((channel) => Math.min(1, Math.max(0, gamma(channel)))) as Rgb;
}

/** Perceptual blend of two sRGB colours; `amount` 0 returns `a`, 1 returns `b`. */
export function mixOklab(a: Rgb, b: Rgb, amount: number): Rgb {
  const t = Math.min(1, Math.max(0, amount));
  const x = toOklab(a);
  const y = toOklab(b);
  return fromOklab([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

/**
 * Colour for a signed result. `scale` is the magnitude drawn at full strength; values beyond it
 * saturate. A square-root response keeps small gains and losses distinguishable from zero.
 */
export function divergingColor(value: number, scale: number, palette: DivergingPalette): Rgb {
  if (!Number.isFinite(value) || scale <= 0 || value === 0) return palette.zero;
  const strength = Math.sqrt(Math.min(1, Math.abs(value) / scale));
  return mixOklab(palette.zero, value > 0 ? palette.up : palette.down, strength);
}

/** CSS `rgba()` text for a colour. */
export function cssColor([r, g, b]: Rgb, alpha = 1): string {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
}

/**
 * A rounded "nice" scale for the colour ramp and height axis: the 90th percentile of absolute
 * values, rounded up to 10%, 20%, 25%, 50% or a multiple of 100%, never below 10%.
 */
export function niceScale(values: ArrayLike<number>): number {
  const magnitudes = Array.from(values, (value) => Math.abs(value))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const reference = magnitudes.length ? magnitudes[Math.floor((magnitudes.length - 1) * 0.9)] : 0;
  for (const step of [0.1, 0.2, 0.25, 0.5, 1]) if (reference <= step) return step;
  return Math.ceil(reference);
}
