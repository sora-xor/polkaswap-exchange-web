import type { FPNumber, IBridgeTransaction, CodecString } from '@sora-substrate/sdk';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';
import type { Subscription } from 'rxjs';

import type { Nullable } from '@/types/common';
import type { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';

export enum BridgeFocusedField {
  Sended = 'Sended',
  Received = 'Received',
}

export type BridgeFormState = {
  isSoraToEvm: boolean;
  assetAddress: string;
  amountSend: string;
  amountReceived: string;
  focusedField: Nullable<BridgeFocusedField>;
};

export type BridgeBalancesState = {
  assetSenderBalance: Nullable<CodecString>;
  assetRecipientBalance: Nullable<CodecString>;
  assetLockedBalance: Nullable<FPNumber>;
  assetExternalMinBalance: CodecString;
  incomingMinLimit: FPNumber;
  outgoingMinLimit: Nullable<FPNumber>;
  outgoingMaxLimit: Nullable<FPNumber>;
};

export type BridgeFeesState = {
  soraNetworkFee: CodecString;
  externalTransferFee: CodecString;
  externalNetworkFee: CodecString;
  externalNativeBalance: CodecString;
  externalBlockNumber: number;
};

export type BridgeFlagsState = {
  balancesFetching: boolean;
  feesAndLockedFundsFetching: boolean;
  isSignTxDialogVisible: boolean;
};

export type BridgeHistoryState = {
  internal: Record<string, IBridgeTransaction>;
  page: number;
  id: string;
  loading: Partial<Record<BridgeNetworkId, boolean>>;
  waitingForApprove: Record<string, boolean>;
  inProgressIds: Record<string, boolean>;
  notificationData: Nullable<IBridgeTransaction>;
};

export type BridgeSubscriptionsState = {
  outgoingMaxLimit: Nullable<Subscription>;
  blockUpdates: Nullable<Subscription>;
};

export type BridgeState = {
  form: BridgeFormState;
  balances: BridgeBalancesState;
  fees: BridgeFeesState;
  flags: BridgeFlagsState;
  history: BridgeHistoryState;
  subscriptions: BridgeSubscriptionsState;
  connector: SubNetworksConnector;
};

export type BridgeFormPatch = Partial<BridgeFormState>;
export type BridgeFlagsPatch = Partial<BridgeFlagsState>;
