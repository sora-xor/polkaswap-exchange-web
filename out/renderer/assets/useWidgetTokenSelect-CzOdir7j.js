import { a9 as ref, X as XOR, h as computed, aj as unref } from "./index-73GArslZ.js";
function resolveBoolean(source) {
  if (!source) return false;
  if (typeof source === "function") {
    return Boolean(source());
  }
  return Boolean(source.value);
}
function useWidgetTokenSelect(options = {}) {
  const fallbackAsset = ref(options.defaultAsset ?? XOR);
  const showSelectTokenDialog = ref(false);
  const predefinedToken = computed(() => unref(options.predefinedToken ?? null));
  const resolveParentLoading = () => resolveBoolean(options.parentLoading);
  const resolveLoading = () => resolveBoolean(options.loading);
  const selectedToken = computed(() => predefinedToken.value ?? fallbackAsset.value);
  const areActionsDisabled = computed(() => resolveParentLoading() || resolveLoading());
  const selectTokenIcon = computed(
    () => areActionsDisabled.value ? null : "chevron-down-rounded-16"
  );
  const tokenTabIndex = computed(() => areActionsDisabled.value ? -1 : 0);
  const handleSelectToken = () => {
    if (areActionsDisabled.value) return;
    showSelectTokenDialog.value = true;
  };
  const changeToken = (asset) => {
    if (selectedToken.value.address === asset.address) return;
    fallbackAsset.value = asset;
  };
  const closeTokenDialog = () => {
    showSelectTokenDialog.value = false;
  };
  return {
    selectedToken,
    areActionsDisabled,
    selectTokenIcon,
    tokenTabIndex,
    showSelectTokenDialog,
    handleSelectToken,
    changeToken,
    closeTokenDialog
  };
}
export {
  useWidgetTokenSelect as u
};
