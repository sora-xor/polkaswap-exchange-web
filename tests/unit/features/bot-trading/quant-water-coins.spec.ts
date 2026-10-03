import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  COIN_SLOT,
  COIN_SLOTS,
  WATER_COINS,
  buildCoinAtlas,
  meanColor,
  parseCoinLogo,
} from '@/features/bot-trading/quant-water-coins';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('coin logos', () => {
  it('prints PSWAP, XOR and ETH from the bundled brand assets', () => {
    expect(WATER_COINS.map((coin) => coin.symbol)).toEqual(['PSWAP', 'XOR', 'ETH']);
    WATER_COINS.forEach((coin) => {
      const logo = parseCoinLogo(coin.svg);
      expect(logo?.shapes.length).toBeGreaterThan(1);
      // Every coin is a filled disc first, so the print reads as a coin face.
      expect(logo?.shapes[0].opacity).toBe(1);
    });
    expect(parseCoinLogo(WATER_COINS[0].svg)?.shapes[0].fill.toLowerCase()).toBe('#ed145b');
  });

  it('reads paths, circles, opacity and default fills, skipping unfilled shapes', () => {
    const logo = parseCoinLogo(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
        <circle cx="5" cy="5" r="5" fill="#123456"/>
        <path d="M0 0h1v1z" opacity="0.5" fill-opacity="0.5"/>
        <path d="M2 2h1v1z" fill="none"/>
        <circle cx="1" cy="1" r="0"/>
      </svg>`
    );
    expect(logo?.viewBox).toEqual([0, 0, 10, 10]);
    expect(logo?.shapes).toEqual([
      { fill: '#123456', opacity: 1, path: 'M0 5a5 5 0 1 0 10 0a5 5 0 1 0 -10 0z' },
      { fill: '#000', opacity: 0.25, path: 'M0 0h1v1z' },
    ]);
  });

  it.each([
    '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1z"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 0 10"><path d="M0 0h1v1z"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path fill="none" d="M0 0h1v1z"/></svg>',
    '<div>not an svg</div>',
  ])('rejects unusable markup %#', (svg) => {
    expect(parseCoinLogo(svg)).toBeNull();
  });

  it('averages ink colour by coverage in linear light', () => {
    const pixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255, 0, 255, 0, 0]);
    expect(meanColor(pixels)).toEqual([0.5, 0, 0.5]);
    expect(meanColor(new Uint8ClampedArray(8))).toEqual([1, 1, 1]);
  });
});

describe('coin atlas', () => {
  it('needs a 2D canvas and Path2D, as test DOMs lack them', () => {
    vi.stubGlobal('Path2D', undefined);
    expect(buildCoinAtlas()).toBeNull();
  });

  it('draws each logo into its own padded slot and reports its ink colour', () => {
    const calls: string[] = [];
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn((x: number, y: number) => calls.push(`translate ${x} ${y}`)),
      scale: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
      globalAlpha: 1,
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([255, 255, 255, 255]) })),
    };
    vi.stubGlobal(
      'Path2D',
      class {
        constructor(public path: string) {}
      }
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    const atlas = buildCoinAtlas();
    expect(atlas?.canvas.width).toBe(COIN_SLOT * COIN_SLOTS);
    expect(atlas?.canvas.height).toBe(COIN_SLOT);
    expect(atlas?.tints).toEqual([
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
    ]);
    // Slots start at multiples of the slot width, inset by the padding.
    expect(calls.filter((call) => call.endsWith(' 6')).map((call) => Number(call.split(' ')[1]))).toEqual([
      6,
      COIN_SLOT + 6,
      2 * COIN_SLOT + 6,
    ]);
    expect(context.fill).toHaveBeenCalledTimes(
      WATER_COINS.reduce((sum, coin) => sum + (parseCoinLogo(coin.svg)?.shapes.length ?? 0), 0)
    );
    expect(context.getImageData).toHaveBeenCalledWith(2 * COIN_SLOT, 0, COIN_SLOT, COIN_SLOT);
  });

  it('keeps a missing logo slot clear', () => {
    vi.stubGlobal('Path2D', class {});
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      fill: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    expect(buildCoinAtlas([null])?.tints).toEqual([[1, 1, 1]]);
    expect(context.fill).not.toHaveBeenCalled();
  });
});
