// Auto-generated via `yarn polkadot-types-from-defs`, do not edit

import type { Enum, Option, Struct, u32, u8 } from '@polkadot/types-codec';
import type { ITuple } from '@polkadot/types-codec/types';
import type { H160, H256 } from '@sora-substrate/types/interfaces/runtime';

/** @name BridgeAppInfo */
export interface BridgeAppInfo extends Enum {
  readonly isEvm: boolean;
  readonly asEvm: ITuple<[GenericNetworkId, EVMAppInfo]>;
  readonly isSub: boolean;
  readonly asSub: GenericNetworkId;
  readonly type: 'Evm' | 'Sub';
}

/** @name BridgeAssetInfo */
export interface BridgeAssetInfo extends Enum {
  readonly isEvmLegacy: boolean;
  readonly asEvmLegacy: EVMLegacyAssetInfo;
  readonly isEvm: boolean;
  readonly asEvm: EVMAssetInfo;
  readonly isSub: boolean;
  readonly asSub: SubAssetInfo;
  readonly type: 'EvmLegacy' | 'Evm' | 'Sub';
}

/** @name EVMAppInfo */
export interface EVMAppInfo extends Struct {
  readonly evmAddress: H160;
  readonly appKind: EVMAppKind;
}

/** @name EVMAppKind */
export interface EVMAppKind extends Enum {
  readonly isEthApp: boolean;
  readonly isFaApp: boolean;
  readonly isHashiBridge: boolean;
  readonly isXorMaster: boolean;
  readonly isValMaster: boolean;
  readonly type: 'EthApp' | 'FaApp' | 'HashiBridge' | 'XorMaster' | 'ValMaster';
}

/** @name EVMAssetInfo */
export interface EVMAssetInfo extends Struct {
  readonly assetId: MainnetAssetId;
  readonly evmAddress: H160;
  readonly appKind: EVMAppKind;
  readonly precision: u8;
}

/** @name EVMChainId */
export interface EVMChainId extends H256 {}

/** @name EVMLegacyAssetInfo */
export interface EVMLegacyAssetInfo extends Struct {
  readonly assetId: MainnetAssetId;
  readonly evmAddress: H160;
  readonly appKind: EVMAppKind;
  readonly precision: Option<u8>;
}

/** @name GenericNetworkId */
export interface GenericNetworkId extends Enum {
  readonly isEvmLegacy: boolean;
  readonly asEvmLegacy: u32;
  readonly isEvm: boolean;
  readonly asEvm: EVMChainId;
  readonly isSub: boolean;
  readonly asSub: SubNetworkId;
  readonly type: 'EvmLegacy' | 'Evm' | 'Sub';
}

/** @name MainnetAssetId */
export interface MainnetAssetId extends H256 {}

/** @name SubAssetInfo */
export interface SubAssetInfo extends Struct {
  readonly assetId: MainnetAssetId;
  readonly assetKind: SubAssetKind;
  readonly precision: u8;
}

/** @name SubAssetKind */
export interface SubAssetKind extends Enum {
  readonly isThischain: boolean;
  readonly isSidechain: boolean;
  readonly type: 'Thischain' | 'Sidechain';
}

/** @name SubNetworkId */
export interface SubNetworkId extends Enum {
  readonly isMainnet: boolean;
  readonly isKusama: boolean;
  readonly isPolkadot: boolean;
  readonly isRococo: boolean;
  readonly isLiberland: boolean;
  readonly isAlphanet: boolean;
  readonly isCustom: boolean;
  readonly asCustom: u32;
  readonly type: 'Mainnet' | 'Kusama' | 'Polkadot' | 'Rococo' | 'Liberland' | 'Alphanet' | 'Custom';
}

export type PHANTOM_BRIDGEPROXY = 'bridgeProxy';
