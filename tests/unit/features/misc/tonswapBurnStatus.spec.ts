import { describe, expect, it } from 'vitest';

import { groupExactDecimal } from '@/features/misc/lib/burnActivityFormat';
import {
  createBurnEmbers,
  getTonswapBurnSteps,
  isTonswapBurnSettled,
  type TonswapBurnPhase,
} from '@/features/misc/lib/tonswapBurnStatus';

const states = (phase: TonswapBurnPhase, excluded = false) =>
  getTonswapBurnSteps(phase, excluded).map((step) => `${step.id}:${step.state}`);

describe('burn status steps', () => {
  it('walks sent, in a block, final and TS reserved in order, with exactly one step in progress', () => {
    expect(states('waiting')).toEqual(['sent:done', 'included:active', 'final:todo', 'reserved:todo']);
    expect(states('included')).toEqual(['sent:done', 'included:done', 'final:active', 'reserved:todo']);
    expect(states('confirmed')).toEqual(['sent:done', 'included:done', 'final:done', 'reserved:active']);
    expect(states('updated')).toEqual(['sent:done', 'included:done', 'final:done', 'reserved:done']);
  });

  it('marks a chain failure at the block step and promises nothing after it', () => {
    expect(states('failed')).toEqual(['sent:done', 'included:failed', 'final:todo', 'reserved:todo']);
    expect(states('failed', true)).toEqual(['sent:done', 'included:failed', 'final:todo']);
  });

  it('never shows a TS reservation step for a source that earns no TS', () => {
    for (const phase of ['waiting', 'included', 'confirmed', 'updated', 'failed'] as const) {
      expect(getTonswapBurnSteps(phase, true).some((step) => step.id === 'reserved')).toBe(false);
    }
    expect(states('confirmed', true)).toEqual(['sent:done', 'included:done', 'final:done']);
    expect(states('included', true)).toEqual(['sent:done', 'included:done', 'final:active']);
  });

  it('settles on an indexed reservation or a failure, and at finality for an excluded source', () => {
    expect(isTonswapBurnSettled('waiting')).toBe(false);
    expect(isTonswapBurnSettled('included')).toBe(false);
    expect(isTonswapBurnSettled('confirmed')).toBe(false);
    expect(isTonswapBurnSettled('updated')).toBe(true);
    expect(isTonswapBurnSettled('failed')).toBe(true);
    expect(isTonswapBurnSettled('confirmed', true)).toBe(true);
    expect(isTonswapBurnSettled('included', true)).toBe(false);
  });
});

describe('burn status sparks', () => {
  it('lays out the same bounded burst for the same seed', () => {
    const first = createBurnEmbers(30, 42);
    expect(first).toEqual(createBurnEmbers(30, 42));
    expect(first).not.toEqual(createBurnEmbers(30, 43));
    expect(first).toHaveLength(30);
    for (const ember of first) {
      expect(ember.left).toBeGreaterThanOrEqual(4);
      expect(ember.left).toBeLessThanOrEqual(96);
      expect(Math.abs(ember.drift)).toBeLessThanOrEqual(40);
      expect(ember.rise).toBeGreaterThanOrEqual(70);
      expect(ember.rise).toBeLessThanOrEqual(180);
      expect(ember.size).toBeGreaterThanOrEqual(4);
      expect(ember.size).toBeLessThanOrEqual(10);
      expect(ember.delay).toBeLessThanOrEqual(500);
      expect(ember.duration).toBeGreaterThanOrEqual(900);
      expect(ember.duration).toBeLessThanOrEqual(1800);
    }
    expect(new Set(first.map((ember) => ember.id)).size).toBe(30);
  });

  it('clamps the number of animated elements and tolerates bad counts', () => {
    expect(createBurnEmbers(10_000)).toHaveLength(48);
    expect(createBurnEmbers(-3)).toEqual([]);
    expect(createBurnEmbers(Number.NaN)).toEqual([]);
    expect(createBurnEmbers(2.9)).toHaveLength(2);
  });
});

describe('exact amount grouping', () => {
  it('groups whole digits without touching a single decimal place', () => {
    expect(groupExactDecimal('14312.9922415')).toBe('14,312.9922415');
    expect(groupExactDecimal('9007199254740993.123456789012345678')).toBe('9,007,199,254,740,993.123456789012345678');
    expect(groupExactDecimal('0.000000000000000001')).toBe('0.000000000000000001');
    expect(groupExactDecimal('999')).toBe('999');
    expect(groupExactDecimal('1000')).toBe('1,000');
    expect(groupExactDecimal(28_194_044)).toBe('28,194,044');
    expect(groupExactDecimal(0)).toBe('0');
  });

  it('returns anything that is not a plain non-negative decimal unchanged', () => {
    for (const value of ['', '-5', '1e9', 'NaN', '1,000', '1.', '.5', ' 12 ']) {
      expect(groupExactDecimal(value)).toBe(value);
    }
  });
});
