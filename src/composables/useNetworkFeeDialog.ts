import { ref } from 'vue';

import { delay } from '@/utils/promise';

/**
 * Tracks the state of the network-fee warning modal for the composable-based
 * wallet flow.
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
    showWarningFeeDialog.value = false;
  };

  const waitOnFeeWarningConfirmation = async (delayMs = 500): Promise<void> => {
    while (showWarningFeeDialog.value) {
      await delay(delayMs);
    }
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
