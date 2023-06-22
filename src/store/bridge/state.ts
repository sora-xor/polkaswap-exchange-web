import { ZeroStringValue } from '@/consts';

import type { BridgeState } from './types';

function initialState(): BridgeState {
  return {
    isSoraToEvm: true,
    assetAddress: '',
    assetBalance: null, // balance for sora
    assetExternalBalance: ZeroStringValue, // balance for bridge network
    amount: '',
    evmNetworkFee: ZeroStringValue,
    evmNetworkFeeFetching: false,
    externalBalance: ZeroStringValue, // balance for external native token (like ETH)
    externalBlockNumber: 0,
    // history sources
    historyInternal: {}, // localstorage history
    historyExternal: {}, // network history
    historyPage: 1,
    historyId: '',
    historyLoading: false,
    waitingForApprove: {},
    inProgressIds: {},
    notificationData: null,
  };
}

const state = initialState();

export default state;
