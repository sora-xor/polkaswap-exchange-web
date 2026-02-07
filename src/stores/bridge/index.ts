import { defineStore } from 'pinia';
import { FPNumber, Operation } from '@sora-substrate/sdk';

import { ZeroStringValue } from '@/consts';
import type { Nullable } from '@/types/common';
import { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import { useWalletStore } from '@/stores/wallet';
import { requireLegacyStore } from '@/utils/legacy-store';

import { BridgeFocusedField, type BridgeFormPatch, type BridgeState } from '@/stores/bridge/types';

import type { IBridgeTransaction } from '@sora-substrate/sdk';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { Subscription } from 'rxjs';

const normalizeHistoryPage = (page?: number): number => {
  const parsed = Number(page);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }

  return Math.floor(parsed);
};

const buildInitialState = (): BridgeState => ({
  form: {
    isSoraToEvm: true,
    assetAddress: '',
    amountSend: '',
    amountReceived: '',
    focusedField: null,
  },
  balances: {
    assetSenderBalance: null,
    assetRecipientBalance: null,
    assetLockedBalance: null,
    assetExternalMinBalance: ZeroStringValue,
    incomingMinLimit: FPNumber.ZERO,
    outgoingMinLimit: null,
    outgoingMaxLimit: null,
  },
  fees: {
    soraNetworkFee: ZeroStringValue,
    externalTransferFee: ZeroStringValue,
    externalNetworkFee: ZeroStringValue,
    externalNativeBalance: ZeroStringValue,
    externalBlockNumber: 0,
  },
  flags: {
    balancesFetching: false,
    feesAndLockedFundsFetching: false,
    isSignTxDialogVisible: false,
  },
  history: {
    internal: {},
    page: 1,
    id: '',
    loading: {},
    waitingForApprove: {},
    inProgressIds: {},
    notificationData: null,
  },
  subscriptions: {
    outgoingMaxLimit: null,
    blockUpdates: null,
  },
  connector: new SubNetworksConnector(),
});

export const useBridgeStore = defineStore('bridge', {
  state: (): BridgeState => buildInitialState(),
  getters: {
    asset(state): Nullable<RegisteredAccountAsset> {
      const walletStore = useWalletStore();
      return walletStore.assetsDataTable?.[state.form.assetAddress] ?? null;
    },
    /**
     * Whether the current form is configured to transfer from Sora to an external network.
     */
    isSoraToEvm(state): boolean {
      return state.form.isSoraToEvm;
    },
    operation(): Operation {
      if (this.isSoraToEvm) {
        return Operation.EthBridgeOutgoing;
      }
      return Operation.EthBridgeIncoming;
    },
    /**
     * Determines whether the user can press submit based on the amount and loading flags.
     */
    canSubmit(state): boolean {
      const hasAmount = Boolean(state.form.amountSend?.trim());
      return hasAmount && !state.flags.balancesFetching && !state.flags.feesAndLockedFundsFetching;
    },
    historyPage(state): number {
      return state.history.page;
    },
    networkHistoryId(): Nullable<BridgeNetworkId> {
      const legacyStore = requireLegacyStore();
      const value = legacyStore?.getters?.bridge?.networkHistoryId as Nullable<BridgeNetworkId>;
      return value ?? null;
    },
    nativeToken(): Nullable<RegisteredAccountAsset> {
      const legacyStore = requireLegacyStore();
      return (legacyStore?.getters?.bridge?.nativeToken as Nullable<RegisteredAccountAsset>) ?? null;
    },
    sender(): string {
      const legacyStore = requireLegacyStore();
      return (legacyStore?.getters?.bridge?.sender as string) ?? '';
    },
    recipient(): string {
      const legacyStore = requireLegacyStore();
      return (legacyStore?.getters?.bridge?.recipient as string) ?? '';
    },
    externalAccount(): string {
      const legacyStore = requireLegacyStore();
      return (legacyStore?.getters?.bridge?.externalAccount as string) ?? '';
    },
    isNativeTokenSelected(): boolean {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.getters?.bridge?.isNativeTokenSelected);
    },
    isSidechainAsset(): boolean {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.getters?.bridge?.isSidechainAsset);
    },
    isValidNetwork(): boolean {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.getters?.web3?.isValidNetwork);
    },
    isRegisteredAsset(): boolean {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.getters?.bridge?.isRegisteredAsset);
    },
    autoselectedAssetAddress(): Nullable<string> {
      const legacyStore = requireLegacyStore();
      return (legacyStore?.getters?.bridge?.autoselectedAssetAddress as Nullable<string>) ?? null;
    },
    hasWaitingForActionTx(): boolean {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.getters?.bridge?.hasWaitingForActionTx);
    },
    isSubBridge(): boolean {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.getters?.bridge?.isSubBridge);
    },
    isSubAccountType(): boolean {
      const legacyStore = requireLegacyStore();
      return Boolean(legacyStore?.getters?.bridge?.isSubAccountType);
    },
    senderName(): string {
      const legacyStore = requireLegacyStore();
      return (legacyStore?.getters?.bridge?.senderName as string) ?? '';
    },
    recipientName(): string {
      const legacyStore = requireLegacyStore();
      return (legacyStore?.getters?.bridge?.recipientName as string) ?? '';
    },
  },
  actions: {
    async runLegacyAction<T = unknown>(action: string, ...params: unknown[]): Promise<T | undefined> {
      const legacyStore = requireLegacyStore();
      const handler = legacyStore?.dispatch?.bridge?.[action];
      if (typeof handler === 'function') {
        return (await handler(...params)) as T;
      }
      return undefined;
    },
    /**
     * Merges partial form updates without resetting the untouched fields.
     */
    updateForm(patch: BridgeFormPatch): void {
      Object.assign(this.form, patch);
    },
    setAmountSend(value: string): void {
      this.form.amountSend = value;
    },
    setAmountReceived(value: string): void {
      this.form.amountReceived = value;
    },
    setFocusedField(field: Nullable<BridgeFocusedField>): void {
      this.form.focusedField = field;
    },
    toggleDirection(): void {
      this.form.isSoraToEvm = !this.form.isSoraToEvm;
    },
    setBalancesFetching(flag: boolean): void {
      this.flags.balancesFetching = flag;
    },
    setFeesFetching(flag: boolean): void {
      this.flags.feesAndLockedFundsFetching = flag;
    },
    setSignTxDialogVisibility(flag: boolean): void {
      this.flags.isSignTxDialogVisible = flag;
    },
    setHistoryPage(page?: number): void {
      this.history.page = normalizeHistoryPage(page);
    },
    setHistoryId(id: string): void {
      this.history.id = id ?? '';
    },
    setHistoryLoading(network: BridgeNetworkId, loading: boolean): void {
      this.history.loading = {
        ...this.history.loading,
        [network]: loading,
      };
    },
    setHistoryTransaction(id: string, tx: IBridgeTransaction): void {
      if (!id) return;

      this.history.internal = {
        ...this.history.internal,
        [id]: tx,
      };
    },
    removeHistoryTransaction(id: string): void {
      if (!(id in this.history.internal)) return;

      const next = { ...this.history.internal };
      delete next[id];
      this.history.internal = next;
    },
    setWaitingForApprove(id: string, pending: boolean): void {
      if (!id) return;
      this.history.waitingForApprove = {
        ...this.history.waitingForApprove,
        [id]: pending,
      };
    },
    setInProgress(id: string, pending: boolean): void {
      if (!id) return;
      this.history.inProgressIds = {
        ...this.history.inProgressIds,
        [id]: pending,
      };
    },
    setNotification(data: Nullable<IBridgeTransaction>): void {
      this.history.notificationData = data ?? null;
    },
    setBlockUpdatesSubscription(subscription: Nullable<Subscription>): void {
      this.subscriptions.blockUpdates?.unsubscribe?.();
      this.subscriptions.blockUpdates = subscription ?? null;
    },
    resetBlockUpdatesSubscription(): void {
      this.setBlockUpdatesSubscription(null);
    },
    setOutgoingMaxLimitSubscription(subscription: Nullable<Subscription>): void {
      this.subscriptions.outgoingMaxLimit?.unsubscribe?.();
      this.subscriptions.outgoingMaxLimit = subscription ?? null;
    },
    resetOutgoingMaxLimitSubscription(): void {
      this.setOutgoingMaxLimitSubscription(null);
      this.balances.outgoingMaxLimit = null;
    },
    /**
     * Refreshes cached bridge histories by delegating to the legacy store.
     */
    async updateBridgeHistory(): Promise<void> {
      await this.runLegacyAction('updateBridgeHistory');
    },
    /**
     * Updates the locally cached internal history slice using the legacy bridge module.
     */
    async updateInternalHistory(): Promise<void> {
      await this.runLegacyAction('updateInternalHistory');
    },
    /**
     * Fetches external network history through the legacy bridge module.
     * @param clearHistory Whether to clear previously cached entries before fetching.
     */
    async updateExternalHistory(clearHistory = false): Promise<void> {
      await this.runLegacyAction('updateExternalHistory', clearHistory);
    },
    async updateExternalBalance(): Promise<void> {
      await this.runLegacyAction('updateExternalBalance');
    },
    async subscribeOnBlockUpdates(): Promise<void> {
      await this.runLegacyAction('subscribeOnBlockUpdates');
    },
    async updateOutgoingMaxLimit(): Promise<void> {
      await this.runLegacyAction('updateOutgoingMaxLimit');
    },
    async resetBridgeForm(): Promise<void> {
      await this.runLegacyAction('resetBridgeForm');
    },
    async setSendedAmount(value?: string): Promise<void> {
      await this.runLegacyAction('setSendedAmount', value);
    },
    async setReceivedAmount(value?: string): Promise<void> {
      await this.runLegacyAction('setReceivedAmount', value);
    },
    async switchDirection(): Promise<void> {
      await this.runLegacyAction('switchDirection');
    },
    async setAssetAddress(address?: string): Promise<void> {
      await this.runLegacyAction('setAssetAddress', address);
      this.form.assetAddress = address ?? '';
    },
    async generateHistoryItem(history?: unknown): Promise<unknown> {
      return await this.runLegacyAction('generateHistoryItem', history);
    },
    /**
     * Hands off transaction handling to the legacy bridge action handler.
     */
    async handleBridgeTransaction(id: string): Promise<void> {
      await this.runLegacyAction('handleBridgeTransaction', id);
    },
    /**
     * Removes a transaction from history, mirroring legacy behaviour.
     */
    async removeHistory(payload: { tx: Partial<IBridgeTransaction>; force?: boolean }): Promise<void> {
      const { tx, force = false } = payload;
      await this.runLegacyAction('removeHistory', { tx, force });
    },
    reset(): void {
      this.$patch(buildInitialState());
    },
  },
});
