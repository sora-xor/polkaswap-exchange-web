// Auto-generated via `yarn polkadot-types-from-defs`, do not edit

import type { Struct, bool, u32 } from '@polkadot/types-codec';
import type { AccountId, AssetId, Balance } from '@sora-substrate/types/interfaces/runtime';

/** @name PoolData */
export interface PoolData extends Struct {
  readonly multiplier: u32;
  readonly depositFee: Balance;
  readonly isCore: bool;
  readonly isFarm: bool;
  readonly totalTokensInPool: Balance;
  readonly rewards: Balance;
  readonly rewardsToBeDistributed: Balance;
  readonly isRemoved: bool;
  readonly baseAsset: AssetId;
}

/** @name TokenInfo */
export interface TokenInfo extends Struct {
  readonly farmsTotalMultiplier: u32;
  readonly stakingTotalMultiplier: u32;
  readonly tokenPerBlock: Balance;
  readonly farmsAllocation: Balance;
  readonly stakingAllocation: Balance;
  readonly teamAllocation: Balance;
  readonly teamAccount: AccountId;
}

/** @name UserInfo */
export interface UserInfo extends Struct {
  readonly poolAsset: AssetId;
  readonly rewardAsset: AssetId;
  readonly isFarm: bool;
  readonly pooledTokens: Balance;
  readonly rewards: Balance;
  readonly baseAsset: AssetId;
}

export type PHANTOM_DEMETERFARMINGPLATFORM = 'demeterFarmingPlatform';
