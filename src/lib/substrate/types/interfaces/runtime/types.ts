// Auto-generated via `yarn polkadot-types-from-defs`, do not edit

import type {
  GenericAccountId32,
  GenericAccountId33,
  GenericAccountIndex,
  GenericBlock,
  GenericCall,
  GenericConsensusEngineId,
  GenericEthereumAccountId,
  GenericLookupSource,
  GenericMultiAddress,
  StorageKey,
} from '@polkadot/types';
import type {
  BTreeMap,
  Bytes,
  Compact,
  DoNotConstruct,
  Enum,
  Int,
  Null,
  Option,
  Result,
  Struct,
  Text,
  U8aFixed,
  UInt,
  Vec,
  bool,
  i128,
  u16,
  u32,
  u64,
  u8,
} from '@polkadot/types-codec';
import type { ITuple } from '@polkadot/types-codec/types';
import type { AuthorityId } from '@polkadot/types/interfaces/consensus';
import type { Signature } from '@polkadot/types/interfaces/extrinsics';
import type { DispatchError, Event, SystemOrigin } from '@polkadot/types/interfaces/system';

/** @name AccountId */
export interface AccountId extends AccountId32 {}

/** @name AccountId20 */
export interface AccountId20 extends GenericEthereumAccountId {}

/** @name AccountId32 */
export interface AccountId32 extends GenericAccountId32 {}

/** @name AccountId33 */
export interface AccountId33 extends GenericAccountId33 {}

/** @name AccountIdOf */
export interface AccountIdOf extends AccountId {}

/** @name AccountIndex */
export interface AccountIndex extends GenericAccountIndex {}

/** @name Address */
export interface Address extends MultiAddress {}

/** @name Amount */
export interface Amount extends i128 {}

/** @name AmountOf */
export interface AmountOf extends Amount {}

/** @name AssetId */
export interface AssetId extends u32 {}

/** @name AssetId32 */
export interface AssetId32 extends U8aFixed {}

/** @name AssetIdOf */
export interface AssetIdOf extends AssetId {}

/** @name AssetName */
export interface AssetName extends Text {}

/** @name AssetSymbol */
export interface AssetSymbol extends Text {}

/** @name Balance */
export interface Balance extends UInt {}

/** @name BalanceOf */
export interface BalanceOf extends Balance {}

/** @name BalancePrecision */
export interface BalancePrecision extends u8 {}

/** @name BasisPoints */
export interface BasisPoints extends u16 {}

/** @name Block */
export interface Block extends GenericBlock {}

/** @name BlockNumber */
export interface BlockNumber extends u32 {}

/** @name BlockNumberFor */
export interface BlockNumberFor extends BlockNumber {}

/** @name BlockNumberOf */
export interface BlockNumberOf extends BlockNumber {}

/** @name Call */
export interface Call extends GenericCall {}

/** @name CallHash */
export interface CallHash extends Hash {}

/** @name CallHashOf */
export interface CallHashOf extends CallHash {}

/** @name ChangesTrieConfiguration */
export interface ChangesTrieConfiguration extends Struct {
  readonly digestInterval: u32;
  readonly digestLevels: u32;
}

/** @name ChangesTrieSignal */
export interface ChangesTrieSignal extends Enum {
  readonly isNewConfiguration: boolean;
  readonly asNewConfiguration: Option<ChangesTrieConfiguration>;
  readonly type: 'NewConfiguration';
}

/** @name ChargeFeeInfo */
export interface ChargeFeeInfo extends Struct {
  readonly tip: Compact<Balance>;
  readonly target_asset_id: AssetId;
}

/** @name CodecHash */
export interface CodecHash extends Hash {}

/** @name Consensus */
export interface Consensus extends ITuple<[ConsensusEngineId, Bytes]> {}

/** @name ConsensusEngineId */
export interface ConsensusEngineId extends GenericConsensusEngineId {}

/** @name ContentSource */
export interface ContentSource extends Text {}

/** @name CrateVersion */
export interface CrateVersion extends Struct {
  readonly major: u16;
  readonly minor: u8;
  readonly patch: u8;
}

/** @name CrowdloanReward */
export interface CrowdloanReward extends Struct {
  readonly id: Bytes;
  readonly address: Bytes;
  readonly contribution: Fixed;
  readonly xorReward: Fixed;
  readonly valReward: Fixed;
  readonly pswapReward: Fixed;
  readonly xstusdReward: Fixed;
  readonly percent: Fixed;
}

/** @name CurrencyId */
export interface CurrencyId extends AssetId {}

/** @name CurrencyIdOf */
export interface CurrencyIdOf extends AssetId {}

/** @name Description */
export interface Description extends Text {}

/** @name DEXId */
export interface DEXId extends u32 {}

/** @name DEXIdOf */
export interface DEXIdOf extends DEXId {}

/** @name DEXInfo */
export interface DEXInfo extends Struct {
  readonly baseAssetId: AssetId;
  readonly defaultFee: BasisPoints;
  readonly defaultProtocolFee: BasisPoints;
}

/** @name Digest */
export interface Digest extends Struct {
  readonly logs: Vec<DigestItem>;
}

/** @name DigestItem */
export interface DigestItem extends Enum {
  readonly isOther: boolean;
  readonly asOther: Bytes;
  readonly isAuthoritiesChange: boolean;
  readonly asAuthoritiesChange: Vec<AuthorityId>;
  readonly isChangesTrieRoot: boolean;
  readonly asChangesTrieRoot: Hash;
  readonly isSealV0: boolean;
  readonly asSealV0: SealV0;
  readonly isConsensus: boolean;
  readonly asConsensus: Consensus;
  readonly isSeal: boolean;
  readonly asSeal: Seal;
  readonly isPreRuntime: boolean;
  readonly asPreRuntime: PreRuntime;
  readonly isChangesTrieSignal: boolean;
  readonly asChangesTrieSignal: ChangesTrieSignal;
  readonly isRuntimeEnvironmentUpdated: boolean;
  readonly type:
    | 'Other'
    | 'AuthoritiesChange'
    | 'ChangesTrieRoot'
    | 'SealV0'
    | 'Consensus'
    | 'Seal'
    | 'PreRuntime'
    | 'ChangesTrieSignal'
    | 'RuntimeEnvironmentUpdated';
}

/** @name DispatchErrorWithPostInfoTPostDispatchInfo */
export interface DispatchErrorWithPostInfoTPostDispatchInfo extends Struct {
  readonly postInfo: PostDispatchInfo;
  readonly error: DispatchError;
}

/** @name DispatchResultWithPostInfo */
export interface DispatchResultWithPostInfo
  extends Result<PostDispatchInfo, DispatchErrorWithPostInfoTPostDispatchInfo> {
  readonly isErr: boolean;
  readonly asErr: DispatchErrorWithPostInfoTPostDispatchInfo;
  readonly isOk: boolean;
  readonly asOk: PostDispatchInfo;
}

/** @name DistributionAccounts */
export interface DistributionAccounts extends Null {}

/** @name Duration */
export interface Duration extends Null {}

/** @name EncodedJustification */
export interface EncodedJustification extends Bytes {}

/** @name ExtrinsicInclusionMode */
export interface ExtrinsicInclusionMode extends Enum {
  readonly isAllExtrinsics: boolean;
  readonly isOnlyInherents: boolean;
  readonly type: 'AllExtrinsics' | 'OnlyInherents';
}

/** @name ExtrinsicsWeight */
export interface ExtrinsicsWeight extends Struct {
  readonly normal: Weight;
  readonly operational: Weight;
}

/** @name Farm */
export interface Farm extends Null {}

/** @name Farmer */
export interface Farmer extends Null {}

/** @name FarmId */
export interface FarmId extends u64 {}

/** @name FilterMode */
export interface FilterMode extends Enum {
  readonly isDisabled: boolean;
  readonly isForbidSelected: boolean;
  readonly isAllowSelected: boolean;
  readonly type: 'Disabled' | 'ForbidSelected' | 'AllowSelected';
}

/** @name Fixed */
export interface Fixed extends FixedU128 {}

/** @name Fixed128 */
export interface Fixed128 extends Int {}

/** @name Fixed64 */
export interface Fixed64 extends Int {}

/** @name FixedI128 */
export interface FixedI128 extends Int {}

/** @name FixedI64 */
export interface FixedI64 extends Int {}

/** @name FixedU128 */
export interface FixedU128 extends UInt {}

/** @name FixedU64 */
export interface FixedU64 extends UInt {}

/** @name H1024 */
export interface H1024 extends U8aFixed {}

/** @name H128 */
export interface H128 extends U8aFixed {}

/** @name H160 */
export interface H160 extends U8aFixed {}

/** @name H2048 */
export interface H2048 extends U8aFixed {}

/** @name H256 */
export interface H256 extends U8aFixed {}

/** @name H32 */
export interface H32 extends U8aFixed {}

/** @name H512 */
export interface H512 extends U8aFixed {}

/** @name H64 */
export interface H64 extends U8aFixed {}

/** @name Hash */
export interface Hash extends H256 {}

/** @name Header */
export interface Header extends Struct {
  readonly parentHash: Hash;
  readonly number: Compact<BlockNumber>;
  readonly stateRoot: Hash;
  readonly extrinsicsRoot: Hash;
  readonly digest: Digest;
}

/** @name HeaderPartial */
export interface HeaderPartial extends Struct {
  readonly parentHash: Hash;
  readonly number: BlockNumber;
}

/** @name HolderId */
export interface HolderId extends AccountId {}

/** @name I32F32 */
export interface I32F32 extends Int {}

/** @name Index */
export interface Index extends u32 {}

/** @name IndicesLookupSource */
export interface IndicesLookupSource extends GenericLookupSource {}

/** @name Justification */
export interface Justification extends ITuple<[ConsensusEngineId, EncodedJustification]> {}

/** @name Justifications */
export interface Justifications extends Vec<Justification> {}

/** @name KeyTypeId */
export interface KeyTypeId extends u32 {}

/** @name KeyValue */
export interface KeyValue extends ITuple<[StorageKey, StorageData]> {}

/** @name LiquiditySourceType */
export interface LiquiditySourceType extends Enum {
  readonly isXykPool: boolean;
  readonly isBondingCurvePool: boolean;
  readonly isMulticollateralBondingCurvePool: boolean;
  readonly isMockPool: boolean;
  readonly isMockPool2: boolean;
  readonly isMockPool3: boolean;
  readonly isMockPool4: boolean;
  readonly isXstPool: boolean;
  readonly isOrderBook: boolean;
  readonly type:
    | 'XykPool'
    | 'BondingCurvePool'
    | 'MulticollateralBondingCurvePool'
    | 'MockPool'
    | 'MockPool2'
    | 'MockPool3'
    | 'MockPool4'
    | 'XstPool'
    | 'OrderBook';
}

/** @name LockIdentifier */
export interface LockIdentifier extends U8aFixed {}

/** @name LookupSource */
export interface LookupSource extends MultiAddress {}

/** @name LookupTarget */
export interface LookupTarget extends AccountId {}

/** @name MarketMakerInfo */
export interface MarketMakerInfo extends Struct {
  readonly count: u32;
  readonly volume: Balance;
}

/** @name Mode */
export interface Mode extends Enum {
  readonly isPermit: boolean;
  readonly isForbid: boolean;
  readonly type: 'Permit' | 'Forbid';
}

/** @name ModuleId */
export interface ModuleId extends LockIdentifier {}

/** @name Moment */
export interface Moment extends UInt {}

/** @name MultiAddress */
export interface MultiAddress extends GenericMultiAddress {}

/** @name MultiCurrencyBalanceOf */
export interface MultiCurrencyBalanceOf extends Null {}

/** @name MultisigAccount */
export interface MultisigAccount extends Struct {
  readonly signatories: Vec<AccountId>;
  readonly threshold: u8;
}

/** @name MultiSigner */
export interface MultiSigner extends Enum {
  readonly isEd25519: boolean;
  readonly asEd25519: U8aFixed;
  readonly isSr25519: boolean;
  readonly asSr25519: U8aFixed;
  readonly isEcdsa: boolean;
  readonly asEcdsa: U8aFixed;
  readonly type: 'Ed25519' | 'Sr25519' | 'Ecdsa';
}

/** @name OpaqueCall */
export interface OpaqueCall extends Bytes {}

/** @name OracleKey */
export interface OracleKey extends AssetId {}

/** @name Origin */
export interface Origin extends DoNotConstruct {}

/** @name OriginCaller */
export interface OriginCaller extends Enum {
  readonly isSystem: boolean;
  readonly asSystem: SystemOrigin;
  readonly type: 'System';
}

/** @name OwnerId */
export interface OwnerId extends AccountId {}

/** @name PalletId */
export interface PalletId extends LockIdentifier {}

/** @name PalletsOrigin */
export interface PalletsOrigin extends OriginCaller {}

/** @name PalletVersion */
export interface PalletVersion extends Struct {
  readonly major: u16;
  readonly minor: u8;
  readonly patch: u8;
}

/** @name Pays */
export interface Pays extends Enum {
  readonly isYes: boolean;
  readonly isNo: boolean;
  readonly type: 'Yes' | 'No';
}

/** @name Perbill */
export interface Perbill extends UInt {}

/** @name Percent */
export interface Percent extends UInt {}

/** @name Permill */
export interface Permill extends UInt {}

/** @name Permission */
export interface Permission extends Null {}

/** @name PermissionId */
export interface PermissionId extends u32 {}

/** @name Perquintill */
export interface Perquintill extends UInt {}

/** @name PerU16 */
export interface PerU16 extends UInt {}

/** @name Phantom */
export interface Phantom extends Null {}

/** @name PhantomData */
export interface PhantomData extends Null {}

/** @name PostDispatchInfo */
export interface PostDispatchInfo extends Struct {
  readonly actualWeight: Option<Weight>;
  readonly paysFee: Pays;
}

/** @name PredefinedAssetId */
export interface PredefinedAssetId extends Enum {
  readonly isXor: boolean;
  readonly isDot: boolean;
  readonly isKsm: boolean;
  readonly isUsdt: boolean;
  readonly isVal: boolean;
  readonly isPswap: boolean;
  readonly isDai: boolean;
  readonly isEth: boolean;
  readonly isXstusd: boolean;
  readonly isXst: boolean;
  readonly isTbcd: boolean;
  readonly isKen: boolean;
  readonly isKusd: boolean;
  readonly isKgold: boolean;
  readonly isKxor: boolean;
  readonly isKarma: boolean;
  readonly type:
    | 'Xor'
    | 'Dot'
    | 'Ksm'
    | 'Usdt'
    | 'Val'
    | 'Pswap'
    | 'Dai'
    | 'Eth'
    | 'Xstusd'
    | 'Xst'
    | 'Tbcd'
    | 'Ken'
    | 'Kusd'
    | 'Kgold'
    | 'Kxor'
    | 'Karma';
}

/** @name PreRuntime */
export interface PreRuntime extends ITuple<[ConsensusEngineId, Bytes]> {}

/** @name PriceInfo */
export interface PriceInfo extends Struct {
  readonly priceFailures: u32;
  readonly spotPrices: Vec<Balance>;
  readonly averagePrice: Balance;
  readonly needsUpdate: bool;
  readonly lastSpotPrice: Balance;
}

/** @name Public */
export interface Public extends U8aFixed {}

/** @name QuoteAmount */
export interface QuoteAmount extends Enum {
  readonly isWithDesiredInput: boolean;
  readonly asWithDesiredInput: QuoteWithDesiredInput;
  readonly isWithDesiredOutput: boolean;
  readonly asWithDesiredOutput: QuoteWithDesiredOutput;
  readonly type: 'WithDesiredInput' | 'WithDesiredOutput';
}

/** @name QuoteWithDesiredInput */
export interface QuoteWithDesiredInput extends Struct {
  readonly desiredAmountIn: Balance;
}

/** @name QuoteWithDesiredOutput */
export interface QuoteWithDesiredOutput extends Struct {
  readonly desiredAmountOut: Balance;
}

/** @name Releases */
export interface Releases extends Enum {
  readonly isV1: boolean;
  readonly isV2: boolean;
  readonly isV3: boolean;
  readonly isV4: boolean;
  readonly isV5: boolean;
  readonly isV6: boolean;
  readonly isV7: boolean;
  readonly isV8: boolean;
  readonly isV9: boolean;
  readonly isV10: boolean;
  readonly type: 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6' | 'V7' | 'V8' | 'V9' | 'V10';
}

/** @name RewardInfo */
export interface RewardInfo extends Struct {
  readonly limit: Balance;
  readonly totalAvailable: Balance;
  readonly rewards: BTreeMap<RewardReason, Balance>;
}

/** @name RewardReason */
export interface RewardReason extends Enum {
  readonly isUnspecified: boolean;
  readonly isBuyOnBondingCurve: boolean;
  readonly isLiquidityProvisionFarming: boolean;
  readonly isMarketMakerVolume: boolean;
  readonly type: 'Unspecified' | 'BuyOnBondingCurve' | 'LiquidityProvisionFarming' | 'MarketMakerVolume';
}

/** @name RuntimeCall */
export interface RuntimeCall extends Call {}

/** @name RuntimeDbWeight */
export interface RuntimeDbWeight extends Struct {
  readonly read: Weight;
  readonly write: Weight;
}

/** @name RuntimeEvent */
export interface RuntimeEvent extends Event {}

/** @name Scope */
export interface Scope extends Enum {
  readonly isLimited: boolean;
  readonly asLimited: H512;
  readonly isUnlimited: boolean;
  readonly type: 'Limited' | 'Unlimited';
}

/** @name Seal */
export interface Seal extends ITuple<[ConsensusEngineId, Bytes]> {}

/** @name SealV0 */
export interface SealV0 extends ITuple<[u64, Signature]> {}

/** @name SignedBlock */
export interface SignedBlock extends SignedBlockWithJustifications {}

/** @name SignedBlockWithJustification */
export interface SignedBlockWithJustification extends Struct {
  readonly block: Block;
  readonly justification: Option<EncodedJustification>;
}

/** @name SignedBlockWithJustifications */
export interface SignedBlockWithJustifications extends Struct {
  readonly block: Block;
  readonly justifications: Option<Justifications>;
}

/** @name Slot */
export interface Slot extends u64 {}

/** @name SlotDuration */
export interface SlotDuration extends u64 {}

/** @name SmoothPriceState */
export interface SmoothPriceState extends Null {}

/** @name StorageData */
export interface StorageData extends Bytes {}

/** @name StorageInfo */
export interface StorageInfo extends Struct {
  readonly palletName: Bytes;
  readonly storage_name: Bytes;
  readonly prefix: Bytes;
  readonly maxValues: Option<u32>;
  readonly maxSize: Option<u32>;
}

/** @name StorageProof */
export interface StorageProof extends Struct {
  readonly trieNodes: Vec<Bytes>;
}

/** @name StorageVersion */
export interface StorageVersion extends Null {}

/** @name SwapAction */
export interface SwapAction extends Null {}

/** @name SwapAmount */
export interface SwapAmount extends Enum {
  readonly isWithDesiredInput: boolean;
  readonly asWithDesiredInput: SwapWithDesiredInput;
  readonly isWithDesiredOutput: boolean;
  readonly asWithDesiredOutput: SwapWithDesiredOutput;
  readonly type: 'WithDesiredInput' | 'WithDesiredOutput';
}

/** @name SwapOutcome */
export interface SwapOutcome extends Struct {
  readonly amount: Balance;
  readonly fee: Balance;
}

/** @name SwapOutcomeInfo */
export interface SwapOutcomeInfo extends Struct {
  readonly amount: Balance;
  readonly fee: Balance;
}

/** @name SwapVariant */
export interface SwapVariant extends Enum {
  readonly isWithDesiredInput: boolean;
  readonly isWithDesiredOutput: boolean;
  readonly type: 'WithDesiredInput' | 'WithDesiredOutput';
}

/** @name SwapWithDesiredInput */
export interface SwapWithDesiredInput extends Struct {
  readonly desiredAmountIn: Balance;
  readonly minAmountOut: Balance;
}

/** @name SwapWithDesiredOutput */
export interface SwapWithDesiredOutput extends Struct {
  readonly desiredAmountOut: Balance;
  readonly maxAmountIn: Balance;
}

/** @name TechAccountId */
export interface TechAccountId extends Enum {
  readonly isPure: boolean;
  readonly asPure: ITuple<[DEXId, TechPurpose]>;
  readonly isGeneric: boolean;
  readonly asGeneric: ITuple<[Bytes, Bytes]>;
  readonly isWrapped: boolean;
  readonly asWrapped: AccountId;
  readonly isWrappedRepr: boolean;
  readonly asWrappedRepr: AccountId;
  readonly type: 'Pure' | 'Generic' | 'Wrapped' | 'WrappedRepr';
}

/** @name TechAmount */
export interface TechAmount extends Amount {}

/** @name TechAssetId */
export interface TechAssetId extends Enum {
  readonly isWrapped: boolean;
  readonly asWrapped: PredefinedAssetId;
  readonly isEscaped: boolean;
  readonly asEscaped: AssetId;
  readonly type: 'Wrapped' | 'Escaped';
}

/** @name TechBalance */
export interface TechBalance extends Balance {}

/** @name TechPurpose */
export interface TechPurpose extends Enum {
  readonly isFeeCollector: boolean;
  readonly isFeeCollectorForPair: boolean;
  readonly asFeeCollectorForPair: TechTradingPair;
  readonly isLiquidityKeeper: boolean;
  readonly asLiquidityKeeper: TechTradingPair;
  readonly isIdentifier: boolean;
  readonly asIdentifier: Bytes;
  readonly type: 'FeeCollector' | 'FeeCollectorForPair' | 'LiquidityKeeper' | 'Identifier';
}

/** @name TechTradingPair */
export interface TechTradingPair extends Struct {
  readonly baseAssetId: TechAssetId;
  readonly targetAssetId: TechAssetId;
}

/** @name TradingPair */
export interface TradingPair extends Struct {
  readonly baseAssetId: AssetId;
  readonly targetAssetId: AssetId;
}

/** @name TransactionInfo */
export interface TransactionInfo extends Struct {
  readonly chunkRoot: H256;
  readonly contentHash: H256;
  readonly dataSize: u32;
  readonly blockChunks: u32;
}

/** @name TransactionLongevity */
export interface TransactionLongevity extends u64 {}

/** @name TransactionPriority */
export interface TransactionPriority extends u64 {}

/** @name TransactionStorageProof */
export interface TransactionStorageProof extends Struct {
  readonly chunk: Bytes;
  readonly proof: Vec<Bytes>;
}

/** @name TransactionTag */
export interface TransactionTag extends Bytes {}

/** @name U32F32 */
export interface U32F32 extends UInt {}

/** @name ValidationFunction */
export interface ValidationFunction extends Null {}

/** @name ValidatorId */
export interface ValidatorId extends AccountId {}

/** @name ValidatorIdOf */
export interface ValidatorIdOf extends ValidatorId {}

/** @name Weight */
export interface Weight extends WeightV2 {}

/** @name WeightMultiplier */
export interface WeightMultiplier extends Fixed64 {}

/** @name WeightV0 */
export interface WeightV0 extends u32 {}

/** @name WeightV1 */
export interface WeightV1 extends u64 {}

/** @name WeightV2 */
export interface WeightV2 extends Struct {
  readonly refTime: Compact<u64>;
  readonly proofSize: Compact<u64>;
}

export type PHANTOM_RUNTIME = 'runtime';
