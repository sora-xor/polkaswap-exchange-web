import { defineMutations } from 'direct-vuex';
import omit from 'lodash/fp/omit';

import { ZeroStringValue } from '@/consts';

import type { BridgeState } from './types';
import type { IBridgeTransaction, CodecString } from '@sora-substrate/util';

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

  setAssetLockedBalance(state, balance: Nullable<CodecString> = null): void {
    state.assetLockedBalance = balance;
  },
  setAssetLockedBalanceFetching(state, flag: boolean): void {
    state.assetLockedBalanceFetching = flag;
  },

  setExternalBalance(state, balance: Nullable<CodecString> = null): void {
    state.externalNativeBalance = balance;
  },
  setExternalBalancesFetching(state, flag: boolean): void {
    state.externalBalancesFetching = flag;
  },

  setAmount(state, value?: string): void {
    state.amount = value || '';
  },

  setExternalNetworkFeeFetching(state, flag: boolean): void {
    state.externalNetworkFeeFetching = flag;
  },

  setExternalNetworkFee(state, fee: CodecString): void {
    state.externalNetworkFee = fee;
  },

  setExternalTransferFee(state, fee: CodecString): void {
    state.externalTransferFee = fee;
  },

  /**
   * Set bridge transactions from localstorage (ethBridgeApi or evmBridgeApi)
   */
  setInternalHistory(state, history: Record<string, IBridgeTransaction>): void {
    state.historyInternal = { ...history };
  },
  /**
   * Set bridge transactions from external sources (f.e. network or etherscan)
   */
  setExternalHistory(state, history: Record<string, IBridgeTransaction>): void {
    state.historyExternal = { ...history };
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

  setHistoryLoading(state, value: boolean): void {
    state.historyLoading = value;
  },
  setNotificationData(state, tx: Nullable<IBridgeTransaction> = null) {
    state.notificationData = tx;
  },
});

export default mutations;
