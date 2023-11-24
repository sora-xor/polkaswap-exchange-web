import type { FPNumber, CodecString, IBridgeTransaction } from '@sora-substrate/util';
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
  incomingMinLimit: FPNumber;
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
  externalNativeBalance: Nullable<CodecString>;
  externalBlockNumber: number;
  historyInternal: Record<string, IBridgeTransaction>;
  historyPage: number;
  historyId: string;
  historyLoading: boolean;
  waitingForApprove: Record<string, boolean>;
  inProgressIds: Record<string, boolean>;
  notificationData: Nullable<IBridgeTransaction>;
};

export type SignTxResult = {
  hash: string;
  fee: Nullable<CodecString>;
};
