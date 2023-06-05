import { MoonpayApi } from '@/utils/moonpay';

import type { MoonpayState } from './types';

function initialState(): MoonpayState {
  return {
    api: new MoonpayApi(),
    dialogVisibility: false,
    notificationVisibility: false,
    notificationKey: '',
    confirmationVisibility: false,
    pollingTimestamp: 0,
    transactions: [],
    transactionsFetching: false,
    bridgeTransactionData: null,
    startBridgeButtonVisibility: false,
    currencies: [],
  };
}

const state = initialState();

export default state;
