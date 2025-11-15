// Auto-generated via `yarn polkadot-types-from-defs`, do not edit

import type { Struct, Text } from '@polkadot/types-codec';

/** @name CrowdloanLease */
export interface CrowdloanLease extends Struct {
  readonly startBlock: Text;
  readonly totalDays: Text;
  readonly blocksPerDay: Text;
}

export type PHANTOM_VESTEDREWARDS = 'vestedRewards';
