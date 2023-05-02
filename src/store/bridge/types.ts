import type { Subscription } from 'rxjs';
import type { CodecString } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';
import type { EvmHistory } from '@sora-substrate/util/build/evm/types';

export type BridgeState = {
  isSoraToEvm: boolean;
  assetAddress: string;
  assetBalance: Nullable<AccountBalance>;
  amount: string;
  evmNetworkFee: CodecString;
  evmNetworkFeeFetching: boolean;
  evmBlockNumber: number;
  // history sources (unsynced localstorage & network)
  historyInternal: Record<string, EvmHistory>;
  historyExternal: Record<string, EvmHistory>;
  historyPage: number;
  historyId: string;
  historyLoading: boolean;
  historyDataSubscription: Nullable<Subscription>;
  waitingForApprove: Record<string, boolean>;
  inProgressIds: Record<string, boolean>;
  notificationData: Nullable<EvmHistory>;
};

export type SignTxResult = {
  hash: string;
  fee: Nullable<CodecString>;
};
