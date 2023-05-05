import omit from 'lodash/fp/omit';
import { defineMutations } from 'direct-vuex';
import type { CodecString } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

import { ZeroStringValue } from '@/consts';
import type { IBridgeTransaction } from '@/utils/bridge/common/types';
import type { BridgeState } from './types';

const mutations = defineMutations<BridgeState>()({
  setSoraToEvm(state, isSoraToEvm: boolean): void {
    state.isSoraToEvm = isSoraToEvm;
  },
  setAssetAddress(state, address?: string): void {
    state.assetAddress = address || '';
  },
  setAssetBalance(state, balance: Nullable<AccountBalance> = null): void {
    state.assetBalance = balance;
  },
  setAmount(state, value?: string): void {
    state.amount = value || '';
  },

  getEvmNetworkFeeRequest(state): void {
    state.evmNetworkFeeFetching = true;
  },
  getEvmNetworkFeeSuccess(state, fee: CodecString): void {
    state.evmNetworkFee = fee;
    state.evmNetworkFeeFetching = false;
  },
  getEvmNetworkFeeFailure(state): void {
    state.evmNetworkFee = ZeroStringValue;
    state.evmNetworkFeeFetching = false;
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

  setEvmBlockNumber(state, blockNumber: number): void {
    state.evmBlockNumber = blockNumber;
  },
  setHistoryLoading(state, value: boolean): void {
    state.historyLoading = value;
  },
  setNotificationData(state, tx: Nullable<IBridgeTransaction> = null) {
    state.notificationData = tx;
  },
});

export default mutations;
