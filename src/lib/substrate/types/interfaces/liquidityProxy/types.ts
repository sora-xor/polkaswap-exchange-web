// Auto-generated via `yarn polkadot-types-from-defs`, do not edit

import type { BTreeMap, Struct, Vec } from '@polkadot/types-codec';
import type {
  AssetId,
  Balance,
  DEXId,
  LiquiditySourceType,
  RewardReason,
} from '@sora-substrate/types/interfaces/runtime';

/** @name LiquiditySourceIdOf */
export interface LiquiditySourceIdOf extends Struct {
  readonly dexId: DEXId;
  readonly liquiditySourceIndex: LiquiditySourceType;
}

/** @name LPRewardsInfo */
export interface LPRewardsInfo extends Struct {
  readonly amount: Balance;
  readonly currency: AssetId;
  readonly reason: RewardReason;
}

/** @name LPSwapOutcomeInfo */
export interface LPSwapOutcomeInfo extends Struct {
  readonly amount: Balance;
  readonly amountWithoutImpact: Balance;
  readonly fee: OutcomeFee;
  readonly rewards: Vec<LPRewardsInfo>;
  readonly route: Vec<AssetId>;
}

/** @name OutcomeFee */
export interface OutcomeFee extends BTreeMap<AssetId, Balance> {}

export type PHANTOM_LIQUIDITYPROXY = 'liquidityProxy';
