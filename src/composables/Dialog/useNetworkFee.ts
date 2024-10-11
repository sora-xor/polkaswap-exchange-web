import { ref } from 'vue';

import { delay } from '@/utils';

export function useNetworkFeeDialog() {
  const showWarningFeeDialog = ref<boolean>(false);
  const isWarningFeeDialogConfirmed = ref<boolean>(false);

  function confirmNetworkFeeWariningDialog(): void {
    isWarningFeeDialogConfirmed.value = true;
  }

  function openWarningFeeDialog(): void {
    showWarningFeeDialog.value = true;
  }

  async function waitOnFeeWarningConfirmation(ms = 500): Promise<void> {
    if (!showWarningFeeDialog.value) return;

    await delay(ms);

    return await waitOnFeeWarningConfirmation();
  }

  return {
    showWarningFeeDialog,
    isWarningFeeDialogConfirmed,
    confirmNetworkFeeWariningDialog,
    openWarningFeeDialog,
    waitOnFeeWarningConfirmation,
  };
}
