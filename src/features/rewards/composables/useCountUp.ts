import { FPNumber } from '@sora-substrate/sdk';
import { onScopeDispose, ref, watch, type Ref } from 'vue';

import { prefersReducedMotion } from './useReducedMotion';

/** Tuning for {@link useCountUp}. */
export interface CountUpOptions {
  /** Length of the tween in milliseconds. */
  duration?: number;
  /** Decimals kept in intermediate frames; the final frame is always the exact target. */
  frameDecimals?: number;
}

const DEFAULT_DURATION = 900;
const DEFAULT_FRAME_DECIMALS = 4;

/** Ease-out expo: fast start, long soft landing. */
const easeOut = (progress: number): number => (progress >= 1 ? 1 : 1 - 2 ** (-10 * progress));

/**
 * Eases a displayed amount toward its real value, as a natural decimal string (empty while there is no value).
 *
 * Only the presentation moves: the target is never changed and the last frame is exactly the target. Intermediate
 * frames use fixed-point math, and the first value counts up from zero. Reduced-motion users, and environments
 * without animation frames, see the target immediately.
 */
export function useCountUp(target: Ref<Nullable<FPNumber>>, options: CountUpOptions = {}): Ref<string> {
  const duration = options.duration ?? DEFAULT_DURATION;
  const frameDecimals = options.frameDecimals ?? DEFAULT_FRAME_DECIMALS;
  const shown = ref('');
  let current: Nullable<FPNumber> = null;
  let frame = 0;

  const cancel = (): void => {
    if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
    frame = 0;
  };

  const set = (value: Nullable<FPNumber>): void => {
    current = value ?? null;
    shown.value = value ? value.toString() : '';
  };

  const animate = (to: Nullable<FPNumber>): void => {
    cancel();

    if (!to) {
      set(null);
      return;
    }

    if (prefersReducedMotion() || typeof requestAnimationFrame !== 'function' || duration <= 0) {
      set(to);
      return;
    }

    const from = current ?? FPNumber.ZERO;

    if (FPNumber.eq(from, to)) {
      set(to);
      return;
    }

    const delta = to.sub(from);
    // Time is measured on the animation frames' own clock, so it never depends on `performance.now()` matching it.
    let startedAt: number | null = null;

    const step = (now: number): void => {
      startedAt ??= now;

      const progress = Math.min(1, Math.max(0, (now - startedAt) / duration));

      if (progress >= 1) {
        frame = 0;
        set(to);
        return;
      }

      set(from.add(delta.mul(new FPNumber(easeOut(progress)))).dp(frameDecimals));
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
  };

  watch(target, animate, { immediate: true });
  onScopeDispose(cancel);

  return shown;
}
