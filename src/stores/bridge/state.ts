import { FPNumber } from '@sora-substrate/sdk';

import { ZeroStringValue } from '@/consts';
import { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';

import type { BridgeState } from './types';

/**
 * Normalizes a user-facing bridge history page into the store's positive
 * integer page model.
 */
export const normalizeBridgeHistoryPage = (page?: number): number => {
  const parsed = Number(page);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1;
  }

  return Math.floor(parsed);
};

/**
 * Builds a fresh bridge store state object, including non-serializable runtime
 * collaborators that should not be shared between store instances.
 */
export const buildInitialBridgeState = (): BridgeState => ({
  form: {
    isSoraToEvm: true,
    assetAddress: '',
    amountSend: '',
    amountReceived: '',
    focusedField: null,
  },
  balances: {
    assetSenderBalance: null,
    assetRecipientBalance: null,
    assetLockedBalance: null,
    assetExternalMinBalance: ZeroStringValue,
    incomingMinLimit: FPNumber.ZERO,
    outgoingMinLimit: null,
    outgoingMaxLimit: null,
  },
  fees: {
    soraNetworkFee: ZeroStringValue,
    externalTransferFee: ZeroStringValue,
    externalNetworkFee: ZeroStringValue,
    externalNativeBalance: ZeroStringValue,
    externalBlockNumber: 0,
  },
  flags: {
    balancesFetching: false,
    feesAndLockedFundsFetching: false,
    isSignTxDialogVisible: false,
  },
  history: {
    internal: {},
    page: 1,
    id: '',
    loading: {},
    waitingForApprove: {},
    inProgressIds: {},
    notificationData: null,
  },
  subscriptions: {
    outgoingMaxLimit: null,
    blockUpdates: null,
  },
  connector: new SubNetworksConnector(),
});
