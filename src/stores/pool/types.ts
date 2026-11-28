import type { CodecString } from '@/lib/substrate/sdk';
import type { AccountBalance } from '@/lib/substrate/sdk/assets/types';
import type { AccountLockedPool } from '@/lib/substrate/sdk/ceresLiquidityLocker/types';
import type { AccountLiquidity } from '@/lib/substrate/sdk/poolXyk/types';
import type { PoolApyObject } from '@/lib/soraneo-wallet/src/services/indexer/types';
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

export enum AddLiquidityFocusedField {
  First = 'firstTokenValue',
  Second = 'secondTokenValue',
}

export type AddLiquidityState = {
  firstTokenAddress: string;
  secondTokenAddress: string;
  firstTokenValue: string;
  secondTokenValue: string;
  firstTokenBalance: Nullable<AccountBalance>;
  secondTokenBalance: Nullable<AccountBalance>;
  reserve: Nullable<Array<CodecString>>;
  reserveSubscription: Nullable<Subscription>;
  minted: CodecString;
  totalSupply: CodecString;
  totalSupplySubscription: Nullable<Subscription>;
  focusedField: Nullable<AddLiquidityFocusedField>;
  isAvailable: boolean;
  availabilitySubscription: Nullable<Subscription>;
};

export enum RemoveLiquidityFocusedField {
  First = 'firstTokenAmount',
  Second = 'secondTokenAmount',
  Percent = 'removePart',
}

export type RemoveLiquidityState = {
  firstTokenAddress: string;
  secondTokenAddress: string;
  removePart: string;
  liquidityAmount: string;
  firstTokenAmount: string;
  secondTokenAmount: string;
  focusedField: Nullable<RemoveLiquidityFocusedField>;
};
