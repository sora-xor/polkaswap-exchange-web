import { describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref } from 'vue';

import { normalizeTransitionAttrs, useModalVisibility } from '@/lib/soramitsu-ui/components/Modal/util';

describe('modal util', () => {
  it('normalizes transition attributes for render-function bindings', () => {
    const attrs = { name: 'fade', appear: true };

    expect(normalizeTransitionAttrs(null)).toBeNull();
    expect(normalizeTransitionAttrs(undefined)).toBeNull();
    expect(normalizeTransitionAttrs('')).toBeNull();
    expect(normalizeTransitionAttrs('fade')).toEqual({ name: 'fade' });
    expect(normalizeTransitionAttrs(attrs)).toBe(attrs);
  });

  it('tracks modal fragment visibility and emits open/close lifecycle events', async () => {
    const show = ref(false);
    const eager = ref(true);
    const overlayEnabled = ref(true);
    const emit = vi.fn();
    const scope = effectScope();

    const visibility = scope.run(() =>
      useModalVisibility({
        show,
        eager,
        overlayEnabled,
        emit,
      })
    );

    if (!visibility) throw new Error('Modal visibility composable did not initialize');

    expect(visibility.rootIf.value).toBe(true);
    expect(visibility.rootShow.value).toBe(false);
    expect(visibility.modalIf.value).toBe(true);
    expect(visibility.modalShow.value).toBe(false);
    expect(visibility.overlayIf.value).toBe(false);
    expect(visibility.modalTransitionAppear).toBe(false);

    show.value = true;
    await nextTick();

    expect(emit).toHaveBeenCalledWith('before-open');
    expect(visibility.rootShow.value).toBe(true);
    expect(visibility.overlayIf.value).toBe(true);

    visibility.modalTransitionListeners.beforeEnter();
    visibility.overlayTransitionListeners.beforeEnter();
    visibility.modalTransitionListeners.afterEnter();
    visibility.overlayTransitionListeners.afterEnter();
    await nextTick();

    expect(emit).toHaveBeenCalledWith('after-open');

    show.value = false;
    await nextTick();

    expect(emit).toHaveBeenCalledWith('before-close');
    expect(visibility.rootIf.value).toBe(true);
    expect(visibility.rootShow.value).toBe(true);

    visibility.modalTransitionListeners.beforeLeave();
    visibility.overlayTransitionListeners.beforeLeave();
    visibility.modalTransitionListeners.afterLeave();
    visibility.overlayTransitionListeners.afterLeave();
    await nextTick();

    expect(emit).toHaveBeenCalledWith('after-close');
    expect(visibility.rootShow.value).toBe(false);

    scope.stop();
  });

  it('does not render lazy fragments while closed and respects disabled overlays', () => {
    const scope = effectScope();
    const visibility = scope.run(() =>
      useModalVisibility({
        show: ref(false),
        eager: ref(false),
        overlayEnabled: ref(false),
        emit: vi.fn(),
      })
    );

    if (!visibility) throw new Error('Modal visibility composable did not initialize');

    expect(visibility.rootIf.value).toBe(false);
    expect(visibility.modalIf.value).toBe(false);
    expect(visibility.overlayIf.value).toBe(false);
    expect(visibility.modalTransitionAppear).toBe(true);

    scope.stop();
  });
});
