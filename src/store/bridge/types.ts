import type { BridgeHistory, CodecString } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

export type BridgeState = {
  isSoraToEvm: boolean;
  assetAddress: string;
  assetBalance: Nullable<AccountBalance>;
  amount: string;
  evmNetworkFee: CodecString;
  evmNetworkFeeFetching: boolean;
  evmBlockNumber: number;
  history: Array<BridgeHistory>;
  historyPage: number;
  historyId: string;
  historyLoading: boolean;
  waitingForApprove: Record<string, boolean>;
  inProgressIds: Record<string, boolean>;
  notificationData: Nullable<BridgeHistory>;
};

export type SignTxResult = {
  hash: string;
  fee: Nullable<CodecString>;
};
