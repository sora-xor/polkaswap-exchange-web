import type { FPNumber, CodecString, IBridgeTransaction } from '@sora-substrate/util';
import type { BridgeNetworkId } from '@sora-substrate/util/build/bridgeProxy/types';
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
  outgoingMaxLimit: Nullable<FPNumber>;
  outgoingMaxLimitSubscription: Nullable<Subscription>;
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
};

export type SignTxResult = {
  hash: string;
  fee: Nullable<CodecString>;
};
