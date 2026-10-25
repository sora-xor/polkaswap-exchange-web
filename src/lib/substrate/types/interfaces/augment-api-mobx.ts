// Auto-generated via `yarn polkadot-types-from-chain`, do not edit

import type { BTreeSet, Bytes, Data, Option, Text, U8aFixed, Vec, bool, u32, u64, u8 } from '@polkadot/types';
import type { AnyNumber, ITuple } from '@polkadot/types/types';
import type { UncleEntryItem } from '@polkadot/types/interfaces/authorship';
import type {
  BabeAuthorityWeight,
  MaybeRandomness,
  NextConfigDescriptor,
  Randomness,
} from '@polkadot/types/interfaces/babe';
import type { AccountData, BalanceLock } from '@polkadot/types/interfaces/balances';
import type { Votes } from '@polkadot/types/interfaces/collective';
import type { AuthorityId } from '@polkadot/types/interfaces/consensus';
import type {
  PreimageStatus,
  PropIndex,
  Proposal,
  ReferendumIndex,
  ReferendumInfo,
  Voting,
} from '@polkadot/types/interfaces/democracy';
import type { VoteThreshold } from '@polkadot/types/interfaces/elections';
import type { SetId, StoredPendingChange, StoredState } from '@polkadot/types/interfaces/grandpa';
import type { RegistrarInfo, Registration } from '@polkadot/types/interfaces/identity';
import type { AuthIndex } from '@polkadot/types/interfaces/imOnline';
import type {
  DeferredOffenceOf,
  Kind,
  OffenceDetails,
  OpaqueTimeSlot,
  ReportIdOf,
} from '@polkadot/types/interfaces/offences';
import type { Scheduled, TaskAddress } from '@polkadot/types/interfaces/scheduler';
import type { Keys, SessionIndex } from '@polkadot/types/interfaces/session';
import type {
  ActiveEraInfo,
  ElectionResult,
  ElectionScore,
  ElectionStatus,
  EraIndex,
  EraRewardPoints,
  Exposure,
  Forcing,
  Nominations,
  RewardDestination,
  SeatHolder,
  SlashingSpans,
  SpanIndex,
  SpanRecord,
  StakingLedger,
  UnappliedSlash,
  ValidatorPrefs,
  Voter,
} from '@polkadot/types/interfaces/staking';
import type {
  AccountInfo,
  ConsumedWeight,
  DigestOf,
  EventIndex,
  EventRecord,
  LastRuntimeUpgradeInfo,
  Phase,
} from '@polkadot/types/interfaces/system';
import type { Multiplier } from '@polkadot/types/interfaces/txpayment';
import type { Multisig } from '@polkadot/types/interfaces/utility';
import type { AssetRecord } from '@sora-substrate/types/interfaces/assets';
import type { PollInfo, VotingInfo } from '@sora-substrate/types/interfaces/ceresGovernancePlatform';
import type { ContributionInfo, ILOInfo } from '@sora-substrate/types/interfaces/ceresLaunchpad';
import type { LockInfo } from '@sora-substrate/types/interfaces/ceresLiquidityLocker';
import type { StakingInfo } from '@sora-substrate/types/interfaces/ceresStaking';
import type { TokenLockInfo } from '@sora-substrate/types/interfaces/ceresTokenLocker';
import type { PoolData, TokenInfo, UserInfo } from '@sora-substrate/types/interfaces/demeterFarmingPlatform';
import type {
  AssetKind,
  BridgeNetworkId,
  BridgeSignatureVersion,
  BridgeStatus,
  BridgeTimepoint,
  EthAddress,
  EthPeersSync,
  OffchainRequest,
  RequestStatus,
  SignatureParams,
} from '@sora-substrate/types/interfaces/ethBridge';
import type { PoolFarmer } from '@sora-substrate/types/interfaces/farming';
import type { PendingMultisigAccount } from '@sora-substrate/types/interfaces/irohaMigration';
import type {
  AccountId,
  AccountIdOf,
  AssetId,
  AssetIdOf,
  AssetName,
  AssetSymbol,
  Balance,
  BalanceOf,
  BalancePrecision,
  BlockNumber,
  ContentSource,
  CrowdloanReward,
  CurrencyId,
  DEXId,
  DEXInfo,
  Description,
  DistributionAccounts,
  Duration,
  Fixed,
  FixedU128,
  H256,
  Hash,
  HolderId,
  KeyTypeId,
  LiquiditySourceType,
  MarketMakerInfo,
  Moment,
  MultiCurrencyBalanceOf,
  MultisigAccount,
  OpaqueCall,
  OwnerId,
  Perbill,
  PermissionId,
  PriceInfo,
  Releases,
  RewardInfo,
  Scope,
  Slot,
  StorageVersion,
  TechAccountId,
  TradingPair,
  ValidatorId,
} from '@sora-substrate/types/interfaces/runtime';
import type { BaseStorageType, StorageDoubleMap, StorageMap } from '@open-web3/api-mobx';

export interface StorageType extends BaseStorageType {
  assets: {
    /**
     * Asset Id -> (Symbol, Name, Precision, Is Mintable, Content Source, Description)
     **/
    assetInfos: StorageMap<
      AssetId | AnyNumber,
      ITuple<[AssetSymbol, AssetName, BalancePrecision, bool, Option<ContentSource>, Option<Description>]>
    >;
    /**
     * Asset Id -> Owner Account Id
     **/
    assetOwners: StorageMap<AssetId | AnyNumber, Option<AccountId>>;
    /**
     * Asset Id -> AssetRecord<T>
     **/
    assetRecordAssetId: StorageMap<AssetId | AnyNumber, Option<AssetRecord>>;
  };
  authorship: {
    /**
     * Author of current block.
     **/
    author: Option<AccountId> | null;
    /**
     * Whether uncles were already set in this block.
     **/
    didSetUncles: bool | null;
    /**
     * Uncles
     **/
    uncles: Vec<UncleEntryItem> | null;
  };
  babe: {
    /**
     * Current epoch authorities.
     **/
    authorities: Vec<ITuple<[AuthorityId, BabeAuthorityWeight]>> | null;
    /**
     * Temporary value (cleared at block finalization) that includes the VRF output generated
     * at this block. This field should always be populated during block processing unless
     * secondary plain slots are enabled (which don't contain a VRF output).
     **/
    authorVrfRandomness: MaybeRandomness | null;
    /**
     * Current slot number.
     **/
    currentSlot: Slot | null;
    /**
     * Current epoch index.
     **/
    epochIndex: u64 | null;
    /**
     * The slot at which the first epoch actually started. This is 0
     * until the first block of the chain.
     **/
    genesisSlot: Slot | null;
    /**
     * Temporary value (cleared at block finalization) which is `Some`
     * if per-block initialization has already been called for current block.
     **/
    initialized: Option<MaybeRandomness> | null;
    /**
     * How late the current block is compared to its parent.
     *
     * This entry is populated as part of block execution and is cleaned up
     * on block finalization. Querying this storage entry outside of block
     * execution context should always yield zero.
     **/
    lateness: BlockNumber | null;
    /**
     * Next epoch authorities.
     **/
    nextAuthorities: Vec<ITuple<[AuthorityId, BabeAuthorityWeight]>> | null;
    /**
     * Next epoch configuration, if changed.
     **/
    nextEpochConfig: Option<NextConfigDescriptor> | null;
    /**
     * Next epoch randomness.
     **/
    nextRandomness: Randomness | null;
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
    randomness: Randomness | null;
    /**
     * Randomness under construction.
     *
     * We make a tradeoff between storage accesses and list length.
     * We store the under-construction randomness in segments of up to
     * `UNDER_CONSTRUCTION_SEGMENT_LENGTH`.
     *
     * Once a segment reaches this length, we begin the next one.
     * We reset all segments and return to `0` at the beginning of every
     * epoch.
     **/
    segmentIndex: u32 | null;
    /**
     * TWOX-NOTE: `SegmentIndex` is an increasing integer, so this is okay.
     **/
    underConstruction: StorageMap<u32 | AnyNumber, Vec<Randomness>>;
  };
  balances: {
    /**
     * The balance of an account.
     *
     * NOTE: This is only used in the case that this pallet is used to store balances.
     **/
    account: StorageMap<AccountId | string, AccountData>;
    /**
     * Any liquidity locks on some account balances.
     * NOTE: Should only be accessed when setting, changing and freeing a lock.
     **/
    locks: StorageMap<AccountId | string, Vec<BalanceLock>>;
    /**
     * Storage version of the pallet.
     *
     * This is set to v2.0.0 for new networks.
     **/
    storageVersion: Releases | null;
    /**
     * The total units issued in the system.
     **/
    totalIssuance: Balance | null;
  };
  bridgeMultisig: {
    /**
     * Multisignature accounts.
     **/
    accounts: StorageMap<AccountId | string, Option<MultisigAccount>>;
    calls: StorageMap<U8aFixed | string, Option<ITuple<[OpaqueCall, AccountId, BalanceOf]>>>;
    dispatchedCalls: StorageDoubleMap<
      U8aFixed | string,
      BridgeTimepoint | { height?: any; index?: any } | string,
      ITuple<[]>
    >;
    /**
     * The set of open multisig operations.
     **/
    multisigs: StorageDoubleMap<AccountId | string, U8aFixed | string, Option<Multisig>>;
  };
  ceresGovernancePlatform: {
    /**
     * Pallet storage version
     **/
    palletStorageVersion: StorageVersion | null;
    pollData: StorageMap<Bytes | string, PollInfo>;
    /**
     * A vote of a particular user for a particular poll
     **/
    voting: StorageDoubleMap<Bytes | string, AccountIdOf | string, VotingInfo>;
  };
  ceresLaunchpad: {
    /**
     * Account which has permissions for changing CERES burn amount fee
     **/
    authorityAccount: AccountIdOf | null;
    /**
     * Amount of CERES for burn fee
     **/
    ceresBurnFeeAmount: Balance | null;
    /**
     * Amount of CERES for contribution in ILO
     **/
    ceresForContributionInIlo: Balance | null;
    contributions: StorageDoubleMap<AssetIdOf | AnyNumber, AccountIdOf | string, ContributionInfo>;
    ilOs: StorageMap<AssetIdOf | AnyNumber, ILOInfo>;
    /**
     * Account for collecting penalties
     **/
    penaltiesAccount: AccountIdOf | null;
    whitelistedContributors: Vec<AccountIdOf> | null;
    whitelistedIloOrganizers: Vec<AccountIdOf> | null;
  };
  ceresLiquidityLocker: {
    /**
     * Account which has permissions for changing CERES amount fee
     **/
    authorityAccount: AccountIdOf | null;
    /**
     * Account for collecting fees from Option 1
     **/
    feesOptionOneAccount: AccountIdOf | null;
    /**
     * Account for collecting fees from Option 2
     **/
    feesOptionTwoAccount: AccountIdOf | null;
    /**
     * Amount of CERES for locker fees option two
     **/
    feesOptionTwoCeresAmount: Balance | null;
    /**
     * Contains data about lockups for each account
     **/
    lockerData: StorageMap<AccountIdOf | string, Vec<LockInfo>>;
    /**
     * Pallet storage version
     **/
    palletStorageVersion: StorageVersion | null;
  };
  ceresStaking: {
    /**
     * Account which has permissions for changing remaining rewards
     **/
    authorityAccount: AccountIdOf | null;
    rewardsRemaining: Balance | null;
    /**
     * AccountId -> StakingInfo
     **/
    stakers: StorageMap<AccountIdOf | string, StakingInfo>;
    totalDeposited: Balance | null;
  };
  ceresTokenLocker: {
    /**
     * Account which has permissions for changing fee
     **/
    authorityAccount: AccountIdOf | null;
    /**
     * Amount of CERES for locker fees option two
     **/
    feeAmount: Balance | null;
    /**
     * Account for collecting fees
     **/
    feesAccount: AccountIdOf | null;
    /**
     * Pallet storage version
     **/
    palletStorageVersion: StorageVersion | null;
    tokenLockerData: StorageMap<AccountIdOf | string, Vec<TokenLockInfo>>;
  };
  council: {
    /**
     * The current members of the collective. This is stored sorted (just by value).
     **/
    members: Vec<AccountId> | null;
    /**
     * The prime member that helps determine the default vote behavior in case of absentations.
     **/
    prime: Option<AccountId> | null;
    /**
     * Proposals so far.
     **/
    proposalCount: u32 | null;
    /**
     * Actual proposal for a given hash, if it's current.
     **/
    proposalOf: StorageMap<Hash | string, Option<Proposal>>;
    /**
     * The hashes of the active proposals.
     **/
    proposals: Vec<Hash> | null;
    /**
     * Votes on a given proposal, if it is ongoing.
     **/
    voting: StorageMap<Hash | string, Option<Votes>>;
  };
  demeterFarmingPlatform: {
    authorityAccount: AccountIdOf | null;
    /**
     * Account for fees
     **/
    feeAccount: AccountIdOf | null;
    pools: StorageDoubleMap<AssetIdOf | AnyNumber, AssetIdOf | AnyNumber, Vec<PoolData>>;
    tokenInfos: StorageMap<AssetIdOf | AnyNumber, Option<TokenInfo>>;
    userInfos: StorageMap<AccountIdOf | string, Vec<UserInfo>>;
  };
  democracy: {
    /**
     * A record of who vetoed what. Maps proposal hash to a possible existent block number
     * (until when it may not be resubmitted) and who vetoed it.
     **/
    blacklist: StorageMap<Hash | string, Option<ITuple<[BlockNumber, Vec<AccountId>]>>>;
    /**
     * Record of all proposals that have been subject to emergency cancellation.
     **/
    cancellations: StorageMap<Hash | string, bool>;
    /**
     * Those who have locked a deposit.
     *
     * TWOX-NOTE: Safe, as increasing integer keys are safe.
     **/
    depositOf: StorageMap<PropIndex | AnyNumber, Option<ITuple<[Vec<AccountId>, BalanceOf]>>>;
    /**
     * True if the last referendum tabled was submitted externally. False if it was a public
     * proposal.
     **/
    lastTabledWasExternal: bool | null;
    /**
     * Accounts for which there are locks in action which may be removed at some point in the
     * future. The value is the block number at which the lock expires and may be removed.
     *
     * TWOX-NOTE: OK ― `AccountId` is a secure hash.
     **/
    locks: StorageMap<AccountId | string, Option<BlockNumber>>;
    /**
     * The lowest referendum index representing an unbaked referendum. Equal to
     * `ReferendumCount` if there isn't a unbaked referendum.
     **/
    lowestUnbaked: ReferendumIndex | null;
    /**
     * The referendum to be tabled whenever it would be valid to table an external proposal.
     * This happens when a referendum needs to be tabled and one of two conditions are met:
     * - `LastTabledWasExternal` is `false`; or
     * - `PublicProps` is empty.
     **/
    nextExternal: Option<ITuple<[Hash, VoteThreshold]>> | null;
    /**
     * Map of hashes to the proposal preimage, along with who registered it and their deposit.
     * The block number is the block at which it was deposited.
     **/
    preimages: StorageMap<Hash | string, Option<PreimageStatus>>;
    /**
     * The number of (public) proposals that have been made so far.
     **/
    publicPropCount: PropIndex | null;
    /**
     * The public proposals. Unsorted. The second item is the proposal's hash.
     **/
    publicProps: Vec<ITuple<[PropIndex, Hash, AccountId]>> | null;
    /**
     * The next free referendum index, aka the number of referenda started so far.
     **/
    referendumCount: ReferendumIndex | null;
    /**
     * Information concerning any given referendum.
     *
     * TWOX-NOTE: SAFE as indexes are not under an attacker’s control.
     **/
    referendumInfoOf: StorageMap<ReferendumIndex | AnyNumber, Option<ReferendumInfo>>;
    /**
     * Storage version of the pallet.
     *
     * New networks start with last version.
     **/
    storageVersion: Option<Releases> | null;
    /**
     * All votes for a particular voter. We store the balance for the number of votes that we
     * have recorded. The second item is the total amount of delegations, that will be added.
     *
     * TWOX-NOTE: SAFE as `AccountId`s are crypto hashes anyway.
     **/
    votingOf: StorageMap<AccountId | string, Voting>;
  };
  dexapi: { enabledSourceTypes: Vec<LiquiditySourceType> | null };
  dexManager: { dexInfos: StorageMap<DEXId | AnyNumber, Option<DEXInfo>> };
  electionsPhragmen: {
    /**
     * The present candidate list. A current member or runner-up can never enter this vector
     * and is always implicitly assumed to be a candidate.
     *
     * Second element is the deposit.
     *
     * Invariant: Always sorted based on account id.
     **/
    candidates: Vec<ITuple<[AccountId, BalanceOf]>> | null;
    /**
     * The total number of vote rounds that have happened, excluding the upcoming one.
     **/
    electionRounds: u32 | null;
    /**
     * The current elected members.
     *
     * Invariant: Always sorted based on account id.
     **/
    members: Vec<SeatHolder> | null;
    /**
     * The current reserved runners-up.
     *
     * Invariant: Always sorted based on rank (worse to best). Upon removal of a member, the
     * last (i.e. _best_) runner-up will be replaced.
     **/
    runnersUp: Vec<SeatHolder> | null;
    /**
     * Votes and locked stake of a particular voter.
     *
     * TWOX-NOTE: SAFE as `AccountId` is a crypto hash.
     **/
    voting: StorageMap<AccountId | string, Voter>;
  };
  ethBridge: {
    /**
     * Requests made by an account.
     **/
    accountRequests: StorageMap<AccountId | string, Vec<ITuple<[BridgeNetworkId, H256]>>>;
    /**
     * Thischain authority account.
     **/
    authorityAccount: AccountId | null;
    /**
     * Multi-signature bridge peers' account. `None` if there is no account and network with the given ID.
     **/
    bridgeAccount: StorageMap<BridgeNetworkId | AnyNumber, Option<AccountId>>;
    /**
     * Smart-contract address on Sidechain.
     **/
    bridgeContractAddress: StorageMap<BridgeNetworkId | AnyNumber, EthAddress>;
    bridgeSignatureVersions: StorageMap<BridgeNetworkId | AnyNumber, BridgeSignatureVersion>;
    /**
     * Bridge status.
     **/
    bridgeStatuses: StorageMap<BridgeNetworkId | AnyNumber, Option<BridgeStatus>>;
    /**
     * Used to identify an incoming request by the corresponding load request.
     **/
    loadToIncomingRequestHash: StorageDoubleMap<BridgeNetworkId | AnyNumber, H256 | string, H256>;
    /**
     * Requests migrating from version '0.1.0' to '0.2.0'. These requests should be removed from
     * `RequestsQueue` before migration procedure started.
     **/
    migratingRequests: Vec<H256> | null;
    /**
     * Next Network ID counter.
     **/
    nextNetworkId: BridgeNetworkId | null;
    /**
     * Peer account ID on Thischain.
     **/
    peerAccountId: StorageDoubleMap<BridgeNetworkId | AnyNumber, EthAddress | string, AccountId>;
    /**
     * Peer address on Sidechain.
     **/
    peerAddress: StorageDoubleMap<BridgeNetworkId | AnyNumber, AccountId | string, EthAddress>;
    /**
     * Network peers set.
     **/
    peers: StorageMap<BridgeNetworkId | AnyNumber, BTreeSet<AccountId>>;
    pendingBridgeSignatureVersions: StorageMap<BridgeNetworkId | AnyNumber, Option<BridgeSignatureVersion>>;
    /**
     * Used for compatibility with XOR and VAL contracts.
     **/
    pendingEthPeersSync: EthPeersSync | null;
    /**
     * Network pending (being added/removed) peer.
     **/
    pendingPeer: StorageMap<BridgeNetworkId | AnyNumber, Option<AccountId>>;
    /**
     * Registered asset kind.
     **/
    registeredAsset: StorageDoubleMap<BridgeNetworkId | AnyNumber, AssetId | AnyNumber, Option<AssetKind>>;
    /**
     * Registered token `AssetId` on Thischain.
     **/
    registeredSidechainAsset: StorageDoubleMap<BridgeNetworkId | AnyNumber, EthAddress | string, Option<AssetId>>;
    /**
     * Registered asset address on Sidechain.
     **/
    registeredSidechainToken: StorageDoubleMap<BridgeNetworkId | AnyNumber, AssetId | AnyNumber, Option<EthAddress>>;
    /**
     * Outgoing requests approvals.
     **/
    requestApprovals: StorageDoubleMap<BridgeNetworkId | AnyNumber, H256 | string, BTreeSet<SignatureParams>>;
    /**
     * Registered requests.
     **/
    requests: StorageDoubleMap<BridgeNetworkId | AnyNumber, H256 | string, Option<OffchainRequest>>;
    /**
     * Registered requests queue handled by off-chain workers.
     **/
    requestsQueue: StorageMap<BridgeNetworkId | AnyNumber, Vec<H256>>;
    /**
     * Requests statuses.
     **/
    requestStatuses: StorageDoubleMap<BridgeNetworkId | AnyNumber, H256 | string, Option<RequestStatus>>;
    /**
     * Requests submission height map (on substrate).
     **/
    requestSubmissionHeight: StorageDoubleMap<BridgeNetworkId | AnyNumber, H256 | string, BlockNumber>;
    /**
     * Precision (decimals) of a registered sidechain asset. Should be the same as in the ERC-20
     * contract.
     **/
    sidechainAssetPrecision: StorageDoubleMap<BridgeNetworkId | AnyNumber, AssetId | AnyNumber, BalancePrecision>;
    /**
     * Sora VAL master contract address.
     **/
    valMasterContractAddress: EthAddress | null;
    /**
     * Sora XOR master contract address.
     **/
    xorMasterContractAddress: EthAddress | null;
  };
  farming: {
    /**
     * Farmers of the pool. Pool => Farmers
     **/
    poolFarmers: StorageMap<AccountId | string, Vec<PoolFarmer>>;
    /**
     * Pools whose farmers are refreshed at the specific block. Block => Pools
     **/
    pools: StorageMap<BlockNumber | AnyNumber, Vec<AccountId>>;
  };
  grandpa: {
    /**
     * The number of changes (both in terms of keys and underlying economic responsibilities)
     * in the "set" of Grandpa validators from genesis.
     **/
    currentSetId: SetId | null;
    /**
     * next block number where we can force a change.
     **/
    nextForced: Option<BlockNumber> | null;
    /**
     * Pending change: (signaled at, scheduled change).
     **/
    pendingChange: Option<StoredPendingChange> | null;
    /**
     * A mapping from grandpa set ID to the index of the *most recent* session for which its
     * members were responsible.
     *
     * TWOX-NOTE: `SetId` is not under user control.
     **/
    setIdSession: StorageMap<SetId | AnyNumber, Option<SessionIndex>>;
    /**
     * `true` if we are currently stalled.
     **/
    stalled: Option<ITuple<[BlockNumber, BlockNumber]>> | null;
    /**
     * State of the current authority set.
     **/
    state: StoredState | null;
  };
  identity: {
    /**
     * Information that is pertinent to identify the entity behind an account.
     *
     * TWOX-NOTE: OK ― `AccountId` is a secure hash.
     **/
    identityOf: StorageMap<AccountId | string, Option<Registration>>;
    /**
     * The set of registrars. Not expected to get very big as can only be added through a
     * special origin (likely a council motion).
     *
     * The index into this can be cast to `RegistrarIndex` to get a valid value.
     **/
    registrars: Vec<Option<RegistrarInfo>> | null;
    /**
     * Alternative "sub" identities of this account.
     *
     * The first item is the deposit, the second is a vector of the accounts.
     *
     * TWOX-NOTE: OK ― `AccountId` is a secure hash.
     **/
    subsOf: StorageMap<AccountId | string, ITuple<[BalanceOf, Vec<AccountId>]>>;
    /**
     * The super-identity of an alternative "sub" identity together with its name, within that
     * context. If the account is not some other account's sub-identity, then just `None`.
     **/
    superOf: StorageMap<AccountId | string, Option<ITuple<[AccountId, Data]>>>;
  };
  imOnline: {
    /**
     * For each session index, we keep a mapping of `ValidatorId<T>` to the
     * number of blocks authored by the given authority.
     **/
    authoredBlocks: StorageDoubleMap<SessionIndex | AnyNumber, ValidatorId | string, u32>;
    /**
     * The block number after which it's ok to send heartbeats in current session.
     *
     * At the beginning of each session we set this to a value that should
     * fall roughly in the middle of the session duration.
     * The idea is to first wait for the validators to produce a block
     * in the current session, so that the heartbeat later on will not be necessary.
     **/
    heartbeatAfter: BlockNumber | null;
    /**
     * The current set of keys that may issue a heartbeat.
     **/
    keys: Vec<AuthorityId> | null;
    /**
     * For each session index, we keep a mapping of `AuthIndex` to
     * `offchain::OpaqueNetworkState`.
     **/
    receivedHeartbeats: StorageDoubleMap<SessionIndex | AnyNumber, AuthIndex | AnyNumber, Option<Bytes>>;
  };
  irohaMigration: {
    account: AccountId | null;
    balances: StorageMap<Text | string, Option<Balance>>;
    migratedAccounts: StorageMap<Text | string, Option<AccountId>>;
    pendingMultiSigAccounts: StorageMap<Text | string, PendingMultisigAccount>;
    pendingReferrals: StorageMap<Text | string, Vec<AccountId>>;
    publicKeys: StorageMap<Text | string, Vec<ITuple<[bool, Text]>>>;
    quorums: StorageMap<Text | string, u8>;
    referrers: StorageMap<Text | string, Option<Text>>;
  };
  multicollateralBondingCurvePool: {
    /**
     * Coefficient which determines the fraction of input collateral token to be exchanged to XOR and
     * be distributed to predefined accounts. Relevant for the Buy function (when a user buys new XOR).
     **/
    alwaysDistributeCoefficient: Fixed | null;
    /**
     * Reward multipliers for special assets. Asset Id => Reward Multiplier
     **/
    assetsWithOptionalRewardMultiplier: StorageMap<AssetId | AnyNumber, Option<Fixed>>;
    /**
     * Base fee in XOR which is deducted on all trades, currently it's burned: 0.3%.
     **/
    baseFee: Fixed | null;
    /**
     * Current reserves balance for collateral tokens, used for client usability.
     **/
    collateralReserves: StorageMap<AssetId | AnyNumber, Balance>;
    /**
     * Accounts that receive 20% buy/sell margin according predefined proportions.
     **/
    distributionAccountsEntry: DistributionAccounts | null;
    /**
     * Collateral Assets allowed to be sold on bonding curve.
     **/
    enabledTargets: BTreeSet<AssetId> | null;
    freeReservesAccountId: AccountId | null;
    /**
     * Account which stores actual PSWAP intended for rewards.
     **/
    incentivesAccountId: AccountId | null;
    /**
     * Number of reserve currencies selling which user will get rewards, namely all registered collaterals except PSWAP and VAL.
     **/
    incentivisedCurrenciesNum: u32 | null;
    /**
     * Buy price starting constant. This is the price users pay for new XOR.
     **/
    initialPrice: Fixed | null;
    /**
     * Amount of PSWAP initially stored in account dedicated for TBC rewards. Actual account balance will deplete over time,
     * however this constant is not modified.
     **/
    initialPswapRewardsSupply: Balance | null;
    pendingFreeReserves: Vec<ITuple<[AssetId, Balance]>> | null;
    priceChangeRate: Fixed | null;
    /**
     * Cofficients in buy price function.
     **/
    priceChangeStep: Fixed | null;
    /**
     * Asset that is used to compare collateral assets by value, e.g., DAI.
     **/
    referenceAssetId: AssetId | null;
    /**
     * Technical account used to store collateral tokens.
     **/
    reservesAcc: TechAccountId | null;
    /**
     * Registry to store information about rewards owned by users in PSWAP. (claim_limit, available_rewards)
     **/
    rewards: StorageMap<AccountId | string, ITuple<[Balance, Balance]>>;
    /**
     * Sets the sell function as a fraction of the buy function, so there is margin between the two functions.
     **/
    sellPriceCoefficient: Fixed | null;
    /**
     * Total amount of PSWAP owned by accounts.
     **/
    totalRewards: Balance | null;
  };
  multisig: {
    calls: StorageMap<U8aFixed | string, Option<ITuple<[OpaqueCall, AccountId, BalanceOf]>>>;
    /**
     * The set of open multisig operations.
     **/
    multisigs: StorageDoubleMap<AccountId | string, U8aFixed | string, Option<Multisig>>;
  };
  offences: {
    /**
     * A vector of reports of the same kind that happened at the same time slot.
     **/
    concurrentReportsIndex: StorageDoubleMap<Kind | string, OpaqueTimeSlot | string, Vec<ReportIdOf>>;
    /**
     * Deferred reports that have been rejected by the offence handler and need to be submitted
     * at a later time.
     **/
    deferredOffences: Vec<DeferredOffenceOf> | null;
    /**
     * The primary structure that holds all offence records keyed by report identifiers.
     **/
    reports: StorageMap<ReportIdOf | string, Option<OffenceDetails>>;
    /**
     * Enumerates all reports of a kind along with the time they happened.
     *
     * All reports are sorted by the time of offence.
     *
     * Note that the actual type of this mapping is `Vec<u8>`, this is because values of
     * different types are not supported at the moment so we are doing the manual serialization.
     **/
    reportsByKindIndex: StorageMap<Kind | string, Bytes>;
  };
  permissions: {
    owners: StorageDoubleMap<
      PermissionId | AnyNumber,
      Scope | { Limited: any } | { Unlimited: any } | string,
      Vec<OwnerId>
    >;
    permissions: StorageDoubleMap<
      HolderId | string,
      Scope | { Limited: any } | { Unlimited: any } | string,
      Vec<PermissionId>
    >;
  };
  poolXyk: {
    /**
     * Set of pools in which accounts have some share.
     * Liquidity provider account => Target Asset of pair (assuming base asset is XOR)
     **/
    accountPools: StorageMap<AccountIdOf | string, BTreeSet<AssetIdOf>>;
    /**
     * Liquidity providers of particular pool.
     * Pool account => Liquidity provider account => Pool token balance
     **/
    poolProviders: StorageDoubleMap<AccountIdOf | string, AccountIdOf | string, Option<Balance>>;
    /**
     * Properties of particular pool. Base Asset => Target Asset => (Reserves Account Id, Fees Account Id)
     **/
    properties: StorageDoubleMap<AssetId | AnyNumber, AssetId | AnyNumber, Option<ITuple<[AccountId, AccountId]>>>;
    /**
     * Updated after last liquidity change operation.
     * [Base Asset Id (XOR) -> Target Asset Id => (Base Balance, Target Balance)].
     * This storage records is not used as source of information, but used as quick cache for
     * information that comes from balances for assets from technical accounts.
     * For example, communication with technical accounts and their storage is not needed, and this
     * pair to balance cache can be used quickly.
     **/
    reserves: StorageDoubleMap<AssetId | AnyNumber, AssetId | AnyNumber, ITuple<[Balance, Balance]>>;
    /**
     * Total issuance of particular pool.
     * Pool account => Total issuance
     **/
    totalIssuances: StorageMap<AccountIdOf | string, Option<Balance>>;
  };
  priceTools: { priceInfos: StorageMap<AssetId | AnyNumber, Option<PriceInfo>> };
  pswapDistribution: {
    /**
     * Amount of incentive tokens to be burned on each distribution.
     **/
    burnRate: Fixed | null;
    /**
     * (Burn Rate Increase Delta, Burn Rate Max)
     **/
    burnUpdateInfo: ITuple<[Fixed, Fixed]> | null;
    /**
     * Sum of all shares of incentive token owners.
     **/
    claimableShares: Fixed | null;
    /**
     * Fraction of PSWAP that could be reminted for parliament.
     **/
    parliamentPswapFraction: Fixed | null;
    /**
     * Information about owned portion of stored incentive tokens. Shareholder -> Owned Fraction
     **/
    shareholderAccounts: StorageMap<AccountId | string, Fixed>;
    /**
     * Store for information about accounts containing fees, that participate in incentive distribution mechanism.
     * Fees Account Id -> (DEX Id, Pool Marker Asset Id, Distribution Frequency, Block Offset) Frequency MUST be non-zero.
     **/
    subscribedAccounts: StorageMap<AccountId | string, Option<ITuple<[DEXId, AccountIdOf, BlockNumber, BlockNumber]>>>;
  };
  randomnessCollectiveFlip: {
    /**
     * Series of block headers from the last 81 blocks that acts as random seed material. This
     * is arranged as a ring buffer with `block_number % 81` being the index into the `Vec` of
     * the oldest hash.
     **/
    randomMaterial: Vec<Hash> | null;
  };
  referrals: {
    referrals: StorageMap<AccountId | string, Vec<AccountId>>;
    referrerBalances: StorageMap<AccountId | string, Option<Balance>>;
    referrers: StorageMap<AccountId | string, Option<AccountId>>;
  };
  rewards: {
    /**
     * Amount of VAL currently being vested (aggregated over the previous period of 14,400 blocks)
     **/
    currentClaimableVal: Balance | null;
    /**
     * All addresses are split in batches, `AddressBatches` maps batch number to a set of addresses
     **/
    ethAddresses: StorageMap<u32 | AnyNumber, Vec<EthAddress>>;
    /**
     * A flag indicating whether VAL rewards data migration has been finalized
     **/
    migrationPending: bool | null;
    pswapFarmOwners: StorageMap<EthAddress | string, Balance>;
    pswapWaifuOwners: StorageMap<EthAddress | string, Balance>;
    reservesAcc: TechAccountId | null;
    /**
     * Total amount of VAL that can be claimed by users at current point in time
     **/
    totalClaimableVal: Balance | null;
    /**
     * Total amount of VAL rewards either claimable now or some time in the future
     **/
    totalValRewards: Balance | null;
    /**
     * Stores whether address already claimed UMI NFT rewards.
     **/
    umiNftClaimed: StorageMap<EthAddress | string, bool>;
    /**
     * UMI NFT receivers storage
     **/
    umiNftReceivers: StorageMap<EthAddress | string, Vec<Balance>>;
    /**
     * The storage of available UMI NFTs.
     **/
    umiNfts: Vec<AssetId> | null;
    /**
     * Amount of VAL burned since last vesting
     **/
    valBurnedSinceLastVesting: Balance | null;
    /**
     * A map EthAddresses -> RewardInfo, that is claimable and remaining vested amounts per address
     **/
    valOwners: StorageMap<EthAddress | string, RewardInfo>;
  };
  scheduler: {
    /**
     * Items to be executed, indexed by the block number that they should be executed on.
     **/
    agenda: StorageMap<BlockNumber | AnyNumber, Vec<Option<Scheduled>>>;
    /**
     * Lookup from identity to the block number and index of the task.
     **/
    lookup: StorageMap<Bytes | string, Option<TaskAddress>>;
    /**
     * Storage version of the pallet.
     *
     * New networks start with last version.
     **/
    storageVersion: Releases | null;
  };
  session: {
    /**
     * Current index of the session.
     **/
    currentIndex: SessionIndex | null;
    /**
     * Indices of disabled validators.
     *
     * The set is cleared when `on_session_ending` returns a new set of identities.
     **/
    disabledValidators: Vec<u32> | null;
    /**
     * The owner of a key. The key is the `KeyTypeId` + the encoded key.
     **/
    keyOwner: StorageMap<ITuple<[KeyTypeId, Bytes]> | [KeyTypeId | AnyNumber, Bytes | string], Option<ValidatorId>>;
    /**
     * The next session keys for a validator.
     **/
    nextKeys: StorageMap<ValidatorId | string, Option<Keys>>;
    /**
     * True if the underlying economic identities or weighting behind the validators
     * has changed in the queued validator set.
     **/
    queuedChanged: bool | null;
    /**
     * The queued keys for the next session. When the next session begins, these keys
     * will be used to determine the validator's session keys.
     **/
    queuedKeys: Vec<ITuple<[ValidatorId, Keys]>> | null;
    /**
     * The current set of validators.
     **/
    validators: Vec<ValidatorId> | null;
  };
  staking: {
    /**
     * The active era information, it holds index and start.
     *
     * The active era is the era being currently rewarded. Validator set of this era must be
     * equal to [`SessionInterface::validators`].
     **/
    activeEra: Option<ActiveEraInfo> | null;
    /**
     * Map from all locked "stash" accounts to the controller account.
     **/
    bonded: StorageMap<AccountId | string, Option<AccountId>>;
    /**
     * A mapping from still-bonded eras to the first session index of that era.
     *
     * Must contains information for eras for the range:
     * `[active_era - bounding_duration; active_era]`
     **/
    bondedEras: Vec<ITuple<[EraIndex, SessionIndex]>> | null;
    /**
     * The amount of currency given to reporters of a slash event which was
     * canceled by extraordinary circumstances (e.g. governance).
     **/
    canceledSlashPayout: BalanceOf | null;
    /**
     * The current era index.
     *
     * This is the latest planned era, depending on how the Session pallet queues the validator
     * set, it might be active or not.
     **/
    currentEra: Option<EraIndex> | null;
    /**
     * The earliest era for which we have a pending, unapplied slash.
     **/
    earliestUnappliedSlash: Option<EraIndex> | null;
    /**
     * Flag to control the execution of the offchain election. When `Open(_)`, we accept
     * solutions to be submitted.
     **/
    eraElectionStatus: ElectionStatus | null;
    /**
     * Rewards for the last `HISTORY_DEPTH` eras.
     * If reward hasn't been set or has been removed then 0 reward is returned.
     **/
    erasRewardPoints: StorageMap<EraIndex | AnyNumber, EraRewardPoints>;
    /**
     * Exposure of validator at era.
     *
     * This is keyed first by the era index to allow bulk deletion and then the stash account.
     *
     * Is it removed after `HISTORY_DEPTH` eras.
     * If stakers hasn't been set or has been removed then empty exposure is returned.
     **/
    erasStakers: StorageDoubleMap<EraIndex | AnyNumber, AccountId | string, Exposure>;
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
    erasStakersClipped: StorageDoubleMap<EraIndex | AnyNumber, AccountId | string, Exposure>;
    /**
     * The session index at which the era start for the last `HISTORY_DEPTH` eras.
     *
     * Note: This tracks the starting session (i.e. session index when era start being active)
     * for the eras in `[CurrentEra - HISTORY_DEPTH, CurrentEra]`.
     **/
    erasStartSessionIndex: StorageMap<EraIndex | AnyNumber, Option<SessionIndex>>;
    /**
     * The total amount staked for the last `HISTORY_DEPTH` eras.
     * If total hasn't been set or has been removed then 0 stake is returned.
     **/
    erasTotalStake: StorageMap<EraIndex | AnyNumber, BalanceOf>;
    /**
     * Similar to `ErasStakers`, this holds the preferences of validators.
     *
     * This is keyed first by the era index to allow bulk deletion and then the stash account.
     *
     * Is it removed after `HISTORY_DEPTH` eras.
     **/
    erasValidatorPrefs: StorageDoubleMap<EraIndex | AnyNumber, AccountId | string, ValidatorPrefs>;
    /**
     * The total validator era payout for the last `HISTORY_DEPTH` eras.
     *
     * Eras that haven't finished yet or has been removed doesn't have reward.
     **/
    erasValidatorReward: StorageMap<EraIndex | AnyNumber, Option<MultiCurrencyBalanceOf>>;
    /**
     * The amount of VAL burned during this era.
     **/
    eraValBurned: MultiCurrencyBalanceOf | null;
    /**
     * Mode of era forcing.
     **/
    forceEra: Forcing | null;
    /**
     * Number of eras to keep in history.
     *
     * Information is kept for eras in `[current_era - history_depth; current_era]`.
     *
     * Must be more than the number of eras delayed by session otherwise. I.e. active era must
     * always be in history. I.e. `active_era > current_era - history_depth` must be
     * guaranteed.
     **/
    historyDepth: u32 | null;
    /**
     * Any validators that may never be slashed or forcibly kicked. It's a Vec since they're
     * easy to initialize and the performance hit is minimal (we expect no more than four
     * invulnerables) and restricted to testnets.
     **/
    invulnerables: Vec<AccountId> | null;
    /**
     * True if the current **planned** session is final. Note that this does not take era
     * forcing into account.
     **/
    isCurrentSessionFinal: bool | null;
    /**
     * Map from all (unlocked) "controller" accounts to the info regarding the staking.
     **/
    ledger: StorageMap<AccountId | string, Option<StakingLedger>>;
    /**
     * Minimum number of staking participants before emergency conditions are imposed.
     **/
    minimumValidatorCount: u32 | null;
    /**
     * The map from nominator stash key to the set of stash keys of all validators to nominate.
     **/
    nominators: StorageMap<AccountId | string, Option<Nominations>>;
    /**
     * All slashing events on nominators, mapped by era to the highest slash value of the era.
     **/
    nominatorSlashInEra: StorageDoubleMap<EraIndex | AnyNumber, AccountId | string, Option<BalanceOf>>;
    /**
     * Where the reward payment should be made. Keyed by stash.
     **/
    payee: StorageMap<AccountId | string, RewardDestination>;
    /**
     * The next validator set. At the end of an era, if this is available (potentially from the
     * result of an offchain worker), it is immediately used. Otherwise, the on-chain election
     * is executed.
     **/
    queuedElected: Option<ElectionResult> | null;
    /**
     * The score of the current [`QueuedElected`].
     **/
    queuedScore: Option<ElectionScore> | null;
    /**
     * Slashing spans for stash accounts.
     **/
    slashingSpans: StorageMap<AccountId | string, Option<SlashingSpans>>;
    /**
     * The percentage of the slash that is distributed to reporters.
     *
     * The rest of the slashed value is handled by the `Slash`.
     **/
    slashRewardFraction: Perbill | null;
    /**
     * Snapshot of nominators at the beginning of the current election window. This should only
     * have a value when [`EraElectionStatus`] == `ElectionStatus::Open(_)`.
     **/
    snapshotNominators: Option<Vec<AccountId>> | null;
    /**
     * Snapshot of validators at the beginning of the current election window. This should only
     * have a value when [`EraElectionStatus`] == `ElectionStatus::Open(_)`.
     **/
    snapshotValidators: Option<Vec<AccountId>> | null;
    /**
     * Records information about the maximum slash of a stash within a slashing span,
     * as well as how much reward has been paid out.
     **/
    spanSlash: StorageMap<ITuple<[AccountId, SpanIndex]> | [AccountId | string, SpanIndex | AnyNumber], SpanRecord>;
    /**
     * True if network has been upgraded to this version.
     * Storage version of the pallet.
     *
     * This is set to v5.0.0 for new networks.
     **/
    storageVersion: Releases | null;
    /**
     * The time span since genesis, incremented at the end of each era.
     **/
    timeSinceGenesis: Duration | null;
    /**
     * All unapplied slashes that are queued for later.
     **/
    unappliedSlashes: StorageMap<EraIndex | AnyNumber, Vec<UnappliedSlash>>;
    /**
     * The ideal number of staking participants.
     **/
    validatorCount: u32 | null;
    /**
     * The map from (wannabe) validator stash key to the preferences of that validator.
     **/
    validators: StorageMap<AccountId | string, ValidatorPrefs>;
    /**
     * All slashing events on validators, mapped by era to the highest slash proportion
     * and slash value of the era.
     **/
    validatorSlashInEra: StorageDoubleMap<
      EraIndex | AnyNumber,
      AccountId | string,
      Option<ITuple<[Perbill, BalanceOf]>>
    >;
  };
  sudo: {
    /**
     * The `AccountId` of the sudo key.
     **/
    key: AccountId | null;
  };
  system: {
    /**
     * The full account information for a particular account ID.
     **/
    account: StorageMap<AccountId | string, AccountInfo>;
    /**
     * Total length (in bytes) for all extrinsics put together, for the current block.
     **/
    allExtrinsicsLen: Option<u32> | null;
    /**
     * Map of block numbers to block hashes.
     **/
    blockHash: StorageMap<BlockNumber | AnyNumber, Hash>;
    /**
     * The current weight for the block.
     **/
    blockWeight: ConsumedWeight | null;
    /**
     * Digest of the current block, also part of the block header.
     **/
    digest: DigestOf | null;
    /**
     * The number of events in the `Events<T>` list.
     **/
    eventCount: EventIndex | null;
    /**
     * Events deposited for the current block.
     **/
    events: Vec<EventRecord> | null;
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
    eventTopics: StorageMap<Hash | string, Vec<ITuple<[BlockNumber, EventIndex]>>>;
    /**
     * The execution phase of the block.
     **/
    executionPhase: Option<Phase> | null;
    /**
     * Total extrinsics count for the current block.
     **/
    extrinsicCount: Option<u32> | null;
    /**
     * Extrinsics data for the current block (maps an extrinsic's index to its data).
     **/
    extrinsicData: StorageMap<u32 | AnyNumber, Bytes>;
    /**
     * Stores the `spec_version` and `spec_name` of when the last runtime upgrade happened.
     **/
    lastRuntimeUpgrade: Option<LastRuntimeUpgradeInfo> | null;
    /**
     * The current block number being processed. Set by `execute_block`.
     **/
    number: BlockNumber | null;
    /**
     * Hash of the previous block.
     **/
    parentHash: Hash | null;
    /**
     * True if we have upgraded so that AccountInfo contains two types of `RefCount`. False
     * (default) if not.
     **/
    upgradedToDualRefCount: bool | null;
    /**
     * True if we have upgraded so that `type RefCount` is `u32`. False (default) if not.
     **/
    upgradedToU32RefCount: bool | null;
  };
  technicalCommittee: {
    /**
     * The current members of the collective. This is stored sorted (just by value).
     **/
    members: Vec<AccountId> | null;
    /**
     * The prime member that helps determine the default vote behavior in case of absentations.
     **/
    prime: Option<AccountId> | null;
    /**
     * Proposals so far.
     **/
    proposalCount: u32 | null;
    /**
     * Actual proposal for a given hash, if it's current.
     **/
    proposalOf: StorageMap<Hash | string, Option<Proposal>>;
    /**
     * The hashes of the active proposals.
     **/
    proposals: Vec<Hash> | null;
    /**
     * Votes on a given proposal, if it is ongoing.
     **/
    voting: StorageMap<Hash | string, Option<Votes>>;
  };
  technicalMembership: {
    /**
     * The current membership, stored as an ordered Vec.
     **/
    members: Vec<AccountId> | null;
    /**
     * The current prime member, if one exists.
     **/
    prime: Option<AccountId> | null;
  };
  timestamp: {
    /**
     * Did the timestamp get updated in this block?
     **/
    didUpdate: bool | null;
    /**
     * Current time for the current block.
     **/
    now: Moment | null;
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
    accounts: StorageDoubleMap<AccountId | string, CurrencyId | AnyNumber, AccountData>;
    /**
     * Any liquidity locks of a token type under an account.
     * NOTE: Should only be accessed when setting, changing and freeing a lock.
     **/
    locks: StorageDoubleMap<AccountId | string, CurrencyId | AnyNumber, Vec<BalanceLock>>;
    /**
     * The total issuance of a token type.
     **/
    totalIssuance: StorageMap<CurrencyId | AnyNumber, Balance>;
  };
  tradingPair: {
    enabledSources: StorageDoubleMap<
      DEXId | AnyNumber,
      TradingPair | { base_asset_id?: any; target_asset_id?: any } | string,
      Option<BTreeSet<LiquiditySourceType>>
    >;
    lockedLiquiditySources: Vec<LiquiditySourceType> | null;
  };
  transactionPayment: { nextFeeMultiplier: Multiplier | null; storageVersion: Releases | null };
  vestedRewards: {
    /**
     * This storage keeps the last block number, when the user (the first) claimed a reward for
     * asset (the second key). The block is rounded to days.
     **/
    crowdloanClaimHistory: StorageDoubleMap<AccountId | string, AssetId | AnyNumber, BlockNumber>;
    /**
     * Crowdloan vested rewards storage.
     **/
    crowdloanRewards: StorageMap<AccountId | string, CrowdloanReward>;
    /**
     * Registry of market makers with large transaction volumes (>1 XOR per transaction).
     **/
    marketMakersRegistry: StorageMap<AccountId | string, MarketMakerInfo>;
    /**
     * Market making pairs storage.
     **/
    marketMakingPairs: StorageDoubleMap<AssetId | AnyNumber, AssetId | AnyNumber, ITuple<[]>>;
    /**
     * Reserved for future use
     * Mapping between users and their owned rewards of different kinds, which are vested.
     **/
    rewards: StorageMap<AccountId | string, RewardInfo>;
    /**
     * Reserved for future use
     * Total amount of PSWAP pending rewards.
     **/
    totalRewards: Balance | null;
  };
  xorFee: {
    multiplier: FixedU128 | null;
    /**
     * The amount of XOR to be reminted and exchanged for VAL at the end of the session
     **/
    xorToVal: Balance | null;
  };
  xstPool: {
    /**
     * Base fee in XOR which is deducted on all trades, currently it's burned: 0.3%.
     **/
    baseFee: Fixed | null;
    /**
     * Current reserves balance for collateral tokens, used for client usability.
     **/
    collateralReserves: StorageMap<AssetId | AnyNumber, Balance>;
    /**
     * XST Assets allowed to be traded using XST.
     **/
    enabledSynthetics: BTreeSet<AssetId> | null;
    /**
     * Technical account used to store collateral tokens.
     **/
    permissionedTechAccount: TechAccountId | null;
    /**
     * Asset that is used to compare collateral assets by value, e.g., DAI.
     **/
    referenceAssetId: AssetId | null;
  };
}
