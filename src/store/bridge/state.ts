import { ZeroStringValue } from '@/consts';

import type { BridgeState } from './types';

function initialState(): BridgeState {
  return {
    isSoraToEvm: true,
    assetAddress: '',
    assetSenderBalance: ZeroStringValue, // balance for sora
    assetRecipientBalance: ZeroStringValue, // balance for bridge network
    amount: '',
    evmNetworkFee: ZeroStringValue,
    externalNetworkFeeFetching: false,
    externalBalance: ZeroStringValue, // balance for external native token (like ETH)
    externalBalancesFetching: false,
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
