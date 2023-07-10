import type { CodecString, IBridgeTransaction } from '@sora-substrate/util';
import type { Subscription } from 'rxjs';

export type BridgeState = {
  isSoraToEvm: boolean;
  assetAddress: string;
  assetSenderBalance: CodecString;
  assetRecipientBalance: CodecString;
  assetLockedBalance: Nullable<CodecString>;
  assetLockedBalanceFetching: boolean;
  amount: string;
  externalNetworkFee: CodecString;
  externalNetworkFeeFetching: boolean;
  externalNativeBalance: CodecString;
  externalBalancesFetching: boolean;
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
