import { FPNumber } from '@sora-substrate/sdk';

import { ZeroStringValue } from '@/consts';
import { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';

import type { BridgeState } from './types';

function initialState(): BridgeState {
  return {
    // form
    isSoraToEvm: true,
    assetAddress: '',
    amountSend: '',
    amountReceived: '',
    focusedField: null,
    // amounts
    assetSenderBalance: null, // balance for sora
    assetRecipientBalance: null, // balance for bridge network
    assetLockedBalance: null, // asset balance locked on bridge
    assetExternalMinBalance: ZeroStringValue, // min account balance should be (existential deposit)
    assetInternalMinBalance: ZeroStringValue, // min account balance should be (existential deposit)
    incomingMinLimit: FPNumber.ZERO, // incoming min limit in asset amount
    outgoingMinLimit: null, // outgoing min limit in asset amount
    soraNetworkFee: ZeroStringValue,
    externalTransferFee: ZeroStringValue, // fee for transfer between networks (xcm message fee for substrate network)
    externalNetworkFee: ZeroStringValue, // fee for transaction execution
    externalNativeBalance: ZeroStringValue, // balance for external native token (like ETH)
    externalBlockNumber: 0,
    blockUpdatesSubscription: null,
    // loading flags
    balancesFetching: false,
    feesAndLockedFundsFetching: false,
    // history sources
    historyInternal: {}, // localstorage history
    historyPage: 1,
    historyId: '',
    historyLoading: {},
    waitingForApprove: {},
    inProgressIds: {},
    notificationData: null,
    // connector
    subBridgeConnector: new SubNetworksConnector(),
    isSignTxDialogVisible: false,
  };
}

const state = initialState();

export default state;
