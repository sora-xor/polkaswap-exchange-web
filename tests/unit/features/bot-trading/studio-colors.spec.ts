import { describe, expect, it } from 'vitest';
import {
  cssColor,
  divergingColor,
  mixOklab,
  niceScale,
  parseCssColor,
  readProbe,
  type DivergingPalette,
} from '@/features/bot-trading/components/quant/studio/studio-colors';

const PALETTE: DivergingPalette = { up: [0.67, 0.02, 0.33], zero: [0.8, 0.77, 0.79], down: [0.22, 0.47, 0.8] };

describe('studio colours', () => {
  it('parse every colour format browsers report, including color-mix output', () => {
    expect(parseCssColor('#f8087b')).toEqual([248 / 255, 8 / 255, 123 / 255]);
    expect(parseCssColor('#fff')).toEqual([1, 1, 1]);
    expect(parseCssColor('rgb(171, 5, 85)')).toEqual([171 / 255, 5 / 255, 85 / 255]);
    expect(parseCssColor('rgba(0 0 0 / 0.5)')).toEqual([0, 0, 0]);
    expect(parseCssColor('color(srgb 0.25 1.2 -0.1)')).toEqual([0.25, 1, 0]);
    expect(parseCssColor('hsl(10 20% 30%)')).toBeNull();
    expect(parseCssColor('rgb(300, 0, 0)')).toBeNull();
  });

  it('read probe elements with a fallback when the colour is missing', () => {
    const element = document.createElement('span');
    element.style.color = 'rgb(10, 20, 30)';
    document.body.append(element);
    expect(readProbe(element, [1, 1, 1])).toEqual([10 / 255, 20 / 255, 30 / 255]);
    expect(readProbe(null, [0.5, 0.5, 0.5])).toEqual([0.5, 0.5, 0.5]);
    element.remove();
  });

  it('blend in OKLab and keep the endpoints exact', () => {
    const a: [number, number, number] = [1, 0, 0];
    const b: [number, number, number] = [0, 0, 1];
    mixOklab(a, b, 0).forEach((channel, index) => expect(channel).toBeCloseTo(a[index], 4));
    mixOklab(a, b, 1).forEach((channel, index) => expect(channel).toBeCloseTo(b[index], 4));
    expect(mixOklab(a, b, 0.5).every((channel) => channel >= 0 && channel <= 1)).toBe(true);
  });

  it('colour results on one diverging ramp: grey at zero, pink for gains, blue for losses', () => {
    expect(divergingColor(0, 0.5, PALETTE)).toEqual(PALETTE.zero);
    expect(divergingColor(Number.NaN, 0.5, PALETTE)).toEqual(PALETTE.zero);
    divergingColor(2, 0.5, PALETTE).forEach((channel, index) => expect(channel).toBeCloseTo(PALETTE.up[index], 3));
    divergingColor(-2, 0.5, PALETTE).forEach((channel, index) => expect(channel).toBeCloseTo(PALETTE.down[index], 3));
    // A small gain is already visibly tinted toward pink.
    const small = divergingColor(0.05, 0.5, PALETTE);
    expect(small[0]).toBeLessThan(PALETTE.zero[0]);
    expect(small[2]).toBeLessThan(PALETTE.zero[2]);
  });

  it('choose rounded scales from the 90th percentile of magnitudes', () => {
    expect(niceScale([])).toBe(0.1);
    expect(niceScale([0.01, -0.03, 0.05])).toBe(0.1);
    expect(niceScale(Float32Array.from([0.1, 0.15, -0.18, 0.12, 0.4]))).toBe(0.2);
    expect(niceScale([0.9, -0.7, 0.3, 0.2])).toBe(1);
    expect(niceScale([2.4, 2.6, -1, 0.5])).toBe(3);
    expect(cssColor([1, 0.5, 0], 0.4)).toBe('rgba(255, 128, 0, 0.4)');
  });
});
