import type { Subscription } from 'rxjs';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';
import type { PoolApyObject } from '@soramitsu/soraneo-wallet-web/lib/services/subquery/types';

export type PoolState = {
  accountLiquidity: readonly AccountLiquidity[];
  accountLiquidityList: Nullable<Subscription>;
  accountLiquidityUpdates: Nullable<Subscription>;
  poolApyObject: PoolApyObject;
};

export type LiquidityParams = {
  firstAddress: string;
  secondAddress: string;
};
