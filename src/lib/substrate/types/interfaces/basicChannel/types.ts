// Auto-generated via `yarn polkadot-types-from-defs`, do not edit

import type { Bytes, Struct, u64 } from '@polkadot/types-codec';
import type { EthNetworkId } from '@sora-substrate/types/interfaces/leafProvider';
import type { H160 } from '@sora-substrate/types/interfaces/runtime';

/** @name BasicChannelMessage */
export interface BasicChannelMessage extends Struct {
  readonly networkId: EthNetworkId;
  readonly target: H160;
  readonly nonce: u64;
  readonly payload: Bytes;
}

export type PHANTOM_BASICCHANNEL = 'basicChannel';
