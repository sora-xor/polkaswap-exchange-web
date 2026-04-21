import { nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { useDialogVisibility } from '@/composables/useDialog';

describe('useDialogVisibility', () => {
  it('syncs internal visibility from the prop ref and updates it on prop changes', async () => {
    const propVisible = ref(false);
    const dialog = useDialogVisibility(propVisible);

    expect(dialog.isVisible.value).toBe(false);

    propVisible.value = true;
    await nextTick();

    expect(dialog.isVisible.value).toBe(true);
  });

  it('emits visibility changes when an emit callback is provided', async () => {
    const propVisible = ref(false);
    const emit = vi.fn();
    const dialog = useDialogVisibility(propVisible, { emit });

    dialog.setVisible(true);
    await nextTick();

    expect(emit).toHaveBeenCalledWith(true);
    expect(propVisible.value).toBe(false);
  });

  it('falls back to mutating the prop ref when no emit callback is provided', async () => {
    const propVisible = ref(false);
    const dialog = useDialogVisibility(propVisible);

    dialog.setVisible(true);
    await nextTick();

    expect(propVisible.value).toBe(true);
    expect(dialog.isVisible.value).toBe(true);
  });

  it('closes the dialog and runs the close hook', async () => {
    const propVisible = ref(true);
    const onClose = vi.fn();
    const dialog = useDialogVisibility(propVisible, { onClose });

    dialog.closeDialog();
    await nextTick();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dialog.isVisible.value).toBe(false);
    expect(propVisible.value).toBe(false);
  });
});
