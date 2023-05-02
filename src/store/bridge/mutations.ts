import omit from 'lodash/fp/omit';
import { defineMutations } from 'direct-vuex';
import type { Subscription } from 'rxjs';
import type { CodecString } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';
import type { EvmHistory } from '@sora-substrate/util/build/evm/types';

import { ZeroStringValue } from '@/consts';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
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

  setInternalHistory(state): void {
    state.historyInternal = { ...evmBridgeApi.history } as Record<string, EvmHistory>;
  },
  setExternalHistory(state, history: Record<string, EvmHistory>): void {
    state.historyExternal = { ...history };
  },

  setHistoryPage(state, historyPage?: number): void {
    state.historyPage = historyPage || 1;
  },
  setHistoryId(state, id?: string): void {
    state.historyId = id || '';
  },

  setHistoryDataSubscription(state, subscription: Subscription): void {
    state.historyDataSubscription = subscription;
  },
  resetHistoryDataSubscription(state): void {
    state.historyDataSubscription?.unsubscribe();
    state.historyDataSubscription = null;
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
  setNotificationData(state, tx: Nullable<EvmHistory> = null) {
    state.notificationData = tx;
  },
});

export default mutations;
