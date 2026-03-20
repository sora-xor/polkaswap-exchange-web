import { p as defineStore, q as SubNetworksConnector, Z as ZeroStringValue, F as FPNumber, r as requireLegacyStore, O as Operation, v as useWalletStore } from "./index-73GArslZ.js";
const normalizeHistoryPage = (page) => {
  const parsed = Number(page);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }
  return Math.floor(parsed);
};
const buildInitialState = () => ({
  form: {
    isSoraToEvm: true,
    assetAddress: "",
    amountSend: "",
    amountReceived: "",
    focusedField: null
  },
  balances: {
    assetSenderBalance: null,
    assetRecipientBalance: null,
    assetLockedBalance: null,
    assetExternalMinBalance: ZeroStringValue,
    incomingMinLimit: FPNumber.ZERO,
    outgoingMinLimit: null,
    outgoingMaxLimit: null
  },
  fees: {
    soraNetworkFee: ZeroStringValue,
    externalTransferFee: ZeroStringValue,
    externalNetworkFee: ZeroStringValue,
    externalNativeBalance: ZeroStringValue,
    externalBlockNumber: 0
  },
  flags: {
    balancesFetching: false,
    feesAndLockedFundsFetching: false,
    isSignTxDialogVisible: false
  },
  history: {
    internal: {},
    page: 1,
    id: "",
    loading: {},
    waitingForApprove: {},
    inProgressIds: {},
    notificationData: null
  },
  subscriptions: {
    outgoingMaxLimit: null,
    blockUpdates: null
  },
  connector: new SubNetworksConnector()
});
const useBridgeStore = defineStore("bridge", {
  state: () => buildInitialState(),
  getters: {
    asset(state) {
      const walletStore = useWalletStore();
      return walletStore.assetsDataTable?.[state.form.assetAddress] ?? null;
    },
    /**
     * Whether the current form is configured to transfer from Sora to an external network.
     */
    isSoraToEvm(state) {
      return state.form.isSoraToEvm;
    },
    operation() {
      if (this.isSoraToEvm) {
        return Operation.EthBridgeOutgoing;
      }
      return Operation.EthBridgeIncoming;
    },
    /**
     * Determines whether the user can press submit based on the amount and loading flags.
     */
    canSubmit(state) {
      const hasAmount = Boolean(state.form.amountSend?.trim());
      return hasAmount && !state.flags.balancesFetching && !state.flags.feesAndLockedFundsFetching;
    },
    historyPage(state) {
      return state.history.page;
    },
    networkHistoryId() {
      const legacyStore = requireLegacyStore();
      const value = legacyStore?.getters?.bridge?.networkHistoryId;
      return value ?? null;
    },
    nativeToken() {
      const legacyStore = requireLegacyStore();
      return legacyStore?.getters?.bridge?.nativeToken ?? null;
    },
    sender() {
      const legacyStore = requireLegacyStore();
      return legacyStore?.getters?.bridge?.sender ?? "";
    },
    recipient() {
      const legacyStore = requireLegacyStore();
      return legacyStore?.getters?.bridge?.recipient ?? "";
    },
    externalAccount() {
      const legacyStore = requireLegacyStore();
      return legacyStore?.getters?.bridge?.externalAccount ?? "";
    },
    isNativeTokenSelected() {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.getters?.bridge?.isNativeTokenSelected);
    },
    isSidechainAsset() {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.getters?.bridge?.isSidechainAsset);
    },
    isValidNetwork() {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.getters?.web3?.isValidNetwork);
    },
    isRegisteredAsset() {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.getters?.bridge?.isRegisteredAsset);
    },
    autoselectedAssetAddress() {
      const legacyStore = requireLegacyStore();
      return legacyStore?.getters?.bridge?.autoselectedAssetAddress ?? null;
    },
    hasWaitingForActionTx() {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.getters?.bridge?.hasWaitingForActionTx);
    },
    isSubBridge() {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.getters?.bridge?.isSubBridge);
    },
    isSubAccountType() {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.getters?.bridge?.isSubAccountType);
    },
    senderName() {
      const legacyStore = requireLegacyStore();
      return legacyStore?.getters?.bridge?.senderName ?? "";
    },
    recipientName() {
      const legacyStore = requireLegacyStore();
      return legacyStore?.getters?.bridge?.recipientName ?? "";
    }
  },
  actions: {
    async runLegacyAction(action, ...params) {
      const legacyStore = requireLegacyStore();
      const handler = legacyStore?.dispatch?.bridge?.[action];
      if (typeof handler === "function") {
        return await handler(...params);
      }
      return void 0;
    },
    /**
     * Merges partial form updates without resetting the untouched fields.
     */
    updateForm(patch) {
      Object.assign(this.form, patch);
    },
    setAmountSend(value) {
      this.form.amountSend = value;
    },
    setAmountReceived(value) {
      this.form.amountReceived = value;
    },
    setFocusedField(field) {
      this.form.focusedField = field;
    },
    toggleDirection() {
      this.form.isSoraToEvm = !this.form.isSoraToEvm;
    },
    setBalancesFetching(flag) {
      this.flags.balancesFetching = flag;
    },
    setFeesFetching(flag) {
      this.flags.feesAndLockedFundsFetching = flag;
    },
    setSignTxDialogVisibility(flag) {
      this.flags.isSignTxDialogVisible = flag;
    },
    setHistoryPage(page) {
      this.history.page = normalizeHistoryPage(page);
    },
    setHistoryId(id) {
      this.history.id = id ?? "";
    },
    setHistoryLoading(network, loading) {
      this.history.loading = {
        ...this.history.loading,
        [network]: loading
      };
    },
    setHistoryTransaction(id, tx) {
      if (!id) return;
      this.history.internal = {
        ...this.history.internal,
        [id]: tx
      };
    },
    removeHistoryTransaction(id) {
      if (!(id in this.history.internal)) return;
      const next = { ...this.history.internal };
      delete next[id];
      this.history.internal = next;
    },
    setWaitingForApprove(id, pending) {
      if (!id) return;
      this.history.waitingForApprove = {
        ...this.history.waitingForApprove,
        [id]: pending
      };
    },
    setInProgress(id, pending) {
      if (!id) return;
      this.history.inProgressIds = {
        ...this.history.inProgressIds,
        [id]: pending
      };
    },
    setNotification(data) {
      this.history.notificationData = data ?? null;
    },
    setBlockUpdatesSubscription(subscription) {
      this.subscriptions.blockUpdates?.unsubscribe?.();
      this.subscriptions.blockUpdates = subscription ?? null;
    },
    resetBlockUpdatesSubscription() {
      this.setBlockUpdatesSubscription(null);
    },
    setOutgoingMaxLimitSubscription(subscription) {
      this.subscriptions.outgoingMaxLimit?.unsubscribe?.();
      this.subscriptions.outgoingMaxLimit = subscription ?? null;
    },
    resetOutgoingMaxLimitSubscription() {
      this.setOutgoingMaxLimitSubscription(null);
      this.balances.outgoingMaxLimit = null;
    },
    /**
     * Refreshes cached bridge histories by delegating to the legacy store.
     */
    async updateBridgeHistory() {
      await this.runLegacyAction("updateBridgeHistory");
    },
    /**
     * Updates the locally cached internal history slice using the legacy bridge module.
     */
    async updateInternalHistory() {
      await this.runLegacyAction("updateInternalHistory");
    },
    /**
     * Fetches external network history through the legacy bridge module.
     * @param clearHistory Whether to clear previously cached entries before fetching.
     */
    async updateExternalHistory(clearHistory = false) {
      await this.runLegacyAction("updateExternalHistory", clearHistory);
    },
    async updateExternalBalance() {
      await this.runLegacyAction("updateExternalBalance");
    },
    async subscribeOnBlockUpdates() {
      await this.runLegacyAction("subscribeOnBlockUpdates");
    },
    async updateOutgoingMaxLimit() {
      await this.runLegacyAction("updateOutgoingMaxLimit");
    },
    async resetBridgeForm() {
      await this.runLegacyAction("resetBridgeForm");
    },
    async setSendedAmount(value) {
      await this.runLegacyAction("setSendedAmount", value);
    },
    async setReceivedAmount(value) {
      await this.runLegacyAction("setReceivedAmount", value);
    },
    async switchDirection() {
      await this.runLegacyAction("switchDirection");
    },
    async setAssetAddress(address) {
      await this.runLegacyAction("setAssetAddress", address);
      this.form.assetAddress = address ?? "";
    },
    async generateHistoryItem(history) {
      return await this.runLegacyAction("generateHistoryItem", history);
    },
    /**
     * Hands off transaction handling to the legacy bridge action handler.
     */
    async handleBridgeTransaction(id) {
      await this.runLegacyAction("handleBridgeTransaction", id);
    },
    /**
     * Removes a transaction from history, mirroring legacy behaviour.
     */
    async removeHistory(payload) {
      const { tx, force = false } = payload;
      await this.runLegacyAction("removeHistory", { tx, force });
    },
    reset() {
      this.$patch(buildInitialState());
    }
  }
});
export {
  useBridgeStore as u
};
