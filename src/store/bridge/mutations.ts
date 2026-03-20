import { defineMutations } from '@/store/module-helpers';
import omit from 'lodash/fp/omit';
import { getActivePinia } from 'pinia';

import { ZeroStringValue } from '@/consts';
import { useBridgeFormStore } from '@/stores/bridge/form';
import { useBridgeHistoryStore } from '@/stores/bridge/history';
import { isPiniaSyncing } from '@/stores/bridge/sync';
import { useBridgeTransactionsStore } from '@/stores/bridge/transactions';

import type { BridgeState, FocusedField } from './types';
import type { FPNumber, IBridgeTransaction, CodecString } from '@sora-substrate/sdk';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';
import type { Subscription } from 'rxjs';

const getPiniaStore = <T>(factory: () => T): T | undefined => {
  try {
    if (!getActivePinia()) return undefined;
    return factory();
  } catch {
    return undefined;
  }
};

const mutations = defineMutations<BridgeState>()({
  setSoraToEvm(state, isSoraToEvm: boolean): void {
    state.isSoraToEvm = isSoraToEvm;
  },

  setAssetAddress(state, address?: string): void {
    state.assetAddress = address || '';
  },

  setAssetSenderBalance(state, balance: Nullable<CodecString> = null): void {
    state.assetSenderBalance = balance;
    const formStore = getPiniaStore(useBridgeFormStore);
    formStore?.syncAssetSenderBalance(state.assetSenderBalance);
  },

  setAssetRecipientBalance(state, balance: Nullable<CodecString> = null): void {
    state.assetRecipientBalance = balance;
    const formStore = getPiniaStore(useBridgeFormStore);
    formStore?.syncAssetRecipientBalance(state.assetRecipientBalance);
  },
  setBalancesBatch(
    state,
    data: { sender?: Nullable<CodecString>; recipient?: Nullable<CodecString>; native?: CodecString }
  ): void {
    if (data.sender !== undefined) state.assetSenderBalance = data.sender ?? null;
    if (data.recipient !== undefined) state.assetRecipientBalance = data.recipient ?? null;
    if (data.native !== undefined) state.externalNativeBalance = data.native ?? ZeroStringValue;

    const formStore = getPiniaStore(useBridgeFormStore);
    formStore?.syncAssetSenderBalance(state.assetSenderBalance);
    formStore?.syncAssetRecipientBalance(state.assetRecipientBalance);
    if (data.native !== undefined) {
      formStore?.syncExternalNativeBalance(state.externalNativeBalance);
    }
  },

  setAssetLockedBalance(state, balance: Nullable<FPNumber> = null): void {
    state.assetLockedBalance = balance;
    const formStore = getPiniaStore(useBridgeFormStore);
    formStore?.syncAssetLockedBalance(state.assetLockedBalance);
  },

  setExternalNativeBalance(state, balance: CodecString = ZeroStringValue): void {
    state.externalNativeBalance = balance;
    const formStore = getPiniaStore(useBridgeFormStore);
    formStore?.syncExternalNativeBalance(state.externalNativeBalance);
  },

  setExternalMinBalance(state, balance: CodecString = ZeroStringValue): void {
    state.assetExternalMinBalance = balance;
    const formStore = getPiniaStore(useBridgeFormStore);
    formStore?.syncAssetExternalMinBalance(state.assetExternalMinBalance);
  },

  setIncomingMinLimit(state, amount: FPNumber): void {
    state.incomingMinLimit = amount;
    const formStore = getPiniaStore(useBridgeFormStore);
    formStore?.syncIncomingMinLimit(state.incomingMinLimit);
  },

  setOutgoingMinLimit(state, amount: FPNumber): void {
    state.outgoingMinLimit = amount;
    const formStore = getPiniaStore(useBridgeFormStore);
    formStore?.syncOutgoingMinLimit(state.outgoingMinLimit);
  },

  setOutgoingMaxLimit(state, amount: Nullable<FPNumber>): void {
    state.outgoingMaxLimit = amount;
    const formStore = getPiniaStore(useBridgeFormStore);
    formStore?.syncOutgoingMaxLimit(state.outgoingMaxLimit);
  },

  setOutgoingMaxLimitSubscription(state, subscription: Subscription): void {
    state.outgoingMaxLimitSubscription = subscription;
  },

  resetOutgoingMaxLimitSubscription(state): void {
    state.outgoingMaxLimitSubscription?.unsubscribe();
    state.outgoingMaxLimitSubscription = null;
    state.outgoingMaxLimit = null;
    const formStore = getPiniaStore(useBridgeFormStore);
    formStore?.syncOutgoingMaxLimit(state.outgoingMaxLimit);
  },

  setBlockUpdatesSubscription(state, subscription: Subscription): void {
    state.blockUpdatesSubscription = subscription;
  },

  resetBlockUpdatesSubscription(state): void {
    state.blockUpdatesSubscription?.unsubscribe();
    state.blockUpdatesSubscription = null;
  },

  setAmountSend(state, value?: string): void {
    state.amountSend = value || '';
  },

  setAmountReceived(state, value?: string): void {
    state.amountReceived = value || '';
  },

  setFocusedField(state, field: FocusedField): void {
    state.focusedField = field;
  },

  setBalancesFetching(state, flag: boolean): void {
    state.balancesFetching = flag;
  },

  setFeesAndLockedFundsFetching(state, flag: boolean): void {
    state.feesAndLockedFundsFetching = flag;
  },

  setExternalNetworkFee(state, fee: CodecString): void {
    state.externalNetworkFee = fee;
    const formStore = getPiniaStore(useBridgeFormStore);
    formStore?.syncExternalNetworkFee(state.externalNetworkFee);
  },

  setExternalTransferFee(state, fee: CodecString): void {
    state.externalTransferFee = fee;
    const formStore = getPiniaStore(useBridgeFormStore);
    formStore?.syncExternalTransferFee(state.externalTransferFee);
  },

  setSoraNetworkFee(state, fee: CodecString) {
    state.soraNetworkFee = fee;
    const formStore = getPiniaStore(useBridgeFormStore);
    formStore?.syncSoraNetworkFee(state.soraNetworkFee);
  },

  /**
   * Set bridge transactions from localstorage (ethBridgeApi or evmBridgeApi)
   */
  setInternalHistory(state, history: Record<string, IBridgeTransaction>): void {
    state.historyInternal = Object.freeze({ ...history });
    const transactionsStore = getPiniaStore(useBridgeTransactionsStore);
    transactionsStore?.syncHistoryInternalFromLegacy(state.historyInternal);
  },

  setHistoryPage(state, historyPage?: number): void {
    state.historyPage = historyPage || 1;
    if (isPiniaSyncing()) {
      return;
    }

    const bridgeHistoryStore = getPiniaStore(useBridgeHistoryStore);
    bridgeHistoryStore?.syncHistoryPageFromLegacy(state.historyPage);
  },
  setHistoryId(state, id?: string): void {
    state.historyId = id || '';

    if (isPiniaSyncing()) {
      return;
    }

    const bridgeHistoryStore = getPiniaStore(useBridgeHistoryStore);
    bridgeHistoryStore?.syncHistoryIdFromLegacy(state.historyId);
  },

  addTxIdInProgress(state, id: string): void {
    state.inProgressIds = { ...state.inProgressIds, [id]: true };
    const transactionsStore = getPiniaStore(useBridgeTransactionsStore);
    transactionsStore?.syncInProgressIdsFromLegacy(state.inProgressIds);
  },
  removeTxIdFromProgress(state, id: string): void {
    state.inProgressIds = omit([id], state.inProgressIds);
    const transactionsStore = getPiniaStore(useBridgeTransactionsStore);
    transactionsStore?.syncInProgressIdsFromLegacy(state.inProgressIds);
  },

  addTxIdInApprove(state, id: string): void {
    state.waitingForApprove = { ...state.waitingForApprove, [id]: true };
    const transactionsStore = getPiniaStore(useBridgeTransactionsStore);
    transactionsStore?.syncWaitingForApproveFromLegacy(state.waitingForApprove);
  },
  removeTxIdFromApprove(state, id: string): void {
    state.waitingForApprove = omit([id], state.waitingForApprove);
    const transactionsStore = getPiniaStore(useBridgeTransactionsStore);
    transactionsStore?.syncWaitingForApproveFromLegacy(state.waitingForApprove);
  },

  setExternalBlockNumber(state, blockNumber: number): void {
    state.externalBlockNumber = blockNumber;
  },

  setNetworkHistoryLoading(state, networkId: BridgeNetworkId): void {
    state.historyLoading = { ...state.historyLoading, [networkId]: true };
    const transactionsStore = getPiniaStore(useBridgeTransactionsStore);
    transactionsStore?.syncHistoryLoadingFromLegacy(state.historyLoading);
  },
  resetNetworkHistoryLoading(state, networkId: BridgeNetworkId): void {
    state.historyLoading = omit([networkId], state.historyLoading);
    const transactionsStore = getPiniaStore(useBridgeTransactionsStore);
    transactionsStore?.syncHistoryLoadingFromLegacy(state.historyLoading);
  },

  setNotificationData(state, tx: Nullable<IBridgeTransaction> = null): void {
    state.notificationData = tx;
    const transactionsStore = getPiniaStore(useBridgeTransactionsStore);
    transactionsStore?.syncNotificationDataFromLegacy(state.notificationData);
  },

  setSignTxDialogVisibility(state, flag: boolean): void {
    state.isSignTxDialogVisible = flag;
    const transactionsStore = getPiniaStore(useBridgeTransactionsStore);
    transactionsStore?.syncSignDialogVisibilityFromLegacy(state.isSignTxDialogVisible);
  },
});

export default mutations;
