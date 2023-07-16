import { ZeroStringValue } from '@/consts';

import type { BridgeState } from './types';

function initialState(): BridgeState {
  return {
    isSoraToEvm: true,
    assetAddress: '',
    assetSenderBalance: null, // balance for sora
    assetRecipientBalance: null, // balance for bridge network
    assetLockedBalance: null, // asset balance locked on bridge
    assetLockedBalanceFetching: false,
    amount: '',
    externalNetworkFee: ZeroStringValue,
    externalNetworkFeeFetching: false,
    externalNativeBalance: ZeroStringValue, // balance for external native token (like ETH)
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
