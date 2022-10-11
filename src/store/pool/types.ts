import type { Subscription } from 'rxjs';
import type { AccountLiquidity } from '@sora-substrate/util/build/poolXyk/types';

export type PoolState = {
  accountLiquidity: Array<AccountLiquidity>;
  accountLiquidityList: Nullable<Subscription>;
  accountLiquidityUpdates: Nullable<Subscription>;
};

export type LiquidityParams = {
  firstAddress: string;
  secondAddress: string;
};
