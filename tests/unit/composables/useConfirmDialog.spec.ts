import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const confirmDisabledState = {
  value: false,
};

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    get isConfirmTxDialogDisabled() {
      return confirmDisabledState.value;
    },
  }),
}));

describe('useConfirmDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    confirmDisabledState.value = false;
  });

  it('opens the dialog when confirmation is required', async () => {
    const { useConfirmDialog } = await import('@/composables/useConfirmDialog');
    const dialog = useConfirmDialog();
    const handler = vi.fn();

    await dialog.confirmOrExecute(handler);

    expect(handler).not.toHaveBeenCalled();
    expect(dialog.confirmDialogVisible.value).toBe(true);
  });

  it('executes immediately when confirm-transactions is disabled', async () => {
    confirmDisabledState.value = true;
    const { useConfirmDialog } = await import('@/composables/useConfirmDialog');
    const dialog = useConfirmDialog();
    const handler = vi.fn();

    await dialog.confirmOrExecute(handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(dialog.confirmDialogVisible.value).toBe(false);
  });

  it('exposes imperative open and close helpers for the confirm dialog', async () => {
    const { useConfirmDialog } = await import('@/composables/useConfirmDialog');
    const dialog = useConfirmDialog();

    dialog.openConfirmDialog();
    expect(dialog.confirmDialogVisible.value).toBe(true);

    dialog.closeConfirmDialog();
    expect(dialog.confirmDialogVisible.value).toBe(false);
  });
});
