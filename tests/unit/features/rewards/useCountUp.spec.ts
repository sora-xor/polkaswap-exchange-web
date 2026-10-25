import { FPNumber } from '@sora-substrate/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, effectScope, nextTick, ref } from 'vue';

import { useCountUp } from '@/features/rewards/composables/useCountUp';
import { useReducedMotion } from '@/features/rewards/composables/useReducedMotion';

let now = 0;
let nextFrameId = 0;
const frames = new Map<number, FrameRequestCallback>();

/** Runs the queued animation frames once, `ms` milliseconds after the previous run. */
const advance = (ms: number): void => {
  now += ms;
  const queued = [...frames.values()];
  frames.clear();
  queued.forEach((callback) => callback(now));
};

const stubMotion = (reduced: boolean) => {
  const listeners = new Set<() => void>();
  const query = {
    matches: reduced,
    addEventListener: vi.fn((_: string, listener: () => void) => listeners.add(listener)),
    removeEventListener: vi.fn((_: string, listener: () => void) => listeners.delete(listener)),
  };

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query)
  );
  window.matchMedia = globalThis.matchMedia;

  return {
    query,
    change: (matches: boolean) => {
      query.matches = matches;
      listeners.forEach((listener) => listener());
    },
  };
};

beforeEach(() => {
  now = 0;
  nextFrameId = 0;
  frames.clear();
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frames.set(++nextFrameId, callback);
      return nextFrameId;
    })
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => frames.delete(id))
  );
  stubMotion(false);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useCountUp', () => {
  it('counts up from zero to the first value and lands exactly on it', async () => {
    const scope = effectScope();
    const target = ref<FPNumber | null>(null);
    const shown = scope.run(() =>
      useCountUp(
        computed(() => target.value),
        { duration: 1000 }
      )
    )!;

    expect(shown.value).toBe('');

    target.value = new FPNumber('123.456789');
    await nextTick();
    // The first frame only fixes the start time.
    advance(16);
    advance(100);

    const early = new FPNumber(shown.value);
    expect(FPNumber.gt(early, FPNumber.ZERO)).toBe(true);
    expect(FPNumber.lt(early, new FPNumber('123.456789'))).toBe(true);

    advance(500);
    const middle = new FPNumber(shown.value);
    expect(FPNumber.gt(middle, early)).toBe(true);

    advance(2000);
    expect(shown.value).toBe('123.456789');
    expect(frames.size).toBe(0);

    scope.stop();
  });

  it('eases from the value on screen when the target changes mid-flight', async () => {
    const scope = effectScope();
    const target = ref<FPNumber | null>(new FPNumber(100));
    const shown = scope.run(() =>
      useCountUp(
        computed(() => target.value),
        { duration: 1000 }
      )
    )!;

    advance(16);
    advance(200);
    const before = new FPNumber(shown.value);
    expect(FPNumber.gt(before, FPNumber.ZERO)).toBe(true);

    target.value = new FPNumber(10);
    await nextTick();
    // Only the new animation is left: the old frame was cancelled.
    expect(frames.size).toBe(1);

    advance(16);
    advance(10);

    // It heads for the new target from where it was, not from zero and not by jumping.
    expect(FPNumber.lt(new FPNumber(shown.value), before)).toBe(true);
    expect(FPNumber.gt(new FPNumber(shown.value), new FPNumber(10))).toBe(true);

    advance(5000);
    expect(shown.value).toBe('10');

    scope.stop();
  });

  it('clears the text when the value goes away', async () => {
    const scope = effectScope();
    const target = ref<FPNumber | null>(new FPNumber(5));
    const shown = scope.run(() =>
      useCountUp(
        computed(() => target.value),
        { duration: 100 }
      )
    )!;

    advance(16);
    advance(1000);
    expect(shown.value).toBe('5');

    target.value = null;
    await nextTick();
    expect(shown.value).toBe('');

    scope.stop();
  });

  it('does not animate when the value is unchanged', async () => {
    const scope = effectScope();
    const target = ref<FPNumber | null>(new FPNumber(8));
    const shown = scope.run(() =>
      useCountUp(
        computed(() => target.value),
        { duration: 100 }
      )
    )!;

    advance(16);
    advance(1000);
    expect(shown.value).toBe('8');

    target.value = new FPNumber(8);
    await nextTick();

    expect(shown.value).toBe('8');
    expect(frames.size).toBe(0);

    scope.stop();
  });

  it('shows the target immediately for reduced-motion users', () => {
    stubMotion(true);

    const scope = effectScope();
    const shown = scope.run(() => useCountUp(computed(() => new FPNumber('42.5'))))!;

    expect(shown.value).toBe('42.5');
    expect(frames.size).toBe(0);

    scope.stop();
  });

  it('shows the target immediately when animation frames are unavailable', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);

    const scope = effectScope();
    const shown = scope.run(() => useCountUp(computed(() => new FPNumber(7))))!;

    expect(shown.value).toBe('7');

    scope.stop();
  });

  it('cancels a running animation when its scope stops', () => {
    const scope = effectScope();

    scope.run(() =>
      useCountUp(
        computed(() => new FPNumber(9)),
        { duration: 1000 }
      )
    );
    expect(frames.size).toBe(1);

    scope.stop();
    expect(frames.size).toBe(0);
  });
});

describe('useReducedMotion', () => {
  it('follows the media query and stops listening with its scope', () => {
    const motion = stubMotion(false);
    const scope = effectScope();
    const reduced = scope.run(() => useReducedMotion())!;

    expect(reduced.value).toBe(false);

    motion.change(true);
    expect(reduced.value).toBe(true);

    scope.stop();
    expect(motion.query.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('counts a missing matchMedia as no preference', () => {
    vi.stubGlobal('matchMedia', undefined);
    window.matchMedia = undefined as never;

    const scope = effectScope();
    const reduced = scope.run(() => useReducedMotion())!;

    expect(reduced.value).toBe(false);

    scope.stop();
  });
});
