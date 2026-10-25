import type { CodecString } from '@sora-substrate/math';

import type { Operation, History } from '../../types';
import type { BridgeTxStatus, BridgeNetworkType } from '../consts';
import type { EvmNetworkId, EvmAppKinds } from './consts';

export type EvmNetwork = EvmNetworkId | number;

export interface EvmHistory extends History {
  type: Operation.EvmIncoming | Operation.EvmOutgoing;
  hash?: string;
  transactionState?: BridgeTxStatus;
  externalBlockId?: string;
  externalBlockHeight?: number;
  externalHash?: string;
  externalNetwork?: EvmNetwork;
  externalNetworkType?: BridgeNetworkType;
  externalNetworkFee?: CodecString;
}

export type EvmAsset = {
  address: string;
  appKind: EvmAppKinds;
  decimals: number;
};

/**
 * Mapping between app kind and smart contract address
 */
export type EvmSupportedApp = Record<EvmAppKinds, string>;
