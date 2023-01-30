import { defineMutations } from 'direct-vuex';

import type { MoonpayCurrency, MoonpayTransaction } from '@/utils/moonpay';
import type { MoonpayNotifications } from '@/components/pages/Moonpay/consts';
import type { BridgeTxData, MoonpayState } from './types';

const mutations = defineMutations<MoonpayState>()({
  setPollingTimestamp(state, timestamp: number = Date.now()): void {
    state.pollingTimestamp = timestamp;
  },
  setDialogVisibility(state, value: boolean): void {
    state.dialogVisibility = value;
  },
  setNotificationVisibility(state, value: boolean): void {
    state.notificationVisibility = value;
  },
  setNotificationKey(state, value: MoonpayNotifications): void {
    state.notificationKey = value;
  },
  setConfirmationVisibility(state, value: boolean): void {
    state.confirmationVisibility = value;
  },
  setBridgeTxData(state, { data = null, startBridgeButtonVisibility = false }: BridgeTxData = {}): void {
    state.bridgeTransactionData = data;
    state.startBridgeButtonVisibility = startBridgeButtonVisibility;
  },
  updateTxsRequest(state, clearTransactions: Nullable<boolean>): void {
    if (clearTransactions) {
      state.transactions = [];
    }
    state.transactionsFetching = true;
  },
  updateTxsSuccess(state, transactions: Array<MoonpayTransaction>): void {
    state.transactions = [...transactions];
    state.transactionsFetching = false;
  },
  updateTxsFailure(state): void {
    state.transactions = [];
    state.transactionsFetching = false;
  },
  setCurrencies(state, currencies: Array<MoonpayCurrency>): void {
    state.currencies = [...currencies];
  },
  resetCurrencies(state): void {
    state.currencies = [];
  },
});

export default mutations;
