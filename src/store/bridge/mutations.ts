import omit from 'lodash/fp/omit';
import { defineMutations } from 'direct-vuex';
import type { BridgeHistory, CodecString } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

import { ZeroStringValue } from '@/consts';
import { bridgeApi } from '@/utils/bridge';
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
  setHistory(state): void {
    state.history = bridgeApi.historyList as Array<BridgeHistory>;
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
  setNotificationData(state, tx: Nullable<BridgeHistory> = null) {
    state.notificationData = tx;
  },
});

export default mutations;
