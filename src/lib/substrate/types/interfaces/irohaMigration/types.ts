// Auto-generated via `yarn polkadot-types-from-defs`, do not edit

import type { Option, Struct, Vec } from '@polkadot/types-codec';
import type { AccountId, BlockNumber } from '@sora-substrate/types/interfaces/runtime';

/** @name PendingMultisigAccount */
export interface PendingMultisigAccount extends Struct {
  readonly approvingAccounts: Vec<AccountId>;
  readonly migrateAt: Option<BlockNumber>;
}

export type PHANTOM_IROHAMIGRATION = 'irohaMigration';
