import type { CodecString } from '@sora-substrate/math';

import type { Operation, History } from '../../types';
import type { BridgeTxStatus, BridgeNetworkType } from '../consts';
import type {
  SubAssetKind,
  SubEvmNetworks,
  SoraParachains,
  PolkadotParachains,
  KusamaParachains,
  AlphanetParachains,
  RococoParachains,
  Relaychains,
  Parachains,
  Standalones,
  LiberlandAssetType,
} from './consts';

export type LiberlandAssetId = { [LiberlandAssetType.Asset]: number } | LiberlandAssetType.LLD;

export type SubAssetId = LiberlandAssetId | undefined | null;

export type SubAsset = {
  address?: SubAssetId;
  assetKind: SubAssetKind;
  decimals: number;
};

export type SubEvmNetwork = (typeof SubEvmNetworks)[number];

export type Standalone = (typeof Standalones)[number];

export type Relaychain = (typeof Relaychains)[number];

export type SoraParachain = (typeof SoraParachains)[number];

export type PolkadotParachain = (typeof PolkadotParachains)[number];

export type KusamaParachain = (typeof KusamaParachains)[number];

export type AlphanetParachain = (typeof AlphanetParachains)[number];

export type RococoParachain = (typeof RococoParachains)[number];

export type Parachain = (typeof Parachains)[number];
/** Used in frontend app */
export type SubNetwork = Relaychain | Parachain | Standalone;

/** Defined on SORA blockchain enum */
export type SubNetworkChainId = Exclude<SubNetwork, Parachain>;

export type ParachainIds = Partial<{
  [key in Parachain]: number;
}>;

/**
 * Network definitions:
 * 1) "external" - Any Substrate network as the starting (SubstrateIncoming) or ending (SubstrateOutgoing) point for transfer
 * 2) "parachain" - SORA parachain network as an intermediate point for transfer
 * 3) "relaychain" - Relaychain network as an intermediate point for transfer
 * 4) "internal" - SORA network
 *
 * Examples:
 * 1) `AlphanetMoonbase` ("external") <-> `Alphanet` ("relaychain") <-> `AlphanetSora` ("parachain") <-> `SORA` ("internal")
 * 2) `Kusama` ("external") <-> `KusamaSora` ("parachain") <-> `SORA` ("internal")
 * 3) `KusamaSora` ("external") <-> `SORA` ("internal")
 */
export interface SubHistory extends History {
  type: Operation.SubstrateIncoming | Operation.SubstrateOutgoing;
  /** SORA network bridge transaction hash */
  hash?: string;
  transactionState?: BridgeTxStatus;
  /** SORA parachain block hash */
  parachainBlockId?: string;
  /** SORA parachain block number */
  parachainBlockHeight?: number;
  /** SORA parachain transaction hash */
  parachainHash?: string;
  /** SORA parachain transfer event index */
  parachainEventIndex?: number;
  /** Relaychain block hash */
  relaychainBlockId?: string;
  /** Relaychain block number */
  relaychainBlockHeight?: number;
  /** Relaychain transaction hash */
  relaychainHash?: string;
  /** Relaychain transfer event index */
  relaychainEventIndex?: number;
  /** External network block hash */
  externalBlockId?: string;
  /** External network block number */
  externalBlockHeight?: number;
  /** External network transaction hash */
  externalHash?: string;
  /** External network transfer event index */
  externalEventIndex?: number;
  /** External network XCM message fee */
  externalTransferFee?: CodecString;
  externalNetwork?: SubNetwork;
  externalNetworkType?: BridgeNetworkType;
  externalNetworkFee?: CodecString;
}
