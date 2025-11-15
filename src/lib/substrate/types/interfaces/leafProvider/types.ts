// Auto-generated via `yarn polkadot-types-from-defs`, do not edit

import type { Enum, Struct, U256, Vec } from '@polkadot/types-codec';
import type { ITuple } from '@polkadot/types-codec/types';
import type { H256 } from '@sora-substrate/types/interfaces/runtime';

/** @name AuxiliaryDigest */
export interface AuxiliaryDigest extends Struct {
  readonly logs: Vec<AuxiliaryDigestItem>;
}

/** @name AuxiliaryDigestItem */
export interface AuxiliaryDigestItem extends Enum {
  readonly isCommitment: boolean;
  readonly asCommitment: ITuple<[EthNetworkId, ChannelId, H256]>;
  readonly type: 'Commitment';
}

/** @name ChannelId */
export interface ChannelId extends Enum {
  readonly isBasic: boolean;
  readonly isIncentivized: boolean;
  readonly type: 'Basic' | 'Incentivized';
}

/** @name EthNetworkId */
export interface EthNetworkId extends U256 {}

export type PHANTOM_LEAFPROVIDER = 'leafProvider';
