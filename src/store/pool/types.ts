import type { AccountLockedPool } from '@sora-substrate/sdk/build/ceresLiquidityLocker/types';
import type { AccountLiquidity } from '@sora-substrate/sdk/build/poolXyk/types';
import type { PoolApyObject } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';
import type { Subscription } from 'rxjs';

export type PoolState = {
  accountLiquidity: readonly AccountLiquidity[];
  accountLiquidityList: Nullable<Subscription>;
  accountLiquidityUpdates: Nullable<Subscription>;
  poolApyObject: PoolApyObject;
  poolApySubscription: Nullable<VoidFunction>;
  accountLockedLiquidity: readonly AccountLockedPool[];
  accountLockedLiquiditySubscription: Nullable<Subscription>;
};

export type LiquidityParams = {
  firstAddress: string;
  secondAddress: string;
};
