// Auto-generated via `yarn polkadot-types-from-defs`, do not edit

import type { Bytes, Enum, Struct, Text, U256, U8aFixed, Vec, bool, u32, u64, u8 } from '@polkadot/types-codec';
import type { ITuple } from '@polkadot/types-codec/types';
import type {
  AccountId,
  AssetId,
  AssetName,
  AssetSymbol,
  Balance,
  BalancePrecision,
  BlockNumber,
  H160,
  H256,
  Index,
} from '@sora-substrate/types/interfaces/runtime';

/** @name AssetKind */
export interface AssetKind extends Enum {
  readonly isThischain: boolean;
  readonly isSidechain: boolean;
  readonly isSidechainOwned: boolean;
  readonly type: 'Thischain' | 'Sidechain' | 'SidechainOwned';
}

/** @name BridgeNetworkId */
export interface BridgeNetworkId extends u32 {}

/** @name BridgeSignatureVersion */
export interface BridgeSignatureVersion extends Enum {
  readonly isV1: boolean;
  readonly isV2: boolean;
  readonly isV3: boolean;
  readonly type: 'V1' | 'V2' | 'V3';
}

/** @name BridgeStatus */
export interface BridgeStatus extends Enum {
  readonly isInitialized: boolean;
  readonly isMigrating: boolean;
  readonly type: 'Initialized' | 'Migrating';
}

/** @name BridgeTimepoint */
export interface BridgeTimepoint extends Struct {
  readonly height: MultiChainHeight;
  readonly index: u32;
}

/** @name ChangePeersContract */
export interface ChangePeersContract extends Enum {
  readonly isXor: boolean;
  readonly isVal: boolean;
  readonly type: 'Xor' | 'Val';
}

/** @name CurrencyIdEncoded */
export interface CurrencyIdEncoded extends Enum {
  readonly isAssetId: boolean;
  readonly asAssetId: H256;
  readonly isTokenAddress: boolean;
  readonly asTokenAddress: H160;
  readonly type: 'AssetId' | 'TokenAddress';
}

/** @name EthAddress */
export interface EthAddress extends H160 {}

/** @name EthBridgeStorageVersion */
export interface EthBridgeStorageVersion extends Enum {
  readonly isV1: boolean;
  readonly isV2RemovePendingTransfers: boolean;
  readonly type: 'V1' | 'V2RemovePendingTransfers';
}

/** @name EthPeersSync */
export interface EthPeersSync extends Struct {
  readonly isBridgeReady: bool;
  readonly isXorReady: bool;
  readonly isValReady: bool;
}

/** @name FixedBytes */
export interface FixedBytes extends Bytes {}

/** @name IncomingAddToken */
export interface IncomingAddToken extends Struct {
  readonly tokenAddress: EthAddress;
  readonly assetId: AssetId;
  readonly precision: BalancePrecision;
  readonly symbol: AssetSymbol;
  readonly name: AssetName;
  readonly author: AccountId;
  readonly txHash: H256;
  readonly atHeight: u64;
  readonly timepoint: BridgeTimepoint;
  readonly networkId: BridgeNetworkId;
}

/** @name IncomingCancelOutgoingRequest */
export interface IncomingCancelOutgoingRequest extends Struct {
  readonly outgoingRequest: OutgoingRequest;
  readonly outgoingRequestHash: H256;
  readonly initialRequestHash: H256;
  readonly txInput: Bytes;
  readonly author: AccountId;
  readonly txHash: H256;
  readonly atHeight: u64;
  readonly timepoint: BridgeTimepoint;
  readonly networkId: BridgeNetworkId;
}

/** @name IncomingChangePeers */
export interface IncomingChangePeers extends Struct {
  readonly peerAccountId: AccountId;
  readonly peerAddress: EthAddress;
  readonly added: bool;
  readonly author: AccountId;
  readonly txHash: H256;
  readonly atHeight: u64;
  readonly timepoint: BridgeTimepoint;
  readonly networkId: BridgeNetworkId;
}

/** @name IncomingChangePeersCompat */
export interface IncomingChangePeersCompat extends Struct {
  readonly peerAccountId: AccountId;
  readonly peerAddress: EthAddress;
  readonly added: bool;
  readonly contract: ChangePeersContract;
  readonly author: AccountId;
  readonly txHash: H256;
  readonly atHeight: u64;
  readonly timepoint: BridgeTimepoint;
  readonly networkId: BridgeNetworkId;
}

/** @name IncomingMarkAsDoneRequest */
export interface IncomingMarkAsDoneRequest extends Struct {
  readonly outgoingRequestHash: H256;
  readonly initialRequestHash: H256;
  readonly author: AccountId;
  readonly atHeight: u64;
  readonly timepoint: BridgeTimepoint;
  readonly networkId: BridgeNetworkId;
}

/** @name IncomingMetaRequestKind */
export interface IncomingMetaRequestKind extends Enum {
  readonly isCancelOutgoingRequest: boolean;
  readonly isMarkAsDone: boolean;
  readonly type: 'CancelOutgoingRequest' | 'MarkAsDone';
}

/** @name IncomingMigrate */
export interface IncomingMigrate extends Struct {
  readonly newContractAddress: EthAddress;
  readonly author: AccountId;
  readonly txHash: H256;
  readonly atHeight: u64;
  readonly timepoint: BridgeTimepoint;
  readonly networkId: BridgeNetworkId;
}

/** @name IncomingPrepareForMigration */
export interface IncomingPrepareForMigration extends Struct {
  readonly author: AccountId;
  readonly txHash: H256;
  readonly atHeight: u64;
  readonly timepoint: BridgeTimepoint;
  readonly networkId: BridgeNetworkId;
}

/** @name IncomingRequest */
export interface IncomingRequest extends Enum {
  readonly isTransfer: boolean;
  readonly asTransfer: IncomingTransfer;
  readonly isAddToken: boolean;
  readonly asAddToken: IncomingAddToken;
  readonly isChangePeers: boolean;
  readonly asChangePeers: IncomingChangePeers;
  readonly isCancelOutgoingRequest: boolean;
  readonly asCancelOutgoingRequest: IncomingCancelOutgoingRequest;
  readonly isMarkAsDone: boolean;
  readonly asMarkAsDone: IncomingMarkAsDoneRequest;
  readonly isPrepareForMigration: boolean;
  readonly asPrepareForMigration: IncomingPrepareForMigration;
  readonly isMigrate: boolean;
  readonly asMigrate: IncomingMigrate;
  readonly type:
    | 'Transfer'
    | 'AddToken'
    | 'ChangePeers'
    | 'CancelOutgoingRequest'
    | 'MarkAsDone'
    | 'PrepareForMigration'
    | 'Migrate';
}

/** @name IncomingRequestKind */
export interface IncomingRequestKind extends Enum {
  readonly isTransaction: boolean;
  readonly asTransaction: IncomingTransactionRequestKind;
  readonly isMeta: boolean;
  readonly asMeta: IncomingMetaRequestKind;
  readonly type: 'Transaction' | 'Meta';
}

/** @name IncomingTransactionRequestKind */
export interface IncomingTransactionRequestKind extends Enum {
  readonly isTransfer: boolean;
  readonly isAddAsset: boolean;
  readonly isAddPeer: boolean;
  readonly isRemovePeer: boolean;
  readonly isPrepareForMigration: boolean;
  readonly isMigrate: boolean;
  readonly isAddPeerCompat: boolean;
  readonly isRemovePeerCompat: boolean;
  readonly isTransferXOR: boolean;
  readonly type:
    | 'Transfer'
    | 'AddAsset'
    | 'AddPeer'
    | 'RemovePeer'
    | 'PrepareForMigration'
    | 'Migrate'
    | 'AddPeerCompat'
    | 'RemovePeerCompat'
    | 'TransferXOR';
}

/** @name IncomingTransfer */
export interface IncomingTransfer extends Struct {
  readonly from: EthAddress;
  readonly to: AccountId;
  readonly assetId: AssetId;
  readonly assetKind: AssetKind;
  readonly amount: Balance;
  readonly author: AccountId;
  readonly txHash: H256;
  readonly atHeight: u64;
  readonly timepoint: BridgeTimepoint;
  readonly networkId: BridgeNetworkId;
}

/** @name LoadIncomingMetaRequest */
export interface LoadIncomingMetaRequest extends Struct {
  readonly author: AccountId;
  readonly hash: H256;
  readonly timepoint: BridgeTimepoint;
  readonly kind: IncomingMetaRequestKind;
  readonly networkId: BridgeNetworkId;
}

/** @name LoadIncomingRequest */
export interface LoadIncomingRequest extends Enum {
  readonly isTransaction: boolean;
  readonly asTransaction: LoadIncomingTransactionRequest;
  readonly isMeta: boolean;
  readonly asMeta: ITuple<[LoadIncomingMetaRequest, H256]>;
  readonly type: 'Transaction' | 'Meta';
}

/** @name LoadIncomingTransactionRequest */
export interface LoadIncomingTransactionRequest extends Struct {
  readonly author: AccountId;
  readonly hash: H256;
  readonly timepoint: BridgeTimepoint;
  readonly kind: IncomingTransactionRequestKind;
  readonly networkId: BridgeNetworkId;
}

/** @name MultiChainHeight */
export interface MultiChainHeight extends Enum {
  readonly isThischain: boolean;
  readonly asThischain: BlockNumber;
  readonly isSidechain: boolean;
  readonly asSidechain: u64;
  readonly type: 'Thischain' | 'Sidechain';
}

/** @name OffchainRequest */
export interface OffchainRequest extends Enum {
  readonly isOutgoing: boolean;
  readonly asOutgoing: ITuple<[OutgoingRequest, H256]>;
  readonly isLoadIncoming: boolean;
  readonly asLoadIncoming: LoadIncomingRequest;
  readonly isIncoming: boolean;
  readonly asIncoming: ITuple<[IncomingRequest, H256]>;
  readonly type: 'Outgoing' | 'LoadIncoming' | 'Incoming';
}

/** @name OutgoingAddAsset */
export interface OutgoingAddAsset extends Struct {
  readonly author: AccountId;
  readonly assetId: AssetId;
  readonly supply: Balance;
  readonly nonce: Index;
  readonly networkId: BridgeNetworkId;
  readonly timepoint: BridgeTimepoint;
}

/** @name OutgoingAddAssetEncoded */
export interface OutgoingAddAssetEncoded extends Struct {
  readonly name: Text;
  readonly symbol: Text;
  readonly decimal: u8;
  readonly supply: U256;
  readonly sidechainAssetId: FixedBytes;
  readonly hash: H256;
  readonly networkId: H256;
  readonly raw: Bytes;
}

/** @name OutgoingAddPeer */
export interface OutgoingAddPeer extends Struct {
  readonly author: AccountId;
  readonly peerAddress: EthAddress;
  readonly peerAccountId: AccountId;
  readonly nonce: Index;
  readonly networkId: BridgeNetworkId;
  readonly timepoint: BridgeTimepoint;
}

/** @name OutgoingAddPeerCompat */
export interface OutgoingAddPeerCompat extends Struct {
  readonly author: AccountId;
  readonly peerAddress: EthAddress;
  readonly peerAccountId: AccountId;
  readonly nonce: Index;
  readonly networkId: BridgeNetworkId;
  readonly timepoint: BridgeTimepoint;
}

/** @name OutgoingAddPeerEncoded */
export interface OutgoingAddPeerEncoded extends Struct {
  readonly peerAddress: EthAddress;
  readonly txHash: H256;
  readonly networkId: H256;
  readonly raw: Bytes;
}

/** @name OutgoingAddToken */
export interface OutgoingAddToken extends Struct {
  readonly author: AccountId;
  readonly tokenAddress: EthAddress;
  readonly ticker: Text;
  readonly name: Text;
  readonly decimals: u8;
  readonly nonce: Index;
  readonly networkId: BridgeNetworkId;
  readonly timepoint: BridgeTimepoint;
}

/** @name OutgoingAddTokenEncoded */
export interface OutgoingAddTokenEncoded extends Struct {
  readonly tokenAddress: EthAddress;
  readonly ticker: Text;
  readonly name: Text;
  readonly decimals: u8;
  readonly hash: H256;
  readonly networkId: H256;
  readonly raw: Bytes;
}

/** @name OutgoingMigrate */
export interface OutgoingMigrate extends Struct {
  readonly author: AccountId;
  readonly newContractAddress: EthAddress;
  readonly erc20NativeTokens: Vec<EthAddress>;
  readonly nonce: Index;
  readonly networkId: BridgeNetworkId;
  readonly timepoint: BridgeTimepoint;
}

/** @name OutgoingMigrateEncoded */
export interface OutgoingMigrateEncoded extends Struct {
  readonly thisContractAddress: EthAddress;
  readonly txHash: H256;
  readonly newContractAddress: EthAddress;
  readonly erc20NativeTokens: Vec<EthAddress>;
  readonly networkId: H256;
  readonly raw: Bytes;
}

/** @name OutgoingPrepareForMigration */
export interface OutgoingPrepareForMigration extends Struct {
  readonly author: AccountId;
  readonly nonce: Index;
  readonly networkId: BridgeNetworkId;
  readonly timepoint: BridgeTimepoint;
}

/** @name OutgoingPrepareForMigrationEncoded */
export interface OutgoingPrepareForMigrationEncoded extends Struct {
  readonly thisContractAddress: EthAddress;
  readonly txHash: H256;
  readonly networkId: H256;
  readonly raw: Bytes;
}

/** @name OutgoingRemovePeer */
export interface OutgoingRemovePeer extends Struct {
  readonly author: AccountId;
  readonly peerAccountId: AccountId;
  readonly peerAddress: EthAddress;
  readonly nonce: Index;
  readonly networkId: BridgeNetworkId;
  readonly timepoint: BridgeTimepoint;
}

/** @name OutgoingRemovePeerCompat */
export interface OutgoingRemovePeerCompat extends Struct {
  readonly author: AccountId;
  readonly peerAccountId: AccountId;
  readonly peerAddress: EthAddress;
  readonly nonce: Index;
  readonly networkId: BridgeNetworkId;
  readonly timepoint: BridgeTimepoint;
}

/** @name OutgoingRemovePeerEncoded */
export interface OutgoingRemovePeerEncoded extends Struct {
  readonly peerAddress: EthAddress;
  readonly txHash: H256;
  readonly networkId: H256;
  readonly raw: Bytes;
}

/** @name OutgoingRequest */
export interface OutgoingRequest extends Enum {
  readonly isTransfer: boolean;
  readonly asTransfer: OutgoingTransfer;
  readonly isAddAsset: boolean;
  readonly asAddAsset: OutgoingAddAsset;
  readonly isAddToken: boolean;
  readonly asAddToken: OutgoingAddToken;
  readonly isAddPeer: boolean;
  readonly asAddPeer: OutgoingAddPeer;
  readonly isRemovePeer: boolean;
  readonly asRemovePeer: OutgoingRemovePeer;
  readonly isPrepareForMigration: boolean;
  readonly asPrepareForMigration: OutgoingPrepareForMigration;
  readonly isMigrate: boolean;
  readonly asMigrate: OutgoingMigrate;
  readonly type: 'Transfer' | 'AddAsset' | 'AddToken' | 'AddPeer' | 'RemovePeer' | 'PrepareForMigration' | 'Migrate';
}

/** @name OutgoingRequestEncoded */
export interface OutgoingRequestEncoded extends Enum {
  readonly isTransfer: boolean;
  readonly asTransfer: OutgoingTransferEncoded;
  readonly isAddAsset: boolean;
  readonly asAddAsset: OutgoingAddAssetEncoded;
  readonly isAddToken: boolean;
  readonly asAddToken: OutgoingAddTokenEncoded;
  readonly isAddPeer: boolean;
  readonly asAddPeer: OutgoingAddPeerEncoded;
  readonly isRemovePeer: boolean;
  readonly asRemovePeer: OutgoingRemovePeerEncoded;
  readonly isPrepareForMigration: boolean;
  readonly asPrepareForMigration: OutgoingPrepareForMigrationEncoded;
  readonly isMigrate: boolean;
  readonly asMigrate: OutgoingMigrateEncoded;
  readonly type: 'Transfer' | 'AddAsset' | 'AddToken' | 'AddPeer' | 'RemovePeer' | 'PrepareForMigration' | 'Migrate';
}

/** @name OutgoingTransfer */
export interface OutgoingTransfer extends Struct {
  readonly from: AccountId;
  readonly to: EthAddress;
  readonly assetId: AssetId;
  readonly amount: Balance;
  readonly nonce: Index;
  readonly networkId: BridgeNetworkId;
  readonly timepoint: BridgeTimepoint;
}

/** @name OutgoingTransferEncoded */
export interface OutgoingTransferEncoded extends Struct {
  readonly currencyId: CurrencyIdEncoded;
  readonly amount: U256;
  readonly to: EthAddress;
  readonly from: EthAddress;
  readonly txHash: H256;
  readonly networkId: H256;
  readonly raw: Bytes;
}

/** @name RequestStatus */
export interface RequestStatus extends Enum {
  readonly isPending: boolean;
  readonly isFrozen: boolean;
  readonly isApprovalsReady: boolean;
  readonly isFailed: boolean;
  readonly isDone: boolean;
  readonly type: 'Pending' | 'Frozen' | 'ApprovalsReady' | 'Failed' | 'Done';
}

/** @name SignatureParams */
export interface SignatureParams extends Struct {
  readonly r: U8aFixed;
  readonly s: U8aFixed;
  readonly v: u8;
}

export type PHANTOM_ETHBRIDGE = 'ethBridge';
