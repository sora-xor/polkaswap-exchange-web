import { describe, expect, it, vi } from 'vitest';

const delay = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('@/utils/promise', () => ({
  delay,
}));

import { useNetworkFeeDialog } from '@/composables/useNetworkFeeDialog';

describe('useNetworkFeeDialog', () => {
  it('manages warning dialog state and waits for confirmation', async () => {
    const {
      showWarningFeeDialog,
      isWarningFeeDialogConfirmed,
      openWarningFeeDialog,
      closeWarningFeeDialog,
      confirmNetworkFeeWariningDialog,
      waitOnFeeWarningConfirmation,
    } = useNetworkFeeDialog();

    expect(showWarningFeeDialog.value).toBe(false);
    expect(isWarningFeeDialogConfirmed.value).toBe(false);

    openWarningFeeDialog();
    expect(showWarningFeeDialog.value).toBe(true);

    const waitPromise = waitOnFeeWarningConfirmation(0);

    closeWarningFeeDialog();
    await waitPromise;

    expect(delay).toHaveBeenCalled();

    confirmNetworkFeeWariningDialog();
    expect(isWarningFeeDialogConfirmed.value).toBe(true);
  });
});
