import { defineMutations } from 'direct-vuex';
import omit from 'lodash/fp/omit';

import { ZeroStringValue } from '@/consts';

import type { BridgeState, FocusedField } from './types';
import type { FPNumber, IBridgeTransaction, CodecString } from '@sora-substrate/sdk';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';
import type { Subscription } from 'rxjs';

const mutations = defineMutations<BridgeState>()({
  setSoraToEvm(state, isSoraToEvm: boolean): void {
    state.isSoraToEvm = isSoraToEvm;
  },

  setAssetAddress(state, address?: string): void {
    state.assetAddress = address || '';
  },

  setAssetSenderBalance(state, balance: Nullable<CodecString> = null): void {
    state.assetSenderBalance = balance;
  },

  setAssetRecipientBalance(state, balance: Nullable<CodecString> = null): void {
    state.assetRecipientBalance = balance;
  },

  setAssetLockedBalance(state, balance: Nullable<FPNumber> = null): void {
    state.assetLockedBalance = balance;
  },

  setExternalNativeBalance(state, balance: CodecString = ZeroStringValue): void {
    state.externalNativeBalance = balance;
  },

  setExternalMinBalance(state, balance: CodecString = ZeroStringValue): void {
    state.assetExternalMinBalance = balance;
  },

  setIncomingMinLimit(state, amount: FPNumber): void {
    state.incomingMinLimit = amount;
  },

  setOutgoingMinLimit(state, amount: FPNumber): void {
    state.outgoingMinLimit = amount;
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
  },

  setExternalTransferFee(state, fee: CodecString): void {
    state.externalTransferFee = fee;
  },

  setSoraNetworkFee(state, fee: CodecString) {
    state.soraNetworkFee = fee;
  },

  /**
   * Set bridge transactions from localstorage (ethBridgeApi or evmBridgeApi)
   */
  setInternalHistory(state, history: Record<string, IBridgeTransaction>): void {
    state.historyInternal = Object.freeze({ ...history });
  },

  setHistoryPage(state, historyPage?: number): void {
    state.historyPage = historyPage || 1;
  },
  setHistoryId(state, id?: string): void {
    state.historyId = id || '';
  },

  addTxIdInProgress(state, id: string): void {
    state.inProgressIds = { ...state.inProgressIds, [id]: true };
  },
  removeTxIdFromProgress(state, id: string): void {
    state.inProgressIds = omit([id], state.inProgressIds);
  },

  addTxIdInApprove(state, id: string): void {
    state.waitingForApprove = { ...state.waitingForApprove, [id]: true };
  },
  removeTxIdFromApprove(state, id: string): void {
    state.waitingForApprove = omit([id], state.waitingForApprove);
  },

  setExternalBlockNumber(state, blockNumber: number): void {
    state.externalBlockNumber = blockNumber;
  },

  setNetworkHistoryLoading(state, networkId: BridgeNetworkId): void {
    state.historyLoading = { ...state.historyLoading, [networkId]: true };
  },
  resetNetworkHistoryLoading(state, networkId: BridgeNetworkId): void {
    state.historyLoading = omit([networkId], state.historyLoading);
  },

  setNotificationData(state, tx: Nullable<IBridgeTransaction> = null): void {
    state.notificationData = tx;
  },

  setSignTxDialogVisibility(state, flag: boolean): void {
    state.isSignTxDialogVisible = flag;
  },
});

export default mutations;
