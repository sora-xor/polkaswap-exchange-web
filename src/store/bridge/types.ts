import type { CodecString, IBridgeTransaction } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

export type BridgeState = {
  isSoraToEvm: boolean;
  assetAddress: string;
  assetBalance: Nullable<AccountBalance>;
  amount: string;
  evmNetworkFee: CodecString;
  evmNetworkFeeFetching: boolean;
  evmBlockNumber: number;
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
