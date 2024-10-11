import { ref, computed } from 'vue';

import { useStore } from '@/composables/useStore';

export function useConfirmDialog() {
  const store = useStore();

  const isConfirmTxDisabled = computed(() => store.state.wallet.transactions.isConfirmTxDialogDisabled);

  const confirmDialogVisibility = ref<boolean>(false);

  function openConfirmDialog(): void {
    confirmDialogVisibility.value = true;
  }

  function confirmOrExecute(signTxMethod: FnWithoutArgs | AsyncFnWithoutArgs): void {
    if (isConfirmTxDisabled.value) {
      signTxMethod();
    } else {
      openConfirmDialog();
    }
  }

  return {
    isConfirmTxDisabled,
    confirmDialogVisibility,
    openConfirmDialog,
    confirmOrExecute,
  };
}
