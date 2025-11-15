// Auto-generated via `yarn polkadot-types-from-chain`, do not edit

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/api-base/types/submittable';

import type {
  ApiTypes,
  AugmentedSubmittable,
  SubmittableExtrinsic,
  SubmittableExtrinsicFunction,
} from '@polkadot/api-base/types';
import type { Data } from '@polkadot/types';
import type {
  BTreeMap,
  Bytes,
  Compact,
  Option,
  Result,
  Text,
  U256,
  U8aFixed,
  Vec,
  bool,
  i128,
  u128,
  u16,
  u32,
  u64,
  u8,
} from '@polkadot/types-codec';
import type { AnyNumber, IMethod, ITuple } from '@polkadot/types-codec/types';
import type {
  AccountId32,
  Call,
  H128,
  H160,
  H256,
  Perbill,
  Percent,
  Permill,
} from '@polkadot/types/interfaces/runtime';
import type {
  BandFeeCalculationParameters,
  BridgeCommonBeefyTypesValidatorProof,
  BridgeCommonSimplifiedProofProof,
  BridgeProxyTransferLimitSettings,
  BridgeTypesAssetKind,
  BridgeTypesGenericAccount,
  BridgeTypesGenericAssetId,
  BridgeTypesGenericBalance,
  BridgeTypesGenericCommitment,
  BridgeTypesGenericNetworkId,
  BridgeTypesMessageStatus,
  BridgeTypesSubNetworkId,
  BridgeTypesSubstrateXcmAppTransferStatus,
  BridgeTypesTonTonAddress,
  BridgeTypesTonTonAddressWithPrefix,
  BridgeTypesTonTonNetworkId,
  CommonPrimitivesAssetId32,
  CommonPrimitivesFilterMode,
  CommonPrimitivesLiquiditySourceType,
  CommonPrimitivesOracle,
  CommonPrimitivesOrderBookId,
  CommonPrimitivesPriceVariant,
  CommonPrimitivesRewardReason,
  CommonSwapAmount,
  EthBridgeBridgeSignatureVersion,
  EthBridgeOffchainSignatureParams,
  EthBridgeRequestsIncomingRequest,
  EthBridgeRequestsIncomingRequestKind,
  EthBridgeRequestsLoadIncomingRequest,
  FixnumFixedPoint,
  FrameSupportPreimagesBounded,
  FramenodeRuntimeMultiProof,
  FramenodeRuntimeOpaqueSessionKeys,
  FramenodeRuntimeOriginCaller,
  KensetsuBorrowTaxes,
  KensetsuCdpType,
  KensetsuCollateralRiskParameters,
  KensetsuStablecoinParameters,
  LiquidityProxySwapBatchInfo,
  OrderBookOrderBookStatus,
  PalletDemocracyConviction,
  PalletDemocracyVoteAccountVote,
  PalletElectionProviderMultiPhaseRawSolution,
  PalletElectionProviderMultiPhaseSolutionOrSnapshotSize,
  PalletElectionsPhragmenRenouncing,
  PalletIdentityBitFlags,
  PalletIdentityIdentityInfo,
  PalletIdentityJudgement,
  PalletImOnlineHeartbeat,
  PalletImOnlineSr25519AppSr25519Signature,
  PalletMultisigBridgeTimepoint,
  PalletMultisigTimepoint,
  PalletStakingPalletConfigOpPerbill,
  PalletStakingPalletConfigOpPercent,
  PalletStakingPalletConfigOpU128,
  PalletStakingPalletConfigOpU32,
  PalletStakingRewardDestination,
  PalletStakingValidatorPrefs,
  PrestoCropReceiptCountry,
  PrestoCropReceiptRating,
  QaToolsInputAssetId,
  QaToolsPalletToolsMcbcBaseSupply,
  QaToolsPalletToolsMcbcOtherCollateralInput,
  QaToolsPalletToolsMcbcTbcdCollateralInput,
  QaToolsPalletToolsOrderBookFillInput,
  QaToolsPalletToolsOrderBookOrderBookAttributes,
  QaToolsPalletToolsPoolXykAssetPairInput,
  QaToolsPalletToolsPriceToolsAssetPrices,
  QaToolsPalletToolsXstBaseInput,
  QaToolsPalletToolsXstSyntheticInput,
  SpBeefyCommitment,
  SpBeefyMmrBeefyAuthoritySet,
  SpBeefyMmrMmrLeaf,
  SpConsensusBabeDigestsNextConfigDescriptor,
  SpConsensusSlotsEquivocationProof,
  SpCoreEcdsaPublic,
  SpCoreEcdsaSignature,
  SpFinalityGrandpaEquivocationProof,
  SpNposElectionsElectionScore,
  SpNposElectionsSupport,
  SpRuntimeDispatchError,
  SpSessionMembershipProof,
  SpWeightsWeightV2Weight,
  VestedRewardsVestingCurrenciesVestingScheduleVariant,
  XcmV3MultiassetAssetId,
  XcmVersionedMultiLocation,
} from '@polkadot/types/lookup';

export type __AugmentedSubmittable = AugmentedSubmittable<() => unknown>;
export type __SubmittableExtrinsic<ApiType extends ApiTypes> = SubmittableExtrinsic<ApiType>;
export type __SubmittableExtrinsicFunction<ApiType extends ApiTypes> = SubmittableExtrinsicFunction<ApiType>;

declare module '@polkadot/api-base/types/submittable' {
  interface AugmentedSubmittables<ApiType extends ApiTypes> {
    apolloPlatform: {
      /**
       * Add more collateral to borrowing position
       **/
      addCollateral: AugmentedSubmittable<
        (
          collateralAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          collateralAmount: u128 | AnyNumber | Uint8Array,
          borrowingAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u128, CommonPrimitivesAssetId32]
      >;
      /**
       * Add pool
       **/
      addPool: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          loanToValue: u128 | AnyNumber | Uint8Array,
          liquidationThreshold: u128 | AnyNumber | Uint8Array,
          optimalUtilizationRate: u128 | AnyNumber | Uint8Array,
          baseRate: u128 | AnyNumber | Uint8Array,
          slopeRate1: u128 | AnyNumber | Uint8Array,
          slopeRate2: u128 | AnyNumber | Uint8Array,
          reserveFactor: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u128, u128, u128, u128, u128, u128, u128]
      >;
      /**
       * Borrow token
       **/
      borrow: AugmentedSubmittable<
        (
          collateralAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          borrowingAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          borrowingAmount: u128 | AnyNumber | Uint8Array,
          loanToValue: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, u128, u128]
      >;
      /**
       * Change rewards amount
       **/
      changeCollateralFactor: AugmentedSubmittable<
        (amount: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
      /**
       * Change rewards amount
       **/
      changeRewardsAmount: AugmentedSubmittable<
        (
          isLending: bool | boolean | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [bool, u128]
      >;
      /**
       * Change rewards per block
       **/
      changeRewardsPerBlock: AugmentedSubmittable<
        (
          isLending: bool | boolean | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [bool, u128]
      >;
      /**
       * Edit pool info
       **/
      editPoolInfo: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          newLoanToValue: u128 | AnyNumber | Uint8Array,
          newLiquidationThreshold: u128 | AnyNumber | Uint8Array,
          newOptimalUtilizationRate: u128 | AnyNumber | Uint8Array,
          newBaseRate: u128 | AnyNumber | Uint8Array,
          newSlopeRate1: u128 | AnyNumber | Uint8Array,
          newSlopeRate2: u128 | AnyNumber | Uint8Array,
          newReserveFactor: u128 | AnyNumber | Uint8Array,
          newTl: u128 | AnyNumber | Uint8Array,
          newTb: u128 | AnyNumber | Uint8Array,
          newTc: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u128, u128, u128, u128, u128, u128, u128, u128, u128, u128]
      >;
      /**
       * Get rewards
       **/
      getRewards: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          isLending: bool | boolean | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, bool]
      >;
      /**
       * Lend token
       **/
      lend: AugmentedSubmittable<
        (
          lendingAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          lendingAmount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u128]
      >;
      /**
       * Liquidate
       **/
      liquidate: AugmentedSubmittable<
        (
          user: AccountId32 | string | Uint8Array,
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, CommonPrimitivesAssetId32]
      >;
      /**
       * Remove pool
       **/
      removePool: AugmentedSubmittable<
        (
          assetIdToRemove: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Repay
       **/
      repay: AugmentedSubmittable<
        (
          collateralAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          borrowingAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          amountToRepay: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, u128]
      >;
      /**
       * Withdraw
       **/
      withdraw: AugmentedSubmittable<
        (
          withdrawnAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          withdrawnAmount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u128]
      >;
    };
    assets: {
      /**
       * Performs a checked Asset burn, can only be done
       * by corresponding asset owner with own account.
       *
       * - `origin`: caller Account, from which Asset amount is burned,
       * - `asset_id`: Id of burned Asset,
       * - `amount`: burned Asset amount.
       **/
      burn: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u128]
      >;
      /**
       * Performs an unchecked Asset mint, can only be done
       * by root account.
       *
       * Should be used as extrinsic call only.
       * `Currencies::updated_balance()` should be deprecated. Using `force_mint` allows us to
       * perform extra actions for minting, such as buy-back, extra-minting and etc.
       *
       * - `origin`: caller Account, which issues Asset minting,
       * - `asset_id`: Id of minted Asset,
       * - `to`: Id of Account, to which Asset amount is minted,
       * - `amount`: minted Asset amount.
       **/
      forceMint: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          to: AccountId32 | string | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, AccountId32, u128]
      >;
      /**
       * Performs a checked Asset mint, can only be done
       * by corresponding asset owner account.
       *
       * - `origin`: caller Account, which issues Asset minting,
       * - `asset_id`: Id of minted Asset,
       * - `to`: Id of Account, to which Asset amount is minted,
       * - `amount`: minted Asset amount.
       **/
      mint: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          to: AccountId32 | string | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, AccountId32, u128]
      >;
      /**
       * Performs an asset registration.
       *
       * Registers new `AssetId` for the given `origin`.
       * AssetSymbol should represent string with only uppercase latin chars with max length of 7.
       * AssetName should represent string with only uppercase or lowercase latin chars or numbers or spaces, with max length of 33.
       **/
      register: AugmentedSubmittable<
        (
          symbol: Bytes | string | Uint8Array,
          name: Bytes | string | Uint8Array,
          initialSupply: u128 | AnyNumber | Uint8Array,
          isMintable: bool | boolean | Uint8Array,
          isIndivisible: bool | boolean | Uint8Array,
          optContentSrc: Option<Bytes> | null | Uint8Array | Bytes | string,
          optDesc: Option<Bytes> | null | Uint8Array | Bytes | string
        ) => SubmittableExtrinsic<ApiType>,
        [Bytes, Bytes, u128, bool, bool, Option<Bytes>, Option<Bytes>]
      >;
      /**
       * Set given asset to be non-mintable, i.e. it can no longer be minted, only burned.
       * Operation can not be undone.
       *
       * - `origin`: caller Account, should correspond to Asset owner
       * - `asset_id`: Id of burned Asset,
       **/
      setNonMintable: AugmentedSubmittable<
        (assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Performs a checked Asset transfer.
       *
       * - `origin`: caller Account, from which Asset amount is withdrawn,
       * - `asset_id`: Id of transferred Asset,
       * - `to`: Id of Account, to which Asset amount is deposited,
       * - `amount`: transferred Asset amount.
       **/
      transfer: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          to: AccountId32 | string | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, AccountId32, u128]
      >;
      /**
       * Add or remove abs(`by_amount`) from the balance of `who` under
       * `currency_id`. If positive `by_amount`, do add, else do remove.
       *
       * Basically a wrapper of `MultiCurrencyExtended::update_balance`
       * for testing purposes.
       *
       * TODO: move into tests extrinsic collection pallet
       **/
      updateBalance: AugmentedSubmittable<
        (
          who: AccountId32 | string | Uint8Array,
          currencyId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          amount: i128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, CommonPrimitivesAssetId32, i128]
      >;
      /**
       * Change information about asset. Can only be done by root
       *
       * - `origin`: caller Account, should be root
       * - `asset_id`: Id of asset to change,
       * - `new_symbol`: New asset symbol. If None asset symbol will not change
       * - `new_name`: New asset name. If None asset name will not change
       **/
      updateInfo: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          newSymbol: Option<Bytes> | null | Uint8Array | Bytes | string,
          newName: Option<Bytes> | null | Uint8Array | Bytes | string
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, Option<Bytes>, Option<Bytes>]
      >;
    };
    babe: {
      /**
       * Plan an epoch config change. The epoch config change is recorded and will be enacted on
       * the next call to `enact_epoch_change`. The config will be activated one epoch after.
       * Multiple calls to this method will replace any existing planned config change that had
       * not been enacted yet.
       **/
      planConfigChange: AugmentedSubmittable<
        (
          config: SpConsensusBabeDigestsNextConfigDescriptor | { V1: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [SpConsensusBabeDigestsNextConfigDescriptor]
      >;
      /**
       * Report authority equivocation/misbehavior. This method will verify
       * the equivocation proof and validate the given key ownership proof
       * against the extracted offender. If both are valid, the offence will
       * be reported.
       **/
      reportEquivocation: AugmentedSubmittable<
        (
          equivocationProof:
            | SpConsensusSlotsEquivocationProof
            | { offender?: any; slot?: any; firstHeader?: any; secondHeader?: any }
            | string
            | Uint8Array,
          keyOwnerProof:
            | SpSessionMembershipProof
            | { session?: any; trieNodes?: any; validatorCount?: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [SpConsensusSlotsEquivocationProof, SpSessionMembershipProof]
      >;
      /**
       * Report authority equivocation/misbehavior. This method will verify
       * the equivocation proof and validate the given key ownership proof
       * against the extracted offender. If both are valid, the offence will
       * be reported.
       * This extrinsic must be called unsigned and it is expected that only
       * block authors will call it (validated in `ValidateUnsigned`), as such
       * if the block author is defined it will be defined as the equivocation
       * reporter.
       **/
      reportEquivocationUnsigned: AugmentedSubmittable<
        (
          equivocationProof:
            | SpConsensusSlotsEquivocationProof
            | { offender?: any; slot?: any; firstHeader?: any; secondHeader?: any }
            | string
            | Uint8Array,
          keyOwnerProof:
            | SpSessionMembershipProof
            | { session?: any; trieNodes?: any; validatorCount?: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [SpConsensusSlotsEquivocationProof, SpSessionMembershipProof]
      >;
    };
    bagsList: {
      /**
       * Move the caller's Id directly in front of `lighter`.
       *
       * The dispatch origin for this call must be _Signed_ and can only be called by the Id of
       * the account going in front of `lighter`.
       *
       * Only works if
       * - both nodes are within the same bag,
       * - and `origin` has a greater `Score` than `lighter`.
       **/
      putInFrontOf: AugmentedSubmittable<
        (lighter: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Declare that some `dislocated` account has, through rewards or penalties, sufficiently
       * changed its score that it should properly fall into a different bag than its current
       * one.
       *
       * Anyone can call this function about any potentially dislocated account.
       *
       * Will always update the stored score of `dislocated` to the correct score, based on
       * `ScoreProvider`.
       *
       * If `dislocated` does not exists, it returns an error.
       **/
      rebag: AugmentedSubmittable<
        (dislocated: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
    };
    band: {
      /**
       * Add `account_ids` to the list of trusted relayers.
       *
       * Ignores repeated accounts in `account_ids`.
       * If one of account is already a trusted relayer an [`Error::AlreadyATrustedRelayer`] will
       * be returned.
       *
       * - `origin`: the sudo account on whose behalf the transaction is being executed,
       * - `account_ids`: list of new trusted relayers to add.
       **/
      addRelayers: AugmentedSubmittable<
        (accountIds: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>,
        [Vec<AccountId32>]
      >;
      /**
       * Similar to [`relay()`] but without the resolve time guard.
       *
       * Should be used in emergency situations i.e. then previous value was
       * relayed by a faulty/malicious actor.
       *
       * - `origin`: the relayer account on whose behalf the transaction is being executed,
       * - `rates`: symbols with rates in USD represented as fixed point with precision = 9,
       * - `resolve_time`: symbols which rates are provided,
       * - `request_id`: id of the request sent to the *BandChain* to retrieve this data.
       **/
      forceRelay: AugmentedSubmittable<
        (
          rates: Vec<ITuple<[Bytes, u64]>> | [Bytes | string | Uint8Array, u64 | AnyNumber | Uint8Array][],
          resolveTime: u64 | AnyNumber | Uint8Array,
          requestId: u64 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Vec<ITuple<[Bytes, u64]>>, u64, u64]
      >;
      /**
       * Relay a list of symbols and their associated rates along with the resolve time and request id on `BandChain`.
       *
       * Checks if:
       * - The caller is a relayer;
       * - The `resolve_time` for a particular symbol is not lower than previous saved value, ignores this rate if so;
       *
       * If `rates` contains duplicated symbols, then the last rate will be stored.
       *
       * - `origin`: the relayer account on whose behalf the transaction is being executed,
       * - `rates`: symbols with rates in USD represented as fixed point with precision = 9,
       * - `resolve_time`: symbols which rates are provided,
       * - `request_id`: id of the request sent to the *BandChain* to retrieve this data.
       **/
      relay: AugmentedSubmittable<
        (
          rates: Vec<ITuple<[Bytes, u64]>> | [Bytes | string | Uint8Array, u64 | AnyNumber | Uint8Array][],
          resolveTime: u64 | AnyNumber | Uint8Array,
          requestId: u64 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Vec<ITuple<[Bytes, u64]>>, u64, u64]
      >;
      /**
       * Remove `account_ids` from the list of trusted relayers.
       *
       * Ignores repeated accounts in `account_ids`.
       * If one of account is not a trusted relayer an [`Error::AlreadyATrustedRelayer`] will
       * be returned.
       *
       * - `origin`: the sudo account on whose behalf the transaction is being executed,
       * - `account_ids`: list of relayers to remove.
       **/
      removeRelayers: AugmentedSubmittable<
        (accountIds: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>,
        [Vec<AccountId32>]
      >;
      setDynamicFeeParameters: AugmentedSubmittable<
        (
          feeParameters:
            | BandFeeCalculationParameters
            | { decay?: any; minFee?: any; deviation?: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BandFeeCalculationParameters]
      >;
    };
    beefyLightClient: {
      initialize: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          latestBeefyBlock: u64 | AnyNumber | Uint8Array,
          validatorSet: SpBeefyMmrBeefyAuthoritySet | { id?: any; len?: any; root?: any } | string | Uint8Array,
          nextValidatorSet: SpBeefyMmrBeefyAuthoritySet | { id?: any; len?: any; root?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesSubNetworkId, u64, SpBeefyMmrBeefyAuthoritySet, SpBeefyMmrBeefyAuthoritySet]
      >;
      submitSignatureCommitment: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          commitment:
            | SpBeefyCommitment
            | { payload?: any; blockNumber?: any; validatorSetId?: any }
            | string
            | Uint8Array,
          validatorProof:
            | BridgeCommonBeefyTypesValidatorProof
            | {
                validatorClaimsBitfield?: any;
                signatures?: any;
                positions?: any;
                publicKeys?: any;
                publicKeyMerkleProofs?: any;
              }
            | string
            | Uint8Array,
          latestMmrLeaf:
            | SpBeefyMmrMmrLeaf
            | { version?: any; parentNumberAndHash?: any; beefyNextAuthoritySet?: any; leafExtra?: any }
            | string
            | Uint8Array,
          proof: BridgeCommonSimplifiedProofProof | { order?: any; items?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [
          BridgeTypesSubNetworkId,
          SpBeefyCommitment,
          BridgeCommonBeefyTypesValidatorProof,
          SpBeefyMmrMmrLeaf,
          BridgeCommonSimplifiedProofProof,
        ]
      >;
    };
    bridgeDataSigner: {
      addPeer: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array,
          peer: SpCoreEcdsaPublic | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesGenericNetworkId, SpCoreEcdsaPublic]
      >;
      approve: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array,
          data: H256 | string | Uint8Array,
          signature: SpCoreEcdsaSignature | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesGenericNetworkId, H256, SpCoreEcdsaSignature]
      >;
      finishAddPeer: AugmentedSubmittable<
        (peer: SpCoreEcdsaPublic | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [SpCoreEcdsaPublic]
      >;
      finishRemovePeer: AugmentedSubmittable<
        (peer: SpCoreEcdsaPublic | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [SpCoreEcdsaPublic]
      >;
      registerNetwork: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array,
          peers: Vec<SpCoreEcdsaPublic> | (SpCoreEcdsaPublic | string | Uint8Array)[]
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesGenericNetworkId, Vec<SpCoreEcdsaPublic>]
      >;
      removePeer: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array,
          peer: SpCoreEcdsaPublic | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesGenericNetworkId, SpCoreEcdsaPublic]
      >;
    };
    bridgeInboundChannel: {
      registerEvmChannel: AugmentedSubmittable<
        (
          networkId: H256 | string | Uint8Array,
          channelAddress: H160 | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, H160]
      >;
      registerTonChannel: AugmentedSubmittable<
        (
          networkId: BridgeTypesTonTonNetworkId | 'Mainnet' | 'Testnet' | number | Uint8Array,
          channelAddress: BridgeTypesTonTonAddress | { workchain?: any; address?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesTonTonNetworkId, BridgeTypesTonTonAddress]
      >;
      submit: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array,
          commitment: BridgeTypesGenericCommitment | { Sub: any } | { EVM: any } | { TON: any } | string | Uint8Array,
          proof:
            | FramenodeRuntimeMultiProof
            | { Beefy: any }
            | { Multisig: any }
            | { EVMMultisig: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesGenericNetworkId, BridgeTypesGenericCommitment, FramenodeRuntimeMultiProof]
      >;
    };
    bridgeMultisig: {
      /**
       * Add a new signatory to the multisig account.
       * Can only be called by a multisig account.
       *
       * TODO: update weights for `add_signatory`
       * # <weight>
       * Key: length of members in multisigConfig: M
       * - One storage read - O(1)
       * - search in members - O(M)
       * - Storage write - O(M)
       * Total complexity - O(M)
       * # <weight>
       **/
      addSignatory: AugmentedSubmittable<
        (newMember: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Register approval for a dispatch to be made from a deterministic composite account if
       * approved by a total of `threshold - 1` of `other_signatories`.
       *
       * Payment: `DepositBase` will be reserved if this is the first approval, plus
       * `threshold` times `DepositFactor`. It is returned once this dispatch happens or
       * is cancelled.
       *
       * The dispatch origin for this call must be _Signed_.
       *
       * - `threshold`: The total number of approvals for this dispatch before it is executed.
       * - `other_signatories`: The accounts (other than the sender) who can approve this
       * dispatch. May not be empty.
       * - `maybe_timepoint`: If this is the first approval, then this must be `None`. If it is
       * not the first approval, then it must be `Some`, with the timepoint (block number and
       * transaction index) of the first approval transaction.
       * - `call_hash`: The hash of the call to be executed.
       *
       * NOTE: If this is the final approval, you will want to use `as_multi` instead.
       *
       * # <weight>
       * - `O(S)`.
       * - Up to one balance-reserve or unreserve operation.
       * - One passthrough operation, one insert, both `O(S)` where `S` is the number of
       * signatories. `S` is capped by `MaxSignatories`, with weight being proportional.
       * - One encode & hash, both of complexity `O(S)`.
       * - Up to one binary search and insert (`O(logS + S)`).
       * - I/O: 1 read `O(S)`, up to 1 mutate `O(S)`. Up to one remove.
       * - One event.
       * - Storage: inserts one item, value size bounded by `MaxSignatories`, with a
       * deposit taken for its lifetime of
       * `DepositBase + threshold * DepositFactor`.
       * ----------------------------------
       * - Base Weight:
       * - Create: 44.71 + 0.088 * S
       * - Approve: 31.48 + 0.116 * S
       * - DB Weight:
       * - Read: Multisig Storage, [Caller Account]
       * - Write: Multisig Storage, [Caller Account]
       * # </weight>
       **/
      approveAsMulti: AugmentedSubmittable<
        (
          id: AccountId32 | string | Uint8Array,
          maybeTimepoint:
            | Option<PalletMultisigBridgeTimepoint>
            | null
            | Uint8Array
            | PalletMultisigBridgeTimepoint
            | { height?: any; index?: any }
            | string,
          callHash: U8aFixed | string | Uint8Array,
          maxWeight: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, Option<PalletMultisigBridgeTimepoint>, U8aFixed, SpWeightsWeightV2Weight]
      >;
      /**
       * Register approval for a dispatch to be made from a deterministic composite account if
       * approved by a total of `threshold - 1` of `other_signatories`.
       *
       * If there are enough, then dispatch the call.
       *
       * Payment: `DepositBase` will be reserved if this is the first approval, plus
       * `threshold` times `DepositFactor`. It is returned once this dispatch happens or
       * is cancelled.
       *
       * The dispatch origin for this call must be _Signed_.
       *
       * - `threshold`: The total number of approvals for this dispatch before it is executed.
       * - `other_signatories`: The accounts (other than the sender) who can approve this
       * dispatch. May not be empty.
       * - `maybe_timepoint`: If this is the first approval, then this must be `None`. If it is
       * not the first approval, then it must be `Some`, with the timepoint (block number and
       * transaction index) of the first approval transaction.
       * - `call`: The call to be executed.
       *
       * NOTE: Unless this is the final approval, you will generally want to use
       * `approve_as_multi` instead, since it only requires a hash of the call.
       *
       * Result is equivalent to the dispatched result if `threshold` is exactly `1`. Otherwise
       * on success, result is `Ok` and the result from the interior call, if it was executed,
       * may be found in the deposited `MultisigExecuted` event.
       *
       * # <weight>
       * - `O(S + Z + Call)`.
       * - Up to one balance-reserve or unreserve operation.
       * - One passthrough operation, one insert, both `O(S)` where `S` is the number of
       * signatories. `S` is capped by `MaxSignatories`, with weight being proportional.
       * - One call encode & hash, both of complexity `O(Z)` where `Z` is tx-len.
       * - One encode & hash, both of complexity `O(S)`.
       * - Up to one binary search and insert (`O(logS + S)`).
       * - I/O: 1 read `O(S)`, up to 1 mutate `O(S)`. Up to one remove.
       * - One event.
       * - The weight of the `call`.
       * - Storage: inserts one item, value size bounded by `MaxSignatories`, with a
       * deposit taken for its lifetime of
       * `DepositBase + threshold * DepositFactor`.
       * -------------------------------
       * - Base Weight:
       * - Create:          41.89 + 0.118 * S + .002 * Z µs
       * - Create w/ Store: 53.57 + 0.119 * S + .003 * Z µs
       * - Approve:         31.39 + 0.136 * S + .002 * Z µs
       * - Complete:        39.94 + 0.26  * S + .002 * Z µs
       * - DB Weight:
       * - Reads: Multisig Storage, [Caller Account], Calls (if `store_call`)
       * - Writes: Multisig Storage, [Caller Account], Calls (if `store_call`)
       * - Plus Call Weight
       * # </weight>
       **/
      asMulti: AugmentedSubmittable<
        (
          id: AccountId32 | string | Uint8Array,
          maybeTimepoint:
            | Option<PalletMultisigBridgeTimepoint>
            | null
            | Uint8Array
            | PalletMultisigBridgeTimepoint
            | { height?: any; index?: any }
            | string,
          call: Bytes | string | Uint8Array,
          storeCall: bool | boolean | Uint8Array,
          maxWeight: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, Option<PalletMultisigBridgeTimepoint>, Bytes, bool, SpWeightsWeightV2Weight]
      >;
      /**
       * Immediately dispatch a multi-signature call using a single approval from the caller.
       *
       * The dispatch origin for this call must be _Signed_.
       *
       * - `other_signatories`: The accounts (other than the sender) who are part of the
       * multi-signature, but do not participate in the approval process.
       * - `call`: The call to be executed.
       *
       * Result is equivalent to the dispatched result.
       *
       * # <weight>
       * O(Z + C) where Z is the length of the call and C its execution weight.
       * -------------------------------
       * - Base Weight: 33.72 + 0.002 * Z µs
       * - DB Weight: None
       * - Plus Call Weight
       * # </weight>
       **/
      asMultiThreshold1: AugmentedSubmittable<
        (
          id: AccountId32 | string | Uint8Array,
          call: Call | IMethod | string | Uint8Array,
          timepoint: PalletMultisigBridgeTimepoint | { height?: any; index?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, Call, PalletMultisigBridgeTimepoint]
      >;
      /**
       * Cancel a pre-existing, on-going multisig transaction. Any deposit reserved previously
       * for this operation will be unreserved on success.
       *
       * The dispatch origin for this call must be _Signed_.
       *
       * - `threshold`: The total number of approvals for this dispatch before it is executed.
       * - `other_signatories`: The accounts (other than the sender) who can approve this
       * dispatch. May not be empty.
       * - `timepoint`: The timepoint (block number and transaction index) of the first approval
       * transaction for this dispatch.
       * - `call_hash`: The hash of the call to be executed.
       *
       * # <weight>
       * - `O(S)`.
       * - Up to one balance-reserve or unreserve operation.
       * - One passthrough operation, one insert, both `O(S)` where `S` is the number of
       * signatories. `S` is capped by `MaxSignatories`, with weight being proportional.
       * - One encode & hash, both of complexity `O(S)`.
       * - One event.
       * - I/O: 1 read `O(S)`, one remove.
       * - Storage: removes one item.
       * ----------------------------------
       * - Base Weight: 36.07 + 0.124 * S
       * - DB Weight:
       * - Read: Multisig Storage, [Caller Account], Refund Account, Calls
       * - Write: Multisig Storage, [Caller Account], Refund Account, Calls
       * # </weight>
       **/
      cancelAsMulti: AugmentedSubmittable<
        (
          id: AccountId32 | string | Uint8Array,
          timepoint: PalletMultisigBridgeTimepoint | { height?: any; index?: any } | string | Uint8Array,
          callHash: U8aFixed | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, PalletMultisigBridgeTimepoint, U8aFixed]
      >;
      /**
       * Create a new multisig account.
       * TODO: update weights for `register_multisig`
       * # <weight>
       * Key: M - length of members,
       * - One storage reads - O(1)
       * - One search in sorted list - O(logM)
       * - Confirmation that the list is sorted - O(M)
       * - One storage writes - O(1)
       * - One event
       * Total Complexity: O(M + logM)
       * # <weight>
       **/
      registerMultisig: AugmentedSubmittable<
        (signatories: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>,
        [Vec<AccountId32>]
      >;
      /**
       * Remove the signatory from the multisig account.
       * Can only be called by a multisig account.
       *
       * TODO: update weights for `remove_signatory`
       * # <weight>
       * Key: length of members in multisigConfig: M
       * - One storage reads - O(1)
       * - remove items in list - O(M)
       * Total complexity - O(M)
       * # <weight>
       **/
      removeSignatory: AugmentedSubmittable<
        (signatory: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
    };
    bridgeProxy: {
      addLimitedAsset: AugmentedSubmittable<
        (assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32]
      >;
      burn: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array,
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          recipient:
            | BridgeTypesGenericAccount
            | { EVM: any }
            | { Sora: any }
            | { Liberland: any }
            | { Parachain: any }
            | { Unknown: any }
            | { Root: any }
            | { TON: any }
            | string
            | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesGenericNetworkId, CommonPrimitivesAssetId32, BridgeTypesGenericAccount, u128]
      >;
      removeLimitedAsset: AugmentedSubmittable<
        (assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32]
      >;
      updateTransferLimit: AugmentedSubmittable<
        (
          settings: BridgeProxyTransferLimitSettings | { maxAmount?: any; periodBlocks?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeProxyTransferLimitSettings]
      >;
    };
    ceresGovernancePlatform: {
      /**
       * Create poll
       **/
      createPoll: AugmentedSubmittable<
        (
          pollAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          pollStartTimestamp: u64 | AnyNumber | Uint8Array,
          pollEndTimestamp: u64 | AnyNumber | Uint8Array,
          title: Bytes | string | Uint8Array,
          description: Bytes | string | Uint8Array,
          options: Vec<Bytes> | (Bytes | string | Uint8Array)[]
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u64, u64, Bytes, Bytes, Vec<Bytes>]
      >;
      /**
       * Voting for option
       **/
      vote: AugmentedSubmittable<
        (
          pollId: H256 | string | Uint8Array,
          votingOption: u32 | AnyNumber | Uint8Array,
          numberOfVotes: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, u32, u128]
      >;
      /**
       * Withdraw voting funds
       **/
      withdraw: AugmentedSubmittable<(pollId: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
    };
    ceresLaunchpad: {
      /**
       * Add whitelisted contributor
       **/
      addWhitelistedContributor: AugmentedSubmittable<
        (contributor: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Add whitelisted ILO organizer
       **/
      addWhitelistedIloOrganizer: AugmentedSubmittable<
        (iloOrganizer: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Change CERES burn fee
       **/
      changeCeresBurnFee: AugmentedSubmittable<
        (ceresFee: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
      /**
       * Change CERES contribution fee
       **/
      changeCeresContributionFee: AugmentedSubmittable<
        (ceresFee: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
      /**
       * Change fee percent on raised funds in successful ILO
       **/
      changeFeePercentForRaisedFunds: AugmentedSubmittable<
        (feePercent: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
      /**
       * Claim tokens
       **/
      claim: AugmentedSubmittable<
        (assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Claim LP tokens
       **/
      claimLpTokens: AugmentedSubmittable<
        (assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Claim PSWAP rewards
       **/
      claimPswapRewards: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Contribute
       **/
      contribute: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          fundsToContribute: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u128]
      >;
      /**
       * Create ILO
       **/
      createIlo: AugmentedSubmittable<
        (
          baseAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          tokensForIlo: u128 | AnyNumber | Uint8Array,
          tokensForLiquidity: u128 | AnyNumber | Uint8Array,
          iloPrice: u128 | AnyNumber | Uint8Array,
          softCap: u128 | AnyNumber | Uint8Array,
          hardCap: u128 | AnyNumber | Uint8Array,
          minContribution: u128 | AnyNumber | Uint8Array,
          maxContribution: u128 | AnyNumber | Uint8Array,
          refundType: bool | boolean | Uint8Array,
          liquidityPercent: u128 | AnyNumber | Uint8Array,
          listingPrice: u128 | AnyNumber | Uint8Array,
          lockupDays: u32 | AnyNumber | Uint8Array,
          startTimestamp: u64 | AnyNumber | Uint8Array,
          endTimestamp: u64 | AnyNumber | Uint8Array,
          teamVestingTotalTokens: u128 | AnyNumber | Uint8Array,
          teamVestingFirstReleasePercent: u128 | AnyNumber | Uint8Array,
          teamVestingPeriod: u64 | AnyNumber | Uint8Array,
          teamVestingPercent: u128 | AnyNumber | Uint8Array,
          firstReleasePercent: u128 | AnyNumber | Uint8Array,
          vestingPeriod: u64 | AnyNumber | Uint8Array,
          vestingPercent: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [
          CommonPrimitivesAssetId32,
          CommonPrimitivesAssetId32,
          u128,
          u128,
          u128,
          u128,
          u128,
          u128,
          u128,
          bool,
          u128,
          u128,
          u32,
          u64,
          u64,
          u128,
          u128,
          u64,
          u128,
          u128,
          u64,
          u128,
        ]
      >;
      /**
       * Emergency withdraw
       **/
      emergencyWithdraw: AugmentedSubmittable<
        (assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Finish ILO
       **/
      finishIlo: AugmentedSubmittable<
        (assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Remove whitelisted contributor
       **/
      removeWhitelistedContributor: AugmentedSubmittable<
        (contributor: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Remove whitelisted ILO organizer
       **/
      removeWhitelistedIloOrganizer: AugmentedSubmittable<
        (iloOrganizer: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
    };
    ceresLiquidityLocker: {
      /**
       * Change CERES fee
       **/
      changeCeresFee: AugmentedSubmittable<
        (ceresFee: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
      /**
       * Lock liquidity
       **/
      lockLiquidity: AugmentedSubmittable<
        (
          assetA: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          assetB: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          unlockingTimestamp: u64 | AnyNumber | Uint8Array,
          percentageOfPoolTokens: u128 | AnyNumber | Uint8Array,
          option: bool | boolean | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, u64, u128, bool]
      >;
    };
    ceresStaking: {
      /**
       * Change RewardsRemaining
       **/
      changeRewardsRemaining: AugmentedSubmittable<
        (rewardsRemaining: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
      deposit: AugmentedSubmittable<(amount: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u128]>;
      withdraw: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
    };
    ceresTokenLocker: {
      /**
       * Change fee
       **/
      changeFee: AugmentedSubmittable<(newFee: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u128]>;
      /**
       * Lock tokens
       **/
      lockTokens: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          unlockingTimestamp: u64 | AnyNumber | Uint8Array,
          numberOfTokens: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u64, u128]
      >;
      /**
       * Withdraw tokens
       **/
      withdrawTokens: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          unlockingTimestamp: u64 | AnyNumber | Uint8Array,
          numberOfTokens: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u64, u128]
      >;
    };
    council: {
      /**
       * Close a vote that is either approved, disapproved or whose voting period has ended.
       *
       * May be called by any signed account in order to finish voting and close the proposal.
       *
       * If called before the end of the voting period it will only close the vote if it is
       * has enough votes to be approved or disapproved.
       *
       * If called after the end of the voting period abstentions are counted as rejections
       * unless there is a prime member set and the prime member cast an approval.
       *
       * If the close operation completes successfully with disapproval, the transaction fee will
       * be waived. Otherwise execution of the approved operation will be charged to the caller.
       *
       * + `proposal_weight_bound`: The maximum amount of weight consumed by executing the closed
       * proposal.
       * + `length_bound`: The upper bound for the length of the proposal in storage. Checked via
       * `storage::read` so it is `size_of::<u32>() == 4` larger than the pure length.
       *
       * # <weight>
       * ## Weight
       * - `O(B + M + P1 + P2)` where:
       * - `B` is `proposal` size in bytes (length-fee-bounded)
       * - `M` is members-count (code- and governance-bounded)
       * - `P1` is the complexity of `proposal` preimage.
       * - `P2` is proposal-count (code-bounded)
       * - DB:
       * - 2 storage reads (`Members`: codec `O(M)`, `Prime`: codec `O(1)`)
       * - 3 mutations (`Voting`: codec `O(M)`, `ProposalOf`: codec `O(B)`, `Proposals`: codec
       * `O(P2)`)
       * - any mutations done while executing `proposal` (`P1`)
       * - up to 3 events
       * # </weight>
       **/
      close: AugmentedSubmittable<
        (
          proposalHash: H256 | string | Uint8Array,
          index: Compact<u32> | AnyNumber | Uint8Array,
          proposalWeightBound: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array,
          lengthBound: Compact<u32> | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, Compact<u32>, SpWeightsWeightV2Weight, Compact<u32>]
      >;
      /**
       * Close a vote that is either approved, disapproved or whose voting period has ended.
       *
       * May be called by any signed account in order to finish voting and close the proposal.
       *
       * If called before the end of the voting period it will only close the vote if it is
       * has enough votes to be approved or disapproved.
       *
       * If called after the end of the voting period abstentions are counted as rejections
       * unless there is a prime member set and the prime member cast an approval.
       *
       * If the close operation completes successfully with disapproval, the transaction fee will
       * be waived. Otherwise execution of the approved operation will be charged to the caller.
       *
       * + `proposal_weight_bound`: The maximum amount of weight consumed by executing the closed
       * proposal.
       * + `length_bound`: The upper bound for the length of the proposal in storage. Checked via
       * `storage::read` so it is `size_of::<u32>() == 4` larger than the pure length.
       *
       * # <weight>
       * ## Weight
       * - `O(B + M + P1 + P2)` where:
       * - `B` is `proposal` size in bytes (length-fee-bounded)
       * - `M` is members-count (code- and governance-bounded)
       * - `P1` is the complexity of `proposal` preimage.
       * - `P2` is proposal-count (code-bounded)
       * - DB:
       * - 2 storage reads (`Members`: codec `O(M)`, `Prime`: codec `O(1)`)
       * - 3 mutations (`Voting`: codec `O(M)`, `ProposalOf`: codec `O(B)`, `Proposals`: codec
       * `O(P2)`)
       * - any mutations done while executing `proposal` (`P1`)
       * - up to 3 events
       * # </weight>
       **/
      closeOldWeight: AugmentedSubmittable<
        (
          proposalHash: H256 | string | Uint8Array,
          index: Compact<u32> | AnyNumber | Uint8Array,
          proposalWeightBound: Compact<u64> | AnyNumber | Uint8Array,
          lengthBound: Compact<u32> | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, Compact<u32>, Compact<u64>, Compact<u32>]
      >;
      /**
       * Disapprove a proposal, close, and remove it from the system, regardless of its current
       * state.
       *
       * Must be called by the Root origin.
       *
       * Parameters:
       * * `proposal_hash`: The hash of the proposal that should be disapproved.
       *
       * # <weight>
       * Complexity: O(P) where P is the number of max proposals
       * DB Weight:
       * * Reads: Proposals
       * * Writes: Voting, Proposals, ProposalOf
       * # </weight>
       **/
      disapproveProposal: AugmentedSubmittable<
        (proposalHash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [H256]
      >;
      /**
       * Dispatch a proposal from a member using the `Member` origin.
       *
       * Origin must be a member of the collective.
       *
       * # <weight>
       * ## Weight
       * - `O(M + P)` where `M` members-count (code-bounded) and `P` complexity of dispatching
       * `proposal`
       * - DB: 1 read (codec `O(M)`) + DB access of `proposal`
       * - 1 event
       * # </weight>
       **/
      execute: AugmentedSubmittable<
        (
          proposal: Call | IMethod | string | Uint8Array,
          lengthBound: Compact<u32> | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Call, Compact<u32>]
      >;
      /**
       * Add a new proposal to either be voted on or executed directly.
       *
       * Requires the sender to be member.
       *
       * `threshold` determines whether `proposal` is executed directly (`threshold < 2`)
       * or put up for voting.
       *
       * # <weight>
       * ## Weight
       * - `O(B + M + P1)` or `O(B + M + P2)` where:
       * - `B` is `proposal` size in bytes (length-fee-bounded)
       * - `M` is members-count (code- and governance-bounded)
       * - branching is influenced by `threshold` where:
       * - `P1` is proposal execution complexity (`threshold < 2`)
       * - `P2` is proposals-count (code-bounded) (`threshold >= 2`)
       * - DB:
       * - 1 storage read `is_member` (codec `O(M)`)
       * - 1 storage read `ProposalOf::contains_key` (codec `O(1)`)
       * - DB accesses influenced by `threshold`:
       * - EITHER storage accesses done by `proposal` (`threshold < 2`)
       * - OR proposal insertion (`threshold <= 2`)
       * - 1 storage mutation `Proposals` (codec `O(P2)`)
       * - 1 storage mutation `ProposalCount` (codec `O(1)`)
       * - 1 storage write `ProposalOf` (codec `O(B)`)
       * - 1 storage write `Voting` (codec `O(M)`)
       * - 1 event
       * # </weight>
       **/
      propose: AugmentedSubmittable<
        (
          threshold: Compact<u32> | AnyNumber | Uint8Array,
          proposal: Call | IMethod | string | Uint8Array,
          lengthBound: Compact<u32> | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Compact<u32>, Call, Compact<u32>]
      >;
      /**
       * Set the collective's membership.
       *
       * - `new_members`: The new member list. Be nice to the chain and provide it sorted.
       * - `prime`: The prime member whose vote sets the default.
       * - `old_count`: The upper bound for the previous number of members in storage. Used for
       * weight estimation.
       *
       * Requires root origin.
       *
       * NOTE: Does not enforce the expected `MaxMembers` limit on the amount of members, but
       * the weight estimations rely on it to estimate dispatchable weight.
       *
       * # WARNING:
       *
       * The `pallet-collective` can also be managed by logic outside of the pallet through the
       * implementation of the trait [`ChangeMembers`].
       * Any call to `set_members` must be careful that the member set doesn't get out of sync
       * with other logic managing the member set.
       *
       * # <weight>
       * ## Weight
       * - `O(MP + N)` where:
       * - `M` old-members-count (code- and governance-bounded)
       * - `N` new-members-count (code- and governance-bounded)
       * - `P` proposals-count (code-bounded)
       * - DB:
       * - 1 storage mutation (codec `O(M)` read, `O(N)` write) for reading and writing the
       * members
       * - 1 storage read (codec `O(P)`) for reading the proposals
       * - `P` storage mutations (codec `O(M)`) for updating the votes for each proposal
       * - 1 storage write (codec `O(1)`) for deleting the old `prime` and setting the new one
       * # </weight>
       **/
      setMembers: AugmentedSubmittable<
        (
          newMembers: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[],
          prime: Option<AccountId32> | null | Uint8Array | AccountId32 | string,
          oldCount: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Vec<AccountId32>, Option<AccountId32>, u32]
      >;
      /**
       * Add an aye or nay vote for the sender to the given proposal.
       *
       * Requires the sender to be a member.
       *
       * Transaction fees will be waived if the member is voting on any particular proposal
       * for the first time and the call is successful. Subsequent vote changes will charge a
       * fee.
       * # <weight>
       * ## Weight
       * - `O(M)` where `M` is members-count (code- and governance-bounded)
       * - DB:
       * - 1 storage read `Members` (codec `O(M)`)
       * - 1 storage mutation `Voting` (codec `O(M)`)
       * - 1 event
       * # </weight>
       **/
      vote: AugmentedSubmittable<
        (
          proposal: H256 | string | Uint8Array,
          index: Compact<u32> | AnyNumber | Uint8Array,
          approve: bool | boolean | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, Compact<u32>, bool]
      >;
    };
    demeterFarmingPlatform: {
      /**
       * Activate removed pool
       **/
      activateRemovedPool: AugmentedSubmittable<
        (
          baseAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          poolAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          rewardAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          isFarm: bool | boolean | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, bool]
      >;
      /**
       * Add pool
       **/
      addPool: AugmentedSubmittable<
        (
          baseAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          poolAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          rewardAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          isFarm: bool | boolean | Uint8Array,
          multiplier: u32 | AnyNumber | Uint8Array,
          depositFee: u128 | AnyNumber | Uint8Array,
          isCore: bool | boolean | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, bool, u32, u128, bool]
      >;
      /**
       * Change info
       **/
      changeInfo: AugmentedSubmittable<
        (
          changedUser: AccountId32 | string | Uint8Array,
          baseAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          poolAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          rewardAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          isFarm: bool | boolean | Uint8Array,
          poolTokens: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, bool, u128]
      >;
      /**
       * Change pool deposit fee
       **/
      changePoolDepositFee: AugmentedSubmittable<
        (
          baseAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          poolAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          rewardAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          isFarm: bool | boolean | Uint8Array,
          depositFee: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, bool, u128]
      >;
      /**
       * Change pool multiplier
       **/
      changePoolMultiplier: AugmentedSubmittable<
        (
          baseAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          poolAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          rewardAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          isFarm: bool | boolean | Uint8Array,
          newMultiplier: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, bool, u32]
      >;
      /**
       * Change token info
       **/
      changeTokenInfo: AugmentedSubmittable<
        (
          poolAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          tokenPerBlock: u128 | AnyNumber | Uint8Array,
          farmsAllocation: u128 | AnyNumber | Uint8Array,
          stakingAllocation: u128 | AnyNumber | Uint8Array,
          teamAllocation: u128 | AnyNumber | Uint8Array,
          teamAccount: AccountId32 | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u128, u128, u128, u128, AccountId32]
      >;
      /**
       * Change total tokens
       **/
      changeTotalTokens: AugmentedSubmittable<
        (
          baseAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          poolAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          rewardAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          isFarm: bool | boolean | Uint8Array,
          totalTokens: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, bool, u128]
      >;
      /**
       * Deposit to pool
       **/
      deposit: AugmentedSubmittable<
        (
          baseAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          poolAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          rewardAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          isFarm: bool | boolean | Uint8Array,
          pooledTokens: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, bool, u128]
      >;
      /**
       * Get rewards
       **/
      getRewards: AugmentedSubmittable<
        (
          baseAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          poolAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          rewardAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          isFarm: bool | boolean | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, bool]
      >;
      /**
       * Register token for farming
       **/
      registerToken: AugmentedSubmittable<
        (
          poolAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          tokenPerBlock: u128 | AnyNumber | Uint8Array,
          farmsAllocation: u128 | AnyNumber | Uint8Array,
          stakingAllocation: u128 | AnyNumber | Uint8Array,
          teamAllocation: u128 | AnyNumber | Uint8Array,
          teamAccount: AccountId32 | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u128, u128, u128, u128, AccountId32]
      >;
      /**
       * Remove pool
       **/
      removePool: AugmentedSubmittable<
        (
          baseAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          poolAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          rewardAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          isFarm: bool | boolean | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, bool]
      >;
      /**
       * Withdraw
       **/
      withdraw: AugmentedSubmittable<
        (
          baseAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          poolAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          rewardAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          pooledTokens: u128 | AnyNumber | Uint8Array,
          isFarm: bool | boolean | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, u128, bool]
      >;
    };
    democracy: {
      /**
       * Permanently place a proposal into the blacklist. This prevents it from ever being
       * proposed again.
       *
       * If called on a queued public or external proposal, then this will result in it being
       * removed. If the `ref_index` supplied is an active referendum with the proposal hash,
       * then it will be cancelled.
       *
       * The dispatch origin of this call must be `BlacklistOrigin`.
       *
       * - `proposal_hash`: The proposal hash to blacklist permanently.
       * - `ref_index`: An ongoing referendum whose hash is `proposal_hash`, which will be
       * cancelled.
       *
       * Weight: `O(p)` (though as this is an high-privilege dispatch, we assume it has a
       * reasonable value).
       **/
      blacklist: AugmentedSubmittable<
        (
          proposalHash: H256 | string | Uint8Array,
          maybeRefIndex: Option<u32> | null | Uint8Array | u32 | AnyNumber
        ) => SubmittableExtrinsic<ApiType>,
        [H256, Option<u32>]
      >;
      /**
       * Remove a proposal.
       *
       * The dispatch origin of this call must be `CancelProposalOrigin`.
       *
       * - `prop_index`: The index of the proposal to cancel.
       *
       * Weight: `O(p)` where `p = PublicProps::<T>::decode_len()`
       **/
      cancelProposal: AugmentedSubmittable<
        (propIndex: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Compact<u32>]
      >;
      /**
       * Remove a referendum.
       *
       * The dispatch origin of this call must be _Root_.
       *
       * - `ref_index`: The index of the referendum to cancel.
       *
       * # Weight: `O(1)`.
       **/
      cancelReferendum: AugmentedSubmittable<
        (refIndex: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Compact<u32>]
      >;
      /**
       * Clears all public proposals.
       *
       * The dispatch origin of this call must be _Root_.
       *
       * Weight: `O(1)`.
       **/
      clearPublicProposals: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Delegate the voting power (with some given conviction) of the sending account.
       *
       * The balance delegated is locked for as long as it's delegated, and thereafter for the
       * time appropriate for the conviction's lock period.
       *
       * The dispatch origin of this call must be _Signed_, and the signing account must either:
       * - be delegating already; or
       * - have no voting activity (if there is, then it will need to be removed/consolidated
       * through `reap_vote` or `unvote`).
       *
       * - `to`: The account whose voting the `target` account's voting power will follow.
       * - `conviction`: The conviction that will be attached to the delegated votes. When the
       * account is undelegated, the funds will be locked for the corresponding period.
       * - `balance`: The amount of the account's balance to be used in delegating. This must not
       * be more than the account's current balance.
       *
       * Emits `Delegated`.
       *
       * Weight: `O(R)` where R is the number of referendums the voter delegating to has
       * voted on. Weight is charged as if maximum votes.
       **/
      delegate: AugmentedSubmittable<
        (
          to: AccountId32 | string | Uint8Array,
          conviction:
            | PalletDemocracyConviction
            | 'None'
            | 'Locked1x'
            | 'Locked2x'
            | 'Locked3x'
            | 'Locked4x'
            | 'Locked5x'
            | 'Locked6x'
            | number
            | Uint8Array,
          balance: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, PalletDemocracyConviction, u128]
      >;
      /**
       * Schedule an emergency cancellation of a referendum. Cannot happen twice to the same
       * referendum.
       *
       * The dispatch origin of this call must be `CancellationOrigin`.
       *
       * -`ref_index`: The index of the referendum to cancel.
       *
       * Weight: `O(1)`.
       **/
      emergencyCancel: AugmentedSubmittable<
        (refIndex: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u32]
      >;
      /**
       * Schedule a referendum to be tabled once it is legal to schedule an external
       * referendum.
       *
       * The dispatch origin of this call must be `ExternalOrigin`.
       *
       * - `proposal_hash`: The preimage hash of the proposal.
       **/
      externalPropose: AugmentedSubmittable<
        (
          proposal:
            | FrameSupportPreimagesBounded
            | { Legacy: any }
            | { Inline: any }
            | { Lookup: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [FrameSupportPreimagesBounded]
      >;
      /**
       * Schedule a negative-turnout-bias referendum to be tabled next once it is legal to
       * schedule an external referendum.
       *
       * The dispatch of this call must be `ExternalDefaultOrigin`.
       *
       * - `proposal_hash`: The preimage hash of the proposal.
       *
       * Unlike `external_propose`, blacklisting has no effect on this and it may replace a
       * pre-scheduled `external_propose` call.
       *
       * Weight: `O(1)`
       **/
      externalProposeDefault: AugmentedSubmittable<
        (
          proposal:
            | FrameSupportPreimagesBounded
            | { Legacy: any }
            | { Inline: any }
            | { Lookup: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [FrameSupportPreimagesBounded]
      >;
      /**
       * Schedule a majority-carries referendum to be tabled next once it is legal to schedule
       * an external referendum.
       *
       * The dispatch of this call must be `ExternalMajorityOrigin`.
       *
       * - `proposal_hash`: The preimage hash of the proposal.
       *
       * Unlike `external_propose`, blacklisting has no effect on this and it may replace a
       * pre-scheduled `external_propose` call.
       *
       * Weight: `O(1)`
       **/
      externalProposeMajority: AugmentedSubmittable<
        (
          proposal:
            | FrameSupportPreimagesBounded
            | { Legacy: any }
            | { Inline: any }
            | { Lookup: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [FrameSupportPreimagesBounded]
      >;
      /**
       * Schedule the currently externally-proposed majority-carries referendum to be tabled
       * immediately. If there is no externally-proposed referendum currently, or if there is one
       * but it is not a majority-carries referendum then it fails.
       *
       * The dispatch of this call must be `FastTrackOrigin`.
       *
       * - `proposal_hash`: The hash of the current external proposal.
       * - `voting_period`: The period that is allowed for voting on this proposal. Increased to
       * Must be always greater than zero.
       * For `FastTrackOrigin` must be equal or greater than `FastTrackVotingPeriod`.
       * - `delay`: The number of block after voting has ended in approval and this should be
       * enacted. This doesn't have a minimum amount.
       *
       * Emits `Started`.
       *
       * Weight: `O(1)`
       **/
      fastTrack: AugmentedSubmittable<
        (
          proposalHash: H256 | string | Uint8Array,
          votingPeriod: u32 | AnyNumber | Uint8Array,
          delay: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, u32, u32]
      >;
      /**
       * Propose a sensitive action to be taken.
       *
       * The dispatch origin of this call must be _Signed_ and the sender must
       * have funds to cover the deposit.
       *
       * - `proposal_hash`: The hash of the proposal preimage.
       * - `value`: The amount of deposit (must be at least `MinimumDeposit`).
       *
       * Emits `Proposed`.
       **/
      propose: AugmentedSubmittable<
        (
          proposal:
            | FrameSupportPreimagesBounded
            | { Legacy: any }
            | { Inline: any }
            | { Lookup: any }
            | string
            | Uint8Array,
          value: Compact<u128> | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [FrameSupportPreimagesBounded, Compact<u128>]
      >;
      /**
       * Remove a vote for a referendum.
       *
       * If the `target` is equal to the signer, then this function is exactly equivalent to
       * `remove_vote`. If not equal to the signer, then the vote must have expired,
       * either because the referendum was cancelled, because the voter lost the referendum or
       * because the conviction period is over.
       *
       * The dispatch origin of this call must be _Signed_.
       *
       * - `target`: The account of the vote to be removed; this account must have voted for
       * referendum `index`.
       * - `index`: The index of referendum of the vote to be removed.
       *
       * Weight: `O(R + log R)` where R is the number of referenda that `target` has voted on.
       * Weight is calculated for the maximum number of vote.
       **/
      removeOtherVote: AugmentedSubmittable<
        (
          target: AccountId32 | string | Uint8Array,
          index: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, u32]
      >;
      /**
       * Remove a vote for a referendum.
       *
       * If:
       * - the referendum was cancelled, or
       * - the referendum is ongoing, or
       * - the referendum has ended such that
       * - the vote of the account was in opposition to the result; or
       * - there was no conviction to the account's vote; or
       * - the account made a split vote
       * ...then the vote is removed cleanly and a following call to `unlock` may result in more
       * funds being available.
       *
       * If, however, the referendum has ended and:
       * - it finished corresponding to the vote of the account, and
       * - the account made a standard vote with conviction, and
       * - the lock period of the conviction is not over
       * ...then the lock will be aggregated into the overall account's lock, which may involve
       * *overlocking* (where the two locks are combined into a single lock that is the maximum
       * of both the amount locked and the time is it locked for).
       *
       * The dispatch origin of this call must be _Signed_, and the signer must have a vote
       * registered for referendum `index`.
       *
       * - `index`: The index of referendum of the vote to be removed.
       *
       * Weight: `O(R + log R)` where R is the number of referenda that `target` has voted on.
       * Weight is calculated for the maximum number of vote.
       **/
      removeVote: AugmentedSubmittable<(index: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u32]>;
      /**
       * Signals agreement with a particular proposal.
       *
       * The dispatch origin of this call must be _Signed_ and the sender
       * must have funds to cover the deposit, equal to the original deposit.
       *
       * - `proposal`: The index of the proposal to second.
       **/
      second: AugmentedSubmittable<
        (proposal: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Compact<u32>]
      >;
      /**
       * Undelegate the voting power of the sending account.
       *
       * Tokens may be unlocked following once an amount of time consistent with the lock period
       * of the conviction with which the delegation was issued.
       *
       * The dispatch origin of this call must be _Signed_ and the signing account must be
       * currently delegating.
       *
       * Emits `Undelegated`.
       *
       * Weight: `O(R)` where R is the number of referendums the voter delegating to has
       * voted on. Weight is charged as if maximum votes.
       **/
      undelegate: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Unlock tokens that have an expired lock.
       *
       * The dispatch origin of this call must be _Signed_.
       *
       * - `target`: The account to remove the lock on.
       *
       * Weight: `O(R)` with R number of vote of target.
       **/
      unlock: AugmentedSubmittable<
        (target: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Veto and blacklist the external proposal hash.
       *
       * The dispatch origin of this call must be `VetoOrigin`.
       *
       * - `proposal_hash`: The preimage hash of the proposal to veto and blacklist.
       *
       * Emits `Vetoed`.
       *
       * Weight: `O(V + log(V))` where V is number of `existing vetoers`
       **/
      vetoExternal: AugmentedSubmittable<
        (proposalHash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [H256]
      >;
      /**
       * Vote in a referendum. If `vote.is_aye()`, the vote is to enact the proposal;
       * otherwise it is a vote to keep the status quo.
       *
       * The dispatch origin of this call must be _Signed_.
       *
       * - `ref_index`: The index of the referendum to vote for.
       * - `vote`: The vote configuration.
       **/
      vote: AugmentedSubmittable<
        (
          refIndex: Compact<u32> | AnyNumber | Uint8Array,
          vote: PalletDemocracyVoteAccountVote | { Standard: any } | { Split: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Compact<u32>, PalletDemocracyVoteAccountVote]
      >;
    };
    denomination: {
      init: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      startDenomination: AugmentedSubmittable<
        (denominator: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
    };
    dexapi: {
      disableLiquiditySource: AugmentedSubmittable<
        (
          source:
            | CommonPrimitivesLiquiditySourceType
            | 'XYKPool'
            | 'BondingCurvePool'
            | 'MulticollateralBondingCurvePool'
            | 'MockPool'
            | 'MockPool2'
            | 'MockPool3'
            | 'MockPool4'
            | 'XSTPool'
            | 'OrderBook'
            | number
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesLiquiditySourceType]
      >;
      enableLiquiditySource: AugmentedSubmittable<
        (
          source:
            | CommonPrimitivesLiquiditySourceType
            | 'XYKPool'
            | 'BondingCurvePool'
            | 'MulticollateralBondingCurvePool'
            | 'MockPool'
            | 'MockPool2'
            | 'MockPool3'
            | 'MockPool4'
            | 'XSTPool'
            | 'OrderBook'
            | number
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesLiquiditySourceType]
      >;
    };
    electionProviderMultiPhase: {
      /**
       * Trigger the governance fallback.
       *
       * This can only be called when [`Phase::Emergency`] is enabled, as an alternative to
       * calling [`Call::set_emergency_election_result`].
       **/
      governanceFallback: AugmentedSubmittable<
        (
          maybeMaxVoters: Option<u32> | null | Uint8Array | u32 | AnyNumber,
          maybeMaxTargets: Option<u32> | null | Uint8Array | u32 | AnyNumber
        ) => SubmittableExtrinsic<ApiType>,
        [Option<u32>, Option<u32>]
      >;
      /**
       * Set a solution in the queue, to be handed out to the client of this pallet in the next
       * call to `ElectionProvider::elect`.
       *
       * This can only be set by `T::ForceOrigin`, and only when the phase is `Emergency`.
       *
       * The solution is not checked for any feasibility and is assumed to be trustworthy, as any
       * feasibility check itself can in principle cause the election process to fail (due to
       * memory/weight constrains).
       **/
      setEmergencyElectionResult: AugmentedSubmittable<
        (
          supports:
            | Vec<ITuple<[AccountId32, SpNposElectionsSupport]>>
            | [
                AccountId32 | string | Uint8Array,
                SpNposElectionsSupport | { total?: any; voters?: any } | string | Uint8Array,
              ][]
        ) => SubmittableExtrinsic<ApiType>,
        [Vec<ITuple<[AccountId32, SpNposElectionsSupport]>>]
      >;
      /**
       * Set a new value for `MinimumUntrustedScore`.
       *
       * Dispatch origin must be aligned with `T::ForceOrigin`.
       *
       * This check can be turned off by setting the value to `None`.
       **/
      setMinimumUntrustedScore: AugmentedSubmittable<
        (
          maybeNextScore:
            | Option<SpNposElectionsElectionScore>
            | null
            | Uint8Array
            | SpNposElectionsElectionScore
            | { minimalStake?: any; sumStake?: any; sumStakeSquared?: any }
            | string
        ) => SubmittableExtrinsic<ApiType>,
        [Option<SpNposElectionsElectionScore>]
      >;
      /**
       * Submit a solution for the signed phase.
       *
       * The dispatch origin fo this call must be __signed__.
       *
       * The solution is potentially queued, based on the claimed score and processed at the end
       * of the signed phase.
       *
       * A deposit is reserved and recorded for the solution. Based on the outcome, the solution
       * might be rewarded, slashed, or get all or a part of the deposit back.
       **/
      submit: AugmentedSubmittable<
        (
          rawSolution:
            | PalletElectionProviderMultiPhaseRawSolution
            | { solution?: any; score?: any; round?: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [PalletElectionProviderMultiPhaseRawSolution]
      >;
      /**
       * Submit a solution for the unsigned phase.
       *
       * The dispatch origin fo this call must be __none__.
       *
       * This submission is checked on the fly. Moreover, this unsigned solution is only
       * validated when submitted to the pool from the **local** node. Effectively, this means
       * that only active validators can submit this transaction when authoring a block (similar
       * to an inherent).
       *
       * To prevent any incorrect solution (and thus wasted time/weight), this transaction will
       * panic if the solution submitted by the validator is invalid in any way, effectively
       * putting their authoring reward at risk.
       *
       * No deposit or reward is associated with this submission.
       **/
      submitUnsigned: AugmentedSubmittable<
        (
          rawSolution:
            | PalletElectionProviderMultiPhaseRawSolution
            | { solution?: any; score?: any; round?: any }
            | string
            | Uint8Array,
          witness:
            | PalletElectionProviderMultiPhaseSolutionOrSnapshotSize
            | { voters?: any; targets?: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [PalletElectionProviderMultiPhaseRawSolution, PalletElectionProviderMultiPhaseSolutionOrSnapshotSize]
      >;
    };
    electionsPhragmen: {
      /**
       * Clean all voters who are defunct (i.e. they do not serve any purpose at all). The
       * deposit of the removed voters are returned.
       *
       * This is an root function to be used only for cleaning the state.
       *
       * The dispatch origin of this call must be root.
       *
       * # <weight>
       * The total number of voters and those that are defunct must be provided as witness data.
       * # </weight>
       **/
      cleanDefunctVoters: AugmentedSubmittable<
        (
          numVoters: u32 | AnyNumber | Uint8Array,
          numDefunct: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u32, u32]
      >;
      /**
       * Remove a particular member from the set. This is effective immediately and the bond of
       * the outgoing member is slashed.
       *
       * If a runner-up is available, then the best runner-up will be removed and replaces the
       * outgoing member. Otherwise, if `rerun_election` is `true`, a new phragmen election is
       * started, else, nothing happens.
       *
       * If `slash_bond` is set to true, the bond of the member being removed is slashed. Else,
       * it is returned.
       *
       * The dispatch origin of this call must be root.
       *
       * Note that this does not affect the designated block number of the next election.
       *
       * # <weight>
       * If we have a replacement, we use a small weight. Else, since this is a root call and
       * will go into phragmen, we assume full block for now.
       * # </weight>
       **/
      removeMember: AugmentedSubmittable<
        (
          who: AccountId32 | string | Uint8Array,
          slashBond: bool | boolean | Uint8Array,
          rerunElection: bool | boolean | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, bool, bool]
      >;
      /**
       * Remove `origin` as a voter.
       *
       * This removes the lock and returns the deposit.
       *
       * The dispatch origin of this call must be signed and be a voter.
       **/
      removeVoter: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Renounce one's intention to be a candidate for the next election round. 3 potential
       * outcomes exist:
       *
       * - `origin` is a candidate and not elected in any set. In this case, the deposit is
       * unreserved, returned and origin is removed as a candidate.
       * - `origin` is a current runner-up. In this case, the deposit is unreserved, returned and
       * origin is removed as a runner-up.
       * - `origin` is a current member. In this case, the deposit is unreserved and origin is
       * removed as a member, consequently not being a candidate for the next round anymore.
       * Similar to [`remove_member`](Self::remove_member), if replacement runners exists, they
       * are immediately used. If the prime is renouncing, then no prime will exist until the
       * next round.
       *
       * The dispatch origin of this call must be signed, and have one of the above roles.
       *
       * # <weight>
       * The type of renouncing must be provided as witness data.
       * # </weight>
       **/
      renounceCandidacy: AugmentedSubmittable<
        (
          renouncing:
            | PalletElectionsPhragmenRenouncing
            | { Member: any }
            | { RunnerUp: any }
            | { Candidate: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [PalletElectionsPhragmenRenouncing]
      >;
      /**
       * Submit oneself for candidacy. A fixed amount of deposit is recorded.
       *
       * All candidates are wiped at the end of the term. They either become a member/runner-up,
       * or leave the system while their deposit is slashed.
       *
       * The dispatch origin of this call must be signed.
       *
       * ### Warning
       *
       * Even if a candidate ends up being a member, they must call [`Call::renounce_candidacy`]
       * to get their deposit back. Losing the spot in an election will always lead to a slash.
       *
       * # <weight>
       * The number of current candidates must be provided as witness data.
       * # </weight>
       **/
      submitCandidacy: AugmentedSubmittable<
        (candidateCount: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Compact<u32>]
      >;
      /**
       * Vote for a set of candidates for the upcoming round of election. This can be called to
       * set the initial votes, or update already existing votes.
       *
       * Upon initial voting, `value` units of `who`'s balance is locked and a deposit amount is
       * reserved. The deposit is based on the number of votes and can be updated over time.
       *
       * The `votes` should:
       * - not be empty.
       * - be less than the number of possible candidates. Note that all current members and
       * runners-up are also automatically candidates for the next round.
       *
       * If `value` is more than `who`'s free balance, then the maximum of the two is used.
       *
       * The dispatch origin of this call must be signed.
       *
       * ### Warning
       *
       * It is the responsibility of the caller to **NOT** place all of their balance into the
       * lock and keep some for further operations.
       *
       * # <weight>
       * We assume the maximum weight among all 3 cases: vote_equal, vote_more and vote_less.
       * # </weight>
       **/
      vote: AugmentedSubmittable<
        (
          votes: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[],
          value: Compact<u128> | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Vec<AccountId32>, Compact<u128>]
      >;
    };
    ethBridge: {
      /**
       * Cancels a registered request.
       *
       * Loads request by the given `hash`, cancels it, changes its status to `Failed` and
       * removes it from the request queues.
       *
       * Can only be called from a bridge account.
       **/
      abortRequest: AugmentedSubmittable<
        (
          hash: H256 | string | Uint8Array,
          error:
            | SpRuntimeDispatchError
            | { Other: any }
            | { CannotLookup: any }
            | { BadOrigin: any }
            | { Module: any }
            | { ConsumerRemaining: any }
            | { NoProviders: any }
            | { TooManyConsumers: any }
            | { Token: any }
            | { Arithmetic: any }
            | { Transactional: any }
            | { Exhausted: any }
            | { Corruption: any }
            | { Unavailable: any }
            | string
            | Uint8Array,
          networkId: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, SpRuntimeDispatchError, u32]
      >;
      /**
       * Add a Thischain asset to the bridge whitelist.
       *
       * Can only be called by root.
       *
       * Parameters:
       * - `asset_id` - Thischain asset identifier.
       * - `network_id` - network identifier to which the asset should be added.
       **/
      addAsset: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          networkId: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u32]
      >;
      /**
       * Add a new peer to the bridge peers set.
       *
       * Parameters:
       * - `account_id` - account id on thischain.
       * - `address` - account id on sidechain.
       * - `network_id` - network identifier.
       **/
      addPeer: AugmentedSubmittable<
        (
          accountId: AccountId32 | string | Uint8Array,
          address: H160 | string | Uint8Array,
          networkId: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, H160, u32]
      >;
      /**
       * Add a Sidechain token to the bridge whitelist.
       *
       * Parameters:
       * - `token_address` - token contract address.
       * - `symbol` - token symbol (ticker).
       * - `name` - token name.
       * - `decimals` -  token precision.
       * - `network_id` - network identifier.
       **/
      addSidechainToken: AugmentedSubmittable<
        (
          tokenAddress: H160 | string | Uint8Array,
          symbol: Text | string,
          name: Text | string,
          decimals: u8 | AnyNumber | Uint8Array,
          networkId: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H160, Text, Text, u8, u32]
      >;
      /**
       * Approve the given outgoing request. The function is used by bridge peers.
       *
       * Verifies the peer signature of the given request and adds it to `RequestApprovals`.
       * Once quorum is collected, the request gets finalized and removed from request queue.
       **/
      approveRequest: AugmentedSubmittable<
        (
          ocwPublic: SpCoreEcdsaPublic | string | Uint8Array,
          hash: H256 | string | Uint8Array,
          signatureParams: EthBridgeOffchainSignatureParams | { r?: any; s?: any; v?: any } | string | Uint8Array,
          networkId: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [SpCoreEcdsaPublic, H256, EthBridgeOffchainSignatureParams, u32]
      >;
      /**
       * Finalize incoming request (see `Pallet::finalize_incoming_request_inner`).
       *
       * Can be only called from a bridge account.
       *
       * Parameters:
       * - `request` - an incoming request.
       * - `network_id` - network identifier.
       **/
      finalizeIncomingRequest: AugmentedSubmittable<
        (hash: H256 | string | Uint8Array, networkId: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [H256, u32]
      >;
      /**
       * Add the given peer to the peers set without additional checks.
       *
       * Can only be called by a root account.
       **/
      forceAddPeer: AugmentedSubmittable<
        (
          who: AccountId32 | string | Uint8Array,
          address: H160 | string | Uint8Array,
          networkId: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, H160, u32]
      >;
      /**
       * Import the given incoming request.
       *
       * Register's the load request, then registers and finalizes the incoming request if it
       * succeeded, otherwise aborts the load request.
       *
       * Can only be called by a bridge account.
       **/
      importIncomingRequest: AugmentedSubmittable<
        (
          loadIncomingRequest:
            | EthBridgeRequestsLoadIncomingRequest
            | { Transaction: any }
            | { Meta: any }
            | string
            | Uint8Array,
          incomingRequestResult:
            | Result<EthBridgeRequestsIncomingRequest, SpRuntimeDispatchError>
            | { Ok: any }
            | { Err: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [EthBridgeRequestsLoadIncomingRequest, Result<EthBridgeRequestsIncomingRequest, SpRuntimeDispatchError>]
      >;
      /**
       * Migrate the given bridge to a new smart-contract.
       *
       * Can only be called by an authority.
       *
       * Parameters:
       * - `new_contract_address` - new sidechain ocntract address.
       * - `erc20_native_tokens` - migrated assets ids.
       * - `network_id` - bridge network identifier.
       **/
      migrate: AugmentedSubmittable<
        (
          newContractAddress: H160 | string | Uint8Array,
          erc20NativeTokens: Vec<H160> | (H160 | string | Uint8Array)[],
          networkId: u32 | AnyNumber | Uint8Array,
          newSignatureVersion: EthBridgeBridgeSignatureVersion | 'V1' | 'V2' | 'V3' | number | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H160, Vec<H160>, u32, EthBridgeBridgeSignatureVersion]
      >;
      /**
       * Prepare the given bridge for migration.
       *
       * Can only be called by an authority.
       *
       * Parameters:
       * - `network_id` - bridge network identifier.
       **/
      prepareForMigration: AugmentedSubmittable<
        (networkId: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u32]
      >;
      /**
       * Register a new bridge.
       *
       * Parameters:
       * - `bridge_contract_address` - address of smart-contract deployed on a corresponding
       * network.
       * - `initial_peers` - a set of initial network peers.
       **/
      registerBridge: AugmentedSubmittable<
        (
          bridgeContractAddress: H160 | string | Uint8Array,
          initialPeers: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[],
          signatureVersion: EthBridgeBridgeSignatureVersion | 'V1' | 'V2' | 'V3' | number | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H160, Vec<AccountId32>, EthBridgeBridgeSignatureVersion]
      >;
      /**
       * Register existing asset
       *
       * Can only be called by root.
       **/
      registerExistingSidechainAsset: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          tokenAddress: H160 | string | Uint8Array,
          networkId: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, H160, u32]
      >;
      /**
       * Register the given incoming request and add it to the queue.
       *
       * Calls `validate` and `prepare` on the request, adds it to the queue and maps it with the
       * corresponding load-incoming-request and removes the load-request from the queue.
       *
       * Can only be called by a bridge account.
       **/
      registerIncomingRequest: AugmentedSubmittable<
        (
          incomingRequest:
            | EthBridgeRequestsIncomingRequest
            | { Transfer: any }
            | { AddToken: any }
            | { ChangePeers: any }
            | { CancelOutgoingRequest: any }
            | { MarkAsDone: any }
            | { PrepareForMigration: any }
            | { Migrate: any }
            | { ChangePeersCompat: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [EthBridgeRequestsIncomingRequest]
      >;
      /**
       * Remove peer from the the bridge peers set.
       *
       * Parameters:
       * - `account_id` - account id on thischain.
       * - `network_id` - network identifier.
       **/
      removePeer: AugmentedSubmittable<
        (
          accountId: AccountId32 | string | Uint8Array,
          peerAddress: Option<H160> | null | Uint8Array | H160 | string,
          networkId: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, Option<H160>, u32]
      >;
      /**
       * Remove asset
       *
       * Can only be called by root.
       **/
      removeSidechainAsset: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          networkId: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u32]
      >;
      /**
       * Load incoming request from Sidechain by the given transaction hash.
       *
       * Parameters:
       * - `eth_tx_hash` - transaction hash on Sidechain.
       * - `kind` - incoming request type.
       * - `network_id` - network identifier.
       **/
      requestFromSidechain: AugmentedSubmittable<
        (
          ethTxHash: H256 | string | Uint8Array,
          kind: EthBridgeRequestsIncomingRequestKind | { Transaction: any } | { Meta: any } | string | Uint8Array,
          networkId: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, EthBridgeRequestsIncomingRequestKind, u32]
      >;
      /**
       * Transfer some amount of the given asset to Sidechain address.
       *
       * Note: if the asset kind is `Sidechain`, the amount should fit in the asset's precision
       * on sidechain (`SidechainAssetPrecision`) without extra digits. For example, assume
       * some ERC-20 (`T`) token has `decimals=6`, and the corresponding asset on substrate has
       * `7`. Alice's balance on thischain is `0.1000009`. If Alice would want to transfer all
       * the amount, she will get an error `NonZeroDust`, because of the `9` at the end, so, the
       * correct amount would be `0.100000` (only 6 digits after the decimal point).
       *
       * Parameters:
       * - `asset_id` - thischain asset id.
       * - `to` - sidechain account id.
       * - `amount` - amount of the asset.
       * - `network_id` - network identifier.
       **/
      transferToSidechain: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          to: H160 | string | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array,
          networkId: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, H160, u128, u32]
      >;
    };
    evmFungibleApp: {
      burn: AugmentedSubmittable<
        (
          networkId: H256 | string | Uint8Array,
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          recipient: H160 | string | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, CommonPrimitivesAssetId32, H160, u128]
      >;
      claimRelayerFees: AugmentedSubmittable<
        (
          networkId: H256 | string | Uint8Array,
          relayer: H160 | string | Uint8Array,
          signature: SpCoreEcdsaSignature | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, H160, SpCoreEcdsaSignature]
      >;
      mint: AugmentedSubmittable<
        (
          token: H160 | string | Uint8Array,
          sender: H160 | string | Uint8Array,
          recipient: AccountId32 | string | Uint8Array,
          amount: U256 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H160, H160, AccountId32, U256]
      >;
      registerAssetInternal: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          contract: H160 | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, H160]
      >;
      registerExistingSidechainAsset: AugmentedSubmittable<
        (
          networkId: H256 | string | Uint8Array,
          address: H160 | string | Uint8Array,
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          decimals: u8 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, H160, CommonPrimitivesAssetId32, u8]
      >;
      registerNetwork: AugmentedSubmittable<
        (
          networkId: H256 | string | Uint8Array,
          contract: H160 | string | Uint8Array,
          symbol: Bytes | string | Uint8Array,
          name: Bytes | string | Uint8Array,
          sidechainPrecision: u8 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, H160, Bytes, Bytes, u8]
      >;
      registerNetworkWithExistingAsset: AugmentedSubmittable<
        (
          networkId: H256 | string | Uint8Array,
          contract: H160 | string | Uint8Array,
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          sidechainPrecision: u8 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, H160, CommonPrimitivesAssetId32, u8]
      >;
      registerSidechainAsset: AugmentedSubmittable<
        (
          networkId: H256 | string | Uint8Array,
          address: H160 | string | Uint8Array,
          symbol: Bytes | string | Uint8Array,
          name: Bytes | string | Uint8Array,
          decimals: u8 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, H160, Bytes, Bytes, u8]
      >;
      registerThischainAsset: AugmentedSubmittable<
        (
          networkId: H256 | string | Uint8Array,
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, CommonPrimitivesAssetId32]
      >;
    };
    extendedAssets: {
      /**
       * Binds a regulated asset to a Soulbound Token (SBT).
       *
       * This function binds a regulated asset to a specified SBT, ensuring the asset and
       * the SBT meet the required criteria.
       *
       * ## Parameters
       *
       * - `origin`: The origin of the transaction.
       * - `sbt_asset_id`: The ID of the SBT to bind the regulated asset to.
       * - `regulated_asset_id`: The ID of the regulated asset to bind.
       **/
      bindRegulatedAssetToSbt: AugmentedSubmittable<
        (
          sbtAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          regulatedAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32]
      >;
      /**
       * Issues a new Soulbound Token (SBT).
       *
       * ## Parameters
       *
       * - `origin`: The origin of the transaction.
       * - `symbol`: The symbol of the SBT which should represent a string with only uppercase Latin characters with a maximum length of 7.
       * - `name`: The name of the SBT which should represent a string with only uppercase or lowercase Latin characters, numbers, or spaces, with a maximum length of 33.
       * - `description`: The description of the SBT. (Optional)
       * - `image`: The URL or identifier for the image associated with the SBT. (Optional)
       * - `external_url`: The URL pointing to an external resource related to the SBT. (Optional)
       **/
      issueSbt: AugmentedSubmittable<
        (
          symbol: Bytes | string | Uint8Array,
          name: Bytes | string | Uint8Array,
          description: Option<Bytes> | null | Uint8Array | Bytes | string,
          image: Option<Bytes> | null | Uint8Array | Bytes | string,
          externalUrl: Option<Bytes> | null | Uint8Array | Bytes | string
        ) => SubmittableExtrinsic<ApiType>,
        [Bytes, Bytes, Option<Bytes>, Option<Bytes>, Option<Bytes>]
      >;
      /**
       * Registers a new regulated asset, representing that the asset will only operate between KYC-verified wallets.
       *
       * ## Parameters
       *
       * - `origin`: The origin of the transaction.
       * - `symbol`: AssetSymbol should represent string with only uppercase latin chars with max length of 7.
       * - `name`: AssetName should represent string with only uppercase or lowercase latin chars or numbers or spaces, with max length of 33.
       * - `initial_supply`: Balance type representing the total amount of the asset to be issued initially.
       * - `is_indivisible`: A boolean flag indicating whether the asset can be divided into smaller units or not.
       * - `opt_content_src`: An optional parameter of type `ContentSource`, which can include a URI or a reference to a content source that provides more details about the asset.
       * - `opt_desc`: An optional parameter of type `Description`, which is a string providing a short description or commentary about the asset.
       *
       * ## Events
       *
       * Emits `RegulatedAssetRegistered` event when the asset is successfully registered.
       *
       **/
      registerRegulatedAsset: AugmentedSubmittable<
        (
          symbol: Bytes | string | Uint8Array,
          name: Bytes | string | Uint8Array,
          initialSupply: u128 | AnyNumber | Uint8Array,
          isMintable: bool | boolean | Uint8Array,
          isIndivisible: bool | boolean | Uint8Array,
          optContentSrc: Option<Bytes> | null | Uint8Array | Bytes | string,
          optDesc: Option<Bytes> | null | Uint8Array | Bytes | string
        ) => SubmittableExtrinsic<ApiType>,
        [Bytes, Bytes, u128, bool, bool, Option<Bytes>, Option<Bytes>]
      >;
      /**
       * Marks an asset as regulated, representing that the asset will only operate between KYC-verified wallets.
       *
       * ## Parameters
       *
       * - `origin`: The origin of the transaction.
       * - `asset_id`: The identifier of the asset.
       **/
      regulateAsset: AugmentedSubmittable<
        (assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Sets the expiration date of a Soulbound Token (SBT) for the given account.
       *
       * ## Parameters
       *
       * - `origin`: The origin of the transaction.
       * - `asset_id`: The ID of the SBT to update.
       * - `account_id`: The ID of the account to set the expiration for.
       * - `new_expires_at`: The new expiration timestamp for the SBT.
       **/
      setSbtExpiration: AugmentedSubmittable<
        (
          accountId: AccountId32 | string | Uint8Array,
          sbtAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          newExpiresAt: Option<u64> | null | Uint8Array | u64 | AnyNumber
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, CommonPrimitivesAssetId32, Option<u64>]
      >;
    };
    farming: {
      setLpMinXorForBonusReward: AugmentedSubmittable<
        (newLpMinXorForBonusReward: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
    };
    faucet: {
      resetRewards: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Transfers the specified amount of asset to the specified account.
       * The supported assets are: XOR, VAL, PSWAP.
       *
       * # Errors
       *
       * AssetNotSupported is returned if `asset_id` is something the function doesn't support.
       * AmountAboveLimit is returned if `target` has already received their daily limit of `asset_id`.
       * NotEnoughReserves is returned if `amount` is greater than the reserves
       **/
      transfer: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          target: AccountId32 | string | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, AccountId32, u128]
      >;
      updateLimit: AugmentedSubmittable<
        (newLimit: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
    };
    grandpa: {
      /**
       * Note that the current authority set of the GRANDPA finality gadget has stalled.
       *
       * This will trigger a forced authority set change at the beginning of the next session, to
       * be enacted `delay` blocks after that. The `delay` should be high enough to safely assume
       * that the block signalling the forced change will not be re-orged e.g. 1000 blocks.
       * The block production rate (which may be slowed down because of finality lagging) should
       * be taken into account when choosing the `delay`. The GRANDPA voters based on the new
       * authority will start voting on top of `best_finalized_block_number` for new finalized
       * blocks. `best_finalized_block_number` should be the highest of the latest finalized
       * block of all validators of the new authority set.
       *
       * Only callable by root.
       **/
      noteStalled: AugmentedSubmittable<
        (
          delay: u32 | AnyNumber | Uint8Array,
          bestFinalizedBlockNumber: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u32, u32]
      >;
      /**
       * Report voter equivocation/misbehavior. This method will verify the
       * equivocation proof and validate the given key ownership proof
       * against the extracted offender. If both are valid, the offence
       * will be reported.
       **/
      reportEquivocation: AugmentedSubmittable<
        (
          equivocationProof:
            | SpFinalityGrandpaEquivocationProof
            | { setId?: any; equivocation?: any }
            | string
            | Uint8Array,
          keyOwnerProof:
            | SpSessionMembershipProof
            | { session?: any; trieNodes?: any; validatorCount?: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [SpFinalityGrandpaEquivocationProof, SpSessionMembershipProof]
      >;
      /**
       * Report voter equivocation/misbehavior. This method will verify the
       * equivocation proof and validate the given key ownership proof
       * against the extracted offender. If both are valid, the offence
       * will be reported.
       *
       * This extrinsic must be called unsigned and it is expected that only
       * block authors will call it (validated in `ValidateUnsigned`), as such
       * if the block author is defined it will be defined as the equivocation
       * reporter.
       **/
      reportEquivocationUnsigned: AugmentedSubmittable<
        (
          equivocationProof:
            | SpFinalityGrandpaEquivocationProof
            | { setId?: any; equivocation?: any }
            | string
            | Uint8Array,
          keyOwnerProof:
            | SpSessionMembershipProof
            | { session?: any; trieNodes?: any; validatorCount?: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [SpFinalityGrandpaEquivocationProof, SpSessionMembershipProof]
      >;
    };
    hermesGovernancePlatform: {
      /**
       * Change minimum Hermes for creating a poll
       **/
      changeMinHermesForCreatingPoll: AugmentedSubmittable<
        (hermesAmount: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
      /**
       * Change minimum Hermes for voting
       **/
      changeMinHermesForVoting: AugmentedSubmittable<
        (hermesAmount: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
      /**
       * Create poll
       **/
      createPoll: AugmentedSubmittable<
        (
          pollStartTimestamp: u64 | AnyNumber | Uint8Array,
          pollEndTimestamp: u64 | AnyNumber | Uint8Array,
          title: Bytes | string | Uint8Array,
          description: Bytes | string | Uint8Array,
          options: Vec<Bytes> | (Bytes | string | Uint8Array)[]
        ) => SubmittableExtrinsic<ApiType>,
        [u64, u64, Bytes, Bytes, Vec<Bytes>]
      >;
      /**
       * Vote for some option
       **/
      vote: AugmentedSubmittable<
        (
          pollId: H256 | string | Uint8Array,
          votingOption: Bytes | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, Bytes]
      >;
      /**
       * Withdraw funds creator
       **/
      withdrawFundsCreator: AugmentedSubmittable<
        (pollId: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [H256]
      >;
      /**
       * Withdraw funds voter
       **/
      withdrawFundsVoter: AugmentedSubmittable<
        (pollId: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [H256]
      >;
    };
    identity: {
      /**
       * Add a registrar to the system.
       *
       * The dispatch origin for this call must be `T::RegistrarOrigin`.
       *
       * - `account`: the account of the registrar.
       *
       * Emits `RegistrarAdded` if successful.
       *
       * # <weight>
       * - `O(R)` where `R` registrar-count (governance-bounded and code-bounded).
       * - One storage mutation (codec `O(R)`).
       * - One event.
       * # </weight>
       **/
      addRegistrar: AugmentedSubmittable<
        (account: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Add the given account to the sender's subs.
       *
       * Payment: Balance reserved by a previous `set_subs` call for one sub will be repatriated
       * to the sender.
       *
       * The dispatch origin for this call must be _Signed_ and the sender must have a registered
       * sub identity of `sub`.
       **/
      addSub: AugmentedSubmittable<
        (
          sub: AccountId32 | string | Uint8Array,
          data:
            | Data
            | { None: any }
            | { Raw: any }
            | { BlakeTwo256: any }
            | { Sha256: any }
            | { Keccak256: any }
            | { ShaThree256: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, Data]
      >;
      /**
       * Cancel a previous request.
       *
       * Payment: A previously reserved deposit is returned on success.
       *
       * The dispatch origin for this call must be _Signed_ and the sender must have a
       * registered identity.
       *
       * - `reg_index`: The index of the registrar whose judgement is no longer requested.
       *
       * Emits `JudgementUnrequested` if successful.
       *
       * # <weight>
       * - `O(R + X)`.
       * - One balance-reserve operation.
       * - One storage mutation `O(R + X)`.
       * - One event
       * # </weight>
       **/
      cancelRequest: AugmentedSubmittable<
        (regIndex: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u32]
      >;
      /**
       * Clear an account's identity info and all sub-accounts and return all deposits.
       *
       * Payment: All reserved balances on the account are returned.
       *
       * The dispatch origin for this call must be _Signed_ and the sender must have a registered
       * identity.
       *
       * Emits `IdentityCleared` if successful.
       *
       * # <weight>
       * - `O(R + S + X)`
       * - where `R` registrar-count (governance-bounded).
       * - where `S` subs-count (hard- and deposit-bounded).
       * - where `X` additional-field-count (deposit-bounded and code-bounded).
       * - One balance-unreserve operation.
       * - `2` storage reads and `S + 2` storage deletions.
       * - One event.
       * # </weight>
       **/
      clearIdentity: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Remove an account's identity and sub-account information and slash the deposits.
       *
       * Payment: Reserved balances from `set_subs` and `set_identity` are slashed and handled by
       * `Slash`. Verification request deposits are not returned; they should be cancelled
       * manually using `cancel_request`.
       *
       * The dispatch origin for this call must match `T::ForceOrigin`.
       *
       * - `target`: the account whose identity the judgement is upon. This must be an account
       * with a registered identity.
       *
       * Emits `IdentityKilled` if successful.
       *
       * # <weight>
       * - `O(R + S + X)`.
       * - One balance-reserve operation.
       * - `S + 2` storage mutations.
       * - One event.
       * # </weight>
       **/
      killIdentity: AugmentedSubmittable<
        (target: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Provide a judgement for an account's identity.
       *
       * The dispatch origin for this call must be _Signed_ and the sender must be the account
       * of the registrar whose index is `reg_index`.
       *
       * - `reg_index`: the index of the registrar whose judgement is being made.
       * - `target`: the account whose identity the judgement is upon. This must be an account
       * with a registered identity.
       * - `judgement`: the judgement of the registrar of index `reg_index` about `target`.
       * - `identity`: The hash of the [`IdentityInfo`] for that the judgement is provided.
       *
       * Emits `JudgementGiven` if successful.
       *
       * # <weight>
       * - `O(R + X)`.
       * - One balance-transfer operation.
       * - Up to one account-lookup operation.
       * - Storage: 1 read `O(R)`, 1 mutate `O(R + X)`.
       * - One event.
       * # </weight>
       **/
      provideJudgement: AugmentedSubmittable<
        (
          regIndex: Compact<u32> | AnyNumber | Uint8Array,
          target: AccountId32 | string | Uint8Array,
          judgement:
            | PalletIdentityJudgement
            | { Unknown: any }
            | { FeePaid: any }
            | { Reasonable: any }
            | { KnownGood: any }
            | { OutOfDate: any }
            | { LowQuality: any }
            | { Erroneous: any }
            | string
            | Uint8Array,
          identity: H256 | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Compact<u32>, AccountId32, PalletIdentityJudgement, H256]
      >;
      /**
       * Remove the sender as a sub-account.
       *
       * Payment: Balance reserved by a previous `set_subs` call for one sub will be repatriated
       * to the sender (*not* the original depositor).
       *
       * The dispatch origin for this call must be _Signed_ and the sender must have a registered
       * super-identity.
       *
       * NOTE: This should not normally be used, but is provided in the case that the non-
       * controller of an account is maliciously registered as a sub-account.
       **/
      quitSub: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Remove the given account from the sender's subs.
       *
       * Payment: Balance reserved by a previous `set_subs` call for one sub will be repatriated
       * to the sender.
       *
       * The dispatch origin for this call must be _Signed_ and the sender must have a registered
       * sub identity of `sub`.
       **/
      removeSub: AugmentedSubmittable<
        (sub: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Alter the associated name of the given sub-account.
       *
       * The dispatch origin for this call must be _Signed_ and the sender must have a registered
       * sub identity of `sub`.
       **/
      renameSub: AugmentedSubmittable<
        (
          sub: AccountId32 | string | Uint8Array,
          data:
            | Data
            | { None: any }
            | { Raw: any }
            | { BlakeTwo256: any }
            | { Sha256: any }
            | { Keccak256: any }
            | { ShaThree256: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, Data]
      >;
      /**
       * Request a judgement from a registrar.
       *
       * Payment: At most `max_fee` will be reserved for payment to the registrar if judgement
       * given.
       *
       * The dispatch origin for this call must be _Signed_ and the sender must have a
       * registered identity.
       *
       * - `reg_index`: The index of the registrar whose judgement is requested.
       * - `max_fee`: The maximum fee that may be paid. This should just be auto-populated as:
       *
       * ```nocompile
       * Self::registrars().get(reg_index).unwrap().fee
       * ```
       *
       * Emits `JudgementRequested` if successful.
       *
       * # <weight>
       * - `O(R + X)`.
       * - One balance-reserve operation.
       * - Storage: 1 read `O(R)`, 1 mutate `O(X + R)`.
       * - One event.
       * # </weight>
       **/
      requestJudgement: AugmentedSubmittable<
        (
          regIndex: Compact<u32> | AnyNumber | Uint8Array,
          maxFee: Compact<u128> | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Compact<u32>, Compact<u128>]
      >;
      /**
       * Change the account associated with a registrar.
       *
       * The dispatch origin for this call must be _Signed_ and the sender must be the account
       * of the registrar whose index is `index`.
       *
       * - `index`: the index of the registrar whose fee is to be set.
       * - `new`: the new account ID.
       *
       * # <weight>
       * - `O(R)`.
       * - One storage mutation `O(R)`.
       * - Benchmark: 8.823 + R * 0.32 µs (min squares analysis)
       * # </weight>
       **/
      setAccountId: AugmentedSubmittable<
        (
          index: Compact<u32> | AnyNumber | Uint8Array,
          updated: AccountId32 | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Compact<u32>, AccountId32]
      >;
      /**
       * Set the fee required for a judgement to be requested from a registrar.
       *
       * The dispatch origin for this call must be _Signed_ and the sender must be the account
       * of the registrar whose index is `index`.
       *
       * - `index`: the index of the registrar whose fee is to be set.
       * - `fee`: the new fee.
       *
       * # <weight>
       * - `O(R)`.
       * - One storage mutation `O(R)`.
       * - Benchmark: 7.315 + R * 0.329 µs (min squares analysis)
       * # </weight>
       **/
      setFee: AugmentedSubmittable<
        (
          index: Compact<u32> | AnyNumber | Uint8Array,
          fee: Compact<u128> | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Compact<u32>, Compact<u128>]
      >;
      /**
       * Set the field information for a registrar.
       *
       * The dispatch origin for this call must be _Signed_ and the sender must be the account
       * of the registrar whose index is `index`.
       *
       * - `index`: the index of the registrar whose fee is to be set.
       * - `fields`: the fields that the registrar concerns themselves with.
       *
       * # <weight>
       * - `O(R)`.
       * - One storage mutation `O(R)`.
       * - Benchmark: 7.464 + R * 0.325 µs (min squares analysis)
       * # </weight>
       **/
      setFields: AugmentedSubmittable<
        (index: Compact<u32> | AnyNumber | Uint8Array, fields: PalletIdentityBitFlags) => SubmittableExtrinsic<ApiType>,
        [Compact<u32>, PalletIdentityBitFlags]
      >;
      /**
       * Set an account's identity information and reserve the appropriate deposit.
       *
       * If the account already has identity information, the deposit is taken as part payment
       * for the new deposit.
       *
       * The dispatch origin for this call must be _Signed_.
       *
       * - `info`: The identity information.
       *
       * Emits `IdentitySet` if successful.
       *
       * # <weight>
       * - `O(X + X' + R)`
       * - where `X` additional-field-count (deposit-bounded and code-bounded)
       * - where `R` judgements-count (registrar-count-bounded)
       * - One balance reserve operation.
       * - One storage mutation (codec-read `O(X' + R)`, codec-write `O(X + R)`).
       * - One event.
       * # </weight>
       **/
      setIdentity: AugmentedSubmittable<
        (
          info:
            | PalletIdentityIdentityInfo
            | {
                additional?: any;
                display?: any;
                legal?: any;
                web?: any;
                riot?: any;
                email?: any;
                pgpFingerprint?: any;
                image?: any;
                twitter?: any;
              }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [PalletIdentityIdentityInfo]
      >;
      /**
       * Set the sub-accounts of the sender.
       *
       * Payment: Any aggregate balance reserved by previous `set_subs` calls will be returned
       * and an amount `SubAccountDeposit` will be reserved for each item in `subs`.
       *
       * The dispatch origin for this call must be _Signed_ and the sender must have a registered
       * identity.
       *
       * - `subs`: The identity's (new) sub-accounts.
       *
       * # <weight>
       * - `O(P + S)`
       * - where `P` old-subs-count (hard- and deposit-bounded).
       * - where `S` subs-count (hard- and deposit-bounded).
       * - At most one balance operations.
       * - DB:
       * - `P + S` storage mutations (codec complexity `O(1)`)
       * - One storage read (codec complexity `O(P)`).
       * - One storage write (codec complexity `O(S)`).
       * - One storage-exists (`IdentityOf::contains_key`).
       * # </weight>
       **/
      setSubs: AugmentedSubmittable<
        (
          subs:
            | Vec<ITuple<[AccountId32, Data]>>
            | [
                AccountId32 | string | Uint8Array,
                (
                  | Data
                  | { None: any }
                  | { Raw: any }
                  | { BlakeTwo256: any }
                  | { Sha256: any }
                  | { Keccak256: any }
                  | { ShaThree256: any }
                  | string
                  | Uint8Array
                ),
              ][]
        ) => SubmittableExtrinsic<ApiType>,
        [Vec<ITuple<[AccountId32, Data]>>]
      >;
    };
    imOnline: {
      /**
       * # <weight>
       * - Complexity: `O(K + E)` where K is length of `Keys` (heartbeat.validators_len) and E is
       * length of `heartbeat.network_state.external_address`
       * - `O(K)`: decoding of length `K`
       * - `O(E)`: decoding/encoding of length `E`
       * - DbReads: pallet_session `Validators`, pallet_session `CurrentIndex`, `Keys`,
       * `ReceivedHeartbeats`
       * - DbWrites: `ReceivedHeartbeats`
       * # </weight>
       **/
      heartbeat: AugmentedSubmittable<
        (
          heartbeat:
            | PalletImOnlineHeartbeat
            | { blockNumber?: any; networkState?: any; sessionIndex?: any; authorityIndex?: any; validatorsLen?: any }
            | string
            | Uint8Array,
          signature: PalletImOnlineSr25519AppSr25519Signature | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [PalletImOnlineHeartbeat, PalletImOnlineSr25519AppSr25519Signature]
      >;
    };
    irohaMigration: {
      migrate: AugmentedSubmittable<
        (
          irohaAddress: Text | string,
          irohaPublicKey: Text | string,
          irohaSignature: Text | string
        ) => SubmittableExtrinsic<ApiType>,
        [Text, Text, Text]
      >;
    };
    jettonApp: {
      /**
       * Mint bridged tokens to user account
       *
       * Arguments:
       * - `origin`: Bridge origin with information about network, source contract and etc.
       * - `token`: Jetton master contract address, or 0:00..00 with prefix 0 for native TON asset
       * - `sender`: Sender address on TON side
       * - `recipient`: User account to mint tokens
       * - `amount`: Amount of tokens to mint with TON network encoding and precision, so real amount could be different
       *
       * Fails if:
       * - Origin network is not registered
       * - Source contract (Jetton app) is not registered
       * - Token is not registered
       * - Sender or token address is wrong (for now we support only standart internal TON addresses)
       * - Amount precision could not be adjusted to thischain
       * - Failed to mint tokens for some reason
       **/
      mint: AugmentedSubmittable<
        (
          token: BridgeTypesTonTonAddressWithPrefix | { prefix?: any; address?: any } | string | Uint8Array,
          sender: BridgeTypesTonTonAddressWithPrefix | { prefix?: any; address?: any } | string | Uint8Array,
          recipient: AccountId32 | string | Uint8Array,
          amount: H128 | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesTonTonAddressWithPrefix, BridgeTypesTonTonAddressWithPrefix, AccountId32, H128]
      >;
      /**
       * Register network with the new asset for native TON
       *
       * Arguments:
       * - `origin`: Only root can call this extrinsic
       * - `network_id`: TON network id
       * - `contract`: Jetton App contract address
       * - `symbol`: Asset symbol
       * - `name`: Asset name
       * - `decimals`: Sidechain precision of native TON
       *
       * Fails if:
       * - Origin is not root
       * - Network already registered
       * - Can't register asset
       **/
      registerNetwork: AugmentedSubmittable<
        (
          networkId: BridgeTypesTonTonNetworkId | 'Mainnet' | 'Testnet' | number | Uint8Array,
          contract: BridgeTypesTonTonAddress | { workchain?: any; address?: any } | string | Uint8Array,
          symbol: Bytes | string | Uint8Array,
          name: Bytes | string | Uint8Array,
          decimals: u8 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesTonTonNetworkId, BridgeTypesTonTonAddress, Bytes, Bytes, u8]
      >;
      /**
       * Register network with the new asset for native TON
       *
       * Arguments:
       * - `origin`: Only root can call this extrinsic
       * - `network_id`: TON network id
       * - `contract`: Jetton App contract address
       * - `asset_id`: Existing TON asset id
       * - `decimals`: Sidechain precision of native TON
       *
       * Fails if:
       * - Origin is not root
       * - Network already registered
       **/
      registerNetworkWithExistingAsset: AugmentedSubmittable<
        (
          networkId: BridgeTypesTonTonNetworkId | 'Mainnet' | 'Testnet' | number | Uint8Array,
          contract: BridgeTypesTonTonAddress | { workchain?: any; address?: any } | string | Uint8Array,
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          decimals: u8 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesTonTonNetworkId, BridgeTypesTonTonAddress, CommonPrimitivesAssetId32, u8]
      >;
    };
    kensetsu: {
      /**
       * Accrues interest on a Collateralized Debt Position (CDP).
       *
       * ## Parameters
       *
       * - `_origin`: The origin of the transaction (unused).
       * - `cdp_id`: The ID of the CDP to accrue interest on.
       **/
      accrue: AugmentedSubmittable<(cdpId: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u128]>;
      /**
       * Borrows funds against a Collateralized Debt Position (CDP).
       * Borrow amount will be as max as possible in the range
       * `[borrow_amount_min, borrow_amount_max]` in order to confrom the slippage tolerance.
       * ## Parameters
       *
       * - `origin`: The origin of the transaction.
       * - `cdp_id`: The ID of the CDP to borrow against.
       * - `borrow_amount_min`: The minimum amount the user wants to borrow.
       * - `borrow_amount_max`: The maximum amount the user wants to borrow.
       **/
      borrow: AugmentedSubmittable<
        (
          cdpId: u128 | AnyNumber | Uint8Array,
          borrowAmountMin: u128 | AnyNumber | Uint8Array,
          borrowAmountMax: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u128, u128, u128]
      >;
      /**
       * Closes a Collateralized Debt Position (CDP).
       *
       * If a CDP has outstanding debt, this amount is covered with owner balance. Collateral
       * then is returned to the owner and CDP is deleted.
       *
       * ## Parameters
       *
       * - `origin`: The origin of the transaction, only CDP owner is allowed.
       * - `cdp_id`: The ID of the CDP to be closed.
       * will be transferred.
       **/
      closeCdp: AugmentedSubmittable<(cdpId: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u128]>;
      /**
       * Creates a Collateralized Debt Position (CDP).
       * The extrinsic combines depositing collateral and borrowing.
       * Borrow amount will be as max as possible in the range
       * `[borrow_amount_min, borrow_amount_max]` in order to confrom the slippage tolerance.
       *
       * ## Parameters
       *
       * - `origin`: The origin of the transaction.
       * - `collateral_asset_id`: The identifier of the asset used as collateral.
       * - `collateral_amount`: The amount of collateral to be deposited.
       * - `borrow_amount_min`: The minimum amount the user wants to borrow.
       * - `borrow_amount_max`: The maximum amount the user wants to borrow.
       **/
      createCdp: AugmentedSubmittable<
        (
          collateralAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          collateralAmount: u128 | AnyNumber | Uint8Array,
          stablecoinAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          borrowAmountMin: u128 | AnyNumber | Uint8Array,
          borrowAmountMax: u128 | AnyNumber | Uint8Array,
          cdpType: KensetsuCdpType | 'Type1' | 'Type2' | number | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u128, CommonPrimitivesAssetId32, u128, u128, KensetsuCdpType]
      >;
      /**
       * Deposits collateral into a Collateralized Debt Position (CDP).
       *
       * ## Parameters
       *
       * - `origin`: The origin of the transaction.
       * - `cdp_id`: The ID of the CDP to deposit collateral into.
       * - `collateral_amount`: The amount of collateral to deposit.
       **/
      depositCollateral: AugmentedSubmittable<
        (
          cdpId: u128 | AnyNumber | Uint8Array,
          collateralAmount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u128, u128]
      >;
      /**
       * Donates stablecoin to cover protocol bad debt.
       *
       * ## Parameters
       *
       * - `origin`: The origin of the transaction.
       * - `stablecoin_asset_id` - The asset id of stablecoin.
       * - `amount`: The amount of stablecoin to donate to cover bad debt.
       **/
      donate: AugmentedSubmittable<
        (
          stablecoinAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u128]
      >;
      /**
       * Liquidates a Collateralized Debt Position (CDP) if it becomes unsafe.
       *
       * ## Parameters
       *
       * - `_origin`: The origin of the transaction (unused).
       * - `cdp_id`: The ID of the CDP to be liquidated.
       **/
      liquidate: AugmentedSubmittable<(cdpId: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u128]>;
      /**
       * Adds new stablecoin mutating StablecoinInfo.
       *
       * ##Parameters
       * - stablecoin_asset_id - asset id of new stablecoin, must be mintable and total supply
       * must be 0.
       * - new_stablecoin_parameters - parameters for peg.
       **/
      registerStablecoin: AugmentedSubmittable<
        (
          newStablecoinParameters:
            | KensetsuStablecoinParameters
            | { pegAsset?: any; minimalStabilityFeeAccrue?: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [KensetsuStablecoinParameters]
      >;
      /**
       * Repays debt against a Collateralized Debt Position (CDP).
       *
       * ## Parameters
       *
       * - `origin`: The origin of the transaction.
       * - `cdp_id`: The ID of the CDP to repay debt for.
       * - `amount`: The amount to repay against the CDP's debt.
       **/
      repayDebt: AugmentedSubmittable<
        (cdpId: u128 | AnyNumber | Uint8Array, amount: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128, u128]
      >;
      /**
       * Updates the borrow tax applied during borrow.
       *
       * ## Parameters
       *
       * - `origin`: The origin of the transaction.
       * - `new_borrow_tax`: The new borrow tax percentage to be set.
       **/
      updateBorrowTax: AugmentedSubmittable<
        (
          newBorrowTaxes:
            | KensetsuBorrowTaxes
            | { kenBorrowTax?: any; karmaBorrowTax?: any; tbcdBorrowTax?: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [KensetsuBorrowTaxes]
      >;
      /**
       * Updates the risk parameters for a specific collateral asset.
       *
       * ## Parameters
       *
       * - `origin`: The origin of the transaction.
       * - `collateral_asset_id`: The identifier of the collateral asset. If collateral asset id
       * is not tracked by PriceTools, registers the asset id in PriceTools.
       * - `new_risk_parameters`: The new risk parameters to be set for the collateral asset.
       **/
      updateCollateralRiskParameters: AugmentedSubmittable<
        (
          collateralAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          stablecoinAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          newRiskParameters:
            | KensetsuCollateralRiskParameters
            | {
                hardCap?: any;
                liquidationRatio?: any;
                maxLiquidationLot?: any;
                stabilityFeeRate?: any;
                minimalCollateralDeposit?: any;
              }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, KensetsuCollateralRiskParameters]
      >;
      /**
       * Updates risk parameter `hard_cap`.
       *
       * ##Parameters
       * - `collateral_asset_id` and `stablecoin_asset_id` - composite key for collateral_info;
       * - `hard_cap` - new value.
       **/
      updateHardCap: AugmentedSubmittable<
        (
          collateralAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          stablecoinAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          hardCap: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, u128]
      >;
      /**
       * Updates the liquidation penalty applied during CDP liquidation.
       *
       * ## Parameters
       *
       * - `origin`: The origin of the transaction.
       * - `new_liquidation_penalty`: The new liquidation penalty percentage to be set.
       **/
      updateLiquidationPenalty: AugmentedSubmittable<
        (newLiquidationPenalty: Percent | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Percent]
      >;
      /**
       * Updates risk parameter `liquidation_ratio`.
       *
       * ##Parameters
       * - `collateral_asset_id` and `stablecoin_asset_id` - composite key for collateral_info;
       * - `liquidation_ratio` - new value.
       **/
      updateLiquidationRatio: AugmentedSubmittable<
        (
          collateralAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          stablecoinAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          liquidationRatio: Perbill | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, Perbill]
      >;
      /**
       * Updates risk parameter `max_liquidation_lot`.
       *
       * ##Parameters
       * - `collateral_asset_id` and `stablecoin_asset_id` - composite key for collateral_info;
       * - `max_liquidation_lot` - new value.
       **/
      updateMaxLiquidationLot: AugmentedSubmittable<
        (
          collateralAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          stablecoinAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          maxLiquidationLot: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, u128]
      >;
      /**
       * Updates risk parameter `minimal_collateral_deposit`.
       *
       * ##Parameters
       * - `collateral_asset_id` and `stablecoin_asset_id` - composite key for collateral_info;
       * - `minimal_collateral_deposit` - new value.
       **/
      updateMinimalCollateralDeposit: AugmentedSubmittable<
        (
          collateralAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          stablecoinAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          minimalCollateralDeposit: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, u128]
      >;
      updateMinimalStabilityFeeAccrue: AugmentedSubmittable<
        (
          stablecoinAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          newMinimalStabilityFeeAccrue: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u128]
      >;
      /**
       * Updates risk parameter `stability_fee_rate`.
       *
       * ##Parameters
       * - `collateral_asset_id` and `stablecoin_asset_id` - composite key for collateral_info;
       * - `stability_fee_rate` - new value.
       **/
      updateStabilityFeeRate: AugmentedSubmittable<
        (
          collateralAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          stablecoinAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          stabilityFeeRate: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, u128]
      >;
      /**
       * Withdraws protocol profit in the form of stablecoin.
       *
       * ## Parameters
       *
       * - `origin`: The origin of the transaction.
       * - `beneficiary` : The destination account where assets will be withdrawn.
       * - `stablecoin_asset_id` - The asset id of stablecoin.
       * - `amount`: The amount of stablecoin to withdraw as protocol profit.
       **/
      withdrawProfit: AugmentedSubmittable<
        (
          beneficiary: AccountId32 | string | Uint8Array,
          stablecoinAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, CommonPrimitivesAssetId32, u128]
      >;
    };
    liquidityProxy: {
      /**
       * Disables XST or TBC liquidity source. The liquidity source becomes unavailable for swap.
       *
       * - `liquidity_source`: the liquidity source to be disabled.
       **/
      disableLiquiditySource: AugmentedSubmittable<
        (
          liquiditySource:
            | CommonPrimitivesLiquiditySourceType
            | 'XYKPool'
            | 'BondingCurvePool'
            | 'MulticollateralBondingCurvePool'
            | 'MockPool'
            | 'MockPool2'
            | 'MockPool3'
            | 'MockPool4'
            | 'XSTPool'
            | 'OrderBook'
            | number
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesLiquiditySourceType]
      >;
      /**
       * Enables XST or TBC liquidity source.
       *
       * - `liquidity_source`: the liquidity source to be enabled.
       **/
      enableLiquiditySource: AugmentedSubmittable<
        (
          liquiditySource:
            | CommonPrimitivesLiquiditySourceType
            | 'XYKPool'
            | 'BondingCurvePool'
            | 'MulticollateralBondingCurvePool'
            | 'MockPool'
            | 'MockPool2'
            | 'MockPool3'
            | 'MockPool4'
            | 'XSTPool'
            | 'OrderBook'
            | number
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesLiquiditySourceType]
      >;
      setAdarCommissionRatio: AugmentedSubmittable<
        (commissionRatio: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
      /**
       * Perform swap of tokens (input/output defined via SwapAmount direction).
       *
       * - `origin`: the account on whose behalf the transaction is being executed,
       * - `dex_id`: DEX ID for which liquidity sources aggregation is being done,
       * - `input_asset_id`: ID of the asset being sold,
       * - `output_asset_id`: ID of the asset being bought,
       * - `swap_amount`: the exact amount to be sold (either in input_asset_id or output_asset_id units with corresponding slippage tolerance absolute bound),
       * - `selected_source_types`: list of selected LiquiditySource types, selection effect is determined by filter_mode,
       * - `filter_mode`: indicate either to allow or forbid selected types only, or disable filtering.
       **/
      swap: AugmentedSubmittable<
        (
          dexId: u32 | AnyNumber | Uint8Array,
          inputAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          outputAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          swapAmount: CommonSwapAmount | { WithDesiredInput: any } | { WithDesiredOutput: any } | string | Uint8Array,
          selectedSourceTypes:
            | Vec<CommonPrimitivesLiquiditySourceType>
            | (
                | CommonPrimitivesLiquiditySourceType
                | 'XYKPool'
                | 'BondingCurvePool'
                | 'MulticollateralBondingCurvePool'
                | 'MockPool'
                | 'MockPool2'
                | 'MockPool3'
                | 'MockPool4'
                | 'XSTPool'
                | 'OrderBook'
                | number
                | Uint8Array
              )[],
          filterMode: CommonPrimitivesFilterMode | 'Disabled' | 'ForbidSelected' | 'AllowSelected' | number | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [
          u32,
          CommonPrimitivesAssetId32,
          CommonPrimitivesAssetId32,
          CommonSwapAmount,
          Vec<CommonPrimitivesLiquiditySourceType>,
          CommonPrimitivesFilterMode,
        ]
      >;
      /**
       * Perform swap of tokens (input/output defined via SwapAmount direction).
       *
       * - `origin`: the account on whose behalf the transaction is being executed,
       * - `receiver`: the account that receives the output,
       * - `dex_id`: DEX ID for which liquidity sources aggregation is being done,
       * - `input_asset_id`: ID of the asset being sold,
       * - `output_asset_id`: ID of the asset being bought,
       * - `swap_amount`: the exact amount to be sold (either in input_asset_id or output_asset_id units with corresponding slippage tolerance absolute bound),
       * - `selected_source_types`: list of selected LiquiditySource types, selection effect is determined by filter_mode,
       * - `filter_mode`: indicate either to allow or forbid selected types only, or disable filtering.
       **/
      swapTransfer: AugmentedSubmittable<
        (
          receiver: AccountId32 | string | Uint8Array,
          dexId: u32 | AnyNumber | Uint8Array,
          inputAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          outputAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          swapAmount: CommonSwapAmount | { WithDesiredInput: any } | { WithDesiredOutput: any } | string | Uint8Array,
          selectedSourceTypes:
            | Vec<CommonPrimitivesLiquiditySourceType>
            | (
                | CommonPrimitivesLiquiditySourceType
                | 'XYKPool'
                | 'BondingCurvePool'
                | 'MulticollateralBondingCurvePool'
                | 'MockPool'
                | 'MockPool2'
                | 'MockPool3'
                | 'MockPool4'
                | 'XSTPool'
                | 'OrderBook'
                | number
                | Uint8Array
              )[],
          filterMode: CommonPrimitivesFilterMode | 'Disabled' | 'ForbidSelected' | 'AllowSelected' | number | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [
          AccountId32,
          u32,
          CommonPrimitivesAssetId32,
          CommonPrimitivesAssetId32,
          CommonSwapAmount,
          Vec<CommonPrimitivesLiquiditySourceType>,
          CommonPrimitivesFilterMode,
        ]
      >;
      /**
       * Dispatches multiple swap & transfer operations. `swap_batches` contains vector of
       * SwapBatchInfo structs, where each batch specifies which asset ID and DEX ID should
       * be used for swapping, receiver accounts and their desired outcome amount in asset,
       * specified for the current batch.
       *
       * - `origin`: the account on whose behalf the transaction is being executed,
       * - `swap_batches`: the vector containing the SwapBatchInfo structs,
       * - `input_asset_id`: ID of the asset being sold,
       * - `max_input_amount`: the maximum amount to be sold in input_asset_id,
       * - `selected_source_types`: list of selected LiquiditySource types, selection effect is
       * determined by filter_mode,
       * - `filter_mode`: indicate either to allow or forbid selected types only, or disable filtering.
       * - `additional_data`: data to include in swap success event.
       **/
      swapTransferBatch: AugmentedSubmittable<
        (
          swapBatches:
            | Vec<LiquidityProxySwapBatchInfo>
            | (
                | LiquidityProxySwapBatchInfo
                | { outcomeAssetId?: any; outcomeAssetReuse?: any; dexId?: any; receivers?: any }
                | string
                | Uint8Array
              )[],
          inputAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          maxInputAmount: u128 | AnyNumber | Uint8Array,
          selectedSourceTypes:
            | Vec<CommonPrimitivesLiquiditySourceType>
            | (
                | CommonPrimitivesLiquiditySourceType
                | 'XYKPool'
                | 'BondingCurvePool'
                | 'MulticollateralBondingCurvePool'
                | 'MockPool'
                | 'MockPool2'
                | 'MockPool3'
                | 'MockPool4'
                | 'XSTPool'
                | 'OrderBook'
                | number
                | Uint8Array
              )[],
          filterMode:
            | CommonPrimitivesFilterMode
            | 'Disabled'
            | 'ForbidSelected'
            | 'AllowSelected'
            | number
            | Uint8Array,
          additionalData: Option<Bytes> | null | Uint8Array | Bytes | string
        ) => SubmittableExtrinsic<ApiType>,
        [
          Vec<LiquidityProxySwapBatchInfo>,
          CommonPrimitivesAssetId32,
          u128,
          Vec<CommonPrimitivesLiquiditySourceType>,
          CommonPrimitivesFilterMode,
          Option<Bytes>,
        ]
      >;
      /**
       * Extrinsic which is enable XORless transfers.
       * Internally it's swaps `asset_id` to `desired_xor_amount` of `XOR` and transfers remaining amount of `asset_id` to `receiver`.
       * Client apps should specify the XOR amount which should be paid as a fee in `desired_xor_amount` parameter.
       * If sender will not have enough XOR to pay fees after execution, transaction will be rejected.
       * This extrinsic is done as temporary solution for XORless transfers, in future it would be removed
       * and logic for XORless extrinsics should be moved to xor-fee pallet.
       **/
      xorlessTransfer: AugmentedSubmittable<
        (
          dexId: u32 | AnyNumber | Uint8Array,
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          receiver: AccountId32 | string | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array,
          desiredXorAmount: u128 | AnyNumber | Uint8Array,
          maxAmountIn: u128 | AnyNumber | Uint8Array,
          selectedSourceTypes:
            | Vec<CommonPrimitivesLiquiditySourceType>
            | (
                | CommonPrimitivesLiquiditySourceType
                | 'XYKPool'
                | 'BondingCurvePool'
                | 'MulticollateralBondingCurvePool'
                | 'MockPool'
                | 'MockPool2'
                | 'MockPool3'
                | 'MockPool4'
                | 'XSTPool'
                | 'OrderBook'
                | number
                | Uint8Array
              )[],
          filterMode:
            | CommonPrimitivesFilterMode
            | 'Disabled'
            | 'ForbidSelected'
            | 'AllowSelected'
            | number
            | Uint8Array,
          additionalData: Option<Bytes> | null | Uint8Array | Bytes | string
        ) => SubmittableExtrinsic<ApiType>,
        [
          u32,
          CommonPrimitivesAssetId32,
          AccountId32,
          u128,
          u128,
          u128,
          Vec<CommonPrimitivesLiquiditySourceType>,
          CommonPrimitivesFilterMode,
          Option<Bytes>,
        ]
      >;
    };
    multicollateralBondingCurvePool: {
      /**
       * Enable exchange path on the pool for pair BaseAsset-CollateralAsset.
       **/
      initializePool: AugmentedSubmittable<
        (
          collateralAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Set multiplier which is applied to rewarded amount when depositing particular collateral assets.
       * `None` value indicates reward without change, same as Some(1.0).
       **/
      setOptionalRewardMultiplier: AugmentedSubmittable<
        (
          collateralAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          multiplier: Option<FixnumFixedPoint> | null | Uint8Array | FixnumFixedPoint | { inner?: any } | string
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, Option<FixnumFixedPoint>]
      >;
      /**
       * Changes `initial_price` used as bias in XOR-DAI(reference asset) price calculation
       **/
      setPriceBias: AugmentedSubmittable<
        (priceBias: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
      /**
       * Changes price change rate and step
       **/
      setPriceChangeConfig: AugmentedSubmittable<
        (
          priceChangeRate: u128 | AnyNumber | Uint8Array,
          priceChangeStep: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u128, u128]
      >;
      /**
       * Change reference asset which is used to determine collateral assets value. Inteded to be e.g. stablecoin DAI.
       **/
      setReferenceAsset: AugmentedSubmittable<
        (
          referenceAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32]
      >;
    };
    multisig: {
      /**
       * Register approval for a dispatch to be made from a deterministic composite account if
       * approved by a total of `threshold - 1` of `other_signatories`.
       *
       * Payment: `DepositBase` will be reserved if this is the first approval, plus
       * `threshold` times `DepositFactor`. It is returned once this dispatch happens or
       * is cancelled.
       *
       * The dispatch origin for this call must be _Signed_.
       *
       * - `threshold`: The total number of approvals for this dispatch before it is executed.
       * - `other_signatories`: The accounts (other than the sender) who can approve this
       * dispatch. May not be empty.
       * - `maybe_timepoint`: If this is the first approval, then this must be `None`. If it is
       * not the first approval, then it must be `Some`, with the timepoint (block number and
       * transaction index) of the first approval transaction.
       * - `call_hash`: The hash of the call to be executed.
       *
       * NOTE: If this is the final approval, you will want to use `as_multi` instead.
       *
       * # <weight>
       * - `O(S)`.
       * - Up to one balance-reserve or unreserve operation.
       * - One passthrough operation, one insert, both `O(S)` where `S` is the number of
       * signatories. `S` is capped by `MaxSignatories`, with weight being proportional.
       * - One encode & hash, both of complexity `O(S)`.
       * - Up to one binary search and insert (`O(logS + S)`).
       * - I/O: 1 read `O(S)`, up to 1 mutate `O(S)`. Up to one remove.
       * - One event.
       * - Storage: inserts one item, value size bounded by `MaxSignatories`, with a deposit
       * taken for its lifetime of `DepositBase + threshold * DepositFactor`.
       * ----------------------------------
       * - DB Weight:
       * - Read: Multisig Storage, [Caller Account]
       * - Write: Multisig Storage, [Caller Account]
       * # </weight>
       **/
      approveAsMulti: AugmentedSubmittable<
        (
          threshold: u16 | AnyNumber | Uint8Array,
          otherSignatories: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[],
          maybeTimepoint:
            | Option<PalletMultisigTimepoint>
            | null
            | Uint8Array
            | PalletMultisigTimepoint
            | { height?: any; index?: any }
            | string,
          callHash: U8aFixed | string | Uint8Array,
          maxWeight: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u16, Vec<AccountId32>, Option<PalletMultisigTimepoint>, U8aFixed, SpWeightsWeightV2Weight]
      >;
      /**
       * Register approval for a dispatch to be made from a deterministic composite account if
       * approved by a total of `threshold - 1` of `other_signatories`.
       *
       * If there are enough, then dispatch the call.
       *
       * Payment: `DepositBase` will be reserved if this is the first approval, plus
       * `threshold` times `DepositFactor`. It is returned once this dispatch happens or
       * is cancelled.
       *
       * The dispatch origin for this call must be _Signed_.
       *
       * - `threshold`: The total number of approvals for this dispatch before it is executed.
       * - `other_signatories`: The accounts (other than the sender) who can approve this
       * dispatch. May not be empty.
       * - `maybe_timepoint`: If this is the first approval, then this must be `None`. If it is
       * not the first approval, then it must be `Some`, with the timepoint (block number and
       * transaction index) of the first approval transaction.
       * - `call`: The call to be executed.
       *
       * NOTE: Unless this is the final approval, you will generally want to use
       * `approve_as_multi` instead, since it only requires a hash of the call.
       *
       * Result is equivalent to the dispatched result if `threshold` is exactly `1`. Otherwise
       * on success, result is `Ok` and the result from the interior call, if it was executed,
       * may be found in the deposited `MultisigExecuted` event.
       *
       * # <weight>
       * - `O(S + Z + Call)`.
       * - Up to one balance-reserve or unreserve operation.
       * - One passthrough operation, one insert, both `O(S)` where `S` is the number of
       * signatories. `S` is capped by `MaxSignatories`, with weight being proportional.
       * - One call encode & hash, both of complexity `O(Z)` where `Z` is tx-len.
       * - One encode & hash, both of complexity `O(S)`.
       * - Up to one binary search and insert (`O(logS + S)`).
       * - I/O: 1 read `O(S)`, up to 1 mutate `O(S)`. Up to one remove.
       * - One event.
       * - The weight of the `call`.
       * - Storage: inserts one item, value size bounded by `MaxSignatories`, with a deposit
       * taken for its lifetime of `DepositBase + threshold * DepositFactor`.
       * -------------------------------
       * - DB Weight:
       * - Reads: Multisig Storage, [Caller Account]
       * - Writes: Multisig Storage, [Caller Account]
       * - Plus Call Weight
       * # </weight>
       **/
      asMulti: AugmentedSubmittable<
        (
          threshold: u16 | AnyNumber | Uint8Array,
          otherSignatories: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[],
          maybeTimepoint:
            | Option<PalletMultisigTimepoint>
            | null
            | Uint8Array
            | PalletMultisigTimepoint
            | { height?: any; index?: any }
            | string,
          call: Call | IMethod | string | Uint8Array,
          maxWeight: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u16, Vec<AccountId32>, Option<PalletMultisigTimepoint>, Call, SpWeightsWeightV2Weight]
      >;
      /**
       * Immediately dispatch a multi-signature call using a single approval from the caller.
       *
       * The dispatch origin for this call must be _Signed_.
       *
       * - `other_signatories`: The accounts (other than the sender) who are part of the
       * multi-signature, but do not participate in the approval process.
       * - `call`: The call to be executed.
       *
       * Result is equivalent to the dispatched result.
       *
       * # <weight>
       * O(Z + C) where Z is the length of the call and C its execution weight.
       * -------------------------------
       * - DB Weight: None
       * - Plus Call Weight
       * # </weight>
       **/
      asMultiThreshold1: AugmentedSubmittable<
        (
          otherSignatories: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[],
          call: Call | IMethod | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Vec<AccountId32>, Call]
      >;
      /**
       * Cancel a pre-existing, on-going multisig transaction. Any deposit reserved previously
       * for this operation will be unreserved on success.
       *
       * The dispatch origin for this call must be _Signed_.
       *
       * - `threshold`: The total number of approvals for this dispatch before it is executed.
       * - `other_signatories`: The accounts (other than the sender) who can approve this
       * dispatch. May not be empty.
       * - `timepoint`: The timepoint (block number and transaction index) of the first approval
       * transaction for this dispatch.
       * - `call_hash`: The hash of the call to be executed.
       *
       * # <weight>
       * - `O(S)`.
       * - Up to one balance-reserve or unreserve operation.
       * - One passthrough operation, one insert, both `O(S)` where `S` is the number of
       * signatories. `S` is capped by `MaxSignatories`, with weight being proportional.
       * - One encode & hash, both of complexity `O(S)`.
       * - One event.
       * - I/O: 1 read `O(S)`, one remove.
       * - Storage: removes one item.
       * ----------------------------------
       * - DB Weight:
       * - Read: Multisig Storage, [Caller Account], Refund Account
       * - Write: Multisig Storage, [Caller Account], Refund Account
       * # </weight>
       **/
      cancelAsMulti: AugmentedSubmittable<
        (
          threshold: u16 | AnyNumber | Uint8Array,
          otherSignatories: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[],
          timepoint: PalletMultisigTimepoint | { height?: any; index?: any } | string | Uint8Array,
          callHash: U8aFixed | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u16, Vec<AccountId32>, PalletMultisigTimepoint, U8aFixed]
      >;
    };
    multisigVerifier: {
      addPeer: AugmentedSubmittable<
        (peer: SpCoreEcdsaPublic | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [SpCoreEcdsaPublic]
      >;
      initialize: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesGenericNetworkId
            | { EVM: any }
            | { Sub: any }
            | { EVMLegacy: any }
            | { TON: any }
            | string
            | Uint8Array,
          peers: Vec<SpCoreEcdsaPublic> | (SpCoreEcdsaPublic | string | Uint8Array)[]
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesGenericNetworkId, Vec<SpCoreEcdsaPublic>]
      >;
      removePeer: AugmentedSubmittable<
        (peer: SpCoreEcdsaPublic | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [SpCoreEcdsaPublic]
      >;
    };
    oracleProxy: {
      /**
       * Disables a specified oracle
       *
       * Checks if the caller is root
       *
       * - `origin`: the sudo account
       * - `oracle`: oracle variant which should be disabled
       **/
      disableOracle: AugmentedSubmittable<
        (oracle: CommonPrimitivesOracle | 'BandChainFeed' | number | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesOracle]
      >;
      /**
       * Enables a specified oracle
       *
       * Checks if the caller is root
       *
       * - `origin`: the sudo account
       * - `oracle`: oracle variant which should be enabled
       **/
      enableOracle: AugmentedSubmittable<
        (oracle: CommonPrimitivesOracle | 'BandChainFeed' | number | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesOracle]
      >;
    };
    orderBook: {
      /**
       * Cancels the limit order
       *
       * # Parameters:
       * - `origin`: caller account who owns the limit order
       * - `order_book_id`: [order book identifier](OrderBookId) that contains: `DexId`, `base asset` & `quote asset`
       * - `order_id`: `id` of the limit order
       *
       * # Rules:
       * - only the order owner can cancel the limit order
       *
       * # Note:
       * Network fee isn't charged if the order is successfully cancelled by the owner
       **/
      cancelLimitOrder: AugmentedSubmittable<
        (
          orderBookId: CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array,
          orderId: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesOrderBookId, u128]
      >;
      /**
       * Cancels the list of limit orders
       *
       * # Parameters:
       * - `origin`: caller account who owns the limit orders
       * - `limit_orders_to_cancel`: the list with [`order_book_id`](OrderBookId) & `order_id` pairs to cancel
       *
       * # Rules:
       * - only the owner of **all** orders can cancel all limit orders from the list
       *
       * # Note:
       * Network fee isn't charged if orders are successfully cancelled by the owner
       **/
      cancelLimitOrdersBatch: AugmentedSubmittable<
        (
          limitOrdersToCancel:
            | Vec<ITuple<[CommonPrimitivesOrderBookId, Vec<u128>]>>
            | [
                CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array,
                Vec<u128> | (u128 | AnyNumber | Uint8Array)[],
              ][]
        ) => SubmittableExtrinsic<ApiType>,
        [Vec<ITuple<[CommonPrimitivesOrderBookId, Vec<u128>]>>]
      >;
      /**
       * Sets the order book status
       *
       * # Parameters:
       * - `origin`: caller account who must have permissions to change the order book status
       * - `order_book_id`: [order book identifier](OrderBookId) that contains: `DexId`, `base asset` & `quote asset`
       * - `status`: one of the statuses from [OrderBookStatus]
       *
       * # Rules:
       * - only root & tech committee can set the order book status
       * - if the order book is locked by updating (tech status is [`Updating`](OrderBookTechStatus::Updating)), the allowed statues to set:
       * - [`OnlyCancel`](OrderBookStatus::OnlyCancel)
       * - [`Stop`](OrderBookStatus::Stop)
       **/
      changeOrderbookStatus: AugmentedSubmittable<
        (
          orderBookId: CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array,
          status: OrderBookOrderBookStatus | 'Trade' | 'PlaceAndCancel' | 'OnlyCancel' | 'Stop' | number | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesOrderBookId, OrderBookOrderBookStatus]
      >;
      /**
       * Creates a new order book for the pair of assets.
       *
       * # Parameters:
       * - `origin`: caller account who must have permissions to create the order book
       * - `order_book_id`: [order book identifier](OrderBookId) that contains: `DexId`, `base asset` & `quote asset`
       * - `tick_size`: price step
       * - `step_lot_size`: amount step
       * - `min_lot_size`: minimal order amount
       * - `max_lot_size`: maximal order amount
       *
       * # Rules:
       * - root & tech committee can create any order book
       * - a regular user can create an order book only for indivisible base assets (most likely NFT) and only if they have this asset on their balance
       * - trading pair for the assets must be registered before the creating an order book
       *
       * # Attribute rules (for `tick_size`, `step_lot_size`, `min_lot_size` & `max_lot_size`):
       * - all attributes must be non-zero
       * - `min_lot_size` <= `max_lot_size`
       * - `step_lot_size` <= `min_lot_size`
       * - `min_lot_size` & `max_lot_size` must be a multiple of `step_lot_size`
       * - `max_lot_size` <= `min_lot_size` * `SOFT_MIN_MAX_RATIO`, now `SOFT_MIN_MAX_RATIO` = 1 000
       * - `max_lot_size` <= total supply of `base` asset
       * - precision of `tick_size` * `step_lot_size` must not overflow **18 digits**
       **/
      createOrderbook: AugmentedSubmittable<
        (
          orderBookId: CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array,
          tickSize: u128 | AnyNumber | Uint8Array,
          stepLotSize: u128 | AnyNumber | Uint8Array,
          minLotSize: u128 | AnyNumber | Uint8Array,
          maxLotSize: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesOrderBookId, u128, u128, u128, u128]
      >;
      /**
       * Deletes the order book
       *
       * # Parameters:
       * - `origin`: caller account who must have permissions to delete the order book
       * - `order_book_id`: [order book identifier](OrderBookId) that contains: `DexId`, `base asset` & `quote asset`
       *
       * # Rules:
       * - only root & tech committee can delete the order book
       * - status of the order book must be [`OnlyCancel`](OrderBookStatus::OnlyCancel) or [`Stop`](OrderBookStatus::Stop)
       * - the order book must be empty - doesn't contain any orders
       *
       * # Real life delete process:
       * 1. Announce that the order book will be deleted.
       * 2. Stop the order book by changing the status to [`OnlyCancel`](OrderBookStatus::OnlyCancel) or [`Stop`](OrderBookStatus::Stop)
       * 3. Wait until users cancel their orders or their lifetime just expires (maximum 1 month).
       * 4. Delete the empty order book.
       **/
      deleteOrderbook: AugmentedSubmittable<
        (
          orderBookId: CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesOrderBookId]
      >;
      /**
       * Executes the market order
       *
       * # Parameters:
       * - `origin`: caller account
       * - `order_book_id`: [order book identifier](OrderBookId) that contains: `DexId`, `base asset` & `quote asset`
       * - `direction`: [direction](PriceVariant) of the market order
       * - `amount`: volume of the `base asset` to trade
       *
       * # Rules:
       * - works only for order books with indivisible `base asset`, because there is no other ability to trade such assets. All other divisible assets must be traded by `liquidity_proxy::swap`
       * - `amount` >= [`OrderBook::min_lot_size`]
       * - `amount` <= [`OrderBook::max_lot_size`]
       * - `amount` must be a multiple of [`OrderBook::step_lot_size`]
       **/
      executeMarketOrder: AugmentedSubmittable<
        (
          orderBookId: CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array,
          direction: CommonPrimitivesPriceVariant | 'Buy' | 'Sell' | number | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesOrderBookId, CommonPrimitivesPriceVariant, u128]
      >;
      /**
       * Places the limit order into the order book
       *
       * # Parameters:
       * - `origin`: caller account, the limit order owner
       * - `order_book_id`: [order book identifier](OrderBookId) that contains: `DexId`, `base asset` & `quote asset`
       * - `price`: price in the `quote asset`
       * - `amount`: volume of the limit order in the `base asset`
       * - `side`: [side](PriceVariant) where to place the limit order
       * - `lifespan`: life duration of the limit order in millisecs, if not defined the default value 30 days is set
       *
       * # Rules:
       * - `price` must be a multiple of [`OrderBook::tick_size`]
       * - `amount` >= [`OrderBook::min_lot_size`]
       * - `amount` <= [`OrderBook::max_lot_size`]
       * - `amount` must be a multiple of [`OrderBook::step_lot_size`]
       * - if the `price` crosses the spread (the opposite `side`):
       * - if [`OrderBook::status`] allows to trade - the limit order is converted into market order and the exchange occurs
       * - if [`OrderBook::status`] doesn't allow to trade - transaction fails
       **/
      placeLimitOrder: AugmentedSubmittable<
        (
          orderBookId: CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array,
          price: u128 | AnyNumber | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array,
          side: CommonPrimitivesPriceVariant | 'Buy' | 'Sell' | number | Uint8Array,
          lifespan: Option<u64> | null | Uint8Array | u64 | AnyNumber
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesOrderBookId, u128, u128, CommonPrimitivesPriceVariant, Option<u64>]
      >;
      /**
       * Updates the attributes of the order book
       *
       * # Parameters:
       * - `origin`: caller account who must have permissions to update the order book
       * - `order_book_id`: [order book identifier](OrderBookId) that contains: `DexId`, `base asset` & `quote asset`
       * - `tick_size`: price step
       * - `step_lot_size`: amount step
       * - `min_lot_size`: minimal order amount
       * - `max_lot_size`: maximal order amount
       *
       * # Rules:
       * - only root & tech committee can update the order book
       * - status of the order book must be [`OnlyCancel`](OrderBookStatus::OnlyCancel) or [`Stop`](OrderBookStatus::Stop)
       * - inernal tech status of the order book must be [`Ready`](OrderBookTechStatus::Ready), that means the previos update is completed
       *
       * # Attribute rules (for `tick_size`, `step_lot_size`, `min_lot_size` & `max_lot_size`):
       * - all attributes must be non-zero
       * - `min_lot_size` <= `max_lot_size`
       * - `step_lot_size` <= `min_lot_size`
       * - `min_lot_size` & `max_lot_size` must be a multiple of `step_lot_size`
       * - `max_lot_size` <= total supply of `base` asset
       * - precision of `tick_size` * `step_lot_size` must not overflow 18 digits
       * - `max_lot_size` <= `min_lot_size` * `SOFT_MIN_MAX_RATIO`, now `SOFT_MIN_MAX_RATIO` = 1 000
       * - `max_lot_size` <= **old** `min_lot_size` * `HARD_MIN_MAX_RATIO`, now `HARD_MIN_MAX_RATIO` = 4 000
       *
       * # Real life update process:
       * 1. Announce that the order book will be updated.
       * 2. Stop the order book by changing the status to [`OnlyCancel`](OrderBookStatus::OnlyCancel) or [`Stop`](OrderBookStatus::Stop)
       * 3. Update the order book attributes according to the rules[^note].
       * 4. Wait the orders alignment if it is necessary - the order book tech status must become [`Ready`](OrderBookTechStatus::Ready).
       * 5. Change the order book status back to [`Trade`](OrderBookStatus::Trade) or other necessary status.
       * 6. Announce that the order book update is completed.
       *
       * [^note]: according to tech reasons it is forbidden to update `max_lot_size` with too large a value (see last 2 rules).
       * For example, if the current values `min_lot_size` = 1 & `max_lot_size` = 1 000,
       * we cannot change it to `min_lot_size` = 1 000 & `max_lot_size` = 1 000 000.
       * In this case it is necessary to do several update rounds:
       * 1. `min_lot_size`: 1 --> 1 000, `max_lot_size`: 1 000 --> 4 000
       * 2. `max_lot_size`: 4 000 --> 1 000 000
       *
       * It is also not recommended to batch these updates, because the tech status of the order book can be changed after the 1st update and the 2nd update will be declined in this case.
       **/
      updateOrderbook: AugmentedSubmittable<
        (
          orderBookId: CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array,
          tickSize: u128 | AnyNumber | Uint8Array,
          stepLotSize: u128 | AnyNumber | Uint8Array,
          minLotSize: u128 | AnyNumber | Uint8Array,
          maxLotSize: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesOrderBookId, u128, u128, u128, u128]
      >;
    };
    parachainBridgeApp: {
      addAssetidParaid: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          paraId: u32 | AnyNumber | Uint8Array,
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesSubNetworkId, u32, CommonPrimitivesAssetId32]
      >;
      bindSidechainAsset: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          sidechainAsset: XcmV3MultiassetAssetId | { Concrete: any } | { Abstract: any } | string | Uint8Array,
          sidechainPrecision: u8 | AnyNumber | Uint8Array,
          allowedParachains: Vec<u32> | (u32 | AnyNumber | Uint8Array)[],
          minimalXcmAmount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesSubNetworkId, CommonPrimitivesAssetId32, XcmV3MultiassetAssetId, u8, Vec<u32>, u128]
      >;
      burn: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          recipient: XcmVersionedMultiLocation | { V2: any } | { V3: any } | string | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesSubNetworkId, CommonPrimitivesAssetId32, XcmVersionedMultiLocation, u128]
      >;
      finalizeAssetRegistration: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          assetKind: BridgeTypesAssetKind | 'Thischain' | 'Sidechain' | number | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, BridgeTypesAssetKind]
      >;
      mint: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          sender:
            | Option<XcmVersionedMultiLocation>
            | null
            | Uint8Array
            | XcmVersionedMultiLocation
            | { V2: any }
            | { V3: any }
            | string,
          recipient: AccountId32 | string | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, Option<XcmVersionedMultiLocation>, AccountId32, u128]
      >;
      registerSidechainAsset: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          sidechainAsset: XcmV3MultiassetAssetId | { Concrete: any } | { Abstract: any } | string | Uint8Array,
          symbol: Bytes | string | Uint8Array,
          name: Bytes | string | Uint8Array,
          decimals: u8 | AnyNumber | Uint8Array,
          allowedParachains: Vec<u32> | (u32 | AnyNumber | Uint8Array)[],
          minimalXcmAmount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesSubNetworkId, XcmV3MultiassetAssetId, Bytes, Bytes, u8, Vec<u32>, u128]
      >;
      registerThischainAsset: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          sidechainAsset: XcmV3MultiassetAssetId | { Concrete: any } | { Abstract: any } | string | Uint8Array,
          allowedParachains: Vec<u32> | (u32 | AnyNumber | Uint8Array)[],
          minimalXcmAmount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesSubNetworkId, CommonPrimitivesAssetId32, XcmV3MultiassetAssetId, Vec<u32>, u128]
      >;
      removeAssetidParaid: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          paraId: u32 | AnyNumber | Uint8Array,
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesSubNetworkId, u32, CommonPrimitivesAssetId32]
      >;
      setMinimumXcmIncomingAssetCount: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          minimalXcmAmount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesSubNetworkId, CommonPrimitivesAssetId32, u128]
      >;
      updateTransactionStatus: AugmentedSubmittable<
        (
          messageId: H256 | string | Uint8Array,
          transferStatus:
            | BridgeTypesSubstrateXcmAppTransferStatus
            | 'Success'
            | 'XCMTransferError'
            | number
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, BridgeTypesSubstrateXcmAppTransferStatus]
      >;
    };
    permissions: {};
    poolXYK: {
      depositLiquidity: AugmentedSubmittable<
        (
          dexId: u32 | AnyNumber | Uint8Array,
          inputAssetA: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          inputAssetB: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          inputADesired: u128 | AnyNumber | Uint8Array,
          inputBDesired: u128 | AnyNumber | Uint8Array,
          inputAMin: u128 | AnyNumber | Uint8Array,
          inputBMin: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u32, CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, u128, u128, u128, u128]
      >;
      initializePool: AugmentedSubmittable<
        (
          dexId: u32 | AnyNumber | Uint8Array,
          assetA: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          assetB: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u32, CommonPrimitivesAssetId32, CommonPrimitivesAssetId32]
      >;
      withdrawLiquidity: AugmentedSubmittable<
        (
          dexId: u32 | AnyNumber | Uint8Array,
          outputAssetA: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          outputAssetB: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          markerAssetDesired: u128 | AnyNumber | Uint8Array,
          outputAMin: u128 | AnyNumber | Uint8Array,
          outputBMin: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u32, CommonPrimitivesAssetId32, CommonPrimitivesAssetId32, u128, u128, u128]
      >;
    };
    preimage: {
      /**
       * Register a preimage on-chain.
       *
       * If the preimage was previously requested, no fees or deposits are taken for providing
       * the preimage. Otherwise, a deposit is taken proportional to the size of the preimage.
       **/
      notePreimage: AugmentedSubmittable<
        (bytes: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Bytes]
      >;
      /**
       * Request a preimage be uploaded to the chain without paying any fees or deposits.
       *
       * If the preimage requests has already been provided on-chain, we unreserve any deposit
       * a user may have paid, and take the control of the preimage out of their hands.
       **/
      requestPreimage: AugmentedSubmittable<
        (hash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [H256]
      >;
      /**
       * Clear an unrequested preimage from the runtime storage.
       *
       * If `len` is provided, then it will be a much cheaper operation.
       *
       * - `hash`: The hash of the preimage to be removed from the store.
       * - `len`: The length of the preimage of `hash`.
       **/
      unnotePreimage: AugmentedSubmittable<(hash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [H256]>;
      /**
       * Clear a previously made request for a preimage.
       *
       * NOTE: THIS MUST NOT BE CALLED ON `hash` MORE TIMES THAN `request_preimage`.
       **/
      unrequestPreimage: AugmentedSubmittable<
        (hash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [H256]
      >;
    };
    presto: {
      addPrestoAuditor: AugmentedSubmittable<
        (auditor: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      addPrestoManager: AugmentedSubmittable<
        (manager: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      applyCreditorKyc: AugmentedSubmittable<
        (creditor: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      applyInvestorKyc: AugmentedSubmittable<
        (investor: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      approveDepositRequest: AugmentedSubmittable<
        (requestId: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u64]
      >;
      approveWithdrawRequest: AugmentedSubmittable<
        (
          requestId: u64 | AnyNumber | Uint8Array,
          paymentReference: Bytes | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u64, Bytes]
      >;
      burnPrestoUsd: AugmentedSubmittable<
        (amount: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
      cancelRequest: AugmentedSubmittable<
        (requestId: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u64]
      >;
      claimRefund: AugmentedSubmittable<
        (
          couponAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          couponAmount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, u128]
      >;
      createCropReceipt: AugmentedSubmittable<
        (
          amount: u128 | AnyNumber | Uint8Array,
          profit: Permill | AnyNumber | Uint8Array,
          country:
            | PrestoCropReceiptCountry
            | 'Brazil'
            | 'Indonesia'
            | 'Nigeria'
            | 'Ukraine'
            | 'Usa'
            | 'Other'
            | number
            | Uint8Array,
          closeInitialPeriod: u64 | AnyNumber | Uint8Array,
          dateOfIssue: u64 | AnyNumber | Uint8Array,
          placeOfIssue: Bytes | string | Uint8Array,
          debtor: Bytes | string | Uint8Array,
          creditor: Bytes | string | Uint8Array,
          perfomanceTime: u64 | AnyNumber | Uint8Array,
          data: Bytes | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u128, Permill, PrestoCropReceiptCountry, u64, u64, Bytes, Bytes, Bytes, u64, Bytes]
      >;
      createDepositRequest: AugmentedSubmittable<
        (
          amount: u128 | AnyNumber | Uint8Array,
          paymentReference: Bytes | string | Uint8Array,
          details: Option<Bytes> | null | Uint8Array | Bytes | string
        ) => SubmittableExtrinsic<ApiType>,
        [u128, Bytes, Option<Bytes>]
      >;
      createWithdrawRequest: AugmentedSubmittable<
        (
          amount: u128 | AnyNumber | Uint8Array,
          details: Option<Bytes> | null | Uint8Array | Bytes | string
        ) => SubmittableExtrinsic<ApiType>,
        [u128, Option<Bytes>]
      >;
      declineCropReceipt: AugmentedSubmittable<
        (cropReceiptId: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u64]
      >;
      declineRequest: AugmentedSubmittable<
        (requestId: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u64]
      >;
      mintPrestoUsd: AugmentedSubmittable<
        (amount: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
      payOffCropReceipt: AugmentedSubmittable<
        (cropReceiptId: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u64]
      >;
      publishCropReceipt: AugmentedSubmittable<
        (
          cropReceiptId: u64 | AnyNumber | Uint8Array,
          supply: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u64, u128]
      >;
      rateCropReceipt: AugmentedSubmittable<
        (
          cropReceiptId: u64 | AnyNumber | Uint8Array,
          rating:
            | PrestoCropReceiptRating
            | 'AAA'
            | 'AA'
            | 'A'
            | 'BBB'
            | 'BB'
            | 'B'
            | 'CCC'
            | 'CC'
            | 'C'
            | 'D'
            | 'NR'
            | number
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u64, PrestoCropReceiptRating]
      >;
      removeCreditorKyc: AugmentedSubmittable<
        (creditor: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      removeInvestorKyc: AugmentedSubmittable<
        (investor: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      removePrestoAuditor: AugmentedSubmittable<
        (auditor: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      removePrestoManager: AugmentedSubmittable<
        (manager: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      sendPrestoUsd: AugmentedSubmittable<
        (amount: u128 | AnyNumber | Uint8Array, to: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128, AccountId32]
      >;
    };
    pswapDistribution: {
      claimIncentive: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
    };
    qaTools: {
      /**
       * Initialize mcbc liquidity source.
       *
       * Parameters:
       * - `origin`: Root
       * - `base_supply`: Control supply of XOR,
       * - `other_collaterals`: Variables related to arbitrary collateral-specific pricing,
       * - `tbcd_collateral`: TBCD-specific pricing variables.
       **/
      mcbcInitialize: AugmentedSubmittable<
        (
          baseSupply:
            | Option<QaToolsPalletToolsMcbcBaseSupply>
            | null
            | Uint8Array
            | QaToolsPalletToolsMcbcBaseSupply
            | { assetCollector?: any; target?: any }
            | string,
          otherCollaterals:
            | Vec<QaToolsPalletToolsMcbcOtherCollateralInput>
            | (QaToolsPalletToolsMcbcOtherCollateralInput | { asset?: any; parameters?: any } | string | Uint8Array)[],
          tbcdCollateral:
            | Option<QaToolsPalletToolsMcbcTbcdCollateralInput>
            | null
            | Uint8Array
            | QaToolsPalletToolsMcbcTbcdCollateralInput
            | { parameters?: any; refXorPrices?: any }
            | string
        ) => SubmittableExtrinsic<ApiType>,
        [
          Option<QaToolsPalletToolsMcbcBaseSupply>,
          Vec<QaToolsPalletToolsMcbcOtherCollateralInput>,
          Option<QaToolsPalletToolsMcbcTbcdCollateralInput>,
        ]
      >;
      /**
       * Create multiple many order books with parameters and fill them according to given parameters.
       *
       * Balance for placing the orders is minted automatically, trading pairs are
       * created if needed.
       *
       * In order to create empty order books, one can leave settings empty.
       *
       * Parameters:
       * - `origin`: root
       * - `bids_owner`: Creator of the buy orders placed on the order books,
       * - `asks_owner`: Creator of the sell orders placed on the order books,
       * - `settings`: Parameters for creation of the order book and placing the orders in each order book.
       **/
      orderBookCreateAndFillBatch: AugmentedSubmittable<
        (
          bidsOwner: AccountId32 | string | Uint8Array,
          asksOwner: AccountId32 | string | Uint8Array,
          settings:
            | Vec<
                ITuple<
                  [
                    CommonPrimitivesOrderBookId,
                    QaToolsPalletToolsOrderBookOrderBookAttributes,
                    QaToolsPalletToolsOrderBookFillInput,
                  ]
                >
              >
            | [
                CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array,
                (
                  | QaToolsPalletToolsOrderBookOrderBookAttributes
                  | { tickSize?: any; stepLotSize?: any; minLotSize?: any; maxLotSize?: any }
                  | string
                  | Uint8Array
                ),
                (
                  | QaToolsPalletToolsOrderBookFillInput
                  | { asks?: any; bids?: any; randomSeed?: any }
                  | string
                  | Uint8Array
                ),
              ][]
        ) => SubmittableExtrinsic<ApiType>,
        [
          AccountId32,
          AccountId32,
          Vec<
            ITuple<
              [
                CommonPrimitivesOrderBookId,
                QaToolsPalletToolsOrderBookOrderBookAttributes,
                QaToolsPalletToolsOrderBookFillInput,
              ]
            >
          >,
        ]
      >;
      /**
       * Fill the order books according to given parameters.
       *
       * Balance for placing the orders is minted automatically.
       *
       * Parameters:
       * - `origin`: root
       * - `bids_owner`: Creator of the buy orders placed on the order books,
       * - `asks_owner`: Creator of the sell orders placed on the order books,
       * - `settings`: Parameters for placing the orders in each order book.
       **/
      orderBookFillBatch: AugmentedSubmittable<
        (
          bidsOwner: AccountId32 | string | Uint8Array,
          asksOwner: AccountId32 | string | Uint8Array,
          settings:
            | Vec<ITuple<[CommonPrimitivesOrderBookId, QaToolsPalletToolsOrderBookFillInput]>>
            | [
                CommonPrimitivesOrderBookId | { dexId?: any; base?: any; quote?: any } | string | Uint8Array,
                (
                  | QaToolsPalletToolsOrderBookFillInput
                  | { asks?: any; bids?: any; randomSeed?: any }
                  | string
                  | Uint8Array
                ),
              ][]
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, AccountId32, Vec<ITuple<[CommonPrimitivesOrderBookId, QaToolsPalletToolsOrderBookFillInput]>>]
      >;
      /**
       * Allows to clear all Presto data (assets, DEX etc.) in testnet without migration.
       *
       * Parameters:
       * - `origin`: Root
       **/
      prestoClear: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Allows to initialize necessary Presto data (assets, DEX etc.) in testnet without migration.
       *
       * Parameters:
       * - `origin`: Root
       **/
      prestoInitialize: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Set prices of an asset in `price_tools` pallet.
       * Ignores pallet restrictions on price speed change.
       *
       * Parameters:
       * - `origin`: Root
       * - `asset_per_xor`: Prices (1 XOR in terms of the corresponding asset).
       * - `asset_id`: Asset identifier; can be some common constant for easier input.
       **/
      priceToolsSetAssetPrice: AugmentedSubmittable<
        (
          assetPerXor: QaToolsPalletToolsPriceToolsAssetPrices | { buy?: any; sell?: any } | string | Uint8Array,
          assetId:
            | QaToolsInputAssetId
            | { McbcReference: any }
            | { XstReference: any }
            | { Other: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [QaToolsPalletToolsPriceToolsAssetPrices, QaToolsInputAssetId]
      >;
      /**
       * Initialize xst liquidity source. In xst's `quote`, one of the assets is the synthetic base
       * (XST) and the other one is a synthetic asset.
       *
       * Parameters:
       * - `origin`: Root
       * - `base_prices`: Synthetic base asset price update. Usually buy price > sell.
       * - `synthetics_prices`: Synthetic initialization;
       * registration of an asset + setting up prices for target quotes.
       * - `relayer`: Account which will be the author of prices fed to `band` pallet;
       *
       * Emits events with actual quotes achieved after initialization;
       * more details in [`liquidity_sources::initialize_xst`]
       **/
      xstInitialize: AugmentedSubmittable<
        (
          basePrices:
            | Option<QaToolsPalletToolsXstBaseInput>
            | null
            | Uint8Array
            | QaToolsPalletToolsXstBaseInput
            | { referencePerSyntheticBaseBuy?: any; referencePerSyntheticBaseSell?: any }
            | string,
          syntheticsPrices:
            | Vec<QaToolsPalletToolsXstSyntheticInput>
            | (
                | QaToolsPalletToolsXstSyntheticInput
                | { assetId?: any; expectedQuote?: any; existence?: any }
                | string
                | Uint8Array
              )[],
          relayer: AccountId32 | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Option<QaToolsPalletToolsXstBaseInput>, Vec<QaToolsPalletToolsXstSyntheticInput>, AccountId32]
      >;
      /**
       * Initialize xyk pool liquidity source.
       *
       * Parameters:
       * - `origin`: Root
       * - `account`: Some account to use during the initialization
       * - `pairs`: Asset pairs to initialize.
       **/
      xykInitialize: AugmentedSubmittable<
        (
          account: AccountId32 | string | Uint8Array,
          pairs:
            | Vec<QaToolsPalletToolsPoolXykAssetPairInput>
            | (
                | QaToolsPalletToolsPoolXykAssetPairInput
                | { dexId?: any; assetA?: any; assetB?: any; price?: any; maybeAssetAReserves?: any }
                | string
                | Uint8Array
              )[]
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, Vec<QaToolsPalletToolsPoolXykAssetPairInput>]
      >;
    };
    referrals: {
      /**
       * Reserves the balance from the account for a special balance that can be used to pay referrals' fees
       **/
      reserve: AugmentedSubmittable<(balance: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u128]>;
      /**
       * Sets the referrer for the account
       **/
      setReferrer: AugmentedSubmittable<
        (referrer: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Unreserves the balance and transfers it back to the account
       **/
      unreserve: AugmentedSubmittable<
        (balance: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
    };
    rewards: {
      /**
       * Finalize the update of unclaimed VAL data in storage
       * Add addresses, who will receive UMI NFT rewards.
       **/
      addUmiNftReceivers: AugmentedSubmittable<
        (receivers: Vec<H160> | (H160 | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>,
        [Vec<H160>]
      >;
      /**
       * Claim the reward with signature.
       **/
      claim: AugmentedSubmittable<(signature: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
    };
    scheduler: {
      /**
       * Cancel an anonymously scheduled task.
       **/
      cancel: AugmentedSubmittable<
        (when: u32 | AnyNumber | Uint8Array, index: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u32, u32]
      >;
      /**
       * Cancel a named scheduled task.
       **/
      cancelNamed: AugmentedSubmittable<
        (id: U8aFixed | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [U8aFixed]
      >;
      /**
       * Anonymously schedule a task.
       **/
      schedule: AugmentedSubmittable<
        (
          when: u32 | AnyNumber | Uint8Array,
          maybePeriodic:
            | Option<ITuple<[u32, u32]>>
            | null
            | Uint8Array
            | ITuple<[u32, u32]>
            | [u32 | AnyNumber | Uint8Array, u32 | AnyNumber | Uint8Array],
          priority: u8 | AnyNumber | Uint8Array,
          call: Call | IMethod | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u32, Option<ITuple<[u32, u32]>>, u8, Call]
      >;
      /**
       * Anonymously schedule a task after a delay.
       *
       * # <weight>
       * Same as [`schedule`].
       * # </weight>
       **/
      scheduleAfter: AugmentedSubmittable<
        (
          after: u32 | AnyNumber | Uint8Array,
          maybePeriodic:
            | Option<ITuple<[u32, u32]>>
            | null
            | Uint8Array
            | ITuple<[u32, u32]>
            | [u32 | AnyNumber | Uint8Array, u32 | AnyNumber | Uint8Array],
          priority: u8 | AnyNumber | Uint8Array,
          call: Call | IMethod | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u32, Option<ITuple<[u32, u32]>>, u8, Call]
      >;
      /**
       * Schedule a named task.
       **/
      scheduleNamed: AugmentedSubmittable<
        (
          id: U8aFixed | string | Uint8Array,
          when: u32 | AnyNumber | Uint8Array,
          maybePeriodic:
            | Option<ITuple<[u32, u32]>>
            | null
            | Uint8Array
            | ITuple<[u32, u32]>
            | [u32 | AnyNumber | Uint8Array, u32 | AnyNumber | Uint8Array],
          priority: u8 | AnyNumber | Uint8Array,
          call: Call | IMethod | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [U8aFixed, u32, Option<ITuple<[u32, u32]>>, u8, Call]
      >;
      /**
       * Schedule a named task after a delay.
       *
       * # <weight>
       * Same as [`schedule_named`](Self::schedule_named).
       * # </weight>
       **/
      scheduleNamedAfter: AugmentedSubmittable<
        (
          id: U8aFixed | string | Uint8Array,
          after: u32 | AnyNumber | Uint8Array,
          maybePeriodic:
            | Option<ITuple<[u32, u32]>>
            | null
            | Uint8Array
            | ITuple<[u32, u32]>
            | [u32 | AnyNumber | Uint8Array, u32 | AnyNumber | Uint8Array],
          priority: u8 | AnyNumber | Uint8Array,
          call: Call | IMethod | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [U8aFixed, u32, Option<ITuple<[u32, u32]>>, u8, Call]
      >;
    };
    session: {
      /**
       * Removes any session key(s) of the function caller.
       *
       * This doesn't take effect until the next session.
       *
       * The dispatch origin of this function must be Signed and the account must be either be
       * convertible to a validator ID using the chain's typical addressing system (this usually
       * means being a controller account) or directly convertible into a validator ID (which
       * usually means being a stash account).
       *
       * # <weight>
       * - Complexity: `O(1)` in number of key types. Actual cost depends on the number of length
       * of `T::Keys::key_ids()` which is fixed.
       * - DbReads: `T::ValidatorIdOf`, `NextKeys`, `origin account`
       * - DbWrites: `NextKeys`, `origin account`
       * - DbWrites per key id: `KeyOwner`
       * # </weight>
       **/
      purgeKeys: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Sets the session key(s) of the function caller to `keys`.
       * Allows an account to set its session key prior to becoming a validator.
       * This doesn't take effect until the next session.
       *
       * The dispatch origin of this function must be signed.
       *
       * # <weight>
       * - Complexity: `O(1)`. Actual cost depends on the number of length of
       * `T::Keys::key_ids()` which is fixed.
       * - DbReads: `origin account`, `T::ValidatorIdOf`, `NextKeys`
       * - DbWrites: `origin account`, `NextKeys`
       * - DbReads per key id: `KeyOwner`
       * - DbWrites per key id: `KeyOwner`
       * # </weight>
       **/
      setKeys: AugmentedSubmittable<
        (
          keys:
            | FramenodeRuntimeOpaqueSessionKeys
            | { babe?: any; grandpa?: any; imOnline?: any; beefy?: any }
            | string
            | Uint8Array,
          proof: Bytes | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [FramenodeRuntimeOpaqueSessionKeys, Bytes]
      >;
    };
    soratopia: {
      /**
       * Soratopia on-chain check in.
       * Transfers XOR from caller to admin account.
       **/
      checkIn: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
    };
    staking: {
      /**
       * Take the origin account as a stash and lock up `value` of its balance. `controller` will
       * be the account that controls it.
       *
       * `value` must be more than the `minimum_balance` specified by `T::Currency`.
       *
       * The dispatch origin for this call must be _Signed_ by the stash account.
       *
       * Emits `Bonded`.
       * # <weight>
       * - Independent of the arguments. Moderate complexity.
       * - O(1).
       * - Three extra DB entries.
       *
       * NOTE: Two of the storage writes (`Self::bonded`, `Self::payee`) are _never_ cleaned
       * unless the `origin` falls below _existential deposit_ and gets removed as dust.
       * ------------------
       * # </weight>
       **/
      bond: AugmentedSubmittable<
        (
          controller: AccountId32 | string | Uint8Array,
          value: Compact<u128> | AnyNumber | Uint8Array,
          payee:
            | PalletStakingRewardDestination
            | { Staked: any }
            | { Stash: any }
            | { Controller: any }
            | { Account: any }
            | { None: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, Compact<u128>, PalletStakingRewardDestination]
      >;
      /**
       * Add some extra amount that have appeared in the stash `free_balance` into the balance up
       * for staking.
       *
       * The dispatch origin for this call must be _Signed_ by the stash, not the controller.
       *
       * Use this if there are additional funds in your stash account that you wish to bond.
       * Unlike [`bond`](Self::bond) or [`unbond`](Self::unbond) this function does not impose
       * any limitation on the amount that can be added.
       *
       * Emits `Bonded`.
       *
       * # <weight>
       * - Independent of the arguments. Insignificant complexity.
       * - O(1).
       * # </weight>
       **/
      bondExtra: AugmentedSubmittable<
        (maxAdditional: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Compact<u128>]
      >;
      /**
       * Cancel enactment of a deferred slash.
       *
       * Can be called by the `T::AdminOrigin`.
       *
       * Parameters: era and indices of the slashes for that era to kill.
       **/
      cancelDeferredSlash: AugmentedSubmittable<
        (
          era: u32 | AnyNumber | Uint8Array,
          slashIndices: Vec<u32> | (u32 | AnyNumber | Uint8Array)[]
        ) => SubmittableExtrinsic<ApiType>,
        [u32, Vec<u32>]
      >;
      /**
       * Declare no desire to either validate or nominate.
       *
       * Effects will be felt at the beginning of the next era.
       *
       * The dispatch origin for this call must be _Signed_ by the controller, not the stash.
       *
       * # <weight>
       * - Independent of the arguments. Insignificant complexity.
       * - Contains one read.
       * - Writes are limited to the `origin` account key.
       * # </weight>
       **/
      chill: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Declare a `controller` to stop participating as either a validator or nominator.
       *
       * Effects will be felt at the beginning of the next era.
       *
       * The dispatch origin for this call must be _Signed_, but can be called by anyone.
       *
       * If the caller is the same as the controller being targeted, then no further checks are
       * enforced, and this function behaves just like `chill`.
       *
       * If the caller is different than the controller being targeted, the following conditions
       * must be met:
       *
       * * `controller` must belong to a nominator who has become non-decodable,
       *
       * Or:
       *
       * * A `ChillThreshold` must be set and checked which defines how close to the max
       * nominators or validators we must reach before users can start chilling one-another.
       * * A `MaxNominatorCount` and `MaxValidatorCount` must be set which is used to determine
       * how close we are to the threshold.
       * * A `MinNominatorBond` and `MinValidatorBond` must be set and checked, which determines
       * if this is a person that should be chilled because they have not met the threshold
       * bond required.
       *
       * This can be helpful if bond requirements are updated, and we need to remove old users
       * who do not satisfy these requirements.
       **/
      chillOther: AugmentedSubmittable<
        (controller: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Force a validator to have at least the minimum commission. This will not affect a
       * validator who already has a commission greater than or equal to the minimum. Any account
       * can call this.
       **/
      forceApplyMinCommission: AugmentedSubmittable<
        (validatorStash: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Force there to be a new era at the end of the next session. After this, it will be
       * reset to normal (non-forced) behaviour.
       *
       * The dispatch origin must be Root.
       *
       * # Warning
       *
       * The election process starts multiple blocks before the end of the era.
       * If this is called just before a new era is triggered, the election process may not
       * have enough blocks to get a result.
       *
       * # <weight>
       * - No arguments.
       * - Weight: O(1)
       * - Write ForceEra
       * # </weight>
       **/
      forceNewEra: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Force there to be a new era at the end of sessions indefinitely.
       *
       * The dispatch origin must be Root.
       *
       * # Warning
       *
       * The election process starts multiple blocks before the end of the era.
       * If this is called just before a new era is triggered, the election process may not
       * have enough blocks to get a result.
       **/
      forceNewEraAlways: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Force there to be no new eras indefinitely.
       *
       * The dispatch origin must be Root.
       *
       * # Warning
       *
       * The election process starts multiple blocks before the end of the era.
       * Thus the election process may be ongoing when this is called. In this case the
       * election will continue until the next era is triggered.
       *
       * # <weight>
       * - No arguments.
       * - Weight: O(1)
       * - Write: ForceEra
       * # </weight>
       **/
      forceNoEras: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Force a current staker to become completely unstaked, immediately.
       *
       * The dispatch origin must be Root.
       **/
      forceUnstake: AugmentedSubmittable<
        (
          stash: AccountId32 | string | Uint8Array,
          numSlashingSpans: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, u32]
      >;
      /**
       * Increments the ideal number of validators upto maximum of
       * `ElectionProviderBase::MaxWinners`.
       *
       * The dispatch origin must be Root.
       *
       * # <weight>
       * Same as [`Self::set_validator_count`].
       * # </weight>
       **/
      increaseValidatorCount: AugmentedSubmittable<
        (additional: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Compact<u32>]
      >;
      /**
       * Remove the given nominations from the calling validator.
       *
       * Effects will be felt at the beginning of the next era.
       *
       * The dispatch origin for this call must be _Signed_ by the controller, not the stash.
       *
       * - `who`: A list of nominator stash accounts who are nominating this validator which
       * should no longer be nominating this validator.
       *
       * Note: Making this call only makes sense if you first set the validator preferences to
       * block any further nominations.
       **/
      kick: AugmentedSubmittable<
        (who: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>,
        [Vec<AccountId32>]
      >;
      /**
       * Declare the desire to nominate `targets` for the origin controller.
       *
       * Effects will be felt at the beginning of the next era.
       *
       * The dispatch origin for this call must be _Signed_ by the controller, not the stash.
       *
       * # <weight>
       * - The transaction's complexity is proportional to the size of `targets` (N)
       * which is capped at CompactAssignments::LIMIT (T::MaxNominations).
       * - Both the reads and writes follow a similar pattern.
       * # </weight>
       **/
      nominate: AugmentedSubmittable<
        (targets: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>,
        [Vec<AccountId32>]
      >;
      /**
       * Pay out all the stakers behind a single validator for a single era.
       *
       * - `validator_stash` is the stash account of the validator. Their nominators, up to
       * `T::MaxNominatorRewardedPerValidator`, will also receive their rewards.
       * - `era` may be any era between `[current_era - history_depth; current_era]`.
       *
       * The origin of this call must be _Signed_. Any account can call this function, even if
       * it is not one of the stakers.
       *
       * # <weight>
       * - Time complexity: at most O(MaxNominatorRewardedPerValidator).
       * - Contains a limited number of reads and writes.
       * -----------
       * N is the Number of payouts for the validator (including the validator)
       * Weight:
       * - Reward Destination Staked: O(N)
       * - Reward Destination Controller (Creating): O(N)
       *
       * NOTE: weights are assuming that payouts are made to alive stash account (Staked).
       * Paying even a dead controller is cheaper weight-wise. We don't do any refunds here.
       * # </weight>
       **/
      payoutStakers: AugmentedSubmittable<
        (
          validatorStash: AccountId32 | string | Uint8Array,
          era: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, u32]
      >;
      /**
       * Remove all data structures concerning a staker/stash once it is at a state where it can
       * be considered `dust` in the staking system. The requirements are:
       *
       * 1. the `total_balance` of the stash is below existential deposit.
       * 2. or, the `ledger.total` of the stash is below existential deposit.
       *
       * The former can happen in cases like a slash; the latter when a fully unbonded account
       * is still receiving staking rewards in `RewardDestination::Staked`.
       *
       * It can be called by anyone, as long as `stash` meets the above requirements.
       *
       * Refunds the transaction fees upon successful execution.
       **/
      reapStash: AugmentedSubmittable<
        (
          stash: AccountId32 | string | Uint8Array,
          numSlashingSpans: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, u32]
      >;
      /**
       * Rebond a portion of the stash scheduled to be unlocked.
       *
       * The dispatch origin must be signed by the controller.
       *
       * # <weight>
       * - Time complexity: O(L), where L is unlocking chunks
       * - Bounded by `MaxUnlockingChunks`.
       * - Storage changes: Can't increase storage, only decrease it.
       * # </weight>
       **/
      rebond: AugmentedSubmittable<
        (value: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Compact<u128>]
      >;
      /**
       * Scale up the ideal number of validators by a factor upto maximum of
       * `ElectionProviderBase::MaxWinners`.
       *
       * The dispatch origin must be Root.
       *
       * # <weight>
       * Same as [`Self::set_validator_count`].
       * # </weight>
       **/
      scaleValidatorCount: AugmentedSubmittable<
        (factor: Percent | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Percent]
      >;
      /**
       * (Re-)set the controller of a stash.
       *
       * Effects will be felt instantly (as soon as this function is completed successfully).
       *
       * The dispatch origin for this call must be _Signed_ by the stash, not the controller.
       *
       * # <weight>
       * - Independent of the arguments. Insignificant complexity.
       * - Contains a limited number of reads.
       * - Writes are limited to the `origin` account key.
       * ----------
       * Weight: O(1)
       * DB Weight:
       * - Read: Bonded, Ledger New Controller, Ledger Old Controller
       * - Write: Bonded, Ledger New Controller, Ledger Old Controller
       * # </weight>
       **/
      setController: AugmentedSubmittable<
        (controller: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Set the validators who cannot be slashed (if any).
       *
       * The dispatch origin must be Root.
       **/
      setInvulnerables: AugmentedSubmittable<
        (invulnerables: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>,
        [Vec<AccountId32>]
      >;
      /**
       * Sets the minimum amount of commission that each validators must maintain.
       *
       * This call has lower privilege requirements than `set_staking_config` and can be called
       * by the `T::AdminOrigin`. Root can always call this.
       **/
      setMinCommission: AugmentedSubmittable<
        (updated: Perbill | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Perbill]
      >;
      /**
       * (Re-)set the payment target for a controller.
       *
       * Effects will be felt instantly (as soon as this function is completed successfully).
       *
       * The dispatch origin for this call must be _Signed_ by the controller, not the stash.
       *
       * # <weight>
       * - Independent of the arguments. Insignificant complexity.
       * - Contains a limited number of reads.
       * - Writes are limited to the `origin` account key.
       * ---------
       * - Weight: O(1)
       * - DB Weight:
       * - Read: Ledger
       * - Write: Payee
       * # </weight>
       **/
      setPayee: AugmentedSubmittable<
        (
          payee:
            | PalletStakingRewardDestination
            | { Staked: any }
            | { Stash: any }
            | { Controller: any }
            | { Account: any }
            | { None: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [PalletStakingRewardDestination]
      >;
      /**
       * Update the various staking configurations .
       *
       * * `min_nominator_bond`: The minimum active bond needed to be a nominator.
       * * `min_validator_bond`: The minimum active bond needed to be a validator.
       * * `max_nominator_count`: The max number of users who can be a nominator at once. When
       * set to `None`, no limit is enforced.
       * * `max_validator_count`: The max number of users who can be a validator at once. When
       * set to `None`, no limit is enforced.
       * * `chill_threshold`: The ratio of `max_nominator_count` or `max_validator_count` which
       * should be filled in order for the `chill_other` transaction to work.
       * * `min_commission`: The minimum amount of commission that each validators must maintain.
       * This is checked only upon calling `validate`. Existing validators are not affected.
       *
       * RuntimeOrigin must be Root to call this function.
       *
       * NOTE: Existing nominators and validators will not be affected by this update.
       * to kick people under the new limits, `chill_other` should be called.
       **/
      setStakingConfigs: AugmentedSubmittable<
        (
          minNominatorBond:
            | PalletStakingPalletConfigOpU128
            | { Noop: any }
            | { Set: any }
            | { Remove: any }
            | string
            | Uint8Array,
          minValidatorBond:
            | PalletStakingPalletConfigOpU128
            | { Noop: any }
            | { Set: any }
            | { Remove: any }
            | string
            | Uint8Array,
          maxNominatorCount:
            | PalletStakingPalletConfigOpU32
            | { Noop: any }
            | { Set: any }
            | { Remove: any }
            | string
            | Uint8Array,
          maxValidatorCount:
            | PalletStakingPalletConfigOpU32
            | { Noop: any }
            | { Set: any }
            | { Remove: any }
            | string
            | Uint8Array,
          chillThreshold:
            | PalletStakingPalletConfigOpPercent
            | { Noop: any }
            | { Set: any }
            | { Remove: any }
            | string
            | Uint8Array,
          minCommission:
            | PalletStakingPalletConfigOpPerbill
            | { Noop: any }
            | { Set: any }
            | { Remove: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [
          PalletStakingPalletConfigOpU128,
          PalletStakingPalletConfigOpU128,
          PalletStakingPalletConfigOpU32,
          PalletStakingPalletConfigOpU32,
          PalletStakingPalletConfigOpPercent,
          PalletStakingPalletConfigOpPerbill,
        ]
      >;
      /**
       * Sets the ideal number of validators.
       *
       * The dispatch origin must be Root.
       *
       * # <weight>
       * Weight: O(1)
       * Write: Validator Count
       * # </weight>
       **/
      setValidatorCount: AugmentedSubmittable<
        (updated: Compact<u32> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Compact<u32>]
      >;
      /**
       * Schedule a portion of the stash to be unlocked ready for transfer out after the bond
       * period ends. If this leaves an amount actively bonded less than
       * T::Currency::minimum_balance(), then it is increased to the full amount.
       *
       * The dispatch origin for this call must be _Signed_ by the controller, not the stash.
       *
       * Once the unlock period is done, you can call `withdraw_unbonded` to actually move
       * the funds out of management ready for transfer.
       *
       * No more than a limited number of unlocking chunks (see `MaxUnlockingChunks`)
       * can co-exists at the same time. If there are no unlocking chunks slots available
       * [`Call::withdraw_unbonded`] is called to remove some of the chunks (if possible).
       *
       * If a user encounters the `InsufficientBond` error when calling this extrinsic,
       * they should call `chill` first in order to free up their bonded funds.
       *
       * Emits `Unbonded`.
       *
       * See also [`Call::withdraw_unbonded`].
       **/
      unbond: AugmentedSubmittable<
        (value: Compact<u128> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Compact<u128>]
      >;
      /**
       * Declare the desire to validate for the origin controller.
       *
       * Effects will be felt at the beginning of the next era.
       *
       * The dispatch origin for this call must be _Signed_ by the controller, not the stash.
       **/
      validate: AugmentedSubmittable<
        (
          prefs: PalletStakingValidatorPrefs | { commission?: any; blocked?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [PalletStakingValidatorPrefs]
      >;
      /**
       * Remove any unlocked chunks from the `unlocking` queue from our management.
       *
       * This essentially frees up that balance to be used by the stash account to do
       * whatever it wants.
       *
       * The dispatch origin for this call must be _Signed_ by the controller.
       *
       * Emits `Withdrawn`.
       *
       * See also [`Call::unbond`].
       *
       * # <weight>
       * Complexity O(S) where S is the number of slashing spans to remove
       * NOTE: Weight annotation is the kill scenario, we refund otherwise.
       * # </weight>
       **/
      withdrawUnbonded: AugmentedSubmittable<
        (numSlashingSpans: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u32]
      >;
    };
    substrateBridgeApp: {
      /**
       * Function used by users to send tokens to the sidechain
       **/
      burn: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          recipient:
            | BridgeTypesGenericAccount
            | { EVM: any }
            | { Sora: any }
            | { Liberland: any }
            | { Parachain: any }
            | { Unknown: any }
            | { Root: any }
            | { TON: any }
            | string
            | Uint8Array,
          amount: u128 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesSubNetworkId, CommonPrimitivesAssetId32, BridgeTypesGenericAccount, u128]
      >;
      /**
       * Function used to finalize asset registration if everything went well on the sidechain
       * The Origin for this call is the Bridge Origin
       * Only the relayer can call this function
       **/
      finalizeAssetRegistration: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          sidechainAssetId:
            | BridgeTypesGenericAssetId
            | { Sora: any }
            | { XCM: any }
            | { EVM: any }
            | { Liberland: any }
            | string
            | Uint8Array,
          assetKind: BridgeTypesAssetKind | 'Thischain' | 'Sidechain' | number | Uint8Array,
          sidechainPrecision: u8 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, BridgeTypesGenericAssetId, BridgeTypesAssetKind, u8]
      >;
      /**
       * Function used to register this chain asset
       * The Origin for this call is the Bridge Origin
       * Only the relayer can call this function
       * Sends the message to sidechain to finalize asset registration
       **/
      incomingThischainAssetRegistration: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          sidechainAssetId:
            | BridgeTypesGenericAssetId
            | { Sora: any }
            | { XCM: any }
            | { EVM: any }
            | { Liberland: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, BridgeTypesGenericAssetId]
      >;
      /**
       * Function used to mint or unlock tokens
       * The Origin for this call is the Bridge Origin
       * Only the relayer can call this function
       **/
      mint: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          sender:
            | BridgeTypesGenericAccount
            | { EVM: any }
            | { Sora: any }
            | { Liberland: any }
            | { Parachain: any }
            | { Unknown: any }
            | { Root: any }
            | { TON: any }
            | string
            | Uint8Array,
          recipient: AccountId32 | string | Uint8Array,
          amount: BridgeTypesGenericBalance | { Substrate: any } | { EVM: any } | { TON: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, BridgeTypesGenericAccount, AccountId32, BridgeTypesGenericBalance]
      >;
      /**
       * Function used to register sidechain asset
       * The Origin for this call is the Root Origin
       * Only the root can call this function
       * Sends the message to sidechain to register asset
       **/
      registerSidechainAsset: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          sidechainAsset:
            | BridgeTypesGenericAssetId
            | { Sora: any }
            | { XCM: any }
            | { EVM: any }
            | { Liberland: any }
            | string
            | Uint8Array,
          symbol: Bytes | string | Uint8Array,
          name: Bytes | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesSubNetworkId, BridgeTypesGenericAssetId, Bytes, Bytes]
      >;
      /**
       * Function used to update transaction status
       * The Origin for this call is the Bridge Origin
       * Only the relayer can call this function
       **/
      updateTransactionStatus: AugmentedSubmittable<
        (
          messageId: H256 | string | Uint8Array,
          messageStatus:
            | BridgeTypesMessageStatus
            | 'InQueue'
            | 'Committed'
            | 'Done'
            | 'Failed'
            | 'Refunded'
            | 'Approved'
            | number
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, BridgeTypesMessageStatus]
      >;
    };
    substrateBridgeInboundChannel: {
      submit: AugmentedSubmittable<
        (
          networkId:
            | BridgeTypesSubNetworkId
            | 'Mainnet'
            | 'Kusama'
            | 'Polkadot'
            | 'Rococo'
            | 'Alphanet'
            | 'Liberland'
            | number
            | Uint8Array,
          commitment: BridgeTypesGenericCommitment | { Sub: any } | { EVM: any } | { TON: any } | string | Uint8Array,
          proof:
            | FramenodeRuntimeMultiProof
            | { Beefy: any }
            | { Multisig: any }
            | { EVMMultisig: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [BridgeTypesSubNetworkId, BridgeTypesGenericCommitment, FramenodeRuntimeMultiProof]
      >;
    };
    substrateBridgeOutboundChannel: {
      updateInterval: AugmentedSubmittable<
        (newInterval: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u32]
      >;
    };
    sudo: {
      /**
       * Authenticates the current sudo key and sets the given AccountId (`new`) as the new sudo
       * key.
       *
       * The dispatch origin for this call must be _Signed_.
       *
       * # <weight>
       * - O(1).
       * - Limited storage reads.
       * - One DB change.
       * # </weight>
       **/
      setKey: AugmentedSubmittable<
        (updated: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Authenticates the sudo key and dispatches a function call with `Root` origin.
       *
       * The dispatch origin for this call must be _Signed_.
       *
       * # <weight>
       * - O(1).
       * - Limited storage reads.
       * - One DB write (event).
       * - Weight of derivative `call` execution + 10,000.
       * # </weight>
       **/
      sudo: AugmentedSubmittable<(call: Call | IMethod | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Call]>;
      /**
       * Authenticates the sudo key and dispatches a function call with `Signed` origin from
       * a given account.
       *
       * The dispatch origin for this call must be _Signed_.
       *
       * # <weight>
       * - O(1).
       * - Limited storage reads.
       * - One DB write (event).
       * - Weight of derivative `call` execution + 10,000.
       * # </weight>
       **/
      sudoAs: AugmentedSubmittable<
        (
          who: AccountId32 | string | Uint8Array,
          call: Call | IMethod | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, Call]
      >;
      /**
       * Authenticates the sudo key and dispatches a function call with `Root` origin.
       * This function does not check the weight of the call, and instead allows the
       * Sudo user to specify the weight of the call.
       *
       * The dispatch origin for this call must be _Signed_.
       *
       * # <weight>
       * - O(1).
       * - The weight of this call is defined by the caller.
       * # </weight>
       **/
      sudoUncheckedWeight: AugmentedSubmittable<
        (
          call: Call | IMethod | string | Uint8Array,
          weight: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Call, SpWeightsWeightV2Weight]
      >;
    };
    system: {
      /**
       * Kill all storage items with a key that starts with the given prefix.
       *
       * **NOTE:** We rely on the Root origin to provide us the number of subkeys under
       * the prefix we are removing to accurately calculate the weight of this function.
       **/
      killPrefix: AugmentedSubmittable<
        (prefix: Bytes | string | Uint8Array, subkeys: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Bytes, u32]
      >;
      /**
       * Kill some items from storage.
       **/
      killStorage: AugmentedSubmittable<
        (keys: Vec<Bytes> | (Bytes | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>,
        [Vec<Bytes>]
      >;
      /**
       * Make some on-chain remark.
       *
       * # <weight>
       * - `O(1)`
       * # </weight>
       **/
      remark: AugmentedSubmittable<(remark: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Make some on-chain remark and emit event.
       **/
      remarkWithEvent: AugmentedSubmittable<
        (remark: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Bytes]
      >;
      /**
       * Set the new runtime code.
       *
       * # <weight>
       * - `O(C + S)` where `C` length of `code` and `S` complexity of `can_set_code`
       * - 1 call to `can_set_code`: `O(S)` (calls `sp_io::misc::runtime_version` which is
       * expensive).
       * - 1 storage write (codec `O(C)`).
       * - 1 digest item.
       * - 1 event.
       * The weight of this function is dependent on the runtime, but generally this is very
       * expensive. We will treat this as a full block.
       * # </weight>
       **/
      setCode: AugmentedSubmittable<(code: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>, [Bytes]>;
      /**
       * Set the new runtime code without doing any checks of the given `code`.
       *
       * # <weight>
       * - `O(C)` where `C` length of `code`
       * - 1 storage write (codec `O(C)`).
       * - 1 digest item.
       * - 1 event.
       * The weight of this function is dependent on the runtime. We will treat this as a full
       * block. # </weight>
       **/
      setCodeWithoutChecks: AugmentedSubmittable<
        (code: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Bytes]
      >;
      /**
       * Set the number of pages in the WebAssembly environment's heap.
       **/
      setHeapPages: AugmentedSubmittable<(pages: u64 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>, [u64]>;
      /**
       * Set some items of storage.
       **/
      setStorage: AugmentedSubmittable<
        (
          items: Vec<ITuple<[Bytes, Bytes]>> | [Bytes | string | Uint8Array, Bytes | string | Uint8Array][]
        ) => SubmittableExtrinsic<ApiType>,
        [Vec<ITuple<[Bytes, Bytes]>>]
      >;
    };
    technical: {};
    technicalCommittee: {
      /**
       * Close a vote that is either approved, disapproved or whose voting period has ended.
       *
       * May be called by any signed account in order to finish voting and close the proposal.
       *
       * If called before the end of the voting period it will only close the vote if it is
       * has enough votes to be approved or disapproved.
       *
       * If called after the end of the voting period abstentions are counted as rejections
       * unless there is a prime member set and the prime member cast an approval.
       *
       * If the close operation completes successfully with disapproval, the transaction fee will
       * be waived. Otherwise execution of the approved operation will be charged to the caller.
       *
       * + `proposal_weight_bound`: The maximum amount of weight consumed by executing the closed
       * proposal.
       * + `length_bound`: The upper bound for the length of the proposal in storage. Checked via
       * `storage::read` so it is `size_of::<u32>() == 4` larger than the pure length.
       *
       * # <weight>
       * ## Weight
       * - `O(B + M + P1 + P2)` where:
       * - `B` is `proposal` size in bytes (length-fee-bounded)
       * - `M` is members-count (code- and governance-bounded)
       * - `P1` is the complexity of `proposal` preimage.
       * - `P2` is proposal-count (code-bounded)
       * - DB:
       * - 2 storage reads (`Members`: codec `O(M)`, `Prime`: codec `O(1)`)
       * - 3 mutations (`Voting`: codec `O(M)`, `ProposalOf`: codec `O(B)`, `Proposals`: codec
       * `O(P2)`)
       * - any mutations done while executing `proposal` (`P1`)
       * - up to 3 events
       * # </weight>
       **/
      close: AugmentedSubmittable<
        (
          proposalHash: H256 | string | Uint8Array,
          index: Compact<u32> | AnyNumber | Uint8Array,
          proposalWeightBound: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array,
          lengthBound: Compact<u32> | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, Compact<u32>, SpWeightsWeightV2Weight, Compact<u32>]
      >;
      /**
       * Close a vote that is either approved, disapproved or whose voting period has ended.
       *
       * May be called by any signed account in order to finish voting and close the proposal.
       *
       * If called before the end of the voting period it will only close the vote if it is
       * has enough votes to be approved or disapproved.
       *
       * If called after the end of the voting period abstentions are counted as rejections
       * unless there is a prime member set and the prime member cast an approval.
       *
       * If the close operation completes successfully with disapproval, the transaction fee will
       * be waived. Otherwise execution of the approved operation will be charged to the caller.
       *
       * + `proposal_weight_bound`: The maximum amount of weight consumed by executing the closed
       * proposal.
       * + `length_bound`: The upper bound for the length of the proposal in storage. Checked via
       * `storage::read` so it is `size_of::<u32>() == 4` larger than the pure length.
       *
       * # <weight>
       * ## Weight
       * - `O(B + M + P1 + P2)` where:
       * - `B` is `proposal` size in bytes (length-fee-bounded)
       * - `M` is members-count (code- and governance-bounded)
       * - `P1` is the complexity of `proposal` preimage.
       * - `P2` is proposal-count (code-bounded)
       * - DB:
       * - 2 storage reads (`Members`: codec `O(M)`, `Prime`: codec `O(1)`)
       * - 3 mutations (`Voting`: codec `O(M)`, `ProposalOf`: codec `O(B)`, `Proposals`: codec
       * `O(P2)`)
       * - any mutations done while executing `proposal` (`P1`)
       * - up to 3 events
       * # </weight>
       **/
      closeOldWeight: AugmentedSubmittable<
        (
          proposalHash: H256 | string | Uint8Array,
          index: Compact<u32> | AnyNumber | Uint8Array,
          proposalWeightBound: Compact<u64> | AnyNumber | Uint8Array,
          lengthBound: Compact<u32> | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, Compact<u32>, Compact<u64>, Compact<u32>]
      >;
      /**
       * Disapprove a proposal, close, and remove it from the system, regardless of its current
       * state.
       *
       * Must be called by the Root origin.
       *
       * Parameters:
       * * `proposal_hash`: The hash of the proposal that should be disapproved.
       *
       * # <weight>
       * Complexity: O(P) where P is the number of max proposals
       * DB Weight:
       * * Reads: Proposals
       * * Writes: Voting, Proposals, ProposalOf
       * # </weight>
       **/
      disapproveProposal: AugmentedSubmittable<
        (proposalHash: H256 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [H256]
      >;
      /**
       * Dispatch a proposal from a member using the `Member` origin.
       *
       * Origin must be a member of the collective.
       *
       * # <weight>
       * ## Weight
       * - `O(M + P)` where `M` members-count (code-bounded) and `P` complexity of dispatching
       * `proposal`
       * - DB: 1 read (codec `O(M)`) + DB access of `proposal`
       * - 1 event
       * # </weight>
       **/
      execute: AugmentedSubmittable<
        (
          proposal: Call | IMethod | string | Uint8Array,
          lengthBound: Compact<u32> | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Call, Compact<u32>]
      >;
      /**
       * Add a new proposal to either be voted on or executed directly.
       *
       * Requires the sender to be member.
       *
       * `threshold` determines whether `proposal` is executed directly (`threshold < 2`)
       * or put up for voting.
       *
       * # <weight>
       * ## Weight
       * - `O(B + M + P1)` or `O(B + M + P2)` where:
       * - `B` is `proposal` size in bytes (length-fee-bounded)
       * - `M` is members-count (code- and governance-bounded)
       * - branching is influenced by `threshold` where:
       * - `P1` is proposal execution complexity (`threshold < 2`)
       * - `P2` is proposals-count (code-bounded) (`threshold >= 2`)
       * - DB:
       * - 1 storage read `is_member` (codec `O(M)`)
       * - 1 storage read `ProposalOf::contains_key` (codec `O(1)`)
       * - DB accesses influenced by `threshold`:
       * - EITHER storage accesses done by `proposal` (`threshold < 2`)
       * - OR proposal insertion (`threshold <= 2`)
       * - 1 storage mutation `Proposals` (codec `O(P2)`)
       * - 1 storage mutation `ProposalCount` (codec `O(1)`)
       * - 1 storage write `ProposalOf` (codec `O(B)`)
       * - 1 storage write `Voting` (codec `O(M)`)
       * - 1 event
       * # </weight>
       **/
      propose: AugmentedSubmittable<
        (
          threshold: Compact<u32> | AnyNumber | Uint8Array,
          proposal: Call | IMethod | string | Uint8Array,
          lengthBound: Compact<u32> | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Compact<u32>, Call, Compact<u32>]
      >;
      /**
       * Set the collective's membership.
       *
       * - `new_members`: The new member list. Be nice to the chain and provide it sorted.
       * - `prime`: The prime member whose vote sets the default.
       * - `old_count`: The upper bound for the previous number of members in storage. Used for
       * weight estimation.
       *
       * Requires root origin.
       *
       * NOTE: Does not enforce the expected `MaxMembers` limit on the amount of members, but
       * the weight estimations rely on it to estimate dispatchable weight.
       *
       * # WARNING:
       *
       * The `pallet-collective` can also be managed by logic outside of the pallet through the
       * implementation of the trait [`ChangeMembers`].
       * Any call to `set_members` must be careful that the member set doesn't get out of sync
       * with other logic managing the member set.
       *
       * # <weight>
       * ## Weight
       * - `O(MP + N)` where:
       * - `M` old-members-count (code- and governance-bounded)
       * - `N` new-members-count (code- and governance-bounded)
       * - `P` proposals-count (code-bounded)
       * - DB:
       * - 1 storage mutation (codec `O(M)` read, `O(N)` write) for reading and writing the
       * members
       * - 1 storage read (codec `O(P)`) for reading the proposals
       * - `P` storage mutations (codec `O(M)`) for updating the votes for each proposal
       * - 1 storage write (codec `O(1)`) for deleting the old `prime` and setting the new one
       * # </weight>
       **/
      setMembers: AugmentedSubmittable<
        (
          newMembers: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[],
          prime: Option<AccountId32> | null | Uint8Array | AccountId32 | string,
          oldCount: u32 | AnyNumber | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Vec<AccountId32>, Option<AccountId32>, u32]
      >;
      /**
       * Add an aye or nay vote for the sender to the given proposal.
       *
       * Requires the sender to be a member.
       *
       * Transaction fees will be waived if the member is voting on any particular proposal
       * for the first time and the call is successful. Subsequent vote changes will charge a
       * fee.
       * # <weight>
       * ## Weight
       * - `O(M)` where `M` is members-count (code- and governance-bounded)
       * - DB:
       * - 1 storage read `Members` (codec `O(M)`)
       * - 1 storage mutation `Voting` (codec `O(M)`)
       * - 1 event
       * # </weight>
       **/
      vote: AugmentedSubmittable<
        (
          proposal: H256 | string | Uint8Array,
          index: Compact<u32> | AnyNumber | Uint8Array,
          approve: bool | boolean | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [H256, Compact<u32>, bool]
      >;
    };
    technicalMembership: {
      /**
       * Add a member `who` to the set.
       *
       * May only be called from `T::AddOrigin`.
       **/
      addMember: AugmentedSubmittable<
        (who: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Swap out the sending member for some other key `new`.
       *
       * May only be called from `Signed` origin of a current member.
       *
       * Prime membership is passed from the origin account to `new`, if extant.
       **/
      changeKey: AugmentedSubmittable<
        (updated: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Remove the prime member if it exists.
       *
       * May only be called from `T::PrimeOrigin`.
       **/
      clearPrime: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      /**
       * Remove a member `who` from the set.
       *
       * May only be called from `T::RemoveOrigin`.
       **/
      removeMember: AugmentedSubmittable<
        (who: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Change the membership to a new set, disregarding the existing membership. Be nice and
       * pass `members` pre-sorted.
       *
       * May only be called from `T::ResetOrigin`.
       **/
      resetMembers: AugmentedSubmittable<
        (members: Vec<AccountId32> | (AccountId32 | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>,
        [Vec<AccountId32>]
      >;
      /**
       * Set the prime member. Must be a current member.
       *
       * May only be called from `T::PrimeOrigin`.
       **/
      setPrime: AugmentedSubmittable<
        (who: AccountId32 | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [AccountId32]
      >;
      /**
       * Swap out one member `remove` for another `add`.
       *
       * May only be called from `T::SwapOrigin`.
       *
       * Prime membership is *not* passed from `remove` to `add`, if extant.
       **/
      swapMember: AugmentedSubmittable<
        (
          remove: AccountId32 | string | Uint8Array,
          add: AccountId32 | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, AccountId32]
      >;
    };
    timestamp: {
      /**
       * Set the current time.
       *
       * This call should be invoked exactly once per block. It will panic at the finalization
       * phase, if this call hasn't been invoked by that time.
       *
       * The timestamp should be greater than the previous one by the amount specified by
       * `MinimumPeriod`.
       *
       * The dispatch origin for this call must be `Inherent`.
       *
       * # <weight>
       * - `O(1)` (Note that implementations of `OnTimestampSet` must also be `O(1)`)
       * - 1 storage read and 1 storage mutation (codec `O(1)`). (because of `DidUpdate::take` in
       * `on_finalize`)
       * - 1 event handler `on_timestamp_set`. Must be `O(1)`.
       * # </weight>
       **/
      set: AugmentedSubmittable<
        (now: Compact<u64> | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Compact<u64>]
      >;
    };
    tradingPair: {
      /**
       * Register trading pair on the given DEX.
       * Can be only called by the DEX owner.
       *
       * - `dex_id`: ID of the exchange.
       * - `base_asset_id`: base asset ID.
       * - `target_asset_id`: target asset ID.
       **/
      register: AugmentedSubmittable<
        (
          dexId: u32 | AnyNumber | Uint8Array,
          baseAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          targetAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u32, CommonPrimitivesAssetId32, CommonPrimitivesAssetId32]
      >;
    };
    utility: {
      /**
       * Send a call through an indexed pseudonym of the sender.
       *
       * Filter from origin are passed along. The call will be dispatched with an origin which
       * use the same filter as the origin of this call.
       *
       * NOTE: If you need to ensure that any account-based filtering is not honored (i.e.
       * because you expect `proxy` to have been used prior in the call stack and you do not want
       * the call restrictions to apply to any sub-accounts), then use `as_multi_threshold_1`
       * in the Multisig pallet instead.
       *
       * NOTE: Prior to version *12, this was called `as_limited_sub`.
       *
       * The dispatch origin for this call must be _Signed_.
       **/
      asDerivative: AugmentedSubmittable<
        (
          index: u16 | AnyNumber | Uint8Array,
          call: Call | IMethod | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [u16, Call]
      >;
      /**
       * Send a batch of dispatch calls.
       *
       * May be called from any origin except `None`.
       *
       * - `calls`: The calls to be dispatched from the same origin. The number of call must not
       * exceed the constant: `batched_calls_limit` (available in constant metadata).
       *
       * If origin is root then the calls are dispatched without checking origin filter. (This
       * includes bypassing `frame_system::Config::BaseCallFilter`).
       *
       * # <weight>
       * - Complexity: O(C) where C is the number of calls to be batched.
       * # </weight>
       *
       * This will return `Ok` in all circumstances. To determine the success of the batch, an
       * event is deposited. If a call failed and the batch was interrupted, then the
       * `BatchInterrupted` event is deposited, along with the number of successful calls made
       * and the error of the failed call. If all were successful, then the `BatchCompleted`
       * event is deposited.
       **/
      batch: AugmentedSubmittable<
        (calls: Vec<Call> | (Call | IMethod | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>,
        [Vec<Call>]
      >;
      /**
       * Send a batch of dispatch calls and atomically execute them.
       * The whole transaction will rollback and fail if any of the calls failed.
       *
       * May be called from any origin except `None`.
       *
       * - `calls`: The calls to be dispatched from the same origin. The number of call must not
       * exceed the constant: `batched_calls_limit` (available in constant metadata).
       *
       * If origin is root then the calls are dispatched without checking origin filter. (This
       * includes bypassing `frame_system::Config::BaseCallFilter`).
       *
       * # <weight>
       * - Complexity: O(C) where C is the number of calls to be batched.
       * # </weight>
       **/
      batchAll: AugmentedSubmittable<
        (calls: Vec<Call> | (Call | IMethod | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>,
        [Vec<Call>]
      >;
      /**
       * Dispatches a function call with a provided origin.
       *
       * The dispatch origin for this call must be _Root_.
       *
       * # <weight>
       * - O(1).
       * - Limited storage reads.
       * - One DB write (event).
       * - Weight of derivative `call` execution + T::WeightInfo::dispatch_as().
       * # </weight>
       **/
      dispatchAs: AugmentedSubmittable<
        (
          asOrigin:
            | FramenodeRuntimeOriginCaller
            | { system: any }
            | { Void: any }
            | { Council: any }
            | { TechnicalCommittee: any }
            | { Dispatch: any }
            | { SubstrateDispatch: any }
            | string
            | Uint8Array,
          call: Call | IMethod | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [FramenodeRuntimeOriginCaller, Call]
      >;
      /**
       * Send a batch of dispatch calls.
       * Unlike `batch`, it allows errors and won't interrupt.
       *
       * May be called from any origin except `None`.
       *
       * - `calls`: The calls to be dispatched from the same origin. The number of call must not
       * exceed the constant: `batched_calls_limit` (available in constant metadata).
       *
       * If origin is root then the calls are dispatch without checking origin filter. (This
       * includes bypassing `frame_system::Config::BaseCallFilter`).
       *
       * # <weight>
       * - Complexity: O(C) where C is the number of calls to be batched.
       * # </weight>
       **/
      forceBatch: AugmentedSubmittable<
        (calls: Vec<Call> | (Call | IMethod | string | Uint8Array)[]) => SubmittableExtrinsic<ApiType>,
        [Vec<Call>]
      >;
      /**
       * Dispatch a function call with a specified weight.
       *
       * This function does not check the weight of the call, and instead allows the
       * Root origin to specify the weight of the call.
       *
       * The dispatch origin for this call must be _Root_.
       **/
      withWeight: AugmentedSubmittable<
        (
          call: Call | IMethod | string | Uint8Array,
          weight: SpWeightsWeightV2Weight | { refTime?: any; proofSize?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Call, SpWeightsWeightV2Weight]
      >;
    };
    vestedRewards: {
      claimCrowdloanRewards: AugmentedSubmittable<
        (crowdloan: Bytes | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [Bytes]
      >;
      claimFor: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          dest: AccountId32 | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, AccountId32]
      >;
      /**
       * Claim all available PSWAP rewards by account signing this transaction.
       **/
      claimRewards: AugmentedSubmittable<() => SubmittableExtrinsic<ApiType>, []>;
      claimUnlocked: AugmentedSubmittable<
        (assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32]
      >;
      registerCrowdloan: AugmentedSubmittable<
        (
          tag: Bytes | string | Uint8Array,
          startBlock: u32 | AnyNumber | Uint8Array,
          length: u32 | AnyNumber | Uint8Array,
          rewards:
            | Vec<ITuple<[CommonPrimitivesAssetId32, u128]>>
            | [CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array, u128 | AnyNumber | Uint8Array][],
          contributions:
            | Vec<ITuple<[AccountId32, u128]>>
            | [AccountId32 | string | Uint8Array, u128 | AnyNumber | Uint8Array][]
        ) => SubmittableExtrinsic<ApiType>,
        [Bytes, u32, u32, Vec<ITuple<[CommonPrimitivesAssetId32, u128]>>, Vec<ITuple<[AccountId32, u128]>>]
      >;
      unlockPendingScheduleByManager: AugmentedSubmittable<
        (
          dest: AccountId32 | string | Uint8Array,
          filterSchedule:
            | VestedRewardsVestingCurrenciesVestingScheduleVariant
            | { LinearVestingSchedule: any }
            | { LinearPendingVestingSchedule: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, VestedRewardsVestingCurrenciesVestingScheduleVariant]
      >;
      updateRewards: AugmentedSubmittable<
        (rewards: BTreeMap<AccountId32, BTreeMap<CommonPrimitivesRewardReason, u128>>) => SubmittableExtrinsic<ApiType>,
        [BTreeMap<AccountId32, BTreeMap<CommonPrimitivesRewardReason, u128>>]
      >;
      updateVestingSchedules: AugmentedSubmittable<
        (
          who: AccountId32 | string | Uint8Array,
          vestingSchedules:
            | Vec<VestedRewardsVestingCurrenciesVestingScheduleVariant>
            | (
                | VestedRewardsVestingCurrenciesVestingScheduleVariant
                | { LinearVestingSchedule: any }
                | { LinearPendingVestingSchedule: any }
                | string
                | Uint8Array
              )[]
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, Vec<VestedRewardsVestingCurrenciesVestingScheduleVariant>]
      >;
      vestedTransfer: AugmentedSubmittable<
        (
          dest: AccountId32 | string | Uint8Array,
          schedule:
            | VestedRewardsVestingCurrenciesVestingScheduleVariant
            | { LinearVestingSchedule: any }
            | { LinearPendingVestingSchedule: any }
            | string
            | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [AccountId32, VestedRewardsVestingCurrenciesVestingScheduleVariant]
      >;
    };
    xorFee: {
      addAssetToWhiteList: AugmentedSubmittable<
        (assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32]
      >;
      removeAssetFromWhiteList: AugmentedSubmittable<
        (assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Scale the multiplier for weight -> fee conversion.
       * multiplier = multiplier * factor
       **/
      scaleMultiplier: AugmentedSubmittable<
        (factor: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
      /**
       * Set new update period for `xor_fee::Multiplier` updating
       * Set 0 to stop updating
       **/
      setFeeUpdatePeriod: AugmentedSubmittable<
        (newPeriod: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u32]
      >;
      setRandomRemintPeriod: AugmentedSubmittable<
        (period: u32 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u32]
      >;
      /**
       * Set new small reference amount `xor_fee::SmallReferenceAmount`
       * Small fee should tend to the amount value
       **/
      setSmallReferenceAmount: AugmentedSubmittable<
        (newReferenceAmount: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
      /**
       * Update the multiplier for weight -> fee conversion.
       **/
      updateMultiplier: AugmentedSubmittable<
        (newMultiplier: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
      /**
       * Allow use assets from white list to pay for fee
       * # Parameters:
       * - `origin`: caller
       * - `call`: dispatch call for which pay fee
       * - `asset_id`: asset in which pay fee, where None - XOR
       **/
      xorlessCall: AugmentedSubmittable<
        (
          call: Call | IMethod | string | Uint8Array,
          assetId:
            | Option<CommonPrimitivesAssetId32>
            | null
            | Uint8Array
            | CommonPrimitivesAssetId32
            | { code?: any }
            | string
        ) => SubmittableExtrinsic<ApiType>,
        [Call, Option<CommonPrimitivesAssetId32>]
      >;
    };
    xstPool: {
      /**
       * Disable synthetic asset.
       *
       * Removes synthetic from exchanging
       * and removes XSTPool liquidity source for corresponding trading pair.
       *
       * - `origin`: the sudo account on whose behalf the transaction is being executed,
       * - `synthetic_asset`: synthetic asset id to disable.
       **/
      disableSyntheticAsset: AugmentedSubmittable<
        (
          syntheticAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32]
      >;
      enableSyntheticAsset: AugmentedSubmittable<
        (
          assetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          referenceSymbol: Bytes | string | Uint8Array,
          feeRatio: FixnumFixedPoint | { inner?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, Bytes, FixnumFixedPoint]
      >;
      /**
       * Register and enable new synthetic asset with `reference_symbol` price binding
       **/
      registerSyntheticAsset: AugmentedSubmittable<
        (
          assetSymbol: Bytes | string | Uint8Array,
          assetName: Bytes | string | Uint8Array,
          referenceSymbol: Bytes | string | Uint8Array,
          feeRatio: FixnumFixedPoint | { inner?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [Bytes, Bytes, Bytes, FixnumFixedPoint]
      >;
      /**
       * Entirely remove synthetic asset (including linked symbol info)
       **/
      removeSyntheticAsset: AugmentedSubmittable<
        (
          syntheticAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Change reference asset which is used to determine collateral assets value.
       * Intended to be e.g., stablecoin DAI.
       *
       * - `origin`: the sudo account on whose behalf the transaction is being executed,
       * - `reference_asset_id`: asset id of the new reference asset.
       **/
      setReferenceAsset: AugmentedSubmittable<
        (
          referenceAssetId: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32]
      >;
      /**
       * Set synthetic asset fee.
       *
       * This fee will be used to determine the amount of synthetic base asset (e.g. XST) to be
       * burned when user buys synthetic asset.
       *
       * - `origin`: the sudo account on whose behalf the transaction is being executed,
       * - `synthetic_asset`: synthetic asset id to set fee for,
       * - `fee_ratio`: fee ratio with precision = 18, so 1000000000000000000 = 1 = 100% fee.
       **/
      setSyntheticAssetFee: AugmentedSubmittable<
        (
          syntheticAsset: CommonPrimitivesAssetId32 | { code?: any } | string | Uint8Array,
          feeRatio: FixnumFixedPoint | { inner?: any } | string | Uint8Array
        ) => SubmittableExtrinsic<ApiType>,
        [CommonPrimitivesAssetId32, FixnumFixedPoint]
      >;
      /**
       * Set floor price for the synthetic base asset
       *
       * - `origin`: root account
       * - `floor_price`: floor price for the synthetic base asset
       **/
      setSyntheticBaseAssetFloorPrice: AugmentedSubmittable<
        (floorPrice: u128 | AnyNumber | Uint8Array) => SubmittableExtrinsic<ApiType>,
        [u128]
      >;
    };
  } // AugmentedSubmittables
} // declare module
