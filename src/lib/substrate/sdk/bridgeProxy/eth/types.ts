import type { CodecString } from '@sora-substrate/math';

import type { Operation, History } from '../../types';
import type { BridgeNetworkType, BridgeTxDirection, BridgeTxStatus } from '../consts';
import type { EthAssetKind, EthCurrencyType, EthRequestType } from './consts';

export interface EthHistory extends History {
  type: Operation.EthBridgeIncoming | Operation.EthBridgeOutgoing;
  hash?: string;
  transactionState?: string;
  externalBlockId?: string;
  externalBlockHeight?: number;
  externalHash?: string;
  externalNetworkFee?: CodecString;
  externalNetwork?: number;
  externalNetworkType?: BridgeNetworkType;
}

export type EthAsset = {
  address: string;
  decimals: number | undefined;
  assetKind: EthAssetKind;
};

/** Outgoing transfers */
export type EthApprovedRequest = {
  currencyType: EthCurrencyType;
  /** [DEPRECATED] Amount is not used and will be removed */
  amount: CodecString;
  from: string;
  to: string;
  hash: string;
  r: Array<string>;
  s: Array<string>;
  v: Array<number>;
};

export type EthRequest = {
  direction: BridgeTxDirection;
  from?: string;
  to?: string;
  soraAssetAddress?: string;
  status: BridgeTxStatus;
  hash: string;
  amount?: string;
  kind?: EthRequestType | any; // For incoming TXs TODO: check type
};
