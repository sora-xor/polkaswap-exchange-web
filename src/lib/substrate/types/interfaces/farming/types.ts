// Auto-generated via `yarn polkadot-types-from-defs`, do not edit

import type { Struct } from '@polkadot/types-codec';
import type { AccountId, Balance, BlockNumber } from '@sora-substrate/types/interfaces/runtime';

/** @name PoolFarmer */
export interface PoolFarmer extends Struct {
  readonly account: AccountId;
  readonly block: BlockNumber;
  readonly weight: Balance;
}

export type PHANTOM_FARMING = 'farming';
