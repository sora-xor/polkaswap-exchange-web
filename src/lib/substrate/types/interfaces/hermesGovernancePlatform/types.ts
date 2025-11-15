// Auto-generated via `yarn polkadot-types-from-defs`, do not edit

import type { Enum, Struct, Text, bool } from '@polkadot/types-codec';
import type { AccountId, Balance, Moment } from '@sora-substrate/types/interfaces/runtime';

/** @name HermesPollInfo */
export interface HermesPollInfo extends Struct {
  readonly creator: AccountId;
  readonly hermesLocked: Balance;
  readonly pollStartTimestamp: Moment;
  readonly pollEndTimestamp: Moment;
  readonly title: Text;
  readonly description: Text;
  readonly creatorHermesWithdrawn: bool;
}

/** @name HermesVotingInfo */
export interface HermesVotingInfo extends Struct {
  readonly votingOption: VotingOption;
  readonly numberOfHermes: Balance;
  readonly hermesWithdrawn: bool;
}

/** @name VotingOption */
export interface VotingOption extends Enum {
  readonly isYes: boolean;
  readonly isNo: boolean;
  readonly type: 'Yes' | 'No';
}

export type PHANTOM_HERMESGOVERNANCEPLATFORM = 'hermesGovernancePlatform';
