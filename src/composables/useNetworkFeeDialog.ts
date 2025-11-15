import { ref } from 'vue';

import { delay } from '@/utils/promise';

/**
 * Tracks the state of the network-fee warning modal (replacement for
 * `NetworkFeeDialogMixin`).
 */
export function useNetworkFeeDialog() {
  const showWarningFeeDialog = ref(false);
  const isWarningFeeDialogConfirmed = ref(false);

  const openWarningFeeDialog = () => {
    showWarningFeeDialog.value = true;
  };

  const closeWarningFeeDialog = () => {
    showWarningFeeDialog.value = false;
  };

  const confirmNetworkFeeWariningDialog = () => {
    isWarningFeeDialogConfirmed.value = true;
  };

  const waitOnFeeWarningConfirmation = async (delayMs = 500): Promise<void> => {
    if (!showWarningFeeDialog.value) return;

    await delay(delayMs);
    return await waitOnFeeWarningConfirmation(delayMs);
  };

  return {
    showWarningFeeDialog,
    isWarningFeeDialogConfirmed,
    openWarningFeeDialog,
    closeWarningFeeDialog,
    confirmNetworkFeeWariningDialog,
    waitOnFeeWarningConfirmation,
  };
}

export type NetworkFeeDialogComposable = ReturnType<typeof useNetworkFeeDialog>;
