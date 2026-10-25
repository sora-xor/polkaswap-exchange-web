import { computed, ref } from 'vue';

import pinia from '@/plugins/pinia';
import { useWalletStore } from '@/stores/wallet';

/**
 * Encapsulates the shared confirm-dialog flow that previously lived in a
 * mixin-based wallet helper. Consumers can gate actions behind the wallet-wide
 * "confirm transactions" toggle.
 */
export function useConfirmDialog() {
  const walletStore = useWalletStore(pinia);
  const isConfirmTxDisabled = computed(() => walletStore.isConfirmTxDialogDisabled);
  const confirmDialogVisible = ref(false);

  const openConfirmDialog = () => {
    confirmDialogVisible.value = true;
  };

  const closeConfirmDialog = () => {
    confirmDialogVisible.value = false;
  };

  const confirmOrExecute = async (handler: FnWithoutArgs | AsyncFnWithoutArgs) => {
    if (isConfirmTxDisabled.value) {
      await handler();
      return;
    }

    openConfirmDialog();
  };

  return {
    isConfirmTxDisabled,
    confirmDialogVisible,
    openConfirmDialog,
    closeConfirmDialog,
    confirmOrExecute,
  };
}

export type ConfirmDialogComposable = ReturnType<typeof useConfirmDialog>;
