import type { CodecString, IBridgeTransaction } from '@sora-substrate/util';
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
  assetLockedBalance: Nullable<CodecString>;
  assetTransferLimited: boolean;
  assetTransferLimit: Nullable<CodecString>;
  outgoingLimitUSD: Nullable<CodecString>;
  outgoingLimitUSDSubscription: Nullable<Subscription>;
  amountSend: string;
  amountReceived: string;
  focusedField: Nullable<FocusedField>;
  externalTransferFee: CodecString;
  externalNetworkFee: CodecString;
  balancesAndFeesFetching: boolean;
  externalNativeBalance: Nullable<CodecString>;
  externalBlockNumber: number;
  // history sources (unsynced localstorage & network)
  historyInternal: Record<string, IBridgeTransaction>;
  historyExternal: Record<string, IBridgeTransaction>;
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
