// Auto-generated via `yarn polkadot-types-from-chain`, do not edit

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/api-base/types/storage';

import type { ApiTypes, AugmentedQuery, QueryableStorageEntry } from '@polkadot/api-base/types';
import type { Data } from '@polkadot/types';
import type {
  BTreeMap,
  BTreeSet,
  Bytes,
  Null,
  Option,
  Text,
  U256,
  U8aFixed,
  Vec,
  WrapperOpaque,
  bool,
  u128,
  u32,
  u64,
  u8,
} from '@polkadot/types-codec';
import type { AnyNumber, ITuple } from '@polkadot/types-codec/types';
import type { AccountId32, Call, H160, H256, Perbill, Percent } from '@polkadot/types/interfaces/runtime';
import type {
  ApolloPlatformBorrowingPosition,
  ApolloPlatformLendingPosition,
  ApolloPlatformPoolInfo,
  AssetsAssetRecord,
  BandBandRate,
  BandFeeCalculationParameters,
  BridgeProxyBridgeRequest,
  BridgeProxyTransferLimitSettings,
  BridgeTypesAssetKind,
  BridgeTypesAuxiliaryDigestItem,
  BridgeTypesGenericAssetId,
  BridgeTypesGenericBridgeMessage,
  BridgeTypesGenericCommitmentWithBlock,
  BridgeTypesGenericNetworkId,
  BridgeTypesSubNetworkId,
  BridgeTypesSubstrateBridgeMessage,
  BridgeTypesTonTonAddress,
  BridgeTypesTonTonNetworkId,
  CeresGovernancePlatformPollInfo,
  CeresGovernancePlatformStorageVersion,
  CeresGovernancePlatformVotingInfo,
  CeresLaunchpadContributionInfo,
  CeresLaunchpadIloInfo,
  CeresLiquidityLockerLockInfo,
  CeresLiquidityLockerStorageVersion,
  CeresStakingStakingInfo,
  CeresTokenLockerStorageVersion,
  CeresTokenLockerTokenLockInfo,
  CommonBalanceUnit,
  CommonPrimitivesAssetId32,
  CommonPrimitivesAssetInfo,
  CommonPrimitivesDexInfo,
  CommonPrimitivesLiquiditySourceType,
  CommonPrimitivesOracle,
  CommonPrimitivesOrderBookId,
  CommonPrimitivesTechAccountId,
  CommonPrimitivesTradingPairAssetId32,
  DemeterFarmingPlatformPoolData,
  DemeterFarmingPlatformStorageVersion,
  DemeterFarmingPlatformTokenInfo,
  DemeterFarmingPlatformUserInfo,
  DenominationMigrationStage,
  EthBridgeBridgeSignatureVersion,
  EthBridgeBridgeStatus,
  EthBridgeOffchainSignatureParams,
  EthBridgeRequestsAssetKind,
  EthBridgeRequestsOffchainRequest,
  EthBridgeRequestsOutgoingEthPeersSync,
  EthBridgeRequestsRequestStatus,
  EvmFungibleAppBaseFeeInfo,
  ExtendedAssetsSoulboundTokenMetadata,
  FarmingPoolFarmer,
  FixnumFixedPoint,
  FrameSupportDispatchPerDispatchClassWeight,
  FrameSupportPreimagesBounded,
  FrameSystemAccountInfo,
  FrameSystemEventRecord,
  FrameSystemLastRuntimeUpgradeInfo,
  FrameSystemPhase,
  FramenodeRuntimeOpaqueSessionKeys,
  HermesGovernancePlatformHermesPollInfo,
  HermesGovernancePlatformHermesVotingInfo,
  HermesGovernancePlatformStorageVersion,
  IrohaMigrationPendingMultisigAccount,
  KensetsuCollateralInfo,
  KensetsuCollateralizedDebtPosition,
  KensetsuStablecoinCollateralIdentifier,
  KensetsuStablecoinInfo,
  MulticollateralBondingCurvePoolDistributionAccounts,
  OrderBook,
  OrderBookLimitOrder,
  OrmlTokensAccountData,
  OrmlTokensBalanceLock,
  OrmlTokensReserveData,
  PalletBagsListListBag,
  PalletBagsListListNode,
  PalletBalancesAccountData,
  PalletBalancesBalanceLock,
  PalletBalancesReserveData,
  PalletCollectiveVotes,
  PalletDemocracyReferendumInfo,
  PalletDemocracyVoteThreshold,
  PalletDemocracyVoteVoting,
  PalletElectionProviderMultiPhasePhase,
  PalletElectionProviderMultiPhaseReadySolution,
  PalletElectionProviderMultiPhaseRoundSnapshot,
  PalletElectionProviderMultiPhaseSignedSignedSubmission,
  PalletElectionProviderMultiPhaseSolutionOrSnapshotSize,
  PalletElectionsPhragmenSeatHolder,
  PalletElectionsPhragmenVoter,
  PalletGrandpaStoredPendingChange,
  PalletGrandpaStoredState,
  PalletIdentityRegistrarInfo,
  PalletIdentityRegistration,
  PalletImOnlineBoundedOpaqueNetworkState,
  PalletImOnlineSr25519AppSr25519Public,
  PalletMultisigBridgeTimepoint,
  PalletMultisigMultisig,
  PalletMultisigMultisigAccount,
  PalletPreimageRequestStatus,
  PalletSchedulerScheduled,
  PalletStakingActiveEraInfo,
  PalletStakingEraRewardPoints,
  PalletStakingExposure,
  PalletStakingForcing,
  PalletStakingNominations,
  PalletStakingRewardDestination,
  PalletStakingSlashingSlashingSpans,
  PalletStakingSlashingSpanRecord,
  PalletStakingSoraDurationWrapper,
  PalletStakingStakingLedger,
  PalletStakingUnappliedSlash,
  PalletStakingValidatorPrefs,
  PalletTransactionPaymentReleases,
  PermissionsScope,
  PrestoCouponInfo,
  PrestoCropReceipt,
  PrestoCropReceiptCropReceiptContent,
  PrestoRequestsRequest,
  PriceToolsAggregatedPriceInfo,
  RewardsRewardInfo,
  SpBeefyCryptoPublic,
  SpBeefyMmrBeefyAuthoritySet,
  SpConsensusBabeAppPublic,
  SpConsensusBabeBabeEpochConfiguration,
  SpConsensusBabeDigestsNextConfigDescriptor,
  SpConsensusBabeDigestsPreDigest,
  SpCoreCryptoKeyTypeId,
  SpCoreEcdsaPublic,
  SpCoreEcdsaSignature,
  SpNposElectionsElectionScore,
  SpRuntimeDigest,
  SpStakingOffenceOffenceDetails,
  VestedRewardsClaim,
  VestedRewardsCrowdloanInfo,
  VestedRewardsCrowdloanUserInfo,
  VestedRewardsRewardInfo,
  VestedRewardsVestingCurrenciesVestingScheduleVariant,
  XorFeeAssetFee,
  XstSyntheticInfo,
} from '@polkadot/types/lookup';
import type { Observable } from '@polkadot/types/types';

export type __AugmentedQuery<ApiType extends ApiTypes> = AugmentedQuery<ApiType, () => unknown>;
export type __QueryableStorageEntry<ApiType extends ApiTypes> = QueryableStorageEntry<ApiType>;

declare module '@polkadot/api-base/types/storage' {
  interface AugmentedQueries<ApiType extends ApiTypes> {
    apolloPlatform: {
      authorityAccount: AugmentedQuery<ApiType, () => Observable<AccountId32>, []>;
      /**
       * Default borrowing rewards
       **/
      borrowingRewards: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * Default borrowing rewards
       **/
      borrowingRewardsPerBlock: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      collateralFactor: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * Default lending rewards
       **/
      lendingRewards: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * Default lending rewards per block
       **/
      lendingRewardsPerBlock: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      poolData: AugmentedQuery<
        ApiType,
        (
          arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<ApolloPlatformPoolInfo>>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * BlockNumber -> AssetId (for updating pools interests by block)
       **/
      poolsByBlock: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<Option<CommonPrimitivesAssetId32>>,
        [u32]
      >;
      treasuryAccount: AugmentedQuery<ApiType, () => Observable<AccountId32>, []>;
      /**
       * Borrowed asset -> AccountId -> (Collateral asset, BorrowingPosition)
       **/
      userBorrowingInfo: AugmentedQuery<
        ApiType,
        (
          arg1: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          arg2: AccountId32 | string | Uint8Array
        ) => Observable<Option<BTreeMap<CommonPrimitivesAssetId32, ApolloPlatformBorrowingPosition>>>,
        [CommonPrimitivesAssetId32, AccountId32]
      >;
      /**
       * Lent asset -> AccountId -> LendingPosition
       **/
      userLendingInfo: AugmentedQuery<
        ApiType,
        (
          arg1: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          arg2: AccountId32 | string | Uint8Array
        ) => Observable<Option<ApolloPlatformLendingPosition>>,
        [CommonPrimitivesAssetId32, AccountId32]
      >;
      /**
       * User AccountId -> Collateral Asset -> Total Collateral Amount
       **/
      userTotalCollateral: AugmentedQuery<
        ApiType,
        (
          arg1: AccountId32 | string | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<u128>>,
        [AccountId32, CommonPrimitivesAssetId32]
      >;
    };
    assets: {
      /**
       * Asset Id -> (Symbol, Name, Precision, Is Mintable, Content Source, Description)
       **/
      assetInfos: AugmentedQuery<
        ApiType,
        (
          arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<ITuple<[Bytes, Bytes, u8, bool, Option<Bytes>, Option<Bytes>]>>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Asset Id -> AssetInfo
       **/
      assetInfosV2: AugmentedQuery<
        ApiType,
        (
          arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<CommonPrimitivesAssetInfo>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Asset Id -> Owner Account Id
       **/
      assetOwners: AugmentedQuery<
        ApiType,
        (arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => Observable<Option<AccountId32>>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Asset Id -> AssetRecord<T>
       **/
      assetRecordAssetId: AugmentedQuery<
        ApiType,
        (
          arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<AssetsAssetRecord>>,
        [CommonPrimitivesAssetId32]
      >;
    };
    authorship: {
      /**
       * Author of current block.
       **/
      author: AugmentedQuery<ApiType, () => Observable<Option<AccountId32>>, []>;
    };
    babe: {
      /**
       * Current epoch authorities.
       **/
      authorities: AugmentedQuery<ApiType, () => Observable<Vec<ITuple<[SpConsensusBabeAppPublic, u64]>>>, []>;
      /**
       * This field should always be populated during block processing unless
       * secondary plain slots are enabled (which don't contain a VRF output).
       *
       * It is set in `on_finalize`, before it will contain the value from the last block.
       **/
      authorVrfRandomness: AugmentedQuery<ApiType, () => Observable<Option<U8aFixed>>, []>;
      /**
       * Current slot number.
       **/
      currentSlot: AugmentedQuery<ApiType, () => Observable<u64>, []>;
      /**
       * The configuration for the current epoch. Should never be `None` as it is initialized in
       * genesis.
       **/
      epochConfig: AugmentedQuery<ApiType, () => Observable<Option<SpConsensusBabeBabeEpochConfiguration>>, []>;
      /**
       * Current epoch index.
       **/
      epochIndex: AugmentedQuery<ApiType, () => Observable<u64>, []>;
      /**
       * The block numbers when the last and current epoch have started, respectively `N-1` and
       * `N`.
       * NOTE: We track this is in order to annotate the block number when a given pool of
       * entropy was fixed (i.e. it was known to chain observers). Since epochs are defined in
       * slots, which may be skipped, the block numbers may not line up with the slot numbers.
       **/
      epochStart: AugmentedQuery<ApiType, () => Observable<ITuple<[u32, u32]>>, []>;
      /**
       * The slot at which the first epoch actually started. This is 0
       * until the first block of the chain.
       **/
      genesisSlot: AugmentedQuery<ApiType, () => Observable<u64>, []>;
      /**
       * Temporary value (cleared at block finalization) which is `Some`
       * if per-block initialization has already been called for current block.
       **/
      initialized: AugmentedQuery<ApiType, () => Observable<Option<Option<SpConsensusBabeDigestsPreDigest>>>, []>;
      /**
       * How late the current block is compared to its parent.
       *
       * This entry is populated as part of block execution and is cleaned up
       * on block finalization. Querying this storage entry outside of block
       * execution context should always yield zero.
       **/
      lateness: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Next epoch authorities.
       **/
      nextAuthorities: AugmentedQuery<ApiType, () => Observable<Vec<ITuple<[SpConsensusBabeAppPublic, u64]>>>, []>;
      /**
       * The configuration for the next epoch, `None` if the config will not change
       * (you can fallback to `EpochConfig` instead in that case).
       **/
      nextEpochConfig: AugmentedQuery<ApiType, () => Observable<Option<SpConsensusBabeBabeEpochConfiguration>>, []>;
      /**
       * Next epoch randomness.
       **/
      nextRandomness: AugmentedQuery<ApiType, () => Observable<U8aFixed>, []>;
      /**
       * Pending epoch configuration change that will be applied when the next epoch is enacted.
       **/
      pendingEpochConfigChange: AugmentedQuery<
        ApiType,
        () => Observable<Option<SpConsensusBabeDigestsNextConfigDescriptor>>,
        []
      >;
      /**
       * The epoch randomness for the *current* epoch.
       *
       * # Security
       *
       * This MUST NOT be used for gambling, as it can be influenced by a
       * malicious validator in the short term. It MAY be used in many
       * cryptographic protocols, however, so long as one remembers that this
       * (like everything else on-chain) it is public. For example, it can be
       * used where a number is needed that cannot have been chosen by an
       * adversary, for purposes such as public-coin zero-knowledge proofs.
       **/
      randomness: AugmentedQuery<ApiType, () => Observable<U8aFixed>, []>;
      /**
       * Randomness under construction.
       *
       * We make a trade-off between storage accesses and list length.
       * We store the under-construction randomness in segments of up to
       * `UNDER_CONSTRUCTION_SEGMENT_LENGTH`.
       *
       * Once a segment reaches this length, we begin the next one.
       * We reset all segments and return to `0` at the beginning of every
       * epoch.
       **/
      segmentIndex: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * TWOX-NOTE: `SegmentIndex` is an increasing integer, so this is okay.
       **/
      underConstruction: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<Vec<U8aFixed>>,
        [u32]
      >;
    };
    bagsList: {
      /**
       * Counter for the related counted storage map
       **/
      counterForListNodes: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * A bag stored in storage.
       *
       * Stores a `Bag` struct, which stores head and tail pointers to itself.
       **/
      listBags: AugmentedQuery<
        ApiType,
        (arg: u64 | AnyNumber | Uint8Array) => Observable<Option<PalletBagsListListBag>>,
        [u64]
      >;
      /**
       * A single node, within some bag.
       *
       * Nodes store links forward and back within their respective bags.
       **/
      listNodes: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Option<PalletBagsListListNode>>,
        [AccountId32]
      >;
    };
    balances: {
      /**
       * The Balances pallet example of storing the balance of an account.
       *
       * # Example
       *
       * ```nocompile
       * impl pallet_balances::Config for Runtime {
       * type AccountStore = StorageMapShim<Self::Account<Runtime>, frame_system::Provider<Runtime>, AccountId, Self::AccountData<Balance>>
       * }
       * ```
       *
       * You can also store the balance of an account in the `System` pallet.
       *
       * # Example
       *
       * ```nocompile
       * impl pallet_balances::Config for Runtime {
       * type AccountStore = System
       * }
       * ```
       *
       * But this comes with tradeoffs, storing account balances in the system pallet stores
       * `frame_system` data alongside the account data contrary to storing account balances in the
       * `Balances` pallet, which uses a `StorageMap` to store balances data only.
       * NOTE: This is only used in the case that this pallet is used to store balances.
       **/
      account: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<PalletBalancesAccountData>,
        [AccountId32]
      >;
      /**
       * The total units of outstanding deactivated balance in the system.
       **/
      inactiveIssuance: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * Any liquidity locks on some account balances.
       * NOTE: Should only be accessed when setting, changing and freeing a lock.
       **/
      locks: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Vec<PalletBalancesBalanceLock>>,
        [AccountId32]
      >;
      /**
       * Named reserves on some account balances.
       **/
      reserves: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Vec<PalletBalancesReserveData>>,
        [AccountId32]
      >;
      /**
       * The total units issued in the system.
       **/
      totalIssuance: AugmentedQuery<ApiType, () => Observable<u128>, []>;
    };
    band: {
      dynamicFeeParameters: AugmentedQuery<ApiType, () => Observable<BandFeeCalculationParameters>, []>;
      symbolCheckBlock: AugmentedQuery<
        ApiType,
        (arg1: u32 | AnyNumber | Uint8Array, arg2: Bytes | string | Uint8Array) => Observable<bool>,
        [u32, Bytes]
      >;
      symbolRates: AugmentedQuery<
        ApiType,
        (arg: Bytes | string | Uint8Array) => Observable<Option<BandBandRate>>,
        [Bytes]
      >;
      trustedRelayers: AugmentedQuery<ApiType, () => Observable<Option<BTreeSet<AccountId32>>>, []>;
    };
    beefy: {
      /**
       * The current authorities set
       **/
      authorities: AugmentedQuery<ApiType, () => Observable<Vec<SpBeefyCryptoPublic>>, []>;
      /**
       * Authorities set scheduled to be used with the next session
       **/
      nextAuthorities: AugmentedQuery<ApiType, () => Observable<Vec<SpBeefyCryptoPublic>>, []>;
      /**
       * The current validator set id
       **/
      validatorSetId: AugmentedQuery<ApiType, () => Observable<u64>, []>;
    };
    beefyLightClient: {
      currentValidatorSet: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array
        ) => Observable<Option<SpBeefyMmrBeefyAuthoritySet>>,
        [BridgeTypesSubNetworkId]
      >;
      latestBeefyBlock: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array
        ) => Observable<u64>,
        [BridgeTypesSubNetworkId]
      >;
      latestMMRRoots: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array
        ) => Observable<Vec<H256>>,
        [BridgeTypesSubNetworkId]
      >;
      latestRandomSeed: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array
        ) => Observable<ITuple<[H256, u32]>>,
        [BridgeTypesSubNetworkId]
      >;
      nextValidatorSet: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array
        ) => Observable<Option<SpBeefyMmrBeefyAuthoritySet>>,
        [BridgeTypesSubNetworkId]
      >;
      thisNetworkId: AugmentedQuery<ApiType, () => Observable<BridgeTypesSubNetworkId>, []>;
    };
    bridgeDataSigner: {
      /**
       * Approvals
       **/
      approvals: AugmentedQuery<
        ApiType,
        (
          arg1:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array,
          arg2: H256 | string | Uint8Array
        ) => Observable<BTreeMap<SpCoreEcdsaPublic, SpCoreEcdsaSignature>>,
        [BridgeTypesGenericNetworkId, H256]
      >;
      /**
       * Peers
       **/
      peers: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array
        ) => Observable<Option<BTreeSet<SpCoreEcdsaPublic>>>,
        [BridgeTypesGenericNetworkId]
      >;
      /**
       * Pending peers
       **/
      pendingPeerUpdate: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array
        ) => Observable<bool>,
        [BridgeTypesGenericNetworkId]
      >;
    };
    bridgeInboundChannel: {
      channelNonces: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array
        ) => Observable<u64>,
        [BridgeTypesGenericNetworkId]
      >;
      evmChannelAddresses: AugmentedQuery<
        ApiType,
        (arg: H256 | string | Uint8Array) => Observable<Option<H160>>,
        [H256]
      >;
      reportedChannelNonces: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array
        ) => Observable<u64>,
        [BridgeTypesGenericNetworkId]
      >;
      tonChannelAddresses: AugmentedQuery<
        ApiType,
        (
          arg: BridgeTypesTonTonNetworkId | 'Mainnet' | 'Testnet' | number | Uint8Array
        ) => Observable<Option<BridgeTypesTonTonAddress>>,
        [BridgeTypesTonTonNetworkId]
      >;
    };
    bridgeMultisig: {
      /**
       * Multisignature accounts.
       **/
      accounts: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Option<PalletMultisigMultisigAccount>>,
        [AccountId32]
      >;
      calls: AugmentedQuery<
        ApiType,
        (arg: U8aFixed | string | Uint8Array) => Observable<Option<ITuple<[Bytes, AccountId32, u128]>>>,
        [U8aFixed]
      >;
      dispatchedCalls: AugmentedQuery<
        ApiType,
        (
          arg1: U8aFixed | string | Uint8Array,
          arg2: PalletMultisigBridgeTimepoint | { height?: any; index?: any } | string | Uint8Array
        ) => Observable<Null>,
        [U8aFixed, PalletMultisigBridgeTimepoint]
      >;
      /**
       * The set of open multisig operations.
       **/
      multisigs: AugmentedQuery<
        ApiType,
        (
          arg1: AccountId32 | string | Uint8Array,
          arg2: U8aFixed | string | Uint8Array
        ) => Observable<Option<PalletMultisigMultisig>>,
        [AccountId32, U8aFixed]
      >;
    };
    bridgeOutboundChannel: {
      channelNonces: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array
        ) => Observable<u64>,
        [BridgeTypesGenericNetworkId]
      >;
      evmSubmitGas: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<U256>, [H256]>;
      /**
       * Interval between committing messages.
       **/
      interval: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      latestCommitment: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array
        ) => Observable<Option<BridgeTypesGenericCommitmentWithBlock>>,
        [BridgeTypesGenericNetworkId]
      >;
      /**
       * Messages waiting to be committed. To update the queue, use `append_message_queue` and `take_message_queue` methods
       * (to keep correct value in [QueuesTotalGas]).
       **/
      messageQueues: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array
        ) => Observable<Vec<BridgeTypesGenericBridgeMessage>>,
        [BridgeTypesGenericNetworkId]
      >;
      queueTotalGas: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array
        ) => Observable<U256>,
        [BridgeTypesGenericNetworkId]
      >;
    };
    bridgeProxy: {
      /**
       * Consumed transfer limit.
       **/
      consumedTransferLimit: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * Assets with transfer limitation.
       **/
      limitedAssets: AugmentedQuery<
        ApiType,
        (arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => Observable<bool>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Amount of assets locked by bridge for specific network. Map ((Network ID, Asset ID) => Locked amount).
       **/
      lockedAssets: AugmentedQuery<
        ApiType,
        (
          arg1:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<u128>,
        [BridgeTypesGenericNetworkId, CommonPrimitivesAssetId32]
      >;
      senders: AugmentedQuery<
        ApiType,
        (
          arg1:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array,
          arg2: H256 | string | Uint8Array
        ) => Observable<Option<AccountId32>>,
        [BridgeTypesGenericNetworkId, H256]
      >;
      transactions: AugmentedQuery<
        ApiType,
        (
          arg1:
            | ITuple<[BridgeTypesGenericNetworkId, AccountId32]>
            | [
                (
                  | BridgeTypesGenericNetworkId
                  | { EVM: any }
                  | { Sub: any }
                  | { EVMLegacy: any }
                  | { TON: any }
                  | string
                  | Uint8Array
                ),
                AccountId32 | string | Uint8Array,
              ],
          arg2: H256 | string | Uint8Array
        ) => Observable<Option<BridgeProxyBridgeRequest>>,
        [ITuple<[BridgeTypesGenericNetworkId, AccountId32]>, H256]
      >;
      /**
       * Maximum amount of assets that can be withdrawn during period of time.
       **/
      transferLimit: AugmentedQuery<ApiType, () => Observable<BridgeProxyTransferLimitSettings>, []>;
      /**
       * Schedule for consumed transfer limit reduce.
       **/
      transferLimitUnlockSchedule: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<u128>,
        [u32]
      >;
    };
    ceresGovernancePlatform: {
      /**
       * Account which has permissions for creating a poll
       **/
      authorityAccount: AugmentedQuery<ApiType, () => Observable<AccountId32>, []>;
      /**
       * Pallet storage version
       **/
      palletStorageVersion: AugmentedQuery<ApiType, () => Observable<CeresGovernancePlatformStorageVersion>, []>;
      pollData: AugmentedQuery<
        ApiType,
        (arg: H256 | string | Uint8Array) => Observable<Option<CeresGovernancePlatformPollInfo>>,
        [H256]
      >;
      /**
       * A vote of a particular user for a particular poll
       **/
      voting: AugmentedQuery<
        ApiType,
        (
          arg1: H256 | string | Uint8Array,
          arg2: AccountId32 | string | Uint8Array
        ) => Observable<Option<CeresGovernancePlatformVotingInfo>>,
        [H256, AccountId32]
      >;
    };
    ceresLaunchpad: {
      /**
       * Account which has permissions for changing CERES burn amount fee
       **/
      authorityAccount: AugmentedQuery<ApiType, () => Observable<AccountId32>, []>;
      /**
       * Amount of CERES for burn fee
       **/
      ceresBurnFeeAmount: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * Amount of CERES for contribution in ILO
       **/
      ceresForContributionInILO: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      contributions: AugmentedQuery<
        ApiType,
        (
          arg1: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          arg2: AccountId32 | string | Uint8Array
        ) => Observable<CeresLaunchpadContributionInfo>,
        [CommonPrimitivesAssetId32, AccountId32]
      >;
      /**
       * Fee percent on raised funds in successful ILO
       **/
      feePercentOnRaisedFunds: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      ilOs: AugmentedQuery<
        ApiType,
        (
          arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<CeresLaunchpadIloInfo>>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Account for collecting penalties
       **/
      penaltiesAccount: AugmentedQuery<ApiType, () => Observable<AccountId32>, []>;
      whitelistedContributors: AugmentedQuery<ApiType, () => Observable<Vec<AccountId32>>, []>;
      whitelistedIloOrganizers: AugmentedQuery<ApiType, () => Observable<Vec<AccountId32>>, []>;
    };
    ceresLiquidityLocker: {
      /**
       * Account which has permissions for changing CERES amount fee
       **/
      authorityAccount: AugmentedQuery<ApiType, () => Observable<AccountId32>, []>;
      /**
       * Account for collecting fees from Option 1
       **/
      feesOptionOneAccount: AugmentedQuery<ApiType, () => Observable<AccountId32>, []>;
      /**
       * Account for collecting fees from Option 2
       **/
      feesOptionTwoAccount: AugmentedQuery<ApiType, () => Observable<AccountId32>, []>;
      /**
       * Amount of CERES for locker fees option two
       **/
      feesOptionTwoCeresAmount: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * Contains data about lockups for each account
       **/
      lockerData: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Vec<CeresLiquidityLockerLockInfo>>,
        [AccountId32]
      >;
      /**
       * Pallet storage version
       **/
      palletStorageVersion: AugmentedQuery<ApiType, () => Observable<CeresLiquidityLockerStorageVersion>, []>;
    };
    ceresStaking: {
      /**
       * Account which has permissions for changing remaining rewards
       **/
      authorityAccount: AugmentedQuery<ApiType, () => Observable<AccountId32>, []>;
      rewardsRemaining: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * AccountId -> StakingInfo
       **/
      stakers: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<CeresStakingStakingInfo>,
        [AccountId32]
      >;
      totalDeposited: AugmentedQuery<ApiType, () => Observable<u128>, []>;
    };
    ceresTokenLocker: {
      /**
       * Account which has permissions for changing fee
       **/
      authorityAccount: AugmentedQuery<ApiType, () => Observable<AccountId32>, []>;
      /**
       * Amount of CERES for locker fees option two
       **/
      feeAmount: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * Account for collecting fees
       **/
      feesAccount: AugmentedQuery<ApiType, () => Observable<AccountId32>, []>;
      /**
       * Pallet storage version
       **/
      palletStorageVersion: AugmentedQuery<ApiType, () => Observable<CeresTokenLockerStorageVersion>, []>;
      tokenLockerData: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Vec<CeresTokenLockerTokenLockInfo>>,
        [AccountId32]
      >;
    };
    council: {
      /**
       * The current members of the collective. This is stored sorted (just by value).
       **/
      members: AugmentedQuery<ApiType, () => Observable<Vec<AccountId32>>, []>;
      /**
       * The prime member that helps determine the default vote behavior in case of absentations.
       **/
      prime: AugmentedQuery<ApiType, () => Observable<Option<AccountId32>>, []>;
      /**
       * Proposals so far.
       **/
      proposalCount: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Actual proposal for a given hash, if it's current.
       **/
      proposalOf: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Option<Call>>, [H256]>;
      /**
       * The hashes of the active proposals.
       **/
      proposals: AugmentedQuery<ApiType, () => Observable<Vec<H256>>, []>;
      /**
       * Votes on a given proposal, if it is ongoing.
       **/
      voting: AugmentedQuery<
        ApiType,
        (arg: H256 | string | Uint8Array) => Observable<Option<PalletCollectiveVotes>>,
        [H256]
      >;
    };
    demeterFarmingPlatform: {
      authorityAccount: AugmentedQuery<ApiType, () => Observable<AccountId32>, []>;
      /**
       * Account for fees
       **/
      feeAccount: AugmentedQuery<ApiType, () => Observable<AccountId32>, []>;
      /**
       * Pallet storage version
       **/
      palletStorageVersion: AugmentedQuery<ApiType, () => Observable<DemeterFarmingPlatformStorageVersion>, []>;
      pools: AugmentedQuery<
        ApiType,
        (
          arg1: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Vec<DemeterFarmingPlatformPoolData>>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32]
      >;
      tokenInfos: AugmentedQuery<
        ApiType,
        (
          arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<DemeterFarmingPlatformTokenInfo>>,
        [CommonPrimitivesAssetId32]
      >;
      userInfos: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Vec<DemeterFarmingPlatformUserInfo>>,
        [AccountId32]
      >;
    };
    democracy: {
      /**
       * A record of who vetoed what. Maps proposal hash to a possible existent block number
       * (until when it may not be resubmitted) and who vetoed it.
       **/
      blacklist: AugmentedQuery<
        ApiType,
        (arg: H256 | string | Uint8Array) => Observable<Option<ITuple<[u32, Vec<AccountId32>]>>>,
        [H256]
      >;
      /**
       * Record of all proposals that have been subject to emergency cancellation.
       **/
      cancellations: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<bool>, [H256]>;
      /**
       * Those who have locked a deposit.
       *
       * TWOX-NOTE: Safe, as increasing integer keys are safe.
       **/
      depositOf: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<Option<ITuple<[Vec<AccountId32>, u128]>>>,
        [u32]
      >;
      /**
       * True if the last referendum tabled was submitted externally. False if it was a public
       * proposal.
       **/
      lastTabledWasExternal: AugmentedQuery<ApiType, () => Observable<bool>, []>;
      /**
       * The lowest referendum index representing an unbaked referendum. Equal to
       * `ReferendumCount` if there isn't a unbaked referendum.
       **/
      lowestUnbaked: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * The referendum to be tabled whenever it would be valid to table an external proposal.
       * This happens when a referendum needs to be tabled and one of two conditions are met:
       * - `LastTabledWasExternal` is `false`; or
       * - `PublicProps` is empty.
       **/
      nextExternal: AugmentedQuery<
        ApiType,
        () => Observable<Option<ITuple<[FrameSupportPreimagesBounded, PalletDemocracyVoteThreshold]>>>,
        []
      >;
      /**
       * The number of (public) proposals that have been made so far.
       **/
      publicPropCount: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * The public proposals. Unsorted. The second item is the proposal.
       **/
      publicProps: AugmentedQuery<
        ApiType,
        () => Observable<Vec<ITuple<[u32, FrameSupportPreimagesBounded, AccountId32]>>>,
        []
      >;
      /**
       * The next free referendum index, aka the number of referenda started so far.
       **/
      referendumCount: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Information concerning any given referendum.
       *
       * TWOX-NOTE: SAFE as indexes are not under an attacker’s control.
       **/
      referendumInfoOf: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<Option<PalletDemocracyReferendumInfo>>,
        [u32]
      >;
      /**
       * All votes for a particular voter. We store the balance for the number of votes that we
       * have recorded. The second item is the total amount of delegations, that will be added.
       *
       * TWOX-NOTE: SAFE as `AccountId`s are crypto hashes anyway.
       **/
      votingOf: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<PalletDemocracyVoteVoting>,
        [AccountId32]
      >;
    };
    denomination: {
      currentMigrationStage: AugmentedQuery<ApiType, () => Observable<DenominationMigrationStage>, []>;
      denominator: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      removeAccountsCursor: AugmentedQuery<ApiType, () => Observable<Option<Bytes>>, []>;
    };
    dexapi: {
      enabledSourceTypes: AugmentedQuery<ApiType, () => Observable<Vec<CommonPrimitivesLiquiditySourceType>>, []>;
    };
    dexManager: {
      dexInfos: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<Option<CommonPrimitivesDexInfo>>,
        [u32]
      >;
    };
    dispatch: {};
    electionProviderMultiPhase: {
      /**
       * Current phase.
       **/
      currentPhase: AugmentedQuery<ApiType, () => Observable<PalletElectionProviderMultiPhasePhase>, []>;
      /**
       * Desired number of targets to elect for this round.
       *
       * Only exists when [`Snapshot`] is present.
       **/
      desiredTargets: AugmentedQuery<ApiType, () => Observable<Option<u32>>, []>;
      /**
       * The minimum score that each 'untrusted' solution must attain in order to be considered
       * feasible.
       *
       * Can be set via `set_minimum_untrusted_score`.
       **/
      minimumUntrustedScore: AugmentedQuery<ApiType, () => Observable<Option<SpNposElectionsElectionScore>>, []>;
      /**
       * Current best solution, signed or unsigned, queued to be returned upon `elect`.
       **/
      queuedSolution: AugmentedQuery<
        ApiType,
        () => Observable<Option<PalletElectionProviderMultiPhaseReadySolution>>,
        []
      >;
      /**
       * Internal counter for the number of rounds.
       *
       * This is useful for de-duplication of transactions submitted to the pool, and general
       * diagnostics of the pallet.
       *
       * This is merely incremented once per every time that an upstream `elect` is called.
       **/
      round: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * A sorted, bounded vector of `(score, block_number, index)`, where each `index` points to a
       * value in `SignedSubmissions`.
       *
       * We never need to process more than a single signed submission at a time. Signed submissions
       * can be quite large, so we're willing to pay the cost of multiple database accesses to access
       * them one at a time instead of reading and decoding all of them at once.
       **/
      signedSubmissionIndices: AugmentedQuery<
        ApiType,
        () => Observable<Vec<ITuple<[SpNposElectionsElectionScore, u32, u32]>>>,
        []
      >;
      /**
       * The next index to be assigned to an incoming signed submission.
       *
       * Every accepted submission is assigned a unique index; that index is bound to that particular
       * submission for the duration of the election. On election finalization, the next index is
       * reset to 0.
       *
       * We can't just use `SignedSubmissionIndices.len()`, because that's a bounded set; past its
       * capacity, it will simply saturate. We can't just iterate over `SignedSubmissionsMap`,
       * because iteration is slow. Instead, we store the value here.
       **/
      signedSubmissionNextIndex: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Unchecked, signed solutions.
       *
       * Together with `SubmissionIndices`, this stores a bounded set of `SignedSubmissions` while
       * allowing us to keep only a single one in memory at a time.
       *
       * Twox note: the key of the map is an auto-incrementing index which users cannot inspect or
       * affect; we shouldn't need a cryptographically secure hasher.
       **/
      signedSubmissionsMap: AugmentedQuery<
        ApiType,
        (
          arg: u32 | AnyNumber | Uint8Array
        ) => Observable<Option<PalletElectionProviderMultiPhaseSignedSignedSubmission>>,
        [u32]
      >;
      /**
       * Snapshot data of the round.
       *
       * This is created at the beginning of the signed phase and cleared upon calling `elect`.
       **/
      snapshot: AugmentedQuery<ApiType, () => Observable<Option<PalletElectionProviderMultiPhaseRoundSnapshot>>, []>;
      /**
       * The metadata of the [`RoundSnapshot`]
       *
       * Only exists when [`Snapshot`] is present.
       **/
      snapshotMetadata: AugmentedQuery<
        ApiType,
        () => Observable<Option<PalletElectionProviderMultiPhaseSolutionOrSnapshotSize>>,
        []
      >;
    };
    electionsPhragmen: {
      /**
       * The present candidate list. A current member or runner-up can never enter this vector
       * and is always implicitly assumed to be a candidate.
       *
       * Second element is the deposit.
       *
       * Invariant: Always sorted based on account id.
       **/
      candidates: AugmentedQuery<ApiType, () => Observable<Vec<ITuple<[AccountId32, u128]>>>, []>;
      /**
       * The total number of vote rounds that have happened, excluding the upcoming one.
       **/
      electionRounds: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * The current elected members.
       *
       * Invariant: Always sorted based on account id.
       **/
      members: AugmentedQuery<ApiType, () => Observable<Vec<PalletElectionsPhragmenSeatHolder>>, []>;
      /**
       * The current reserved runners-up.
       *
       * Invariant: Always sorted based on rank (worse to best). Upon removal of a member, the
       * last (i.e. _best_) runner-up will be replaced.
       **/
      runnersUp: AugmentedQuery<ApiType, () => Observable<Vec<PalletElectionsPhragmenSeatHolder>>, []>;
      /**
       * Votes and locked stake of a particular voter.
       *
       * TWOX-NOTE: SAFE as `AccountId` is a crypto hash.
       **/
      voting: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<PalletElectionsPhragmenVoter>,
        [AccountId32]
      >;
    };
    ethBridge: {
      /**
       * Requests made by an account.
       **/
      accountRequests: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Vec<ITuple<[u32, H256]>>>,
        [AccountId32]
      >;
      /**
       * Thischain authority account.
       **/
      authorityAccount: AugmentedQuery<ApiType, () => Observable<Option<AccountId32>>, []>;
      /**
       * Multi-signature bridge peers' account. `None` if there is no account and network with the given ID.
       **/
      bridgeAccount: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<Option<AccountId32>>,
        [u32]
      >;
      /**
       * Smart-contract address on Sidechain.
       **/
      bridgeContractAddress: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<H160>, [u32]>;
      bridgeSignatureVersions: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<EthBridgeBridgeSignatureVersion>,
        [u32]
      >;
      /**
       * Bridge status.
       **/
      bridgeStatuses: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<Option<EthBridgeBridgeStatus>>,
        [u32]
      >;
      /**
       * Used to identify an incoming request by the corresponding load request.
       **/
      loadToIncomingRequestHash: AugmentedQuery<
        ApiType,
        (arg1: u32 | AnyNumber | Uint8Array, arg2: H256 | string | Uint8Array) => Observable<H256>,
        [u32, H256]
      >;
      /**
       * Requests migrating from version '0.1.0' to '0.2.0'. These requests should be removed from
       * `RequestsQueue` before migration procedure started.
       **/
      migratingRequests: AugmentedQuery<ApiType, () => Observable<Vec<H256>>, []>;
      /**
       * Next Network ID counter.
       **/
      nextNetworkId: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Peer account ID on Thischain.
       **/
      peerAccountId: AugmentedQuery<
        ApiType,
        (arg1: u32 | AnyNumber | Uint8Array, arg2: H160 | string | Uint8Array) => Observable<Option<AccountId32>>,
        [u32, H160]
      >;
      /**
       * Peer address on Sidechain.
       **/
      peerAddress: AugmentedQuery<
        ApiType,
        (arg1: u32 | AnyNumber | Uint8Array, arg2: AccountId32 | string | Uint8Array) => Observable<H160>,
        [u32, AccountId32]
      >;
      /**
       * Network peers set.
       **/
      peers: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<BTreeSet<AccountId32>>, [u32]>;
      pendingBridgeSignatureVersions: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<Option<EthBridgeBridgeSignatureVersion>>,
        [u32]
      >;
      /**
       * Used for compatibility with XOR and VAL contracts.
       **/
      pendingEthPeersSync: AugmentedQuery<ApiType, () => Observable<EthBridgeRequestsOutgoingEthPeersSync>, []>;
      /**
       * Network pending (being added/removed) peer.
       **/
      pendingPeer: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<Option<AccountId32>>,
        [u32]
      >;
      /**
       * Registered asset kind.
       **/
      registeredAsset: AugmentedQuery<
        ApiType,
        (
          arg1: u32 | AnyNumber | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<EthBridgeRequestsAssetKind>>,
        [u32, CommonPrimitivesAssetId32]
      >;
      /**
       * Registered token `AssetId` on Thischain.
       **/
      registeredSidechainAsset: AugmentedQuery<
        ApiType,
        (
          arg1: u32 | AnyNumber | Uint8Array,
          arg2: H160 | string | Uint8Array
        ) => Observable<Option<CommonPrimitivesAssetId32>>,
        [u32, H160]
      >;
      /**
       * Registered asset address on Sidechain.
       **/
      registeredSidechainToken: AugmentedQuery<
        ApiType,
        (
          arg1: u32 | AnyNumber | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<H160>>,
        [u32, CommonPrimitivesAssetId32]
      >;
      /**
       * Outgoing requests approvals.
       **/
      requestApprovals: AugmentedQuery<
        ApiType,
        (
          arg1: u32 | AnyNumber | Uint8Array,
          arg2: H256 | string | Uint8Array
        ) => Observable<BTreeSet<EthBridgeOffchainSignatureParams>>,
        [u32, H256]
      >;
      /**
       * Registered requests.
       **/
      requests: AugmentedQuery<
        ApiType,
        (
          arg1: u32 | AnyNumber | Uint8Array,
          arg2: H256 | string | Uint8Array
        ) => Observable<Option<EthBridgeRequestsOffchainRequest>>,
        [u32, H256]
      >;
      /**
       * Registered requests queue handled by off-chain workers.
       **/
      requestsQueue: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<Vec<H256>>, [u32]>;
      /**
       * Requests statuses.
       **/
      requestStatuses: AugmentedQuery<
        ApiType,
        (
          arg1: u32 | AnyNumber | Uint8Array,
          arg2: H256 | string | Uint8Array
        ) => Observable<Option<EthBridgeRequestsRequestStatus>>,
        [u32, H256]
      >;
      /**
       * Requests submission height map (on substrate).
       **/
      requestSubmissionHeight: AugmentedQuery<
        ApiType,
        (arg1: u32 | AnyNumber | Uint8Array, arg2: H256 | string | Uint8Array) => Observable<u32>,
        [u32, H256]
      >;
      /**
       * Precision (decimals) of a registered sidechain asset. Should be the same as in the ERC-20
       * contract.
       **/
      sidechainAssetPrecision: AugmentedQuery<
        ApiType,
        (
          arg1: u32 | AnyNumber | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<u8>,
        [u32, CommonPrimitivesAssetId32]
      >;
      /**
       * Sora VAL master contract address.
       **/
      valMasterContractAddress: AugmentedQuery<ApiType, () => Observable<H160>, []>;
      /**
       * Sora XOR master contract address.
       **/
      xorMasterContractAddress: AugmentedQuery<ApiType, () => Observable<H160>, []>;
    };
    evmFungibleApp: {
      appAddresses: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Option<H160>>, [H256]>;
      assetKinds: AugmentedQuery<
        ApiType,
        (
          arg1: H256 | string | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<BridgeTypesAssetKind>>,
        [H256, CommonPrimitivesAssetId32]
      >;
      assetsByAddresses: AugmentedQuery<
        ApiType,
        (
          arg1: H256 | string | Uint8Array,
          arg2: H160 | string | Uint8Array
        ) => Observable<Option<CommonPrimitivesAssetId32>>,
        [H256, H160]
      >;
      /**
       * Base fees
       **/
      baseFees: AugmentedQuery<
        ApiType,
        (arg: H256 | string | Uint8Array) => Observable<Option<EvmFungibleAppBaseFeeInfo>>,
        [H256]
      >;
      /**
       * Collected fees
       **/
      collectedFees: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<U256>, [H256]>;
      sidechainPrecision: AugmentedQuery<
        ApiType,
        (
          arg1: H256 | string | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<u8>>,
        [H256, CommonPrimitivesAssetId32]
      >;
      /**
       * Fees spend by relayer
       **/
      spentFees: AugmentedQuery<
        ApiType,
        (arg1: H256 | string | Uint8Array, arg2: H160 | string | Uint8Array) => Observable<U256>,
        [H256, H160]
      >;
      tokenAddresses: AugmentedQuery<
        ApiType,
        (
          arg1: H256 | string | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<H160>>,
        [H256, CommonPrimitivesAssetId32]
      >;
    };
    extendedAssets: {
      /**
       * Mapping from Regulated asset id to SBT asset id
       **/
      regulatedAssetToSoulboundAsset: AugmentedQuery<
        ApiType,
        (
          arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<CommonPrimitivesAssetId32>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Mapping from SBT asset id to its expiration per account
       **/
      sbtExpiration: AugmentedQuery<
        ApiType,
        (
          arg1: AccountId32 | string | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<u64>>,
        [AccountId32, CommonPrimitivesAssetId32]
      >;
      /**
       * Mapping from SBT (asset_id) to its metadata
       **/
      soulboundAsset: AugmentedQuery<
        ApiType,
        (
          arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<ExtendedAssetsSoulboundTokenMetadata>>,
        [CommonPrimitivesAssetId32]
      >;
    };
    farming: {
      lpMinXorForBonusReward: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * Farmers of the pool. Pool => Farmers
       **/
      poolFarmers: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Vec<FarmingPoolFarmer>>,
        [AccountId32]
      >;
      /**
       * Pools whose farmers are refreshed at the specific block. Block => Pools
       **/
      pools: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<Vec<AccountId32>>, [u32]>;
    };
    grandpa: {
      /**
       * The number of changes (both in terms of keys and underlying economic responsibilities)
       * in the "set" of Grandpa validators from genesis.
       **/
      currentSetId: AugmentedQuery<ApiType, () => Observable<u64>, []>;
      /**
       * next block number where we can force a change.
       **/
      nextForced: AugmentedQuery<ApiType, () => Observable<Option<u32>>, []>;
      /**
       * Pending change: (signaled at, scheduled change).
       **/
      pendingChange: AugmentedQuery<ApiType, () => Observable<Option<PalletGrandpaStoredPendingChange>>, []>;
      /**
       * A mapping from grandpa set ID to the index of the *most recent* session for which its
       * members were responsible.
       *
       * This is only used for validating equivocation proofs. An equivocation proof must
       * contains a key-ownership proof for a given session, therefore we need a way to tie
       * together sessions and GRANDPA set ids, i.e. we need to validate that a validator
       * was the owner of a given key on a given session, and what the active set ID was
       * during that session.
       *
       * TWOX-NOTE: `SetId` is not under user control.
       **/
      setIdSession: AugmentedQuery<ApiType, (arg: u64 | AnyNumber | Uint8Array) => Observable<Option<u32>>, [u64]>;
      /**
       * `true` if we are currently stalled.
       **/
      stalled: AugmentedQuery<ApiType, () => Observable<Option<ITuple<[u32, u32]>>>, []>;
      /**
       * State of the current authority set.
       **/
      state: AugmentedQuery<ApiType, () => Observable<PalletGrandpaStoredState>, []>;
    };
    hermesGovernancePlatform: {
      /**
       * Account which has permissions for changing Hermes minimum amount for voting and creating a poll
       **/
      authorityAccount: AugmentedQuery<ApiType, () => Observable<AccountId32>, []>;
      hermesPollData: AugmentedQuery<
        ApiType,
        (arg: H256 | string | Uint8Array) => Observable<Option<HermesGovernancePlatformHermesPollInfo>>,
        [H256]
      >;
      /**
       * A vote of a particular user for a particular poll
       **/
      hermesVotings: AugmentedQuery<
        ApiType,
        (
          arg1: H256 | string | Uint8Array,
          arg2: AccountId32 | string | Uint8Array
        ) => Observable<Option<HermesGovernancePlatformHermesVotingInfo>>,
        [H256, AccountId32]
      >;
      minimumHermesAmountForCreatingPoll: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      minimumHermesVotingAmount: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * Pallet storage version
       **/
      palletStorageVersion: AugmentedQuery<ApiType, () => Observable<HermesGovernancePlatformStorageVersion>, []>;
    };
    identity: {
      /**
       * Information that is pertinent to identify the entity behind an account.
       *
       * TWOX-NOTE: OK ― `AccountId` is a secure hash.
       **/
      identityOf: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Option<PalletIdentityRegistration>>,
        [AccountId32]
      >;
      /**
       * The set of registrars. Not expected to get very big as can only be added through a
       * special origin (likely a council motion).
       *
       * The index into this can be cast to `RegistrarIndex` to get a valid value.
       **/
      registrars: AugmentedQuery<ApiType, () => Observable<Vec<Option<PalletIdentityRegistrarInfo>>>, []>;
      /**
       * Alternative "sub" identities of this account.
       *
       * The first item is the deposit, the second is a vector of the accounts.
       *
       * TWOX-NOTE: OK ― `AccountId` is a secure hash.
       **/
      subsOf: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<ITuple<[u128, Vec<AccountId32>]>>,
        [AccountId32]
      >;
      /**
       * The super-identity of an alternative "sub" identity together with its name, within that
       * context. If the account is not some other account's sub-identity, then just `None`.
       **/
      superOf: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Option<ITuple<[AccountId32, Data]>>>,
        [AccountId32]
      >;
    };
    imOnline: {
      /**
       * For each session index, we keep a mapping of `ValidatorId<T>` to the
       * number of blocks authored by the given authority.
       **/
      authoredBlocks: AugmentedQuery<
        ApiType,
        (arg1: u32 | AnyNumber | Uint8Array, arg2: AccountId32 | string | Uint8Array) => Observable<u32>,
        [u32, AccountId32]
      >;
      /**
       * The block number after which it's ok to send heartbeats in the current
       * session.
       *
       * At the beginning of each session we set this to a value that should fall
       * roughly in the middle of the session duration. The idea is to first wait for
       * the validators to produce a block in the current session, so that the
       * heartbeat later on will not be necessary.
       *
       * This value will only be used as a fallback if we fail to get a proper session
       * progress estimate from `NextSessionRotation`, as those estimates should be
       * more accurate then the value we calculate for `HeartbeatAfter`.
       **/
      heartbeatAfter: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * The current set of keys that may issue a heartbeat.
       **/
      keys: AugmentedQuery<ApiType, () => Observable<Vec<PalletImOnlineSr25519AppSr25519Public>>, []>;
      /**
       * For each session index, we keep a mapping of `SessionIndex` and `AuthIndex` to
       * `WrapperOpaque<BoundedOpaqueNetworkState>`.
       **/
      receivedHeartbeats: AugmentedQuery<
        ApiType,
        (
          arg1: u32 | AnyNumber | Uint8Array,
          arg2: u32 | AnyNumber | Uint8Array
        ) => Observable<Option<WrapperOpaque<PalletImOnlineBoundedOpaqueNetworkState>>>,
        [u32, u32]
      >;
    };
    irohaMigration: {
      account: AugmentedQuery<ApiType, () => Observable<Option<AccountId32>>, []>;
      balances: AugmentedQuery<ApiType, (arg: Text | string) => Observable<Option<u128>>, [Text]>;
      migratedAccounts: AugmentedQuery<ApiType, (arg: Text | string) => Observable<Option<AccountId32>>, [Text]>;
      pendingMultiSigAccounts: AugmentedQuery<
        ApiType,
        (arg: Text | string) => Observable<IrohaMigrationPendingMultisigAccount>,
        [Text]
      >;
      pendingReferrals: AugmentedQuery<ApiType, (arg: Text | string) => Observable<Vec<AccountId32>>, [Text]>;
      publicKeys: AugmentedQuery<ApiType, (arg: Text | string) => Observable<Vec<ITuple<[bool, Text]>>>, [Text]>;
      quorums: AugmentedQuery<ApiType, (arg: Text | string) => Observable<u8>, [Text]>;
      referrers: AugmentedQuery<ApiType, (arg: Text | string) => Observable<Option<Text>>, [Text]>;
    };
    jettonApp: {
      appInfo: AugmentedQuery<
        ApiType,
        () => Observable<Option<ITuple<[BridgeTypesTonTonNetworkId, BridgeTypesTonTonAddress]>>>,
        []
      >;
      assetKinds: AugmentedQuery<
        ApiType,
        (
          arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<BridgeTypesAssetKind>>,
        [CommonPrimitivesAssetId32]
      >;
      assetsByAddresses: AugmentedQuery<
        ApiType,
        (
          arg: BridgeTypesTonTonAddress | { workchain?: any; address?: any } | string | Uint8Array
        ) => Observable<Option<CommonPrimitivesAssetId32>>,
        [BridgeTypesTonTonAddress]
      >;
      sidechainPrecision: AugmentedQuery<
        ApiType,
        (arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => Observable<Option<u8>>,
        [CommonPrimitivesAssetId32]
      >;
      tokenAddresses: AugmentedQuery<
        ApiType,
        (
          arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<BridgeTypesTonTonAddress>>,
        [CommonPrimitivesAssetId32]
      >;
    };
    kensetsu: {
      /**
       * Borrows tax applied on borrow amount in any stablecoin and used to buy back and incentivize
       * KEN. It is a risk parameter.
       **/
      borrowTax: AugmentedQuery<ApiType, () => Observable<Percent>, []>;
      /**
       * Storage of all CDPs, where key is a unique CDP identifier
       **/
      cdpDepository: AugmentedQuery<
        ApiType,
        (arg: u128 | AnyNumber | Uint8Array) => Observable<Option<KensetsuCollateralizedDebtPosition>>,
        [u128]
      >;
      /**
       * Index links owner to CDP ids, not needed by protocol, but used by front-end
       **/
      cdpOwnerIndex: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Option<Vec<u128>>>,
        [AccountId32]
      >;
      /**
       * Parameters for collaterals, include risk parameters and interest recalculation coefficients.
       * Map (Collateral asset id, Stablecoin asset id => CollateralInfo)
       **/
      collateralInfos: AugmentedQuery<
        ApiType,
        (
          arg:
            | KensetsuStablecoinCollateralIdentifier
            | { collateralAssetId?: any; stablecoinAssetId?: any }
            | string
            | Uint8Array
        ) => Observable<Option<KensetsuCollateralInfo>>,
        [KensetsuStablecoinCollateralIdentifier]
      >;
      /**
       * Borrow tax applied on borrow amount in KXOR and used to buy back and incentivize KARMA.
       **/
      karmaBorrowTax: AugmentedQuery<ApiType, () => Observable<Percent>, []>;
      /**
       * Flag indicates that liquidation took place in this block. Only one liquidation per block is
       * allowed, the flag is dropped every block.
       **/
      liquidatedThisBlock: AugmentedQuery<ApiType, () => Observable<bool>, []>;
      /**
       * Liquidation penalty
       **/
      liquidationPenalty: AugmentedQuery<ApiType, () => Observable<Percent>, []>;
      /**
       * CDP counter used for CDP id
       **/
      nextCDPId: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * Stablecoin parameters
       **/
      stablecoinInfos: AugmentedQuery<
        ApiType,
        (
          arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<KensetsuStablecoinInfo>>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Borrow tax applied on borrow amount in KXOR and used to buy back and burn TBCD.
       **/
      tbcdBorrowTax: AugmentedQuery<ApiType, () => Observable<Percent>, []>;
    };
    leafProvider: {
      /**
       * Latest digest
       **/
      latestDigest: AugmentedQuery<ApiType, () => Observable<Option<Vec<BridgeTypesAuxiliaryDigestItem>>>, []>;
    };
    mmr: {
      /**
       * Hashes of the nodes in the MMR.
       *
       * Note this collection only contains MMR peaks, the inner nodes (and leaves)
       * are pruned and only stored in the Offchain DB.
       **/
      nodes: AugmentedQuery<ApiType, (arg: u64 | AnyNumber | Uint8Array) => Observable<Option<H256>>, [u64]>;
      /**
       * Current size of the MMR (number of leaves).
       **/
      numberOfLeaves: AugmentedQuery<ApiType, () => Observable<u64>, []>;
      /**
       * Latest MMR Root hash.
       **/
      rootHash: AugmentedQuery<ApiType, () => Observable<H256>, []>;
    };
    mmrLeaf: {
      /**
       * Details of current BEEFY authority set.
       **/
      beefyAuthorities: AugmentedQuery<ApiType, () => Observable<SpBeefyMmrBeefyAuthoritySet>, []>;
      /**
       * Details of next BEEFY authority set.
       *
       * This storage entry is used as cache for calls to `update_beefy_next_authority_set`.
       **/
      beefyNextAuthorities: AugmentedQuery<ApiType, () => Observable<SpBeefyMmrBeefyAuthoritySet>, []>;
    };
    multicollateralBondingCurvePool: {
      /**
       * Coefficient which determines the fraction of input collateral token to be exchanged to XOR and
       * be distributed to predefined accounts. Relevant for the Buy function (when a user buys new XOR).
       **/
      alwaysDistributeCoefficient: AugmentedQuery<ApiType, () => Observable<FixnumFixedPoint>, []>;
      /**
       * Reward multipliers for special assets. Asset Id => Reward Multiplier
       **/
      assetsWithOptionalRewardMultiplier: AugmentedQuery<
        ApiType,
        (arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => Observable<Option<FixnumFixedPoint>>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Base fee in XOR which is deducted on all trades, currently it's burned: 0.3%
       **/
      baseFee: AugmentedQuery<ApiType, () => Observable<FixnumFixedPoint>, []>;
      /**
       * Current reserves balance for collateral tokens, used for client usability.
       **/
      collateralReserves: AugmentedQuery<
        ApiType,
        (arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => Observable<u128>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Accounts that receive 20% buy/sell margin according to predefined proportions
       **/
      distributionAccountsEntry: AugmentedQuery<
        ApiType,
        () => Observable<MulticollateralBondingCurvePoolDistributionAccounts>,
        []
      >;
      /**
       * Collateral Assets allowed to be sold by the token bonding curve
       **/
      enabledTargets: AugmentedQuery<ApiType, () => Observable<BTreeSet<CommonPrimitivesAssetId32>>, []>;
      freeReservesAccountId: AugmentedQuery<ApiType, () => Observable<Option<AccountId32>>, []>;
      /**
       * Account which stores actual PSWAP intended for rewards
       **/
      incentivesAccountId: AugmentedQuery<ApiType, () => Observable<Option<AccountId32>>, []>;
      /**
       * Number of reserve currencies selling which user will get rewards, namely all registered collaterals except PSWAP and VAL
       **/
      incentivisedCurrenciesNum: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Buy price starting constant. This is the price users pay for new XOR.
       **/
      initialPrice: AugmentedQuery<ApiType, () => Observable<FixnumFixedPoint>, []>;
      /**
       * Amount of PSWAP initially stored in account dedicated for TBC rewards. Actual account balance will deplete over time,
       * however this constant is not modified
       **/
      initialPswapRewardsSupply: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      pendingFreeReserves: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<BTreeMap<CommonPrimitivesAssetId32, u128>>,
        [u32]
      >;
      priceChangeRate: AugmentedQuery<ApiType, () => Observable<FixnumFixedPoint>, []>;
      /**
       * Coefficients in buy price function.
       **/
      priceChangeStep: AugmentedQuery<ApiType, () => Observable<FixnumFixedPoint>, []>;
      /**
       * Asset that is used to compare collateral assets by value, e.g., DAI
       **/
      referenceAssetId: AugmentedQuery<ApiType, () => Observable<CommonPrimitivesAssetId32>, []>;
      /**
       * Technical account used to store collateral tokens.
       **/
      reservesAcc: AugmentedQuery<ApiType, () => Observable<CommonPrimitivesTechAccountId>, []>;
      /**
       * Registry to store information about rewards owned by users in PSWAP. (claim_limit, available_rewards)
       **/
      rewards: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<ITuple<[u128, u128]>>,
        [AccountId32]
      >;
      /**
       * Sets the sell function as a fraction of the buy function, so there is margin between the two functions.
       **/
      sellPriceCoefficient: AugmentedQuery<ApiType, () => Observable<FixnumFixedPoint>, []>;
      /**
       * Total amount of PSWAP owned by accounts
       **/
      totalRewards: AugmentedQuery<ApiType, () => Observable<u128>, []>;
    };
    multisig: {
      /**
       * The set of open multisig operations.
       **/
      multisigs: AugmentedQuery<
        ApiType,
        (
          arg1: AccountId32 | string | Uint8Array,
          arg2: U8aFixed | string | Uint8Array
        ) => Observable<Option<PalletMultisigMultisig>>,
        [AccountId32, U8aFixed]
      >;
    };
    multisigVerifier: {
      peerKeys: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array
        ) => Observable<Option<BTreeSet<SpCoreEcdsaPublic>>>,
        [BridgeTypesGenericNetworkId]
      >;
    };
    offences: {
      /**
       * A vector of reports of the same kind that happened at the same time slot.
       **/
      concurrentReportsIndex: AugmentedQuery<
        ApiType,
        (arg1: U8aFixed | string | Uint8Array, arg2: Bytes | string | Uint8Array) => Observable<Vec<H256>>,
        [U8aFixed, Bytes]
      >;
      /**
       * The primary structure that holds all offence records keyed by report identifiers.
       **/
      reports: AugmentedQuery<
        ApiType,
        (arg: H256 | string | Uint8Array) => Observable<Option<SpStakingOffenceOffenceDetails>>,
        [H256]
      >;
      /**
       * Enumerates all reports of a kind along with the time they happened.
       *
       * All reports are sorted by the time of offence.
       *
       * Note that the actual type of this mapping is `Vec<u8>`, this is because values of
       * different types are not supported at the moment so we are doing the manual serialization.
       **/
      reportsByKindIndex: AugmentedQuery<
        ApiType,
        (arg: U8aFixed | string | Uint8Array) => Observable<Bytes>,
        [U8aFixed]
      >;
    };
    oracleProxy: {
      enabledOracles: AugmentedQuery<ApiType, () => Observable<BTreeSet<CommonPrimitivesOracle>>, []>;
      symbolProviders: AugmentedQuery<
        ApiType,
        (arg: Bytes | string | Uint8Array) => Observable<Option<CommonPrimitivesOracle>>,
        [Bytes]
      >;
    };
    orderBook: {
      /**
       * The index contains the aggregated information about asks with total volume of orders for each price.
       **/
      aggregatedAsks: AugmentedQuery<
        ApiType,
        (
          arg: CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array
        ) => Observable<BTreeMap<CommonBalanceUnit, CommonBalanceUnit>>,
        [CommonPrimitivesOrderBookId]
      >;
      /**
       * The index contains the aggregated information about bids with total volume of orders for each price.
       **/
      aggregatedBids: AugmentedQuery<
        ApiType,
        (
          arg: CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array
        ) => Observable<BTreeMap<CommonBalanceUnit, CommonBalanceUnit>>,
        [CommonPrimitivesOrderBookId]
      >;
      /**
       * The tech storage that is used during the process of updating the order book.
       **/
      alignmentCursor: AugmentedQuery<
        ApiType,
        (
          arg: CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array
        ) => Observable<Option<u128>>,
        [CommonPrimitivesOrderBookId]
      >;
      /**
       * The index contains the list with the ask order `id` for each price.
       **/
      asks: AugmentedQuery<
        ApiType,
        (
          arg1: CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array,
          arg2: CommonBalanceUnit | { inner?: any; isDivisible?: any } | string | Uint8Array
        ) => Observable<Option<Vec<u128>>>,
        [CommonPrimitivesOrderBookId, CommonBalanceUnit]
      >;
      /**
       * The index contains the list with the bid order `id` for each price.
       **/
      bids: AugmentedQuery<
        ApiType,
        (
          arg1: CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array,
          arg2: CommonBalanceUnit | { inner?: any; isDivisible?: any } | string | Uint8Array
        ) => Observable<Option<Vec<u128>>>,
        [CommonPrimitivesOrderBookId, CommonBalanceUnit]
      >;
      /**
       * The tech storage that is used in the order expiration mechanism.
       **/
      expirationsAgenda: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<Vec<ITuple<[CommonPrimitivesOrderBookId, u128]>>>,
        [u32]
      >;
      /**
       * Earliest block with incomplete expirations;
       * Weight limit might not allow to finish all expirations for a block
       * so they might be operated later.
       **/
      incompleteExpirationsSince: AugmentedQuery<ApiType, () => Observable<Option<u32>>, []>;
      /**
       * The storage contains the information about all limit orders in all order books.
       **/
      limitOrders: AugmentedQuery<
        ApiType,
        (
          arg1: CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array,
          arg2: u128 | AnyNumber | Uint8Array
        ) => Observable<Option<OrderBookLimitOrder>>,
        [CommonPrimitivesOrderBookId, u128]
      >;
      /**
       * The storage contains the information about order book, it's parameters and statuses.
       **/
      orderBooks: AugmentedQuery<
        ApiType,
        (
          arg: CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array
        ) => Observable<Option<OrderBook>>,
        [CommonPrimitivesOrderBookId]
      >;
      /**
       * The index contains the list with the order `id` for the user in different order books.
       **/
      userLimitOrders: AugmentedQuery<
        ApiType,
        (
          arg1: AccountId32 | string | Uint8Array,
          arg2: CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array
        ) => Observable<Option<Vec<u128>>>,
        [AccountId32, CommonPrimitivesOrderBookId]
      >;
    };
    parachainBridgeApp: {
      allowedParachainAssets: AugmentedQuery<
        ApiType,
        (
          arg1:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          arg2: u32 | AnyNumber | Uint8Array
        ) => Observable<Vec<CommonPrimitivesAssetId32>>,
        [BridgeTypesSubNetworkId, u32]
      >;
      assetKinds: AugmentedQuery<
        ApiType,
        (
          arg1:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<BridgeTypesAssetKind>>,
        [BridgeTypesSubNetworkId, CommonPrimitivesAssetId32]
      >;
      relaychainAsset: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array
        ) => Observable<Option<CommonPrimitivesAssetId32>>,
        [BridgeTypesSubNetworkId]
      >;
      sidechainPrecision: AugmentedQuery<
        ApiType,
        (
          arg1:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<u8>>,
        [BridgeTypesSubNetworkId, CommonPrimitivesAssetId32]
      >;
    };
    permissions: {
      owners: AugmentedQuery<
        ApiType,
        (
          arg1: u32 | AnyNumber | Uint8Array,
          arg2: PermissionsScope | { Limited: any } | { Unlimited: any } | string | Uint8Array
        ) => Observable<Vec<AccountId32>>,
        [u32, PermissionsScope]
      >;
      permissions: AugmentedQuery<
        ApiType,
        (
          arg1: AccountId32 | string | Uint8Array,
          arg2: PermissionsScope | { Limited: any } | { Unlimited: any } | string | Uint8Array
        ) => Observable<Vec<u32>>,
        [AccountId32, PermissionsScope]
      >;
    };
    poolXYK: {
      /**
       * Set of pools in which accounts have some share.
       * Liquidity provider account => Target Asset of pair (assuming base asset is XOR)
       **/
      accountPools: AugmentedQuery<
        ApiType,
        (
          arg1: AccountId32 | string | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<BTreeSet<CommonPrimitivesAssetId32>>,
        [AccountId32, CommonPrimitivesAssetId32]
      >;
      /**
       * Liquidity providers of particular pool.
       * Pool account => Liquidity provider account => Pool token balance
       **/
      poolProviders: AugmentedQuery<
        ApiType,
        (arg1: AccountId32 | string | Uint8Array, arg2: AccountId32 | string | Uint8Array) => Observable<Option<u128>>,
        [AccountId32, AccountId32]
      >;
      /**
       * Properties of particular pool. Base Asset => Target Asset => (Reserves Account Id, Fees Account Id)
       **/
      properties: AugmentedQuery<
        ApiType,
        (
          arg1: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<ITuple<[AccountId32, AccountId32]>>>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32]
      >;
      /**
       * Updated after last liquidity change operation.
       * [Base Asset Id (XOR) -> Target Asset Id => (Base Balance, Target Balance)].
       * This storage records is not used as source of information, but used as quick cache for
       * information that comes from balances for assets from technical accounts.
       * For example, communication with technical accounts and their storage is not needed, and this
       * pair to balance cache can be used quickly.
       **/
      reserves: AugmentedQuery<
        ApiType,
        (
          arg1: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<ITuple<[u128, u128]>>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32]
      >;
      /**
       * Total issuance of particular pool.
       * Pool account => Total issuance
       **/
      totalIssuances: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Option<u128>>,
        [AccountId32]
      >;
    };
    preimage: {
      preimageFor: AugmentedQuery<
        ApiType,
        (
          arg: ITuple<[H256, u32]> | [H256 | string | Uint8Array, u32 | AnyNumber | Uint8Array]
        ) => Observable<Option<Bytes>>,
        [ITuple<[H256, u32]>]
      >;
      /**
       * The request status of a given hash.
       **/
      statusFor: AugmentedQuery<
        ApiType,
        (arg: H256 | string | Uint8Array) => Observable<Option<PalletPreimageRequestStatus>>,
        [H256]
      >;
    };
    presto: {
      /**
       * Presto auditors
       **/
      auditors: AugmentedQuery<ApiType, () => Observable<Vec<AccountId32>>, []>;
      /**
       * Coupons
       **/
      coupons: AugmentedQuery<
        ApiType,
        (arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => Observable<Option<PrestoCouponInfo>>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Crop receipts
       **/
      cropReceipts: AugmentedQuery<
        ApiType,
        (arg: u64 | AnyNumber | Uint8Array) => Observable<Option<PrestoCropReceipt>>,
        [u64]
      >;
      /**
       * Crop receipts content
       **/
      cropReceiptsContent: AugmentedQuery<
        ApiType,
        (arg: u64 | AnyNumber | Uint8Array) => Observable<Option<PrestoCropReceiptCropReceiptContent>>,
        [u64]
      >;
      /**
       * Index to map Crop Receipt with emitted Coupon
       **/
      cropReceiptToCoupon: AugmentedQuery<
        ApiType,
        (arg: u64 | AnyNumber | Uint8Array) => Observable<Option<CommonPrimitivesAssetId32>>,
        [u64]
      >;
      /**
       * Counter to generate new Coupon Ids
       **/
      lastCouponId: AugmentedQuery<ApiType, () => Observable<u64>, []>;
      /**
       * Counter to generate new Crop Receipt Ids
       **/
      lastCropReceiptId: AugmentedQuery<ApiType, () => Observable<u64>, []>;
      /**
       * Counter to generate new Request Ids
       **/
      lastRequestId: AugmentedQuery<ApiType, () => Observable<u64>, []>;
      /**
       * Presto managers
       **/
      managers: AugmentedQuery<ApiType, () => Observable<Vec<AccountId32>>, []>;
      /**
       * Requests
       **/
      requests: AugmentedQuery<
        ApiType,
        (arg: u64 | AnyNumber | Uint8Array) => Observable<Option<PrestoRequestsRequest>>,
        [u64]
      >;
      /**
       * Crop receipts index by user
       **/
      userCropReceipts: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Vec<u64>>,
        [AccountId32]
      >;
      /**
       * Requests index by users
       **/
      userRequests: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Vec<u64>>,
        [AccountId32]
      >;
    };
    priceTools: {
      fastPriceInfos: AugmentedQuery<
        ApiType,
        (
          arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<PriceToolsAggregatedPriceInfo>>,
        [CommonPrimitivesAssetId32]
      >;
      priceInfos: AugmentedQuery<
        ApiType,
        (
          arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<PriceToolsAggregatedPriceInfo>>,
        [CommonPrimitivesAssetId32]
      >;
    };
    pswapDistribution: {
      /**
       * Amount of incentive tokens to be burned on each distribution.
       **/
      burnRate: AugmentedQuery<ApiType, () => Observable<FixnumFixedPoint>, []>;
      /**
       * (Burn Rate Increase Delta, Burn Rate Max)
       **/
      burnUpdateInfo: AugmentedQuery<ApiType, () => Observable<ITuple<[FixnumFixedPoint, FixnumFixedPoint]>>, []>;
      /**
       * Sum of all shares of incentive token owners.
       **/
      claimableShares: AugmentedQuery<ApiType, () => Observable<FixnumFixedPoint>, []>;
      /**
       * Information about owned portion of stored incentive tokens. Shareholder -> Owned Fraction
       **/
      shareholderAccounts: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<FixnumFixedPoint>,
        [AccountId32]
      >;
      /**
       * Store for information about accounts containing fees, that participate in incentive distribution mechanism.
       * Fees Account Id -> (DEX Id, Pool Marker Asset Id, Distribution Frequency, Block Offset) Frequency MUST be non-zero.
       **/
      subscribedAccounts: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Option<ITuple<[u32, AccountId32, u32, u32]>>>,
        [AccountId32]
      >;
    };
    randomnessCollectiveFlip: {
      /**
       * Series of block headers from the last 81 blocks that acts as random seed material. This
       * is arranged as a ring buffer with `block_number % 81` being the index into the `Vec` of
       * the oldest hash.
       **/
      randomMaterial: AugmentedQuery<ApiType, () => Observable<Vec<H256>>, []>;
    };
    referrals: {
      referrals: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Vec<AccountId32>>,
        [AccountId32]
      >;
      referrerBalances: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Option<u128>>,
        [AccountId32]
      >;
      referrers: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Option<AccountId32>>,
        [AccountId32]
      >;
    };
    rewards: {
      /**
       * Amount of VAL currently being vested (aggregated over the previous period of 14,400 blocks)
       **/
      currentClaimableVal: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * All addresses are split in batches, `AddressBatches` maps batch number to a set of addresses
       **/
      ethAddresses: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<Vec<H160>>, [u32]>;
      /**
       * A flag indicating whether VAL rewards data migration has been finalized
       **/
      migrationPending: AugmentedQuery<ApiType, () => Observable<bool>, []>;
      pswapFarmOwners: AugmentedQuery<ApiType, (arg: H160 | string | Uint8Array) => Observable<u128>, [H160]>;
      pswapWaifuOwners: AugmentedQuery<ApiType, (arg: H160 | string | Uint8Array) => Observable<u128>, [H160]>;
      reservesAcc: AugmentedQuery<ApiType, () => Observable<CommonPrimitivesTechAccountId>, []>;
      /**
       * Total amount of VAL that can be claimed by users at current point in time
       **/
      totalClaimableVal: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * Total amount of VAL rewards either claimable now or some time in the future
       **/
      totalValRewards: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * Stores whether address already claimed UMI NFT rewards.
       **/
      umiNftClaimed: AugmentedQuery<ApiType, (arg: H160 | string | Uint8Array) => Observable<bool>, [H160]>;
      /**
       * UMI NFT receivers storage
       **/
      umiNftReceivers: AugmentedQuery<ApiType, (arg: H160 | string | Uint8Array) => Observable<Vec<u128>>, [H160]>;
      /**
       * The storage of available UMI NFTs.
       **/
      umiNfts: AugmentedQuery<ApiType, () => Observable<Vec<CommonPrimitivesAssetId32>>, []>;
      /**
       * Amount of VAL burned since last vesting
       **/
      valBurnedSinceLastVesting: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * A map EthAddresses -> RewardInfo, that is claimable and remaining vested amounts per address
       **/
      valOwners: AugmentedQuery<ApiType, (arg: H160 | string | Uint8Array) => Observable<RewardsRewardInfo>, [H160]>;
    };
    scheduler: {
      /**
       * Items to be executed, indexed by the block number that they should be executed on.
       **/
      agenda: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<Vec<Option<PalletSchedulerScheduled>>>,
        [u32]
      >;
      incompleteSince: AugmentedQuery<ApiType, () => Observable<Option<u32>>, []>;
      /**
       * Lookup from a name to the block number and index of the task.
       *
       * For v3 -> v4 the previously unbounded identities are Blake2-256 hashed to form the v4
       * identities.
       **/
      lookup: AugmentedQuery<
        ApiType,
        (arg: U8aFixed | string | Uint8Array) => Observable<Option<ITuple<[u32, u32]>>>,
        [U8aFixed]
      >;
    };
    session: {
      /**
       * Current index of the session.
       **/
      currentIndex: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Indices of disabled validators.
       *
       * The vec is always kept sorted so that we can find whether a given validator is
       * disabled using binary search. It gets cleared when `on_session_ending` returns
       * a new set of identities.
       **/
      disabledValidators: AugmentedQuery<ApiType, () => Observable<Vec<u32>>, []>;
      /**
       * The owner of a key. The key is the `KeyTypeId` + the encoded key.
       **/
      keyOwner: AugmentedQuery<
        ApiType,
        (
          arg:
            | ITuple<[SpCoreCryptoKeyTypeId, Bytes]>
            | [SpCoreCryptoKeyTypeId | string | Uint8Array, Bytes | string | Uint8Array]
        ) => Observable<Option<AccountId32>>,
        [ITuple<[SpCoreCryptoKeyTypeId, Bytes]>]
      >;
      /**
       * The next session keys for a validator.
       **/
      nextKeys: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Option<FramenodeRuntimeOpaqueSessionKeys>>,
        [AccountId32]
      >;
      /**
       * True if the underlying economic identities or weighting behind the validators
       * has changed in the queued validator set.
       **/
      queuedChanged: AugmentedQuery<ApiType, () => Observable<bool>, []>;
      /**
       * The queued keys for the next session. When the next session begins, these keys
       * will be used to determine the validator's session keys.
       **/
      queuedKeys: AugmentedQuery<
        ApiType,
        () => Observable<Vec<ITuple<[AccountId32, FramenodeRuntimeOpaqueSessionKeys]>>>,
        []
      >;
      /**
       * The current set of validators.
       **/
      validators: AugmentedQuery<ApiType, () => Observable<Vec<AccountId32>>, []>;
    };
    soratopia: {};
    staking: {
      /**
       * The active era information, it holds index and start.
       *
       * The active era is the era being currently rewarded. Validator set of this era must be
       * equal to [`SessionInterface::validators`].
       **/
      activeEra: AugmentedQuery<ApiType, () => Observable<Option<PalletStakingActiveEraInfo>>, []>;
      /**
       * Map from all locked "stash" accounts to the controller account.
       *
       * TWOX-NOTE: SAFE since `AccountId` is a secure hash.
       **/
      bonded: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Option<AccountId32>>,
        [AccountId32]
      >;
      /**
       * A mapping from still-bonded eras to the first session index of that era.
       *
       * Must contains information for eras for the range:
       * `[active_era - bounding_duration; active_era]`
       **/
      bondedEras: AugmentedQuery<ApiType, () => Observable<Vec<ITuple<[u32, u32]>>>, []>;
      /**
       * The amount of currency given to reporters of a slash event which was
       * canceled by extraordinary circumstances (e.g. governance).
       **/
      canceledSlashPayout: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * The threshold for when users can start calling `chill_other` for other validators /
       * nominators. The threshold is compared to the actual number of validators / nominators
       * (`CountFor*`) in the system compared to the configured max (`Max*Count`).
       **/
      chillThreshold: AugmentedQuery<ApiType, () => Observable<Option<Percent>>, []>;
      /**
       * Counter for the related counted storage map
       **/
      counterForNominators: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Counter for the related counted storage map
       **/
      counterForValidators: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * The current era index.
       *
       * This is the latest planned era, depending on how the Session pallet queues the validator
       * set, it might be active or not.
       **/
      currentEra: AugmentedQuery<ApiType, () => Observable<Option<u32>>, []>;
      /**
       * The last planned session scheduled by the session pallet.
       *
       * This is basically in sync with the call to [`pallet_session::SessionManager::new_session`].
       **/
      currentPlannedSession: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Rewards for the last `HISTORY_DEPTH` eras.
       * If reward hasn't been set or has been removed then 0 reward is returned.
       **/
      erasRewardPoints: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<PalletStakingEraRewardPoints>,
        [u32]
      >;
      /**
       * Exposure of validator at era.
       *
       * This is keyed first by the era index to allow bulk deletion and then the stash account.
       *
       * Is it removed after `HISTORY_DEPTH` eras.
       * If stakers hasn't been set or has been removed then empty exposure is returned.
       **/
      erasStakers: AugmentedQuery<
        ApiType,
        (
          arg1: u32 | AnyNumber | Uint8Array,
          arg2: AccountId32 | string | Uint8Array
        ) => Observable<PalletStakingExposure>,
        [u32, AccountId32]
      >;
      /**
       * Clipped Exposure of validator at era.
       *
       * This is similar to [`ErasStakers`] but number of nominators exposed is reduced to the
       * `T::MaxNominatorRewardedPerValidator` biggest stakers.
       * (Note: the field `total` and `own` of the exposure remains unchanged).
       * This is used to limit the i/o cost for the nominator payout.
       *
       * This is keyed fist by the era index to allow bulk deletion and then the stash account.
       *
       * Is it removed after `HISTORY_DEPTH` eras.
       * If stakers hasn't been set or has been removed then empty exposure is returned.
       **/
      erasStakersClipped: AugmentedQuery<
        ApiType,
        (
          arg1: u32 | AnyNumber | Uint8Array,
          arg2: AccountId32 | string | Uint8Array
        ) => Observable<PalletStakingExposure>,
        [u32, AccountId32]
      >;
      /**
       * The session index at which the era start for the last `HISTORY_DEPTH` eras.
       *
       * Note: This tracks the starting session (i.e. session index when era start being active)
       * for the eras in `[CurrentEra - HISTORY_DEPTH, CurrentEra]`.
       **/
      erasStartSessionIndex: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<Option<u32>>,
        [u32]
      >;
      /**
       * The total amount staked for the last `HISTORY_DEPTH` eras.
       * If total hasn't been set or has been removed then 0 stake is returned.
       **/
      erasTotalStake: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<u128>, [u32]>;
      /**
       * Similar to `ErasStakers`, this holds the preferences of validators.
       *
       * This is keyed first by the era index to allow bulk deletion and then the stash account.
       *
       * Is it removed after `HISTORY_DEPTH` eras.
       **/
      erasValidatorPrefs: AugmentedQuery<
        ApiType,
        (
          arg1: u32 | AnyNumber | Uint8Array,
          arg2: AccountId32 | string | Uint8Array
        ) => Observable<PalletStakingValidatorPrefs>,
        [u32, AccountId32]
      >;
      /**
       * The total validator era payout for the last `HISTORY_DEPTH` eras.
       *
       * Eras that haven't finished yet or has been removed doesn't have reward.
       **/
      erasValidatorReward: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<Option<u128>>,
        [u32]
      >;
      /**
       * The amount of VAL burned during this era.
       **/
      eraValBurned: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * Mode of era forcing.
       **/
      forceEra: AugmentedQuery<ApiType, () => Observable<PalletStakingForcing>, []>;
      /**
       * Any validators that may never be slashed or forcibly kicked. It's a Vec since they're
       * easy to initialize and the performance hit is minimal (we expect no more than four
       * invulnerables) and restricted to testnets.
       **/
      invulnerables: AugmentedQuery<ApiType, () => Observable<Vec<AccountId32>>, []>;
      /**
       * Map from all (unlocked) "controller" accounts to the info regarding the staking.
       **/
      ledger: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Option<PalletStakingStakingLedger>>,
        [AccountId32]
      >;
      /**
       * The maximum nominator count before we stop allowing new validators to join.
       *
       * When this value is not set, no limits are enforced.
       **/
      maxNominatorsCount: AugmentedQuery<ApiType, () => Observable<Option<u32>>, []>;
      /**
       * The maximum validator count before we stop allowing new validators to join.
       *
       * When this value is not set, no limits are enforced.
       **/
      maxValidatorsCount: AugmentedQuery<ApiType, () => Observable<Option<u32>>, []>;
      /**
       * The minimum amount of commission that validators can set.
       *
       * If set to `0`, no limit exists.
       **/
      minCommission: AugmentedQuery<ApiType, () => Observable<Perbill>, []>;
      /**
       * The minimum active nominator stake of the last successful election.
       **/
      minimumActiveStake: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * Minimum number of staking participants before emergency conditions are imposed.
       **/
      minimumValidatorCount: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * The minimum active bond to become and maintain the role of a nominator.
       **/
      minNominatorBond: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * The minimum active bond to become and maintain the role of a validator.
       **/
      minValidatorBond: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * The map from nominator stash key to their nomination preferences, namely the validators that
       * they wish to support.
       *
       * Note that the keys of this storage map might become non-decodable in case the
       * [`Config::MaxNominations`] configuration is decreased. In this rare case, these nominators
       * are still existent in storage, their key is correct and retrievable (i.e. `contains_key`
       * indicates that they exist), but their value cannot be decoded. Therefore, the non-decodable
       * nominators will effectively not-exist, until they re-submit their preferences such that it
       * is within the bounds of the newly set `Config::MaxNominations`.
       *
       * This implies that `::iter_keys().count()` and `::iter().count()` might return different
       * values for this map. Moreover, the main `::count()` is aligned with the former, namely the
       * number of keys that exist.
       *
       * Lastly, if any of the nominators become non-decodable, they can be chilled immediately via
       * [`Call::chill_other`] dispatchable by anyone.
       *
       * TWOX-NOTE: SAFE since `AccountId` is a secure hash.
       **/
      nominators: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Option<PalletStakingNominations>>,
        [AccountId32]
      >;
      /**
       * All slashing events on nominators, mapped by era to the highest slash value of the era.
       **/
      nominatorSlashInEra: AugmentedQuery<
        ApiType,
        (arg1: u32 | AnyNumber | Uint8Array, arg2: AccountId32 | string | Uint8Array) => Observable<Option<u128>>,
        [u32, AccountId32]
      >;
      /**
       * Indices of validators that have offended in the active era and whether they are currently
       * disabled.
       *
       * This value should be a superset of disabled validators since not all offences lead to the
       * validator being disabled (if there was no slash). This is needed to track the percentage of
       * validators that have offended in the current era, ensuring a new era is forced if
       * `OffendingValidatorsThreshold` is reached. The vec is always kept sorted so that we can find
       * whether a given validator has previously offended using binary search. It gets cleared when
       * the era ends.
       **/
      offendingValidators: AugmentedQuery<ApiType, () => Observable<Vec<ITuple<[u32, bool]>>>, []>;
      /**
       * Where the reward payment should be made. Keyed by stash.
       *
       * TWOX-NOTE: SAFE since `AccountId` is a secure hash.
       **/
      payee: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<PalletStakingRewardDestination>,
        [AccountId32]
      >;
      /**
       * Slashing spans for stash accounts.
       **/
      slashingSpans: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Option<PalletStakingSlashingSlashingSpans>>,
        [AccountId32]
      >;
      /**
       * The percentage of the slash that is distributed to reporters.
       *
       * The rest of the slashed value is handled by the `Slash`.
       **/
      slashRewardFraction: AugmentedQuery<ApiType, () => Observable<Perbill>, []>;
      /**
       * Records information about the maximum slash of a stash within a slashing span,
       * as well as how much reward has been paid out.
       **/
      spanSlash: AugmentedQuery<
        ApiType,
        (
          arg: ITuple<[AccountId32, u32]> | [AccountId32 | string | Uint8Array, u32 | AnyNumber | Uint8Array]
        ) => Observable<PalletStakingSlashingSpanRecord>,
        [ITuple<[AccountId32, u32]>]
      >;
      /**
       * The time span since genesis, incremented at the end of each era.
       **/
      timeSinceGenesis: AugmentedQuery<ApiType, () => Observable<PalletStakingSoraDurationWrapper>, []>;
      /**
       * All unapplied slashes that are queued for later.
       **/
      unappliedSlashes: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<Vec<PalletStakingUnappliedSlash>>,
        [u32]
      >;
      /**
       * The ideal number of active validators.
       **/
      validatorCount: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * The map from (wannabe) validator stash key to the preferences of that validator.
       *
       * TWOX-NOTE: SAFE since `AccountId` is a secure hash.
       **/
      validators: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<PalletStakingValidatorPrefs>,
        [AccountId32]
      >;
      /**
       * All slashing events on validators, mapped by era to the highest slash proportion
       * and slash value of the era.
       **/
      validatorSlashInEra: AugmentedQuery<
        ApiType,
        (
          arg1: u32 | AnyNumber | Uint8Array,
          arg2: AccountId32 | string | Uint8Array
        ) => Observable<Option<ITuple<[Perbill, u128]>>>,
        [u32, AccountId32]
      >;
    };
    substrateBridgeApp: {
      assetKinds: AugmentedQuery<
        ApiType,
        (
          arg1:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<BridgeTypesAssetKind>>,
        [BridgeTypesSubNetworkId, CommonPrimitivesAssetId32]
      >;
      sidechainAssetId: AugmentedQuery<
        ApiType,
        (
          arg1:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<BridgeTypesGenericAssetId>>,
        [BridgeTypesSubNetworkId, CommonPrimitivesAssetId32]
      >;
      sidechainPrecision: AugmentedQuery<
        ApiType,
        (
          arg1:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Option<u8>>,
        [BridgeTypesSubNetworkId, CommonPrimitivesAssetId32]
      >;
      thischainAssetId: AugmentedQuery<
        ApiType,
        (
          arg1:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          arg2:
            | BridgeTypesGenericAssetId
            | { Sora: any }
            | { XCM: any }
            | { EVM: any }
            | { Liberland: any }
            | string
            | Uint8Array
        ) => Observable<Option<CommonPrimitivesAssetId32>>,
        [BridgeTypesSubNetworkId, BridgeTypesGenericAssetId]
      >;
    };
    substrateBridgeInboundChannel: {
      channelNonces: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array
        ) => Observable<u64>,
        [BridgeTypesSubNetworkId]
      >;
    };
    substrateBridgeOutboundChannel: {
      channelNonces: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array
        ) => Observable<u64>,
        [BridgeTypesSubNetworkId]
      >;
      /**
       * Interval between committing messages.
       **/
      interval: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      latestCommitment: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array
        ) => Observable<Option<BridgeTypesGenericCommitmentWithBlock>>,
        [BridgeTypesSubNetworkId]
      >;
      /**
       * Messages waiting to be committed. To update the queue, use `append_message_queue` and `take_message_queue` methods
       * (to keep correct value in [QueuesTotalGas]).
       **/
      messageQueues: AugmentedQuery<
        ApiType,
        (
          arg:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array
        ) => Observable<Vec<BridgeTypesSubstrateBridgeMessage>>,
        [BridgeTypesSubNetworkId]
      >;
    };
    substrateDispatch: {};
    sudo: {
      /**
       * The `AccountId` of the sudo key.
       **/
      key: AugmentedQuery<ApiType, () => Observable<Option<AccountId32>>, []>;
    };
    system: {
      /**
       * The full account information for a particular account ID.
       **/
      account: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<FrameSystemAccountInfo>,
        [AccountId32]
      >;
      /**
       * Total length (in bytes) for all extrinsics put together, for the current block.
       **/
      allExtrinsicsLen: AugmentedQuery<ApiType, () => Observable<Option<u32>>, []>;
      /**
       * Map of block numbers to block hashes.
       **/
      blockHash: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<H256>, [u32]>;
      /**
       * The current weight for the block.
       **/
      blockWeight: AugmentedQuery<ApiType, () => Observable<FrameSupportDispatchPerDispatchClassWeight>, []>;
      /**
       * Digest of the current block, also part of the block header.
       **/
      digest: AugmentedQuery<ApiType, () => Observable<SpRuntimeDigest>, []>;
      /**
       * The number of events in the `Events<T>` list.
       **/
      eventCount: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Events deposited for the current block.
       *
       * NOTE: The item is unbound and should therefore never be read on chain.
       * It could otherwise inflate the PoV size of a block.
       *
       * Events have a large in-memory size. Box the events to not go out-of-memory
       * just in case someone still reads them from within the runtime.
       **/
      events: AugmentedQuery<ApiType, () => Observable<Vec<FrameSystemEventRecord>>, []>;
      /**
       * Mapping between a topic (represented by T::Hash) and a vector of indexes
       * of events in the `<Events<T>>` list.
       *
       * All topic vectors have deterministic storage locations depending on the topic. This
       * allows light-clients to leverage the changes trie storage tracking mechanism and
       * in case of changes fetch the list of events of interest.
       *
       * The value has the type `(T::BlockNumber, EventIndex)` because if we used only just
       * the `EventIndex` then in case if the topic has the same contents on the next block
       * no notification will be triggered thus the event might be lost.
       **/
      eventTopics: AugmentedQuery<
        ApiType,
        (arg: H256 | string | Uint8Array) => Observable<Vec<ITuple<[u32, u32]>>>,
        [H256]
      >;
      /**
       * The execution phase of the block.
       **/
      executionPhase: AugmentedQuery<ApiType, () => Observable<Option<FrameSystemPhase>>, []>;
      /**
       * Total extrinsics count for the current block.
       **/
      extrinsicCount: AugmentedQuery<ApiType, () => Observable<Option<u32>>, []>;
      /**
       * Extrinsics data for the current block (maps an extrinsic's index to its data).
       **/
      extrinsicData: AugmentedQuery<ApiType, (arg: u32 | AnyNumber | Uint8Array) => Observable<Bytes>, [u32]>;
      /**
       * Stores the `spec_version` and `spec_name` of when the last runtime upgrade happened.
       **/
      lastRuntimeUpgrade: AugmentedQuery<ApiType, () => Observable<Option<FrameSystemLastRuntimeUpgradeInfo>>, []>;
      /**
       * The current block number being processed. Set by `execute_block`.
       **/
      number: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Hash of the previous block.
       **/
      parentHash: AugmentedQuery<ApiType, () => Observable<H256>, []>;
      /**
       * True if we have upgraded so that AccountInfo contains three types of `RefCount`. False
       * (default) if not.
       **/
      upgradedToTripleRefCount: AugmentedQuery<ApiType, () => Observable<bool>, []>;
      /**
       * True if we have upgraded so that `type RefCount` is `u32`. False (default) if not.
       **/
      upgradedToU32RefCount: AugmentedQuery<ApiType, () => Observable<bool>, []>;
    };
    technical: {
      /**
       * Registered technical account identifiers. Map from repr `AccountId` into pure `TechAccountId`.
       **/
      techAccounts: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<Option<CommonPrimitivesTechAccountId>>,
        [AccountId32]
      >;
    };
    technicalCommittee: {
      /**
       * The current members of the collective. This is stored sorted (just by value).
       **/
      members: AugmentedQuery<ApiType, () => Observable<Vec<AccountId32>>, []>;
      /**
       * The prime member that helps determine the default vote behavior in case of absentations.
       **/
      prime: AugmentedQuery<ApiType, () => Observable<Option<AccountId32>>, []>;
      /**
       * Proposals so far.
       **/
      proposalCount: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Actual proposal for a given hash, if it's current.
       **/
      proposalOf: AugmentedQuery<ApiType, (arg: H256 | string | Uint8Array) => Observable<Option<Call>>, [H256]>;
      /**
       * The hashes of the active proposals.
       **/
      proposals: AugmentedQuery<ApiType, () => Observable<Vec<H256>>, []>;
      /**
       * Votes on a given proposal, if it is ongoing.
       **/
      voting: AugmentedQuery<
        ApiType,
        (arg: H256 | string | Uint8Array) => Observable<Option<PalletCollectiveVotes>>,
        [H256]
      >;
    };
    technicalMembership: {
      /**
       * The current membership, stored as an ordered Vec.
       **/
      members: AugmentedQuery<ApiType, () => Observable<Vec<AccountId32>>, []>;
      /**
       * The current prime member, if one exists.
       **/
      prime: AugmentedQuery<ApiType, () => Observable<Option<AccountId32>>, []>;
    };
    timestamp: {
      /**
       * Did the timestamp get updated in this block?
       **/
      didUpdate: AugmentedQuery<ApiType, () => Observable<bool>, []>;
      /**
       * Current time for the current block.
       **/
      now: AugmentedQuery<ApiType, () => Observable<u64>, []>;
    };
    tokens: {
      /**
       * The balance of a token type under an account.
       *
       * NOTE: If the total is ever zero, decrease account ref account.
       *
       * NOTE: This is only used in the case that this module is used to store
       * balances.
       **/
      accounts: AugmentedQuery<
        ApiType,
        (
          arg1: AccountId32 | string | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<OrmlTokensAccountData>,
        [AccountId32, CommonPrimitivesAssetId32]
      >;
      /**
       * Any liquidity locks of a token type under an account.
       * NOTE: Should only be accessed when setting, changing and freeing a lock.
       **/
      locks: AugmentedQuery<
        ApiType,
        (
          arg1: AccountId32 | string | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Vec<OrmlTokensBalanceLock>>,
        [AccountId32, CommonPrimitivesAssetId32]
      >;
      /**
       * Named reserves on some account balances.
       **/
      reserves: AugmentedQuery<
        ApiType,
        (
          arg1: AccountId32 | string | Uint8Array,
          arg2: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => Observable<Vec<OrmlTokensReserveData>>,
        [AccountId32, CommonPrimitivesAssetId32]
      >;
      /**
       * The total issuance of a token type.
       **/
      totalIssuance: AugmentedQuery<
        ApiType,
        (arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => Observable<u128>,
        [CommonPrimitivesAssetId32]
      >;
    };
    tradingPair: {
      enabledSources: AugmentedQuery<
        ApiType,
        (
          arg1: u32 | AnyNumber | Uint8Array,
          arg2: CommonPrimitivesTradingPairAssetId32 | { baseAssetId?: any; targetAssetId?: any } | string | Uint8Array
        ) => Observable<Option<BTreeSet<CommonPrimitivesLiquiditySourceType>>>,
        [u32, CommonPrimitivesTradingPairAssetId32]
      >;
      lockedLiquiditySources: AugmentedQuery<ApiType, () => Observable<Vec<CommonPrimitivesLiquiditySourceType>>, []>;
    };
    transactionPayment: {
      nextFeeMultiplier: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      storageVersion: AugmentedQuery<ApiType, () => Observable<PalletTransactionPaymentReleases>, []>;
    };
    vestedRewards: {
      /**
       * Vesting claims of a block.
       *
       * VestingSchedules: map AccountId => Vec<VestingSchedule>
       **/
      claimSchedules: AugmentedQuery<
        ApiType,
        (arg: u32 | AnyNumber | Uint8Array) => Observable<Vec<VestedRewardsClaim>>,
        [u32]
      >;
      /**
       * Information about crowdloan
       **/
      crowdloanInfos: AugmentedQuery<
        ApiType,
        (arg: Bytes | string | Uint8Array) => Observable<Option<VestedRewardsCrowdloanInfo>>,
        [Bytes]
      >;
      /**
       * Information about crowdloan rewards claimed by user
       **/
      crowdloanUserInfos: AugmentedQuery<
        ApiType,
        (
          arg1: AccountId32 | string | Uint8Array,
          arg2: Bytes | string | Uint8Array
        ) => Observable<Option<VestedRewardsCrowdloanUserInfo>>,
        [AccountId32, Bytes]
      >;
      /**
       * Claims was not processed.
       **/
      pendingClaims: AugmentedQuery<ApiType, () => Observable<Vec<VestedRewardsClaim>>, []>;
      /**
       * Reserved for future use
       * Mapping between users and their owned rewards of different kinds, which are vested.
       **/
      rewards: AugmentedQuery<
        ApiType,
        (arg: AccountId32 | string | Uint8Array) => Observable<VestedRewardsRewardInfo>,
        [AccountId32]
      >;
      /**
       * Reserved for future use
       * Total amount of PSWAP pending rewards.
       **/
      totalRewards: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * Vesting schedules of an account.
       *
       * VestingSchedules: map AccountId => Vec<VestingSchedule>
       **/
      vestingSchedules: AugmentedQuery<
        ApiType,
        (
          arg: AccountId32 | string | Uint8Array
        ) => Observable<Vec<VestedRewardsVestingCurrenciesVestingScheduleVariant>>,
        [AccountId32]
      >;
    };
    xorFee: {
      /**
       * AssetId -> Amount to pay for fee
       **/
      burntForFee: AugmentedQuery<
        ApiType,
        (arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => Observable<XorFeeAssetFee>,
        [CommonPrimitivesAssetId32]
      >;
      multiplier: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      remintPeriod: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Small fee value should be `SmallReferenceAmount` in reference asset id
       **/
      smallReferenceAmount: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * Next block number to update multiplier
       * If it is necessary to stop updating the multiplier,
       * set 0 value
       **/
      updatePeriod: AugmentedQuery<ApiType, () => Observable<u32>, []>;
      /**
       * Tokens allowed for xorless execution
       **/
      whitelistTokensForFee: AugmentedQuery<ApiType, () => Observable<Vec<CommonPrimitivesAssetId32>>, []>;
      /**
       * The amount of XOR to be reminted and exchanged for KUSD at the end of the session
       **/
      xorToBuyBack: AugmentedQuery<ApiType, () => Observable<u128>, []>;
      /**
       * The amount of XOR to be reminted and exchanged for VAL at the end of the session
       **/
      xorToVal: AugmentedQuery<ApiType, () => Observable<u128>, []>;
    };
    xstPool: {
      /**
       * Current reserves balance for collateral tokens, used for client usability.
       **/
      collateralReserves: AugmentedQuery<
        ApiType,
        (arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => Observable<u128>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Reference symbols and their synthetic assets.
       *
       * It's a programmer responsibility to keep this collection consistent with [`EnabledSynthetics`].
       **/
      enabledSymbols: AugmentedQuery<
        ApiType,
        (arg: Bytes | string | Uint8Array) => Observable<Option<CommonPrimitivesAssetId32>>,
        [Bytes]
      >;
      /**
       * Synthetic assets and their reference symbols.
       *
       * It's a programmer responsibility to keep this collection consistent with [`EnabledSymbols`].
       **/
      enabledSynthetics: AugmentedQuery<
        ApiType,
        (arg: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => Observable<Option<XstSyntheticInfo>>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Asset that is used to compare collateral assets by value, e.g., DAI.
       **/
      referenceAssetId: AugmentedQuery<ApiType, () => Observable<CommonPrimitivesAssetId32>, []>;
      /**
       * Floor price for the synthetic base asset.
       **/
      syntheticBaseAssetFloorPrice: AugmentedQuery<ApiType, () => Observable<u128>, []>;
    };
  } // AugmentedQueries
} // declare module
