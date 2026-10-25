import { onScopeDispose, ref, type Ref } from 'vue';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Reads the current "reduce motion" preference. Environments without `matchMedia` count as "no preference". */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;

  return window.matchMedia(QUERY).matches;
}

/**
 * Reactive "reduce motion" preference. JavaScript-driven effects (count-up, pointer parallax, particle bursts)
 * check it; pure CSS animations use the matching `@media` query instead.
 */
export function useReducedMotion(): Ref<boolean> {
  const reduced = ref(prefersReducedMotion());

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return reduced;

  const query = window.matchMedia(QUERY);
  const update = (): void => {
    reduced.value = query.matches;
  };

  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', update);
    onScopeDispose(() => query.removeEventListener('change', update));
  } else if (typeof query.addListener === 'function') {
    // Safari before 14 only knows the deprecated listener API.
    query.addListener(update);
    onScopeDispose(() => query.removeListener(update));
  }

  return reduced;
}
