import type { CodecString, IBridgeTransaction } from '@sora-substrate/util';

export type BridgeState = {
  isSoraToEvm: boolean;
  assetAddress: string;
  assetSenderBalance: CodecString;
  assetRecipientBalance: CodecString;
  amount: string;
  evmNetworkFee: CodecString;
  evmNetworkFeeFetching: boolean;
  externalBalance: CodecString;
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
