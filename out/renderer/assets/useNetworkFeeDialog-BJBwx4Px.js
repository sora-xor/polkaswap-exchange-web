import { e as useSettingsStore, v as useWalletStore, h as computed, O as Operation, x as useNumberFormatter, F as FPNumber, X as XOR, a9 as ref } from "./index-73GArslZ.js";
const PREDEFINED_OPERATIONS = /* @__PURE__ */ new Set([
  Operation.Transfer,
  Operation.EthBridgeOutgoing,
  Operation.RegisterAsset,
  Operation.CreatePair,
  Operation.AddLiquidity
]);
function useNetworkFeeWarning() {
  const { Zero, getFPNumberFromCodec } = useNumberFormatter();
  const settingsStore = useSettingsStore();
  const walletStore = useWalletStore();
  const networkFees = computed(() => settingsStore.networkFees);
  const allowFeePopup = computed(() => settingsStore.allowFeePopup);
  const accountAssetsAddressTable = computed(
    () => walletStore.accountAssetsAddressTable
  );
  const xorBalance = computed(() => {
    const accountXor = accountAssetsAddressTable.value[XOR.address];
    if (!accountXor?.balance?.transferable) {
      return Zero;
    }
    return getFPNumberFromCodec(accountXor.balance.transferable);
  });
  const isXorSufficientForNextTx = ({ type, isXor, amount }) => {
    const balance = xorBalance.value;
    if (type === Operation.EthBridgeIncoming || !balance.isFinity()) return true;
    const networkFee = getFPNumberFromCodec(
      type === Operation.AddLiquidity ? networkFees.value.RemoveLiquidity : networkFees.value[type]
    );
    const fpAmount = amount ?? Zero;
    const nextBalance = (() => {
      if (PREDEFINED_OPERATIONS.has(type)) {
        return isXor ? balance.sub(fpAmount).sub(networkFee) : balance.sub(networkFee);
      }
      if (type === Operation.RemoveLiquidity) {
        return isXor ? balance.add(fpAmount).sub(networkFee) : balance.sub(networkFee);
      }
      return balance;
    })();
    return FPNumber.gte(nextBalance, networkFee);
  };
  return {
    allowFeePopup,
    accountAssetsAddressTable,
    networkFees,
    xorBalance,
    isXorSufficientForNextTx
  };
}
const delay = (ms = 50) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
};
function useNetworkFeeDialog() {
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
  const waitOnFeeWarningConfirmation = async (delayMs = 500) => {
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
    waitOnFeeWarningConfirmation
  };
}
export {
  useNetworkFeeDialog as a,
  useNetworkFeeWarning as u
};
