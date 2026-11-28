// Auto-generated via `yarn polkadot-types-from-defs`, do not edit

import type { Struct } from '@polkadot/types-codec';
import type { Balance } from '@/lib/substrate/types/interfaces/runtime';

/** @name StakingInfo */
export interface StakingInfo extends Struct {
  readonly deposited: Balance;
  readonly rewards: Balance;
}

export type PHANTOM_CERESSTAKING = 'ceresStaking';
