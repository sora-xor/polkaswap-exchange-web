import { onBeforeUnmount, ref, watch, type Ref } from 'vue';

/**
 * Tween a displayed number toward a real target value. The target is never altered:
 * only its on-screen presentation eases in (ease-out expo). Reduced-motion users, and
 * environments without animation frames, see the target immediately.
 */
export function useCountUp(target: Ref<number>, duration = 1100, initial = 0): Ref<number> {
  const shown = ref(initial);
  let frame = 0;
  const reduced = () =>
    typeof window === 'undefined' ||
    typeof requestAnimationFrame === 'undefined' ||
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function animate(to: number): void {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (!Number.isFinite(to)) return;
    if (reduced()) {
      shown.value = to;
      return;
    }
    const from = shown.value;
    const started = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
      shown.value = from + (to - from) * eased;
      frame = progress < 1 ? requestAnimationFrame(step) : 0;
    };
    frame = requestAnimationFrame(step);
  }

  watch(target, animate, { immediate: true });
  onBeforeUnmount(() => {
    if (frame) cancelAnimationFrame(frame);
  });
  return shown;
}
