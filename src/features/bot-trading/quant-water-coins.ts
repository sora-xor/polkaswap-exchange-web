import pswapSvg from '@/assets/img/pswap.svg?raw';
import ethSvg from '@/lib/soramitsu-ui/icons/icomoon/finance-eth-blue-16.svg?raw';
import xorSvg from '@/lib/soramitsu-ui/icons/icomoon/finance-XOR-16.svg?raw';

/**
 * Coin logos printed around the Quant Loop water bubbles, largest bubble first. They come from
 * the bundled brand assets, so the art makes no network requests and taints no canvas.
 */
export const WATER_COINS = [
  { symbol: 'PSWAP', svg: pswapSvg },
  { symbol: 'XOR', svg: xorSvg },
  { symbol: 'ETH', svg: ethSvg },
] as const;

/** Atlas layout: square logo slots side by side; four slots keep the width a power of two. */
export const COIN_SLOT = 256;
export const COIN_SLOTS = 4;
/** Transparent margin inside each slot so filtering never bleeds between logos. */
const PADDING = 6;

export interface CoinShape {
  fill: string;
  /** Combined `opacity` and `fill-opacity`, 0…1. */
  opacity: number;
  /** SVG path data in the logo's viewBox units. */
  path: string;
}

export interface CoinLogo {
  viewBox: [number, number, number, number];
  shapes: CoinShape[];
}

export interface CoinAtlas {
  canvas: HTMLCanvasElement;
  /** Alpha-weighted mean colour of each logo in linear RGB, for tinting light through it. */
  tints: [number, number, number][];
}

/**
 * Read the filled shapes of a simple flat logo: `<path d>` and `<circle>` elements with a
 * `fill` attribute (default black) and optional opacity. Returns null for markup without a
 * usable viewBox or without any filled shape.
 */
export function parseCoinLogo(svg: string): CoinLogo | null {
  if (typeof DOMParser === 'undefined') return null;
  const root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg') return null;
  const viewBox = (root.getAttribute('viewBox') ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value)) || viewBox[2] <= 0 || viewBox[3] <= 0) {
    return null;
  }
  const shapes: CoinShape[] = [];
  const share = (value: string | null) => {
    const number = Number(value ?? 1);
    return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : 1;
  };
  // Walk every element in document order: later shapes paint over earlier ones.
  root.querySelectorAll('*').forEach((element) => {
    const name = element.nodeName.toLowerCase();
    if (name !== 'path' && name !== 'circle') return;
    const fill = element.getAttribute('fill') ?? '#000';
    const opacity = share(element.getAttribute('opacity')) * share(element.getAttribute('fill-opacity'));
    if (fill === 'none' || !opacity) return;
    if (name === 'path') {
      const path = element.getAttribute('d');
      if (path) shapes.push({ fill, opacity, path });
      return;
    }
    const [cx, cy, r] = ['cx', 'cy', 'r'].map((name) => Number(element.getAttribute(name) ?? 0));
    if (!(r > 0)) return;
    shapes.push({ fill, opacity, path: `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z` });
  });
  return shapes.length ? { viewBox: viewBox as CoinLogo['viewBox'], shapes } : null;
}

/**
 * Rasterise the coin logos into one atlas row with Canvas 2D paths. Returns null where a 2D
 * canvas or Path2D is unavailable (for example in test DOMs); the bubbles then stay clear.
 */
export function buildCoinAtlas(logos = WATER_COINS.map((coin) => parseCoinLogo(coin.svg))): CoinAtlas | null {
  if (typeof document === 'undefined' || typeof Path2D === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = COIN_SLOT * COIN_SLOTS;
  canvas.height = COIN_SLOT;
  let context: CanvasRenderingContext2D | null = null;
  try {
    context = canvas.getContext('2d', { willReadFrequently: true });
  } catch {
    context = null;
  }
  if (!context) return null;
  const size = COIN_SLOT - 2 * PADDING;
  const tints: [number, number, number][] = [];
  logos.slice(0, COIN_SLOTS).forEach((logo, slot) => {
    if (!logo) {
      tints.push([1, 1, 1]);
      return;
    }
    const [x, y, width, height] = logo.viewBox;
    context!.save();
    context!.translate(slot * COIN_SLOT + PADDING, PADDING);
    context!.scale(size / width, size / height);
    context!.translate(-x, -y);
    logo.shapes.forEach((shape) => {
      context!.globalAlpha = shape.opacity;
      context!.fillStyle = shape.fill;
      context!.fill(new Path2D(shape.path));
    });
    context!.restore();
    tints.push(meanColor(context!.getImageData(slot * COIN_SLOT, 0, COIN_SLOT, COIN_SLOT).data));
  });
  return { canvas, tints };
}

/** Alpha-weighted mean of non-premultiplied RGBA bytes (as getImageData returns them), in linear RGB. */
export function meanColor(pixels: Uint8ClampedArray): [number, number, number] {
  const sum = [0, 0, 0];
  let weight = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    if (!alpha) continue;
    for (let channel = 0; channel < 3; channel++) sum[channel] += alpha * (pixels[index + channel] / 255) ** 2.2;
    weight += alpha;
  }
  return weight ? [sum[0] / weight, sum[1] / weight, sum[2] / weight] : [1, 1, 1];
}
