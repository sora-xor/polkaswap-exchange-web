// Auto-generated via `yarn polkadot-types-from-defs`, do not edit

import type { Bytes, Struct, U256, u64 } from '@polkadot/types-codec';
import type { EthNetworkId } from '@sora-substrate/types/interfaces/leafProvider';
import type { H160 } from '@sora-substrate/types/interfaces/runtime';

/** @name IntentivizedChannelMessage */
export interface IntentivizedChannelMessage extends Struct {
  readonly networkId: EthNetworkId;
  readonly target: H160;
  readonly nonce: u64;
  readonly fee: U256;
  readonly payload: Bytes;
}

export type PHANTOM_INTENTIVIZEDCHANNEL = 'intentivizedChannel';
