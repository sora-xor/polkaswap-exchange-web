// Auto-generated via `yarn polkadot-types-from-defs`, do not edit

import type { Struct } from '@polkadot/types-codec';
import type { AssetId, Balance, Moment } from '@sora-substrate/types/interfaces/runtime';

/** @name TokenLockInfo */
export interface TokenLockInfo extends Struct {
  readonly tokens: Balance;
  readonly unlockingTimestamp: Moment;
  readonly assetId: AssetId;
}

export type PHANTOM_CERESTOKENLOCKER = 'ceresTokenLocker';
