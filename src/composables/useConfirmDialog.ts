import { computed, ref } from 'vue';

import store from '@/store';

/**
 * Encapsulates shared confirm-dialog state that used to live inside
 * `ConfirmDialogMixin`. Consumers can gate actions behind the wallet-wide
 * "confirm transactions" toggle.
 */
export function useConfirmDialog() {
  const isConfirmTxDisabled = computed(() => store.state.wallet.transactions.isConfirmTxDialogDisabled);
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
