import { a9 as ref, h as computed, s as store } from "./index-73GArslZ.js";
function useConfirmDialog() {
  const isConfirmTxDisabled = computed(() => store.state.wallet.transactions.isConfirmTxDialogDisabled);
  const confirmDialogVisible = ref(false);
  const openConfirmDialog = () => {
    confirmDialogVisible.value = true;
  };
  const closeConfirmDialog = () => {
    confirmDialogVisible.value = false;
  };
  const confirmOrExecute = async (handler) => {
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
    confirmOrExecute
  };
}
export {
  useConfirmDialog as u
};
