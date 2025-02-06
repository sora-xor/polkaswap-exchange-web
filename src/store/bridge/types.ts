import type { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';

import type { FPNumber, CodecString, IBridgeTransaction } from '@sora-substrate/sdk';
import type { BridgeNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/types';
import type { Subscription } from 'rxjs';

export enum FocusedField {
  Sended = 'Sended',
  Received = 'Received',
}

export type BridgeState = {
  isSoraToEvm: boolean;
  assetAddress: string;
  assetSenderBalance: Nullable<CodecString>;
  assetRecipientBalance: Nullable<CodecString>;
  assetLockedBalance: Nullable<FPNumber>;
  assetExternalMinBalance: CodecString;
  incomingMinLimit: FPNumber;
  outgoingMinLimit: Nullable<FPNumber>;
  blockUpdatesSubscription: Nullable<Subscription>;
  amountSend: string;
  amountReceived: string;
  focusedField: Nullable<FocusedField>;
  soraNetworkFee: CodecString;
  externalTransferFee: CodecString;
  externalNetworkFee: CodecString;
  balancesFetching: boolean;
  feesAndLockedFundsFetching: boolean;
  externalNativeBalance: CodecString;
  externalBlockNumber: number;
  historyInternal: Record<string, IBridgeTransaction>;
  historyPage: number;
  historyId: string;
  historyLoading: Partial<Record<BridgeNetworkId, boolean>>;
  waitingForApprove: Record<string, boolean>;
  inProgressIds: Record<string, boolean>;
  notificationData: Nullable<IBridgeTransaction>;
  subBridgeConnector: SubNetworksConnector;
  isSignTxDialogVisible: boolean;
};
