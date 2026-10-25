import { computed, inject, unref, type ComputedRef, type InjectionKey, type Ref } from 'vue';

export type OverlayTarget = string | HTMLElement | null;

/**
 * Provides a local DOM node where floating UI should render instead of the
 * main document body.
 */
export const OVERLAY_TARGET_KEY: InjectionKey<Ref<HTMLElement | null>> = Symbol('soramitsu-ui-overlay-target');

/**
 * Resolves the active overlay target, allowing local providers such as widget
 * Picture-in-Picture windows to keep popovers and modals inside their frame.
 */
export function useResolvedOverlayTarget(target: Ref<OverlayTarget> | ComputedRef<OverlayTarget> | OverlayTarget) {
  const providedTarget = inject(OVERLAY_TARGET_KEY, null);

  return computed<OverlayTarget>(() => {
    const fallback = unref(target);

    if (fallback !== 'body') {
      return fallback;
    }

    return providedTarget?.value ?? fallback;
  });
}
