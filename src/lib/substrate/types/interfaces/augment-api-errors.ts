// Auto-generated via `yarn polkadot-types-from-chain`, do not edit

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/api-base/types/errors';

import type { ApiTypes, AugmentedError } from '@polkadot/api-base/types';

export type __AugmentedError<ApiType extends ApiTypes> = AugmentedError<ApiType>;

declare module '@polkadot/api-base/types/errors' {
  interface AugmentedErrors<ApiType extends ApiTypes> {
    apolloPlatform: {
      /**
       * Asset already listed
       **/
      AssetAlreadyListed: AugmentedError<ApiType>;
      /**
       * Can not transfer amount to developers
       **/
      CanNotTransferAmountToDevelopers: AugmentedError<ApiType>;
      /**
       * Can not transfer amount to repay
       **/
      CanNotTransferAmountToRepay: AugmentedError<ApiType>;
      /**
       * Can not transfer amount to treasury
       **/
      CanNotTransferAmountToTreasury: AugmentedError<ApiType>;
      /**
       * Can not transfer borrowing amount
       **/
      CanNotTransferBorrowingAmount: AugmentedError<ApiType>;
      /**
       * Can not transfer borrowing rewards
       **/
      CanNotTransferBorrowingRewards: AugmentedError<ApiType>;
      /**
       * Can not transfer collateral amount
       **/
      CanNotTransferCollateralAmount: AugmentedError<ApiType>;
      /**
       * Can not transfer lending amount
       **/
      CanNotTransferLendingAmount: AugmentedError<ApiType>;
      /**
       * Can not transfer lending interest
       **/
      CanNotTransferLendingInterest: AugmentedError<ApiType>;
      /**
       * Can not withdraw lending amount
       **/
      CanNotWithdrawLendingAmount: AugmentedError<ApiType>;
      /**
       * Collateral token does not exists
       **/
      CollateralTokenDoesNotExist: AugmentedError<ApiType>;
      /**
       * Insufficient lending amount
       **/
      InsufficientLendingAmount: AugmentedError<ApiType>;
      /**
       * Invalid borrowing amount
       **/
      InvalidBorrowingAmount: AugmentedError<ApiType>;
      /**
       * Invalid collateral amount
       **/
      InvalidCollateralAmount: AugmentedError<ApiType>;
      /**
       * The amount that is being lent is invalid
       **/
      InvalidLendingAmount: AugmentedError<ApiType>;
      /**
       * User should not be liquidated
       **/
      InvalidLiquidation: AugmentedError<ApiType>;
      /**
       * Invalid loan to value
       **/
      InvalidLoanToValue: AugmentedError<ApiType>;
      /**
       * Invalid pool parameters
       **/
      InvalidPoolParameters: AugmentedError<ApiType>;
      /**
       * Lending amount exceeded
       **/
      LendingAmountExceeded: AugmentedError<ApiType>;
      /**
       * No lending amount to borrow
       **/
      NoLendingAmountToBorrow: AugmentedError<ApiType>;
      /**
       * No liquidity for borrowing asset
       **/
      NoLiquidityForBorrowingAsset: AugmentedError<ApiType>;
      /**
       * Nonexistent borrowing position
       **/
      NonexistentBorrowingPosition: AugmentedError<ApiType>;
      /**
       * No rewards to claim
       **/
      NoRewardsToClaim: AugmentedError<ApiType>;
      /**
       * Nothing borrowed
       **/
      NothingBorrowed: AugmentedError<ApiType>;
      /**
       * Nothing lent
       **/
      NothingLent: AugmentedError<ApiType>;
      /**
       * Nothing to repay
       **/
      NothingToRepay: AugmentedError<ApiType>;
      /**
       * Pool does not exist
       **/
      PoolDoesNotExist: AugmentedError<ApiType>;
      /**
       * Pool is removed
       **/
      PoolIsRemoved: AugmentedError<ApiType>;
      /**
       * Same borrowing and collateral assets
       **/
      SameCollateralAndBorrowingAssets: AugmentedError<ApiType>;
      /**
       * Unable to transfer amount to repay
       **/
      UnableToTransferAmountToRepay: AugmentedError<ApiType>;
      /**
       * Unable to transfer collateral
       **/
      UnableToTransferCollateral: AugmentedError<ApiType>;
      /**
       * Unable to transfer rewards
       **/
      UnableToTransferRewards: AugmentedError<ApiType>;
      /**
       * Unauthorized
       **/
      Unauthorized: AugmentedError<ApiType>;
    };
    assets: {
      /**
       * An asset with a given ID already exists.
       **/
      AssetIdAlreadyExists: AugmentedError<ApiType>;
      /**
       * An asset with a given ID not exists.
       **/
      AssetIdNotExists: AugmentedError<ApiType>;
      /**
       * Minting for particular asset id is disabled.
       **/
      AssetSupplyIsNotMintable: AugmentedError<ApiType>;
      /**
       * The asset is not mintable and its initial balance is 0.
       **/
      DeadAsset: AugmentedError<ApiType>;
      /**
       * Increment account reference error.
       **/
      IncRefError: AugmentedError<ApiType>;
      /**
       * A number is out of range of the balance type.
       **/
      InsufficientBalance: AugmentedError<ApiType>;
      /**
       * Name is not valid. It must contain only uppercase or lowercase latin characters or numbers or spaces, length is from 1 to 33.
       **/
      InvalidAssetName: AugmentedError<ApiType>;
      /**
       * Caller does not own requested asset.
       **/
      InvalidAssetOwner: AugmentedError<ApiType>;
      /**
       * Symbol is not valid. It must contain only uppercase latin characters or numbers, length is from 1 to 7.
       **/
      InvalidAssetSymbol: AugmentedError<ApiType>;
      /**
       * Content source is not valid. It must be ascii only and `common::ASSET_CONTENT_SOURCE_MAX_LENGTH` characters long at max.
       **/
      InvalidContentSource: AugmentedError<ApiType>;
      /**
       * Description is not valid. It must be `common::ASSET_DESCRIPTION_MAX_LENGTH` characters long at max.
       **/
      InvalidDescription: AugmentedError<ApiType>;
      /**
       * Precision value is not valid, it should represent a number of decimal places for number, max is 30.
       **/
      InvalidPrecision: AugmentedError<ApiType>;
      /**
       * Computation overflow.
       **/
      Overflow: AugmentedError<ApiType>;
    };
    babe: {
      /**
       * A given equivocation report is valid but already previously reported.
       **/
      DuplicateOffenceReport: AugmentedError<ApiType>;
      /**
       * Submitted configuration is invalid.
       **/
      InvalidConfiguration: AugmentedError<ApiType>;
      /**
       * An equivocation proof provided as part of an equivocation report is invalid.
       **/
      InvalidEquivocationProof: AugmentedError<ApiType>;
      /**
       * A key ownership proof provided as part of an equivocation report is invalid.
       **/
      InvalidKeyOwnershipProof: AugmentedError<ApiType>;
    };
    bagsList: {
      /**
       * A error in the list interface implementation.
       **/
      List: AugmentedError<ApiType>;
    };
    balances: {
      /**
       * Beneficiary account must pre-exist
       **/
      DeadAccount: AugmentedError<ApiType>;
      /**
       * Value too low to create account due to existential deposit
       **/
      ExistentialDeposit: AugmentedError<ApiType>;
      /**
       * A vesting schedule already exists for this account
       **/
      ExistingVestingSchedule: AugmentedError<ApiType>;
      /**
       * Balance too low to send value.
       **/
      InsufficientBalance: AugmentedError<ApiType>;
      /**
       * Transfer/payment would kill account
       **/
      KeepAlive: AugmentedError<ApiType>;
      /**
       * Account liquidity restrictions prevent withdrawal
       **/
      LiquidityRestrictions: AugmentedError<ApiType>;
      /**
       * Number of named reserves exceed MaxReserves
       **/
      TooManyReserves: AugmentedError<ApiType>;
      /**
       * Vesting balance too high to send value
       **/
      VestingBalance: AugmentedError<ApiType>;
    };
    band: {
      /**
       * A request to add an account, which is already a trusted relayer, was supplied.
       **/
      AlreadyATrustedRelayer: AugmentedError<ApiType>;
      /**
       * Error during dynamic fee calculation
       **/
      DynamicFeeCalculationError: AugmentedError<ApiType>;
      /**
       * Dynamic fee parameters are invalid,
       **/
      InvalidDynamicFeeParameters: AugmentedError<ApiType>;
      /**
       * A request to remove an account, which is not a trusted relayer, was supplied.
       **/
      NoSuchRelayer: AugmentedError<ApiType>;
      /**
       * Relayed rate is too big to be stored in the pallet.
       **/
      RateConversionOverflow: AugmentedError<ApiType>;
      /**
       * Rate is expired and can't be used until next update.
       **/
      RateExpired: AugmentedError<ApiType>;
      /**
       * Rate has invalid timestamp.
       **/
      RateHasInvalidTimestamp: AugmentedError<ApiType>;
      /**
       * An untrusted account tried to relay data.
       **/
      UnauthorizedRelayer: AugmentedError<ApiType>;
    };
    beefyLightClient: {
      CannotSwitchOldValidatorSet: AugmentedError<ApiType>;
      CommitmentNotFoundInDigest: AugmentedError<ApiType>;
      InvalidDigestHash: AugmentedError<ApiType>;
      InvalidMMRProof: AugmentedError<ApiType>;
      InvalidNetworkId: AugmentedError<ApiType>;
      InvalidNumberOfPositions: AugmentedError<ApiType>;
      InvalidNumberOfPublicKeys: AugmentedError<ApiType>;
      InvalidNumberOfSignatures: AugmentedError<ApiType>;
      InvalidSignature: AugmentedError<ApiType>;
      InvalidValidatorSetId: AugmentedError<ApiType>;
      MerklePositionTooHigh: AugmentedError<ApiType>;
      MerkleProofTooHigh: AugmentedError<ApiType>;
      MerkleProofTooShort: AugmentedError<ApiType>;
      MMRPayloadNotFound: AugmentedError<ApiType>;
      NotEnoughValidatorSignatures: AugmentedError<ApiType>;
      PalletNotInitialized: AugmentedError<ApiType>;
      PayloadBlocknumberTooNew: AugmentedError<ApiType>;
      PayloadBlocknumberTooOld: AugmentedError<ApiType>;
      ValidatorNotOnceInbitfield: AugmentedError<ApiType>;
      ValidatorSetIncorrectPosition: AugmentedError<ApiType>;
    };
    bridgeDataSigner: {
      ApprovalsNotFound: AugmentedError<ApiType>;
      DontHavePendingPeerUpdates: AugmentedError<ApiType>;
      FailedToVerifySignature: AugmentedError<ApiType>;
      HasPendingPeerUpdate: AugmentedError<ApiType>;
      NetworkNotSupported: AugmentedError<ApiType>;
      PalletInitialized: AugmentedError<ApiType>;
      PalletNotInitialized: AugmentedError<ApiType>;
      PeerExists: AugmentedError<ApiType>;
      PeerNotExists: AugmentedError<ApiType>;
      PeerNotFound: AugmentedError<ApiType>;
      SignatureAlreadyExists: AugmentedError<ApiType>;
      SignaturesNotFound: AugmentedError<ApiType>;
      TooMuchApprovals: AugmentedError<ApiType>;
      TooMuchPeers: AugmentedError<ApiType>;
    };
    bridgeInboundChannel: {
      /**
       * Call encoding failed.
       **/
      CallEncodeFailed: AugmentedError<ApiType>;
      /**
       * This contract already exists
       **/
      ContractExists: AugmentedError<ApiType>;
      /**
       * Invalid base fee update.
       **/
      InvalidBaseFeeUpdate: AugmentedError<ApiType>;
      /**
       * Submitted invalid commitment type.
       **/
      InvalidCommitment: AugmentedError<ApiType>;
      /**
       * Message came from an invalid network.
       **/
      InvalidNetwork: AugmentedError<ApiType>;
      /**
       * Message has an unexpected nonce.
       **/
      InvalidNonce: AugmentedError<ApiType>;
      /**
       * Incorrect reward fraction
       **/
      InvalidRewardFraction: AugmentedError<ApiType>;
      /**
       * Message came from an invalid outbound channel on the Ethereum side.
       **/
      InvalidSourceChannel: AugmentedError<ApiType>;
    };
    bridgeMultisig: {
      /**
       * Call is already approved by this signatory.
       **/
      AlreadyApproved: AugmentedError<ApiType>;
      /**
       * Call with the given hash was already dispatched.
       **/
      AlreadyDispatched: AugmentedError<ApiType>;
      /**
       * The given account ID is already presented in the signatories.
       **/
      AlreadyInSignatories: AugmentedError<ApiType>;
      /**
       * The data to be stored is already stored.
       **/
      AlreadyStored: AugmentedError<ApiType>;
      /**
       * Threshold must be 2 or greater.
       **/
      MinimumThreshold: AugmentedError<ApiType>;
      /**
       * The multisig account is already registered.
       **/
      MultisigAlreadyExists: AugmentedError<ApiType>;
      /**
       * Call doesn't need any (more) approvals.
       **/
      NoApprovalsNeeded: AugmentedError<ApiType>;
      /**
       * Multisig operation not found when attempting to cancel.
       **/
      NotFound: AugmentedError<ApiType>;
      /**
       * No timepoint was given, yet the multisig operation is already underway.
       **/
      NoTimepoint: AugmentedError<ApiType>;
      /**
       * The given account ID is not presented in the signatories.
       **/
      NotInSignatories: AugmentedError<ApiType>;
      /**
       * Only the account that originally created the multisig is able to cancel it.
       **/
      NotOwner: AugmentedError<ApiType>;
      /**
       * The sender wasn't contained in the other signatories; it shouldn be.
       **/
      SenderNotInSignatories: AugmentedError<ApiType>;
      /**
       * Signatories list unordered or contains duplicated entries.
       **/
      SignatoriesAreNotUniqueOrUnordered: AugmentedError<ApiType>;
      /**
       * The signatories were provided out of order; they should be ordered.
       **/
      SignatoriesOutOfOrder: AugmentedError<ApiType>;
      /**
       * There are too few signatories in the list.
       **/
      TooFewSignatories: AugmentedError<ApiType>;
      /**
       * There are too many signatories in the list.
       **/
      TooManySignatories: AugmentedError<ApiType>;
      /**
       * A timepoint was given, yet no multisig operation is underway.
       **/
      UnexpectedTimepoint: AugmentedError<ApiType>;
      /**
       * Corresponding multisig account wasn't found.
       **/
      UnknownMultisigAccount: AugmentedError<ApiType>;
      /**
       * The maximum weight information provided was too low.
       **/
      WeightTooLow: AugmentedError<ApiType>;
      /**
       * A different timepoint was given to the multisig operation that is underway.
       **/
      WrongTimepoint: AugmentedError<ApiType>;
      /**
       * Threshold should not be zero.
       **/
      ZeroThreshold: AugmentedError<ApiType>;
    };
    bridgeOutboundChannel: {
      /**
       * This channel already exists
       **/
      ChannelExists: AugmentedError<ApiType>;
      /**
       * Commitment consume too much gas
       **/
      CommitmentGasLimitExceeded: AugmentedError<ApiType>;
      /**
       * Maximum gas for queued batch exceeds limit.
       **/
      MaxGasTooBig: AugmentedError<ApiType>;
      /**
       * Message consume too much gas
       **/
      MessageGasLimitExceeded: AugmentedError<ApiType>;
      /**
       * Network does not support this kind of message (it's a developer's mistake)
       **/
      MessageTypeIsNotSupported: AugmentedError<ApiType>;
      /**
       * Cannot pay the fee to submit a message.
       **/
      NoFunds: AugmentedError<ApiType>;
      /**
       * Cannot increment nonce
       **/
      Overflow: AugmentedError<ApiType>;
      /**
       * The message payload exceeds byte limit.
       **/
      PayloadTooLarge: AugmentedError<ApiType>;
      /**
       * No more messages can be queued for the channel during this commit cycle.
       **/
      QueueSizeLimitReached: AugmentedError<ApiType>;
    };
    bridgeProxy: {
      AssetAlreadyLimited: AugmentedError<ApiType>;
      AssetNotLimited: AugmentedError<ApiType>;
      NotEnoughLockedLiquidity: AugmentedError<ApiType>;
      Overflow: AugmentedError<ApiType>;
      PathIsNotAvailable: AugmentedError<ApiType>;
      TransferLimitReached: AugmentedError<ApiType>;
      WrongAccountKind: AugmentedError<ApiType>;
      WrongLimitSettings: AugmentedError<ApiType>;
    };
    ceresGovernancePlatform: {
      /**
       * Duplicate options
       **/
      DuplicateOptions: AugmentedError<ApiType>;
      /**
       * Funds already withdrawn,
       **/
      FundsAlreadyWithdrawn: AugmentedError<ApiType>;
      /**
       * Invalid end timestamp
       **/
      InvalidEndTimestamp: AugmentedError<ApiType>;
      /**
       * Invalid number of votes
       **/
      InvalidNumberOfVotes: AugmentedError<ApiType>;
      /**
       * Invalid option
       **/
      InvalidOption: AugmentedError<ApiType>;
      /**
       * Invalid start timestamp
       **/
      InvalidStartTimestamp: AugmentedError<ApiType>;
      /**
       * Invalid voting options
       **/
      InvalidVotingOptions: AugmentedError<ApiType>;
      /**
       * Not enough funds
       **/
      NotEnoughFunds: AugmentedError<ApiType>;
      /**
       * Not voted
       **/
      NotVoted: AugmentedError<ApiType>;
      /**
       * Poll does not exist
       **/
      PollDoesNotExist: AugmentedError<ApiType>;
      /**
       * Poll is finished
       **/
      PollIsFinished: AugmentedError<ApiType>;
      /**
       * Poll is not finished
       **/
      PollIsNotFinished: AugmentedError<ApiType>;
      /**
       * Poll is not started
       **/
      PollIsNotStarted: AugmentedError<ApiType>;
      /**
       * Too many voting options
       **/
      TooManyVotingOptions: AugmentedError<ApiType>;
      /**
       * Unauthorized
       **/
      Unauthorized: AugmentedError<ApiType>;
      /**
       * Vote denied
       **/
      VoteDenied: AugmentedError<ApiType>;
    };
    ceresLaunchpad: {
      /**
       * Account is not whitelisted
       **/
      AccountIsNotWhitelisted: AugmentedError<ApiType>;
      /**
       * Asset in which funds are being raised is not supported
       **/
      BaseAssetNotSupported: AugmentedError<ApiType>;
      /**
       * Can't claim LP tokens
       **/
      CantClaimLPTokens: AugmentedError<ApiType>;
      /**
       * Can't contribute in ILO
       **/
      CantContributeInILO: AugmentedError<ApiType>;
      /**
       * Can't create ILO for listed token
       **/
      CantCreateILOForListedToken: AugmentedError<ApiType>;
      /**
       * Contribution is bigger than max
       **/
      ContributionIsBiggerThenMax: AugmentedError<ApiType>;
      /**
       * Contribution is lower than min
       **/
      ContributionIsLowerThenMin: AugmentedError<ApiType>;
      /**
       * Funds already claimed
       **/
      FundsAlreadyClaimed: AugmentedError<ApiType>;
      /**
       * Hard cap is hit
       **/
      HardCapIsHit: AugmentedError<ApiType>;
      /**
       * ILO for token already exists
       **/
      ILOAlreadyExists: AugmentedError<ApiType>;
      /**
       * ILO for token does not exist
       **/
      ILODoesNotExist: AugmentedError<ApiType>;
      /**
       * ILO is failed
       **/
      ILOIsFailed: AugmentedError<ApiType>;
      /**
       * ILO is finished,
       **/
      ILOIsFinished: AugmentedError<ApiType>;
      /**
       * ILO is not finished
       **/
      ILOIsNotFinished: AugmentedError<ApiType>;
      /**
       * ILO is succeeded
       **/
      ILOIsSucceeded: AugmentedError<ApiType>;
      /**
       * ILO not started
       **/
      ILONotStarted: AugmentedError<ApiType>;
      /**
       * End timestamp must be greater than start timestamp
       **/
      InvalidEndTimestamp: AugmentedError<ApiType>;
      /**
       * Invalid fee percent on raised funds
       **/
      InvalidFeePercent: AugmentedError<ApiType>;
      /**
       * First release percent can't be zero
       **/
      InvalidFirstReleasePercent: AugmentedError<ApiType>;
      /**
       * Minimum 51% of raised funds must go to liquidity
       **/
      InvalidLiquidityPercent: AugmentedError<ApiType>;
      /**
       * Lockup days must be minimum 30
       **/
      InvalidLockupDays: AugmentedError<ApiType>;
      /**
       * Maximum contribution must be greater than minimum contribution
       **/
      InvalidMaximumContribution: AugmentedError<ApiType>;
      /**
       * Minimum contribution must be equal or greater than 0.01 base asset tokens
       **/
      InvalidMinimumContribution: AugmentedError<ApiType>;
      /**
       * Invalid number of tokens for ILO
       **/
      InvalidNumberOfTokensForILO: AugmentedError<ApiType>;
      /**
       * Invalid number of tokens for liquidity
       **/
      InvalidNumberOfTokensForLiquidity: AugmentedError<ApiType>;
      /**
       * Listing price must be greater than ILO price
       **/
      InvalidPrice: AugmentedError<ApiType>;
      /**
       * Soft cap should be minimum 50% of hard cap
       **/
      InvalidSoftCap: AugmentedError<ApiType>;
      /**
       * Start timestamp be in future
       **/
      InvalidStartTimestamp: AugmentedError<ApiType>;
      /**
       * Team first release percent can't be zero
       **/
      InvalidTeamFirstReleasePercent: AugmentedError<ApiType>;
      /**
       * Team invalid vesting percent
       **/
      InvalidTeamVestingPercent: AugmentedError<ApiType>;
      /**
       * Team vesting period can't be zero
       **/
      InvalidTeamVestingPeriod: AugmentedError<ApiType>;
      /**
       * Invalid vesting percent
       **/
      InvalidVestingPercent: AugmentedError<ApiType>;
      /**
       * Vesting period can't be zero
       **/
      InvalidVestingPeriod: AugmentedError<ApiType>;
      /**
       * Not enough CERES
       **/
      NotEnoughCeres: AugmentedError<ApiType>;
      /**
       * Not enough funds
       **/
      NotEnoughFunds: AugmentedError<ApiType>;
      /**
       * Not enough team tokens to lock
       **/
      NotEnoughTeamTokensToLock: AugmentedError<ApiType>;
      /**
       * Not enough ILO tokens
       **/
      NotEnoughTokens: AugmentedError<ApiType>;
      /**
       * Not enough tokens to buy
       **/
      NotEnoughTokensToBuy: AugmentedError<ApiType>;
      /**
       * Nothing to claim
       **/
      NothingToClaim: AugmentedError<ApiType>;
      /**
       * Parameter can't be zero
       **/
      ParameterCantBeZero: AugmentedError<ApiType>;
      /**
       * Pool does not exist
       **/
      PoolDoesNotExist: AugmentedError<ApiType>;
      /**
       * Unauthorized
       **/
      Unauthorized: AugmentedError<ApiType>;
    };
    ceresLiquidityLocker: {
      /**
       * Insufficient liquidity to lock
       **/
      InsufficientLiquidityToLock: AugmentedError<ApiType>;
      /**
       * Percentage greater than 100%
       **/
      InvalidPercentage: AugmentedError<ApiType>;
      /**
       * Unlocking date cannot be in past
       **/
      InvalidUnlockingTimestamp: AugmentedError<ApiType>;
      /**
       * Pool does not exist
       **/
      PoolDoesNotExist: AugmentedError<ApiType>;
      /**
       * Unauthorized access
       **/
      Unauthorized: AugmentedError<ApiType>;
    };
    ceresStaking: {
      /**
       * Staking pool is full
       **/
      StakingPoolIsFull: AugmentedError<ApiType>;
      /**
       * Unauthorized
       **/
      Unauthorized: AugmentedError<ApiType>;
    };
    ceresTokenLocker: {
      /**
       * Number of tokens equals zero
       **/
      InvalidNumberOfTokens: AugmentedError<ApiType>;
      /**
       * Unlocking date cannot be in past
       **/
      InvalidUnlockingTimestamp: AugmentedError<ApiType>;
      /**
       * Lock info does not exist
       **/
      LockInfoDoesNotExist: AugmentedError<ApiType>;
      /**
       * Not enough funds
       **/
      NotEnoughFunds: AugmentedError<ApiType>;
      /**
       * Tokens not unlocked yet
       **/
      NotUnlockedYet: AugmentedError<ApiType>;
      /**
       * Unauthorized access
       **/
      Unauthorized: AugmentedError<ApiType>;
    };
    council: {
      /**
       * Members are already initialized!
       **/
      AlreadyInitialized: AugmentedError<ApiType>;
      /**
       * Duplicate proposals not allowed
       **/
      DuplicateProposal: AugmentedError<ApiType>;
      /**
       * Duplicate vote ignored
       **/
      DuplicateVote: AugmentedError<ApiType>;
      /**
       * Account is not a member
       **/
      NotMember: AugmentedError<ApiType>;
      /**
       * Proposal must exist
       **/
      ProposalMissing: AugmentedError<ApiType>;
      /**
       * The close call was made too early, before the end of the voting.
       **/
      TooEarly: AugmentedError<ApiType>;
      /**
       * There can only be a maximum of `MaxProposals` active proposals.
       **/
      TooManyProposals: AugmentedError<ApiType>;
      /**
       * Mismatched index
       **/
      WrongIndex: AugmentedError<ApiType>;
      /**
       * The given length bound for the proposal was too low.
       **/
      WrongProposalLength: AugmentedError<ApiType>;
      /**
       * The given weight bound for the proposal was too low.
       **/
      WrongProposalWeight: AugmentedError<ApiType>;
    };
    currencies: {
      /**
       * Unable to convert the Amount type into Balance.
       **/
      AmountIntoBalanceFailed: AugmentedError<ApiType>;
      /**
       * Balance is too low.
       **/
      BalanceTooLow: AugmentedError<ApiType>;
      /**
       * Deposit result is not expected
       **/
      DepositFailed: AugmentedError<ApiType>;
    };
    demeterFarmingPlatform: {
      /**
       * Insufficient Funds
       **/
      InsufficientFunds: AugmentedError<ApiType>;
      /**
       * Insufficient LP tokens
       **/
      InsufficientLPTokens: AugmentedError<ApiType>;
      /**
       * Invalid allocation parameters
       **/
      InvalidAllocationParameters: AugmentedError<ApiType>;
      /**
       * Invalid deposit fee
       **/
      InvalidDepositFee: AugmentedError<ApiType>;
      /**
       * Multiplier must be greater or equal to 1
       **/
      InvalidMultiplier: AugmentedError<ApiType>;
      /**
       * Pool already exists
       **/
      PoolAlreadyExists: AugmentedError<ApiType>;
      /**
       * Pool does not exist
       **/
      PoolDoesNotExist: AugmentedError<ApiType>;
      /**
       * Pool does not have rewards,
       **/
      PoolDoesNotHaveRewards: AugmentedError<ApiType>;
      /**
       * Token is not registered
       **/
      RewardTokenIsNotRegistered: AugmentedError<ApiType>;
      /**
       * Token is already registered
       **/
      TokenAlreadyRegistered: AugmentedError<ApiType>;
      /**
       * Token per block can't be zero
       **/
      TokenPerBlockCantBeZero: AugmentedError<ApiType>;
      /**
       * Unauthorized
       **/
      Unauthorized: AugmentedError<ApiType>;
      /**
       * Zero Rewards
       **/
      ZeroRewards: AugmentedError<ApiType>;
    };
    democracy: {
      /**
       * Cannot cancel the same proposal twice
       **/
      AlreadyCanceled: AugmentedError<ApiType>;
      /**
       * The account is already delegating.
       **/
      AlreadyDelegating: AugmentedError<ApiType>;
      /**
       * Identity may not veto a proposal twice
       **/
      AlreadyVetoed: AugmentedError<ApiType>;
      /**
       * Proposal already made
       **/
      DuplicateProposal: AugmentedError<ApiType>;
      /**
       * The instant referendum origin is currently disallowed.
       **/
      InstantNotAllowed: AugmentedError<ApiType>;
      /**
       * Too high a balance was provided that the account cannot afford.
       **/
      InsufficientFunds: AugmentedError<ApiType>;
      /**
       * Invalid hash
       **/
      InvalidHash: AugmentedError<ApiType>;
      /**
       * Maximum number of votes reached.
       **/
      MaxVotesReached: AugmentedError<ApiType>;
      /**
       * No proposals waiting
       **/
      NoneWaiting: AugmentedError<ApiType>;
      /**
       * Delegation to oneself makes no sense.
       **/
      Nonsense: AugmentedError<ApiType>;
      /**
       * The actor has no permission to conduct the action.
       **/
      NoPermission: AugmentedError<ApiType>;
      /**
       * No external proposal
       **/
      NoProposal: AugmentedError<ApiType>;
      /**
       * The account is not currently delegating.
       **/
      NotDelegating: AugmentedError<ApiType>;
      /**
       * Next external proposal not simple majority
       **/
      NotSimpleMajority: AugmentedError<ApiType>;
      /**
       * The given account did not vote on the referendum.
       **/
      NotVoter: AugmentedError<ApiType>;
      /**
       * Proposal still blacklisted
       **/
      ProposalBlacklisted: AugmentedError<ApiType>;
      /**
       * Proposal does not exist
       **/
      ProposalMissing: AugmentedError<ApiType>;
      /**
       * Vote given for invalid referendum
       **/
      ReferendumInvalid: AugmentedError<ApiType>;
      /**
       * Maximum number of items reached.
       **/
      TooMany: AugmentedError<ApiType>;
      /**
       * Value too low
       **/
      ValueLow: AugmentedError<ApiType>;
      /**
       * The account currently has votes attached to it and the operation cannot succeed until
       * these are removed, either through `unvote` or `reap_vote`.
       **/
      VotesExist: AugmentedError<ApiType>;
      /**
       * Voting period too low
       **/
      VotingPeriodLow: AugmentedError<ApiType>;
      /**
       * Invalid upper bound.
       **/
      WrongUpperBound: AugmentedError<ApiType>;
    };
    denomination: {
      /**
       * Resulting denominator is too large
       **/
      InvalidDenominator: AugmentedError<ApiType>;
      /**
       * This action is not allowed at current stage
       **/
      WrongMigrationStage: AugmentedError<ApiType>;
    };
    dexapi: {
      /**
       * Liquidity source is already disabled
       **/
      LiquiditySourceAlreadyDisabled: AugmentedError<ApiType>;
      /**
       * Liquidity source is already enabled
       **/
      LiquiditySourceAlreadyEnabled: AugmentedError<ApiType>;
    };
    dexManager: {
      /**
       * DEX with given Id is not registered.
       **/
      DEXDoesNotExist: AugmentedError<ApiType>;
      /**
       * DEX with given id is already registered.
       **/
      DEXIdAlreadyExists: AugmentedError<ApiType>;
      /**
       * Account with given Id is not registered.
       **/
      InvalidAccountId: AugmentedError<ApiType>;
      /**
       * Numeric value provided as fee is not valid, e.g. out of basis-point range.
       **/
      InvalidFeeValue: AugmentedError<ApiType>;
    };
    electionProviderMultiPhase: {
      /**
       * Some bound not met
       **/
      BoundNotMet: AugmentedError<ApiType>;
      /**
       * The call is not allowed at this point.
       **/
      CallNotAllowed: AugmentedError<ApiType>;
      /**
       * The fallback failed
       **/
      FallbackFailed: AugmentedError<ApiType>;
      /**
       * `Self::insert_submission` returned an invalid index.
       **/
      InvalidSubmissionIndex: AugmentedError<ApiType>;
      /**
       * Snapshot metadata should exist but didn't.
       **/
      MissingSnapshotMetadata: AugmentedError<ApiType>;
      /**
       * OCW submitted solution for wrong round
       **/
      OcwCallWrongEra: AugmentedError<ApiType>;
      /**
       * Submission was too early.
       **/
      PreDispatchEarlySubmission: AugmentedError<ApiType>;
      /**
       * Submission was too weak, score-wise.
       **/
      PreDispatchWeakSubmission: AugmentedError<ApiType>;
      /**
       * Wrong number of winners presented.
       **/
      PreDispatchWrongWinnerCount: AugmentedError<ApiType>;
      /**
       * The origin failed to pay the deposit.
       **/
      SignedCannotPayDeposit: AugmentedError<ApiType>;
      /**
       * Witness data to dispatchable is invalid.
       **/
      SignedInvalidWitness: AugmentedError<ApiType>;
      /**
       * The queue was full, and the solution was not better than any of the existing ones.
       **/
      SignedQueueFull: AugmentedError<ApiType>;
      /**
       * The signed submission consumes too much weight
       **/
      SignedTooMuchWeight: AugmentedError<ApiType>;
      /**
       * Submitted solution has too many winners
       **/
      TooManyWinners: AugmentedError<ApiType>;
    };
    electionsPhragmen: {
      /**
       * Duplicated candidate submission.
       **/
      DuplicatedCandidate: AugmentedError<ApiType>;
      /**
       * Candidate does not have enough funds.
       **/
      InsufficientCandidateFunds: AugmentedError<ApiType>;
      /**
       * The renouncing origin presented a wrong `Renouncing` parameter.
       **/
      InvalidRenouncing: AugmentedError<ApiType>;
      /**
       * Prediction regarding replacement after member removal is wrong.
       **/
      InvalidReplacement: AugmentedError<ApiType>;
      /**
       * The provided count of number of votes is incorrect.
       **/
      InvalidVoteCount: AugmentedError<ApiType>;
      /**
       * The provided count of number of candidates is incorrect.
       **/
      InvalidWitnessData: AugmentedError<ApiType>;
      /**
       * Cannot vote with stake less than minimum balance.
       **/
      LowBalance: AugmentedError<ApiType>;
      /**
       * Cannot vote more than maximum allowed.
       **/
      MaximumVotesExceeded: AugmentedError<ApiType>;
      /**
       * Member cannot re-submit candidacy.
       **/
      MemberSubmit: AugmentedError<ApiType>;
      /**
       * Must be a voter.
       **/
      MustBeVoter: AugmentedError<ApiType>;
      /**
       * Not a member.
       **/
      NotMember: AugmentedError<ApiType>;
      /**
       * Must vote for at least one candidate.
       **/
      NoVotes: AugmentedError<ApiType>;
      /**
       * Runner cannot re-submit candidacy.
       **/
      RunnerUpSubmit: AugmentedError<ApiType>;
      /**
       * Too many candidates have been created.
       **/
      TooManyCandidates: AugmentedError<ApiType>;
      /**
       * Cannot vote more than candidates.
       **/
      TooManyVotes: AugmentedError<ApiType>;
      /**
       * Voter can not pay voting bond.
       **/
      UnableToPayBond: AugmentedError<ApiType>;
      /**
       * Cannot vote when no candidates or members exist.
       **/
      UnableToVote: AugmentedError<ApiType>;
    };
    ethBridge: {
      /**
       * Account not found.
       **/
      AccountNotFound: AugmentedError<ApiType>;
      /**
       * Funds are already claimed.
       **/
      AlreadyClaimed: AugmentedError<ApiType>;
      /**
       * Authority account is not set.
       **/
      AuthorityAccountNotSet: AugmentedError<ApiType>;
      /**
       * The request was purposely cancelled.
       **/
      Cancelled: AugmentedError<ApiType>;
      /**
       * Can't add more peers.
       **/
      CantAddMorePeers: AugmentedError<ApiType>;
      /**
       * Can't remove more peers.
       **/
      CantRemoveMorePeers: AugmentedError<ApiType>;
      /**
       * Can't reserve funds.
       **/
      CantReserveFunds: AugmentedError<ApiType>;
      /**
       * Contract is already in migration stage.
       **/
      ContractIsAlreadyInMigrationStage: AugmentedError<ApiType>;
      /**
       * Contract is in migration stage.
       **/
      ContractIsInMigrationStage: AugmentedError<ApiType>;
      /**
       * Contract is not on migration stage.
       **/
      ContractIsNotInMigrationStage: AugmentedError<ApiType>;
      /**
       * Duplicated request.
       **/
      DuplicatedRequest: AugmentedError<ApiType>;
      /**
       * Ethereum ABI decoding error.
       **/
      EthAbiDecodingError: AugmentedError<ApiType>;
      /**
       * Ethereum ABI encoding error.
       **/
      EthAbiEncodingError: AugmentedError<ApiType>;
      /**
       * Ethereum log was removed.
       **/
      EthLogWasRemoved: AugmentedError<ApiType>;
      /**
       * Ethereum transaction is failed.
       **/
      EthTransactionIsFailed: AugmentedError<ApiType>;
      /**
       * Ethereum transaction is pending.
       **/
      EthTransactionIsPending: AugmentedError<ApiType>;
      /**
       * Ethereum transaction is succeeded.
       **/
      EthTransactionIsSucceeded: AugmentedError<ApiType>;
      /**
       * Expected Ethereum network.
       **/
      ExpectedEthNetwork: AugmentedError<ApiType>;
      /**
       * Expected an incoming request.
       **/
      ExpectedIncomingRequest: AugmentedError<ApiType>;
      /**
       * Expected an outgoing request.
       **/
      ExpectedOutgoingRequest: AugmentedError<ApiType>;
      /**
       * Expected pending request.
       **/
      ExpectedPendingRequest: AugmentedError<ApiType>;
      /**
       * A transfer of XOR was expected.
       **/
      ExpectedXORTransfer: AugmentedError<ApiType>;
      /**
       * Probably denomination factor is too big and we can't apply it
       **/
      FailedToApplyDenomination: AugmentedError<ApiType>;
      /**
       * Failed to get an asset by id.
       **/
      FailedToGetAssetById: AugmentedError<ApiType>;
      /**
       * Failed to load substrate block header.
       **/
      FailedToLoadBlockHeader: AugmentedError<ApiType>;
      /**
       * Failed to load current sidechain height.
       **/
      FailedToLoadCurrentSidechainHeight: AugmentedError<ApiType>;
      /**
       * Failed to load substrate finalized head.
       **/
      FailedToLoadFinalizedHead: AugmentedError<ApiType>;
      /**
       * Failed to query sidechain 'used' variable.
       **/
      FailedToLoadIsUsed: AugmentedError<ApiType>;
      /**
       * Failed to load token precision.
       **/
      FailedToLoadPrecision: AugmentedError<ApiType>;
      /**
       * Failed to load sidechain node parameters.
       **/
      FailedToLoadSidechainNodeParams: AugmentedError<ApiType>;
      /**
       * Failed to load sidechain transaction.
       **/
      FailedToLoadTransaction: AugmentedError<ApiType>;
      /**
       * Failed to parse transaction hash in a call.
       **/
      FailedToParseTxHashInCall: AugmentedError<ApiType>;
      /**
       * Failed to send signed message.
       **/
      FailedToSendSignedTransaction: AugmentedError<ApiType>;
      /**
       * Failed to sign message.
       **/
      FailedToSignMessage: AugmentedError<ApiType>;
      /**
       * Failed to unreserve asset.
       **/
      FailedToUnreserve: AugmentedError<ApiType>;
      /**
       * Forbidden.
       **/
      Forbidden: AugmentedError<ApiType>;
      /**
       * Error fetching HTTP.
       **/
      HttpFetchingError: AugmentedError<ApiType>;
      /**
       * Increment account reference error.
       **/
      IncRefError: AugmentedError<ApiType>;
      /**
       * Invalid account id value.
       **/
      InvalidAccountId: AugmentedError<ApiType>;
      /**
       * Invalid address value.
       **/
      InvalidAddress: AugmentedError<ApiType>;
      /**
       * Invalid amount value.
       **/
      InvalidAmount: AugmentedError<ApiType>;
      /**
       * Invalid array value.
       **/
      InvalidArray: AugmentedError<ApiType>;
      /**
       * Invalid asset id value.
       **/
      InvalidAssetId: AugmentedError<ApiType>;
      /**
       * Invalid balance value.
       **/
      InvalidBalance: AugmentedError<ApiType>;
      /**
       * Invalid bool value.
       **/
      InvalidBool: AugmentedError<ApiType>;
      /**
       * Invalid byte value.
       **/
      InvalidByte: AugmentedError<ApiType>;
      /**
       * Invalid contract input.
       **/
      InvalidContractInput: AugmentedError<ApiType>;
      /**
       * Invalid contract function input.
       **/
      InvalidFunctionInput: AugmentedError<ApiType>;
      /**
       * Invalid h256 value.
       **/
      InvalidH256: AugmentedError<ApiType>;
      /**
       * Invalid peer signature.
       **/
      InvalidSignature: AugmentedError<ApiType>;
      /**
       * Invalid string value.
       **/
      InvalidString: AugmentedError<ApiType>;
      /**
       * Invalid uint value.
       **/
      InvalidUint: AugmentedError<ApiType>;
      /**
       * Failed to deserialize JSON.
       **/
      JsonDeserializationError: AugmentedError<ApiType>;
      /**
       * Failed to serialize JSON.
       **/
      JsonSerializationError: AugmentedError<ApiType>;
      /**
       * No local account for signing available.
       **/
      NoLocalAccountForSigning: AugmentedError<ApiType>;
      /**
       * Non-zero dust.
       **/
      NonZeroDust: AugmentedError<ApiType>;
      /**
       * No pending peer.
       **/
      NoPendingPeer: AugmentedError<ApiType>;
      /**
       * Not enough peers provided, need at least 1
       **/
      NotEnoughPeers: AugmentedError<ApiType>;
      /**
       * Unknown error.
       **/
      Other: AugmentedError<ApiType>;
      /**
       * Peer is already added.
       **/
      PeerIsAlreadyAdded: AugmentedError<ApiType>;
      /**
       * Failed to read value from offchain storage.
       **/
      ReadStorageError: AugmentedError<ApiType>;
      /**
       * Request was removed and refunded.
       **/
      RemovedAndRefunded: AugmentedError<ApiType>;
      /**
       * Request is already registered.
       **/
      RequestIsAlreadyRegistered: AugmentedError<ApiType>;
      /**
       * Request is not owned by the author.
       **/
      RequestIsNotOwnedByTheAuthor: AugmentedError<ApiType>;
      /**
       * Request is not ready.
       **/
      RequestIsNotReady: AugmentedError<ApiType>;
      /**
       * Request is not finalized on Sidechain.
       **/
      RequestNotFinalizedOnSidechain: AugmentedError<ApiType>;
      /**
       * The sidechain asset is alredy registered.
       **/
      SidechainAssetIsAlreadyRegistered: AugmentedError<ApiType>;
      /**
       * Token is already added.
       **/
      TokenIsAlreadyAdded: AugmentedError<ApiType>;
      /**
       * Token is not owned by the author.
       **/
      TokenIsNotOwnedByTheAuthor: AugmentedError<ApiType>;
      /**
       * Too many pending peers.
       **/
      TooManyPendingPeers: AugmentedError<ApiType>;
      /**
       * Sidechain transaction might have failed due to gas limit.
       **/
      TransactionMightHaveFailedDueToGasLimit: AugmentedError<ApiType>;
      /**
       * Unable to pay transfer fees.
       **/
      UnableToPayFees: AugmentedError<ApiType>;
      /**
       * Functionality is unavailable.
       **/
      Unavailable: AugmentedError<ApiType>;
      /**
       * Unknown asset id.
       **/
      UnknownAssetId: AugmentedError<ApiType>;
      /**
       * Unknown contract address.
       **/
      UnknownContractAddress: AugmentedError<ApiType>;
      /**
       * Unknown contract event.
       **/
      UnknownEvent: AugmentedError<ApiType>;
      /**
       * Unknown method ID.
       **/
      UnknownMethodId: AugmentedError<ApiType>;
      /**
       * Unknown network.
       **/
      UnknownNetwork: AugmentedError<ApiType>;
      /**
       * Unknown peer address.
       **/
      UnknownPeerAddress: AugmentedError<ApiType>;
      /**
       * Unknown peer id.
       **/
      UnknownPeerId: AugmentedError<ApiType>;
      /**
       * Unknown request.
       **/
      UnknownRequest: AugmentedError<ApiType>;
      /**
       * Unknown token address.
       **/
      UnknownTokenAddress: AugmentedError<ApiType>;
      /**
       * Bridge needs to have at least 3 peers for migration. Add new peer
       **/
      UnsafeMigration: AugmentedError<ApiType>;
      /**
       * Unsupported asset id.
       **/
      UnsupportedAssetId: AugmentedError<ApiType>;
      /**
       * Unsupported asset precision.
       **/
      UnsupportedAssetPrecision: AugmentedError<ApiType>;
      /**
       * Token is unsupported.
       **/
      UnsupportedToken: AugmentedError<ApiType>;
      /**
       * Wrong pending peer.
       **/
      WrongPendingPeer: AugmentedError<ApiType>;
    };
    evmFungibleApp: {
      AppAlreadyRegistered: AugmentedError<ApiType>;
      AppIsNotRegistered: AugmentedError<ApiType>;
      BaseFeeIsNotAvailable: AugmentedError<ApiType>;
      BaseFeeLifetimeExceeded: AugmentedError<ApiType>;
      /**
       * Call encoding failed.
       **/
      CallEncodeFailed: AugmentedError<ApiType>;
      InvalidBaseFeeUpdate: AugmentedError<ApiType>;
      InvalidNetwork: AugmentedError<ApiType>;
      InvalidSignature: AugmentedError<ApiType>;
      NotEnoughFeesCollected: AugmentedError<ApiType>;
      NotEnoughFunds: AugmentedError<ApiType>;
      NothingToClaim: AugmentedError<ApiType>;
      TokenAlreadyRegistered: AugmentedError<ApiType>;
      TokenIsNotRegistered: AugmentedError<ApiType>;
      /**
       * Amount must be > 0
       **/
      WrongAmount: AugmentedError<ApiType>;
      /**
       * Wrong bridge request for refund
       **/
      WrongRequest: AugmentedError<ApiType>;
      /**
       * Wrong bridge request status, must be Failed
       **/
      WrongRequestStatus: AugmentedError<ApiType>;
    };
    extendedAssets: {
      /**
       * All involved users of a regulated asset operation should hold valid SBT
       **/
      AllInvolvedUsersShouldHoldValidSBT: AugmentedError<ApiType>;
      /**
       * Asset is already regulated
       **/
      AssetAlreadyRegulated: AugmentedError<ApiType>;
      /**
       * All Allowed assets must be regulated
       **/
      AssetNotRegulated: AugmentedError<ApiType>;
      /**
       * Invalid External URL
       **/
      InvalidExternalUrl: AugmentedError<ApiType>;
      /**
       * Not allowed to regulate SBT
       **/
      NotAllowedToRegulateSoulboundAsset: AugmentedError<ApiType>;
      /**
       * Caller is not the owner of the SBT
       **/
      NotSBTOwner: AugmentedError<ApiType>;
      /**
       * Only asset owner can regulate
       **/
      OnlyAssetOwnerCanRegulate: AugmentedError<ApiType>;
      /**
       * All Allowed assets must be owned by SBT issuer
       **/
      RegulatedAssetNoOwnedBySBTIssuer: AugmentedError<ApiType>;
      /**
       * Regulated Assets per SBT exceeded
       **/
      RegulatedAssetsPerSBTExceeded: AugmentedError<ApiType>;
      /**
       * SBT not found
       **/
      SBTNotFound: AugmentedError<ApiType>;
      /**
       * SBT is not operationable by any asset operation
       **/
      SoulboundAssetNotOperationable: AugmentedError<ApiType>;
      /**
       * SBT is not transferable
       **/
      SoulboundAssetNotTransferable: AugmentedError<ApiType>;
    };
    farming: {
      /**
       * Increment account reference error.
       **/
      IncRefError: AugmentedError<ApiType>;
    };
    faucet: {
      /**
       * Amount is above limit.
       **/
      AmountAboveLimit: AugmentedError<ApiType>;
      /**
       * Asset is not supported.
       **/
      AssetNotSupported: AugmentedError<ApiType>;
      /**
       * Not enough reserves.
       **/
      NotEnoughReserves: AugmentedError<ApiType>;
    };
    grandpa: {
      /**
       * Attempt to signal GRANDPA change with one already pending.
       **/
      ChangePending: AugmentedError<ApiType>;
      /**
       * A given equivocation report is valid but already previously reported.
       **/
      DuplicateOffenceReport: AugmentedError<ApiType>;
      /**
       * An equivocation proof provided as part of an equivocation report is invalid.
       **/
      InvalidEquivocationProof: AugmentedError<ApiType>;
      /**
       * A key ownership proof provided as part of an equivocation report is invalid.
       **/
      InvalidKeyOwnershipProof: AugmentedError<ApiType>;
      /**
       * Attempt to signal GRANDPA pause when the authority set isn't live
       * (either paused or already pending pause).
       **/
      PauseFailed: AugmentedError<ApiType>;
      /**
       * Attempt to signal GRANDPA resume when the authority set isn't paused
       * (either live or already pending resume).
       **/
      ResumeFailed: AugmentedError<ApiType>;
      /**
       * Cannot signal forced change so soon after last.
       **/
      TooSoon: AugmentedError<ApiType>;
    };
    hermesGovernancePlatform: {
      /**
       * AlreadyVoted,
       **/
      AlreadyVoted: AugmentedError<ApiType>;
      /**
       * Duplicate options
       **/
      DuplicateOptions: AugmentedError<ApiType>;
      /**
       * Funds Already Withdrawn
       **/
      FundsAlreadyWithdrawn: AugmentedError<ApiType>;
      /**
       * Invalid End Timestamp,
       **/
      InvalidEndTimestamp: AugmentedError<ApiType>;
      /**
       * Invalid Maximum Duration Of Poll
       **/
      InvalidMaximumDurationOfPoll: AugmentedError<ApiType>;
      /**
       * Invalid Minimum Duration Of Poll
       **/
      InvalidMinimumDurationOfPoll: AugmentedError<ApiType>;
      /**
       * Invalid Option
       **/
      InvalidOption: AugmentedError<ApiType>;
      /**
       * Invalid Start Timestamp
       **/
      InvalidStartTimestamp: AugmentedError<ApiType>;
      /**
       * Invalid Voting Options
       **/
      InvalidVotingOptions: AugmentedError<ApiType>;
      /**
       * Not Enough Hermes For Creating Poll
       **/
      NotEnoughHermesForCreatingPoll: AugmentedError<ApiType>;
      /**
       * Not Enough Hermes For Voting
       **/
      NotEnoughHermesForVoting: AugmentedError<ApiType>;
      /**
       * Not Voted
       **/
      NotVoted: AugmentedError<ApiType>;
      /**
       * Poll Does Not Exist,
       **/
      PollDoesNotExist: AugmentedError<ApiType>;
      /**
       * Poll Is Finished
       **/
      PollIsFinished: AugmentedError<ApiType>;
      /**
       * Poll Is Not Finished
       **/
      PollIsNotFinished: AugmentedError<ApiType>;
      /**
       * Poll Is Not Started
       **/
      PollIsNotStarted: AugmentedError<ApiType>;
      /**
       * Too Many Voting Options
       **/
      TooManyVotingOptions: AugmentedError<ApiType>;
      /**
       * Unauthorized
       **/
      Unauthorized: AugmentedError<ApiType>;
      /**
       * You Are Not Creator
       **/
      YouAreNotCreator: AugmentedError<ApiType>;
    };
    identity: {
      /**
       * Account ID is already named.
       **/
      AlreadyClaimed: AugmentedError<ApiType>;
      /**
       * Empty index.
       **/
      EmptyIndex: AugmentedError<ApiType>;
      /**
       * Fee is changed.
       **/
      FeeChanged: AugmentedError<ApiType>;
      /**
       * The index is invalid.
       **/
      InvalidIndex: AugmentedError<ApiType>;
      /**
       * Invalid judgement.
       **/
      InvalidJudgement: AugmentedError<ApiType>;
      /**
       * The target is invalid.
       **/
      InvalidTarget: AugmentedError<ApiType>;
      /**
       * The provided judgement was for a different identity.
       **/
      JudgementForDifferentIdentity: AugmentedError<ApiType>;
      /**
       * Judgement given.
       **/
      JudgementGiven: AugmentedError<ApiType>;
      /**
       * Error that occurs when there is an issue paying for judgement.
       **/
      JudgementPaymentFailed: AugmentedError<ApiType>;
      /**
       * No identity found.
       **/
      NoIdentity: AugmentedError<ApiType>;
      /**
       * Account isn't found.
       **/
      NotFound: AugmentedError<ApiType>;
      /**
       * Account isn't named.
       **/
      NotNamed: AugmentedError<ApiType>;
      /**
       * Sub-account isn't owned by sender.
       **/
      NotOwned: AugmentedError<ApiType>;
      /**
       * Sender is not a sub-account.
       **/
      NotSub: AugmentedError<ApiType>;
      /**
       * Sticky judgement.
       **/
      StickyJudgement: AugmentedError<ApiType>;
      /**
       * Too many additional fields.
       **/
      TooManyFields: AugmentedError<ApiType>;
      /**
       * Maximum amount of registrars reached. Cannot add any more.
       **/
      TooManyRegistrars: AugmentedError<ApiType>;
      /**
       * Too many subs-accounts.
       **/
      TooManySubAccounts: AugmentedError<ApiType>;
    };
    imOnline: {
      /**
       * Duplicated heartbeat.
       **/
      DuplicatedHeartbeat: AugmentedError<ApiType>;
      /**
       * Non existent public key.
       **/
      InvalidKey: AugmentedError<ApiType>;
    };
    irohaMigration: {
      /**
       * Iroha account is already migrated
       **/
      AccountAlreadyMigrated: AugmentedError<ApiType>;
      /**
       * Iroha account is not found
       **/
      AccountNotFound: AugmentedError<ApiType>;
      /**
       * Milti-signature account creation failed
       **/
      MultiSigCreationFailed: AugmentedError<ApiType>;
      /**
       * Public key is already used
       **/
      PublicKeyAlreadyUsed: AugmentedError<ApiType>;
      /**
       * Public key is not found
       **/
      PublicKeyNotFound: AugmentedError<ApiType>;
      /**
       * Failed to parse public key
       **/
      PublicKeyParsingFailed: AugmentedError<ApiType>;
      /**
       * Referral migration failed
       **/
      ReferralMigrationFailed: AugmentedError<ApiType>;
      /**
       * Signatory addition to multi-signature account failed
       **/
      SignatoryAdditionFailed: AugmentedError<ApiType>;
      /**
       * Failed to parse signature
       **/
      SignatureParsingFailed: AugmentedError<ApiType>;
      /**
       * Failed to verify signature
       **/
      SignatureVerificationFailed: AugmentedError<ApiType>;
    };
    jettonApp: {
      AppAlreadyRegistered: AugmentedError<ApiType>;
      AppIsNotRegistered: AugmentedError<ApiType>;
      /**
       * Call encoding failed.
       **/
      CallEncodeFailed: AugmentedError<ApiType>;
      InvalidNetwork: AugmentedError<ApiType>;
      NotEnoughFunds: AugmentedError<ApiType>;
      OperationNotSupported: AugmentedError<ApiType>;
      TokenAlreadyRegistered: AugmentedError<ApiType>;
      TokenIsNotRegistered: AugmentedError<ApiType>;
      WrongAccountPrefix: AugmentedError<ApiType>;
      /**
       * Amount must be > 0
       **/
      WrongAmount: AugmentedError<ApiType>;
      /**
       * Wrong bridge request for refund
       **/
      WrongRequest: AugmentedError<ApiType>;
      /**
       * Wrong bridge request status, must be Failed
       **/
      WrongRequestStatus: AugmentedError<ApiType>;
    };
    kensetsu: {
      AccrueWrongTime: AugmentedError<ApiType>;
      ArithmeticError: AugmentedError<ApiType>;
      /**
       * Too many CDPs per user
       **/
      CDPLimitPerUser: AugmentedError<ApiType>;
      CDPNotFound: AugmentedError<ApiType>;
      CDPSafe: AugmentedError<ApiType>;
      CDPUnsafe: AugmentedError<ApiType>;
      CollateralBelowMinimal: AugmentedError<ApiType>;
      CollateralInfoNotFound: AugmentedError<ApiType>;
      /**
       * Collateral must be registered in PriceTools.
       **/
      CollateralNotRegisteredInPriceTools: AugmentedError<ApiType>;
      HardCapSupply: AugmentedError<ApiType>;
      /**
       * Liquidation limit reached
       **/
      LiquidationLimit: AugmentedError<ApiType>;
      OperationNotPermitted: AugmentedError<ApiType>;
      StablecoinInfoNotFound: AugmentedError<ApiType>;
      SymbolNotEnabledByOracle: AugmentedError<ApiType>;
      /**
       * Uncollected stability fee is too small for accrue
       **/
      UncollectedStabilityFeeTooSmall: AugmentedError<ApiType>;
      WrongAssetId: AugmentedError<ApiType>;
      /**
       * Wrong borrow amounts
       **/
      WrongBorrowAmounts: AugmentedError<ApiType>;
      /**
       * Liquidation lot set in risk parameters is zero, cannot liquidate
       **/
      ZeroLiquidationLot: AugmentedError<ApiType>;
    };
    liquidityProxy: {
      /**
       * Unable to aggregate the liquidity from sources.
       **/
      AggregationError: AugmentedError<ApiType>;
      /**
       * Internal error. Liquidity source returned wrong liquidity.
       **/
      BadLiquidity: AugmentedError<ApiType>;
      /**
       * Specified parameters lead to arithmetic error
       **/
      CalculationError: AugmentedError<ApiType>;
      /**
       * Failure while calculating price ignoring non-linearity of liquidity source.
       **/
      FailedToCalculatePriceWithoutImpact: AugmentedError<ApiType>;
      /**
       * Failure while transferring commission to ADAR account
       **/
      FailedToTransferAdarCommission: AugmentedError<ApiType>;
      /**
       * Selected filtering request is not allowed.
       **/
      ForbiddenFilter: AugmentedError<ApiType>;
      /**
       * Sender don't have enough asset balance
       **/
      InsufficientBalance: AugmentedError<ApiType>;
      /**
       * None of the sources has enough reserves to execute a trade
       **/
      InsufficientLiquidity: AugmentedError<ApiType>;
      /**
       * ADAR commission ratio exceeds 1
       **/
      InvalidADARCommissionRatio: AugmentedError<ApiType>;
      /**
       * Fee value outside of the basis points range [0..10000]
       **/
      InvalidFeeValue: AugmentedError<ApiType>;
      /**
       * Information about swap batch receivers is invalid
       **/
      InvalidReceiversInfo: AugmentedError<ApiType>;
      /**
       * Liquidity source is already disabled
       **/
      LiquiditySourceAlreadyDisabled: AugmentedError<ApiType>;
      /**
       * Liquidity source is already enabled
       **/
      LiquiditySourceAlreadyEnabled: AugmentedError<ApiType>;
      /**
       * Max fee exceeded
       **/
      MaxFeeExceeded: AugmentedError<ApiType>;
      /**
       * Slippage either exceeds minimum tolerated output or maximum tolerated input.
       **/
      SlippageNotTolerated: AugmentedError<ApiType>;
      /**
       * Sender and receiver should not be the same
       **/
      TheSameSenderAndReceiver: AugmentedError<ApiType>;
      /**
       * Unable to disable liquidity source
       **/
      UnableToDisableLiquiditySource: AugmentedError<ApiType>;
      /**
       * Unable to enable liquidity source
       **/
      UnableToEnableLiquiditySource: AugmentedError<ApiType>;
      /**
       * Unable to swap indivisible assets
       **/
      UnableToSwapIndivisibleAssets: AugmentedError<ApiType>;
      /**
       * No route exists in a given DEX for given parameters to carry out the swap
       **/
      UnavailableExchangePath: AugmentedError<ApiType>;
    };
    multicollateralBondingCurvePool: {
      /**
       * An error occured during balance type conversion.
       **/
      ArithmeticError: AugmentedError<ApiType>;
      /**
       * The pool can't perform exchange on itself.
       **/
      CannotExchangeWithSelf: AugmentedError<ApiType>;
      /**
       * Liquidity source can't exchange assets with the given IDs on the given DEXId.
       **/
      CantExchange: AugmentedError<ApiType>;
      /**
       * Failure while calculating price ignoring non-linearity of liquidity source.
       **/
      FailedToCalculatePriceWithoutImpact: AugmentedError<ApiType>;
      /**
       * Could not calculate fee including sell penalty.
       **/
      FeeCalculationFailed: AugmentedError<ApiType>;
      /**
       * Free reserves account is not set
       **/
      FreeReservesAccountNotSet: AugmentedError<ApiType>;
      /**
       * Increment account reference error.
       **/
      IncRefError: AugmentedError<ApiType>;
      /**
       * It's not enough reserves in the pool to perform the operation.
       **/
      NotEnoughReserves: AugmentedError<ApiType>;
      /**
       * Either user has no pending rewards or current limit is exceeded at the moment.
       **/
      NothingToClaim: AugmentedError<ApiType>;
      /**
       * Attempt to initialize pool for pair that already exists.
       **/
      PoolAlreadyInitializedForPair: AugmentedError<ApiType>;
      /**
       * Attempt to get info for uninitialized pool.
       **/
      PoolNotInitialized: AugmentedError<ApiType>;
      /**
       * An error occurred while calculating the price.
       **/
      PriceCalculationFailed: AugmentedError<ApiType>;
      /**
       * User has pending reward, but rewards supply is insufficient at the moment.
       **/
      RewardsSupplyShortage: AugmentedError<ApiType>;
      /**
       * Indicated limits for slippage has not been met during transaction execution.
       **/
      SlippageLimitExceeded: AugmentedError<ApiType>;
      /**
       * Indicated collateral asset is not enabled for pool.
       **/
      UnsupportedCollateralAssetId: AugmentedError<ApiType>;
    };
    multisig: {
      /**
       * Call is already approved by this signatory.
       **/
      AlreadyApproved: AugmentedError<ApiType>;
      /**
       * The data to be stored is already stored.
       **/
      AlreadyStored: AugmentedError<ApiType>;
      /**
       * The maximum weight information provided was too low.
       **/
      MaxWeightTooLow: AugmentedError<ApiType>;
      /**
       * Threshold must be 2 or greater.
       **/
      MinimumThreshold: AugmentedError<ApiType>;
      /**
       * Call doesn't need any (more) approvals.
       **/
      NoApprovalsNeeded: AugmentedError<ApiType>;
      /**
       * Multisig operation not found when attempting to cancel.
       **/
      NotFound: AugmentedError<ApiType>;
      /**
       * No timepoint was given, yet the multisig operation is already underway.
       **/
      NoTimepoint: AugmentedError<ApiType>;
      /**
       * Only the account that originally created the multisig is able to cancel it.
       **/
      NotOwner: AugmentedError<ApiType>;
      /**
       * The sender was contained in the other signatories; it shouldn't be.
       **/
      SenderInSignatories: AugmentedError<ApiType>;
      /**
       * The signatories were provided out of order; they should be ordered.
       **/
      SignatoriesOutOfOrder: AugmentedError<ApiType>;
      /**
       * There are too few signatories in the list.
       **/
      TooFewSignatories: AugmentedError<ApiType>;
      /**
       * There are too many signatories in the list.
       **/
      TooManySignatories: AugmentedError<ApiType>;
      /**
       * A timepoint was given, yet no multisig operation is underway.
       **/
      UnexpectedTimepoint: AugmentedError<ApiType>;
      /**
       * A different timepoint was given to the multisig operation that is underway.
       **/
      WrongTimepoint: AugmentedError<ApiType>;
    };
    multisigVerifier: {
      CommitmentNotFoundInDigest: AugmentedError<ApiType>;
      DuplicatedPeer: AugmentedError<ApiType>;
      InvalidInitParams: AugmentedError<ApiType>;
      InvalidNetworkId: AugmentedError<ApiType>;
      InvalidNumberOfSignatures: AugmentedError<ApiType>;
      InvalidSignature: AugmentedError<ApiType>;
      NetworkNotInitialized: AugmentedError<ApiType>;
      NoSuchPeer: AugmentedError<ApiType>;
      NotTrustedPeerSignature: AugmentedError<ApiType>;
      PeerExists: AugmentedError<ApiType>;
      TooMuchPeers: AugmentedError<ApiType>;
    };
    oracleProxy: {
      OracleAlreadyDisabled: AugmentedError<ApiType>;
      OracleAlreadyEnabled: AugmentedError<ApiType>;
    };
    orderBook: {
      /**
       * An error occurred while calculating the amount
       **/
      AmountCalculationFailed: AugmentedError<ApiType>;
      /**
       * Expiration schedule for expiration block is full
       **/
      BlockScheduleFull: AugmentedError<ApiType>;
      /**
       * At the moment, Users cannot cancel their limit orders in the current order book
       **/
      CancellationOfLimitOrdersIsForbidden: AugmentedError<ApiType>;
      /**
       * It is impossible to delete the limit order
       **/
      DeleteLimitOrderError: AugmentedError<ApiType>;
      /**
       * Could not find expiration in given block schedule
       **/
      ExpirationNotFound: AugmentedError<ApiType>;
      /**
       * It is possible to delete an order-book only with the statuses: OnlyCancel or Stop
       **/
      ForbiddenStatusToDeleteOrderBook: AugmentedError<ApiType>;
      /**
       * It is possible to update an order-book only with the statuses: OnlyCancel or Stop
       **/
      ForbiddenStatusToUpdateOrderBook: AugmentedError<ApiType>;
      /**
       * Cannot create order book with equal base and target assets
       **/
      ForbiddenToCreateOrderBookWithSameAssets: AugmentedError<ApiType>;
      /**
       * Invalid asset
       **/
      InvalidAsset: AugmentedError<ApiType>;
      /**
       * Lifespan exceeds defined limits
       **/
      InvalidLifespan: AugmentedError<ApiType>;
      /**
       * The limit order price does not meet the requirements
       **/
      InvalidLimitOrderPrice: AugmentedError<ApiType>;
      /**
       * Invalid max lot size
       **/
      InvalidMaxLotSize: AugmentedError<ApiType>;
      /**
       * Invalid min lot size
       **/
      InvalidMinLotSize: AugmentedError<ApiType>;
      /**
       * The order amount (limit or market) does not meet the requirements
       **/
      InvalidOrderAmount: AugmentedError<ApiType>;
      /**
       * Invalid order book id
       **/
      InvalidOrderBookId: AugmentedError<ApiType>;
      /**
       * Invalid step lot size
       **/
      InvalidStepLotSize: AugmentedError<ApiType>;
      /**
       * Invalid tick size
       **/
      InvalidTickSize: AugmentedError<ApiType>;
      /**
       * Limit order already exists for this trading pair and order id
       **/
      LimitOrderAlreadyExists: AugmentedError<ApiType>;
      /**
       * User cannot set the price of limit order too far from actual market price
       **/
      LimitOrderPriceIsTooFarFromSpread: AugmentedError<ApiType>;
      /**
       * It is impossible to insert the limit order because the bounds have been reached
       **/
      LimitOrderStorageOverflow: AugmentedError<ApiType>;
      /**
       * Market orders are allowed only for indivisible assets
       **/
      MarketOrdersAllowedOnlyForIndivisibleAssets: AugmentedError<ApiType>;
      /**
       * Max lot size cannot be more that total supply of base asset
       **/
      MaxLotSizeIsMoreThanTotalSupply: AugmentedError<ApiType>;
      /**
       * There are no aggregated bids/asks for the order book
       **/
      NoAggregatedData: AugmentedError<ApiType>;
      /**
       * There are no bids/asks for the price
       **/
      NoDataForPrice: AugmentedError<ApiType>;
      /**
       * Orderbooks cannot be created with given dex id.
       **/
      NotAllowedDEXId: AugmentedError<ApiType>;
      /**
       * The asset is not allowed to be quote. Only the dex base asset can be a quote asset for order book
       **/
      NotAllowedQuoteAsset: AugmentedError<ApiType>;
      /**
       * There is not enough liquidity in the order book to cover the deal
       **/
      NotEnoughLiquidityInOrderBook: AugmentedError<ApiType>;
      /**
       * Order book already exists for this trading pair
       **/
      OrderBookAlreadyExists: AugmentedError<ApiType>;
      /**
       * Order Book is locked for technical maintenance. Try again later.
       **/
      OrderBookIsLocked: AugmentedError<ApiType>;
      /**
       * It is possible to delete only empty order-book
       **/
      OrderBookIsNotEmpty: AugmentedError<ApiType>;
      /**
       * It is impossible to place the limit order because bounds of the max count of prices for the side have been reached
       **/
      OrderBookReachedMaxCountOfPricesForSide: AugmentedError<ApiType>;
      /**
       * At the moment, Users cannot place new limit orders in the current order book
       **/
      PlacementOfLimitOrdersIsForbidden: AugmentedError<ApiType>;
      /**
       * An error occurred while calculating the price
       **/
      PriceCalculationFailed: AugmentedError<ApiType>;
      /**
       * It is impossible to place the limit order because bounds of the max count of orders at the current price have been reached
       **/
      PriceReachedMaxCountOfLimitOrders: AugmentedError<ApiType>;
      /**
       * Indicated limit for slippage has not been met during transaction execution.
       **/
      SlippageLimitExceeded: AugmentedError<ApiType>;
      /**
       * Synthetic assets are forbidden for order book.
       **/
      SyntheticAssetIsForbidden: AugmentedError<ApiType>;
      /**
       * Tick size & step lot size are too big and their multiplication overflows Balance
       **/
      TickSizeAndStepLotSizeAreTooBig: AugmentedError<ApiType>;
      /**
       * Product of tick and step lot sizes goes out of precision. It must be accurately represented by fixed-precision float to prevent rounding errors. I.e. the product should not have more than 18 digits after the comma.
       **/
      TickSizeAndStepLotSizeLosePrecision: AugmentedError<ApiType>;
      /**
       * At the moment, Trading is forbidden in the current order book
       **/
      TradingIsForbidden: AugmentedError<ApiType>;
      /**
       * Unauthorized action
       **/
      Unauthorized: AugmentedError<ApiType>;
      /**
       * Limit order does not exist for this trading pair and order id
       **/
      UnknownLimitOrder: AugmentedError<ApiType>;
      /**
       * Order book does not exist for this trading pair
       **/
      UnknownOrderBook: AugmentedError<ApiType>;
      /**
       * It is impossible to update the limit order
       **/
      UpdateLimitOrderError: AugmentedError<ApiType>;
      /**
       * User has the max available count of open limit orders in the current order book
       **/
      UserHasMaxCountOfOpenedOrders: AugmentedError<ApiType>;
      /**
       * User cannot create an order book with NFT if they don't have NFT
       **/
      UserHasNoNft: AugmentedError<ApiType>;
    };
    parachainBridgeApp: {
      AppAlreadyRegistered: AugmentedError<ApiType>;
      AppIsNotRegistered: AugmentedError<ApiType>;
      /**
       * Call encoding failed.
       **/
      CallEncodeFailed: AugmentedError<ApiType>;
      InvalidDestinationParachain: AugmentedError<ApiType>;
      InvalidDestinationParams: AugmentedError<ApiType>;
      InvalidNetwork: AugmentedError<ApiType>;
      MessageIdNotFound: AugmentedError<ApiType>;
      NotEnoughFunds: AugmentedError<ApiType>;
      NotRelayTransferableAsset: AugmentedError<ApiType>;
      RelaychainAssetNotRegistered: AugmentedError<ApiType>;
      RelaychainAssetRegistered: AugmentedError<ApiType>;
      TokenAlreadyRegistered: AugmentedError<ApiType>;
      TokenIsNotRegistered: AugmentedError<ApiType>;
      TransferLimitReached: AugmentedError<ApiType>;
      UnknownPrecision: AugmentedError<ApiType>;
      /**
       * Amount must be > 0
       **/
      WrongAmount: AugmentedError<ApiType>;
    };
    permissions: {
      /**
       * The account either doesn't have the permission.
       **/
      Forbidden: AugmentedError<ApiType>;
      /**
       * Increment account reference error.
       **/
      IncRefError: AugmentedError<ApiType>;
      /**
       * Permission already exists in the system.
       **/
      PermissionAlreadyExists: AugmentedError<ApiType>;
      /**
       * Account doesn't hold a permission.
       **/
      PermissionNotFound: AugmentedError<ApiType>;
      /**
       * Account doesn't own a permission.
       **/
      PermissionNotOwned: AugmentedError<ApiType>;
    };
    poolXYK: {
      /**
       * The account balance is invalid.
       **/
      AccountBalanceIsInvalid: AugmentedError<ApiType>;
      /**
       * Error in asset decoding.
       **/
      AssetDecodingError: AugmentedError<ApiType>;
      /**
       * Asset Regulations Check failed
       **/
      AssetRegulationsCheckFailed: AugmentedError<ApiType>;
      /**
       * In this case assets must not be same.
       **/
      AssetsMustNotBeSame: AugmentedError<ApiType>;
      /**
       * The base asset is not matched with any asset arguments.
       **/
      BaseAssetIsNotMatchedWithAnyAssetArguments: AugmentedError<ApiType>;
      /**
       * The values that is calculated is out out of required bounds.
       **/
      CalculatedValueIsNotMeetsRequiredBoundaries: AugmentedError<ApiType>;
      /**
       * Calculated value is out of desired bounds.
       **/
      CalculatedValueIsOutOfDesiredBounds: AugmentedError<ApiType>;
      /**
       * Some values need to be same, the destination amount must be same.
       **/
      DestinationAmountMustBeSame: AugmentedError<ApiType>;
      /**
       * Destination amount of liquidity is not large enough.
       **/
      DestinationAmountOfLiquidityIsNotLargeEnough: AugmentedError<ApiType>;
      /**
       * Destination base balance is not large enough.
       **/
      DestinationBaseBalanceIsNotLargeEnough: AugmentedError<ApiType>;
      /**
       * Destination base balance is not large enough.
       **/
      DestinationTargetBalanceIsNotLargeEnough: AugmentedError<ApiType>;
      /**
       * It is not allowed to initialize pools in this Dex
       **/
      DexIsForbidden: AugmentedError<ApiType>;
      /**
       * Failure while calculating price ignoring non-linearity of liquidity source.
       **/
      FailedToCalculatePriceWithoutImpact: AugmentedError<ApiType>;
      /**
       * The fee account is invalid.
       **/
      FeeAccountIsInvalid: AugmentedError<ApiType>;
      /**
       * Math calculation with fixed number has failed to complete.
       **/
      FixedWrapperCalculationFailed: AugmentedError<ApiType>;
      /**
       * In this case getting fee from destination is impossible.
       **/
      GettingFeeFromDestinationIsImpossible: AugmentedError<ApiType>;
      /**
       * Impossible to decide asset pair amounts.
       **/
      ImpossibleToDecideAssetPairAmounts: AugmentedError<ApiType>;
      /**
       * Impossible to decide deposit liquidity amounts.
       **/
      ImpossibleToDecideDepositLiquidityAmounts: AugmentedError<ApiType>;
      /**
       * It is impossible to decide valid pair values from range for this pool.
       **/
      ImpossibleToDecideValidPairValuesFromRangeForThisPool: AugmentedError<ApiType>;
      /**
       * Impossible to decide withdraw liquidity amounts.
       **/
      ImpossibleToDecideWithdrawLiquidityAmounts: AugmentedError<ApiType>;
      /**
       * Couldn't increase reference counter for the account that adds liquidity.
       * It is expected to never happen because if the account has funds to add liquidity, it has a provider from balances.
       **/
      IncRefError: AugmentedError<ApiType>;
      /**
       * Initial liquidity deposit ratio must be defined.
       **/
      InitialLiqudityDepositRatioMustBeDefined: AugmentedError<ApiType>;
      /**
       * Asset for liquidity marking is invalid.
       **/
      InvalidAssetForLiquidityMarking: AugmentedError<ApiType>;
      /**
       * Invalid deposit liquidity base asset amount.
       **/
      InvalidDepositLiquidityBasicAssetAmount: AugmentedError<ApiType>;
      /**
       * Invalid deposit liquidity destination amount.
       **/
      InvalidDepositLiquidityDestinationAmount: AugmentedError<ApiType>;
      /**
       * Invalid deposit liquidity target asset amount.
       **/
      InvalidDepositLiquidityTargetAssetAmount: AugmentedError<ApiType>;
      /**
       * The minimum bound values of balance are invalid.
       **/
      InvalidMinimumBoundValueOfBalance: AugmentedError<ApiType>;
      /**
       * Invalid withdraw liquidity base asset amount.
       **/
      InvalidWithdrawLiquidityBasicAssetAmount: AugmentedError<ApiType>;
      /**
       * Invalid withdraw liquidity target asset amount.
       **/
      InvalidWithdrawLiquidityTargetAssetAmount: AugmentedError<ApiType>;
      /**
       * Not enough liquidity out of farming to withdraw
       **/
      NotEnoughLiquidityOutOfFarming: AugmentedError<ApiType>;
      /**
       * Output asset reserves is not enough
       **/
      NotEnoughOutputReserves: AugmentedError<ApiType>;
      /**
       * Not enough unlocked liquidity to withdraw
       **/
      NotEnoughUnlockedLiquidity: AugmentedError<ApiType>;
      /**
       * Pair swap action fee is smaller than recommended.
       **/
      PairSwapActionFeeIsSmallerThanRecommended: AugmentedError<ApiType>;
      /**
       * Pair swap action minimum liquidity is smaller than recommended.
       **/
      PairSwapActionMinimumLiquidityIsSmallerThanRecommended: AugmentedError<ApiType>;
      /**
       * Pool becomes invalid after operation.
       **/
      PoolBecameInvalidAfterOperation: AugmentedError<ApiType>;
      /**
       * The pool initialization is invalid and has failed.
       **/
      PoolInitializationIsInvalid: AugmentedError<ApiType>;
      /**
       * The pool is already initialized.
       **/
      PoolIsAlreadyInitialized: AugmentedError<ApiType>;
      /**
       * The pool has empty liquidity.
       **/
      PoolIsEmpty: AugmentedError<ApiType>;
      /**
       * The balance structure of pool is invalid.
       **/
      PoolIsInvalid: AugmentedError<ApiType>;
      /**
       * Pool pair ratio and pair swap ratio are different.
       **/
      PoolPairRatioAndPairSwapRatioIsDifferent: AugmentedError<ApiType>;
      /**
       * Pool token supply has reached limit of data type.
       **/
      PoolTokenSupplyOverflow: AugmentedError<ApiType>;
      /**
       * This range values is not validy by rules of correct range.
       **/
      RangeValuesIsInvalid: AugmentedError<ApiType>;
      /**
       * Restricted Chameleon pool
       **/
      RestrictedChameleonPool: AugmentedError<ApiType>;
      /**
       * Some values need to be same, the source amount must be same.
       **/
      SourceAmountMustBeSame: AugmentedError<ApiType>;
      /**
       * Source and client accounts do not match as equal.
       **/
      SourceAndClientAccountDoNotMatchAsEqual: AugmentedError<ApiType>;
      /**
       * Source balance is not large enough.
       **/
      SourceBalanceIsNotLargeEnough: AugmentedError<ApiType>;
      /**
       * Source balance of liquidity is not large enough.
       **/
      SourceBalanceOfLiquidityTokensIsNotLargeEnough: AugmentedError<ApiType>;
      /**
       * Source base amount is not large enough.
       **/
      SourceBaseAmountIsNotLargeEnough: AugmentedError<ApiType>;
      /**
       * Source base amount is too large.
       **/
      SourceBaseAmountIsTooLarge: AugmentedError<ApiType>;
      /**
       * Cannot create a pool with restricted target asset
       **/
      TargetAssetIsRestricted: AugmentedError<ApiType>;
      /**
       * Target balance is not large enough.
       **/
      TargetBalanceIsNotLargeEnough: AugmentedError<ApiType>;
      /**
       * Target base amount is not large enough.
       **/
      TargetBaseAmountIsNotLargeEnough: AugmentedError<ApiType>;
      /**
       * Technical asset is not representable.
       **/
      TechAssetIsNotRepresentable: AugmentedError<ApiType>;
      /**
       * This case if not supported by logic of pool of validation code.
       **/
      ThisCaseIsNotSupported: AugmentedError<ApiType>;
      /**
       * It is impossible to calculate fee for some pair swap operation, or other operation.
       **/
      UnableToCalculateFee: AugmentedError<ApiType>;
      /**
       * Unable to convert asset to tech asset id.
       **/
      UnableToConvertAssetToTechAssetId: AugmentedError<ApiType>;
      /**
       * Cannot create a pool with indivisible assets
       **/
      UnableToCreatePoolWithIndivisibleAssets: AugmentedError<ApiType>;
      /**
       * Unable or impossible to decide marker asset.
       **/
      UnableToDecideMarkerAsset: AugmentedError<ApiType>;
      /**
       * Unable to provide liquidity because its XOR part is lesser than the minimum value (0.007)
       **/
      UnableToDepositXorLessThanMinimum: AugmentedError<ApiType>;
      /**
       * It is not possible to derive fee account.
       **/
      UnableToDeriveFeeAccount: AugmentedError<ApiType>;
      /**
       * Unable or impossible to get asset representation.
       **/
      UnableToGetAssetRepr: AugmentedError<ApiType>;
      /**
       * Is is impossible to get balance.
       **/
      UnableToGetBalance: AugmentedError<ApiType>;
      /**
       * Unable to get XOR part from marker asset.
       **/
      UnableToGetXORPartFromMarkerAsset: AugmentedError<ApiType>;
      /**
       * Unable to proceed operation with indivisible assets
       **/
      UnableToOperateWithIndivisibleAssets: AugmentedError<ApiType>;
      /**
       * Attempt to quote via unsupported path, i.e. both output and input tokens are not XOR.
       **/
      UnsupportedQuotePath: AugmentedError<ApiType>;
      /**
       * Amount parameter has zero value, it is invalid.
       **/
      ZeroValueInAmountParameter: AugmentedError<ApiType>;
    };
    preimage: {
      /**
       * Preimage has already been noted on-chain.
       **/
      AlreadyNoted: AugmentedError<ApiType>;
      /**
       * The user is not authorized to perform this action.
       **/
      NotAuthorized: AugmentedError<ApiType>;
      /**
       * The preimage cannot be removed since it has not yet been noted.
       **/
      NotNoted: AugmentedError<ApiType>;
      /**
       * The preimage request cannot be removed since no outstanding requests exist.
       **/
      NotRequested: AugmentedError<ApiType>;
      /**
       * A preimage may not be removed when there are outstanding requests.
       **/
      Requested: AugmentedError<ApiType>;
      /**
       * Preimage is too large to store on-chain.
       **/
      TooBig: AugmentedError<ApiType>;
    };
    presto: {
      /**
       * Account has any Presto asset
       **/
      AccountHasPrestoAssets: AugmentedError<ApiType>;
      /**
       * Zero amount doesn't make sense
       **/
      AmountIsZero: AugmentedError<ApiType>;
      /**
       * This account already was added as an auditor before
       **/
      AuditorAlreadyAdded: AugmentedError<ApiType>;
      /**
       * There is no such auditor
       **/
      AuditorNotExists: AugmentedError<ApiType>;
      /**
       * Auditors storage has reached its limit
       **/
      AuditorsAreOverloaded: AugmentedError<ApiType>;
      /**
       * Error during calculations
       **/
      CalculationError: AugmentedError<ApiType>;
      /**
       * This account is not an auditor
       **/
      CallerIsNotAuditor: AugmentedError<ApiType>;
      /**
       * This account is not an owner of the crop receipt
       **/
      CallerIsNotCropReceiptOwner: AugmentedError<ApiType>;
      /**
       * This account is not a manager
       **/
      CallerIsNotManager: AugmentedError<ApiType>;
      /**
       * This account is not an owner of the request
       **/
      CallerIsNotRequestOwner: AugmentedError<ApiType>;
      /**
       * Fail of coupon public offering
       **/
      CouponOfferingFail: AugmentedError<ApiType>;
      /**
       * Account not passed KYC as creditor
       **/
      CreditorKycNotPassed: AugmentedError<ApiType>;
      /**
       * The crop receipt already has a decision
       **/
      CropReceiptAlreadyHasDecision: AugmentedError<ApiType>;
      /**
       * The crop receipt already has been rated
       **/
      CropReceiptAlreadyRated: AugmentedError<ApiType>;
      /**
       * The crop receipt cannot be closed
       **/
      CropReceiptCannotBeClosed: AugmentedError<ApiType>;
      /**
       * The crop receipt has been closed
       **/
      CropReceiptHasBeenClosed: AugmentedError<ApiType>;
      /**
       * The crop receipt is not closed yet
       **/
      CropReceiptIsNotClosedYet: AugmentedError<ApiType>;
      /**
       * There is no such crop receipt
       **/
      CropReceiptIsNotExists: AugmentedError<ApiType>;
      /**
       * This account has reached the max count of crop receipts
       **/
      CropReceiptsCountForUserOverloaded: AugmentedError<ApiType>;
      /**
       * The operation cannot be performed until the crop receipt has been rated
       **/
      CropReceiptWaitingForRate: AugmentedError<ApiType>;
      /**
       * Account not passed KYC as investor
       **/
      InvestorKycNotPassed: AugmentedError<ApiType>;
      /**
       * Account already passed KYC
       **/
      KycAlreadyPassed: AugmentedError<ApiType>;
      /**
       * Account not passed KYC
       **/
      KycNotPassed: AugmentedError<ApiType>;
      /**
       * This account already was added as a manager before
       **/
      ManagerAlreadyAdded: AugmentedError<ApiType>;
      /**
       * There is no such manager
       **/
      ManagerNotExists: AugmentedError<ApiType>;
      /**
       * Managers storage has reached its limit
       **/
      ManagersAreOverloaded: AugmentedError<ApiType>;
      /**
       * There is no data about emitted coupon for the crop receipt
       **/
      NoCouponData: AugmentedError<ApiType>;
      /**
       * This request was already processed by manager
       **/
      RequestAlreadyProcessed: AugmentedError<ApiType>;
      /**
       * There is no such request
       **/
      RequestIsNotExists: AugmentedError<ApiType>;
      /**
       * This account has reached the max count of requests
       **/
      RequestsCountForUserOverloaded: AugmentedError<ApiType>;
      /**
       * Coupon supply cannot be bigger than requested amount in crop receipt
       **/
      TooBigCouponSupply: AugmentedError<ApiType>;
      /**
       * The actual request type by provided RequestId is different
       **/
      WrongRequestType: AugmentedError<ApiType>;
    };
    priceTools: {
      /**
       * AssetId has been already registered.
       **/
      AssetAlreadyRegistered: AugmentedError<ApiType>;
      /**
       * Failed to calculate new average price.
       **/
      AveragePriceCalculationFailed: AugmentedError<ApiType>;
      /**
       * Spot price for asset has not changed but info for last spot price is unavailable.
       **/
      CantDuplicateLastPrice: AugmentedError<ApiType>;
      /**
       * Failed to perform quote to get average price.
       **/
      FailedToQuoteAveragePrice: AugmentedError<ApiType>;
      /**
       * Either spot price records has been reset or not initialized yet. Wait till spot price
       * quote is recovered and span is recalculated.
       **/
      InsufficientSpotPriceData: AugmentedError<ApiType>;
      /**
       * Requested quote path is not supported.
       **/
      UnsupportedQuotePath: AugmentedError<ApiType>;
      /**
       * Failed to add new spot price to average.
       **/
      UpdateAverageWithSpotPriceFailed: AugmentedError<ApiType>;
    };
    pswapDistribution: {
      /**
       * Error occurred during calculation, e.g. underflow/overflow of share amount.
       **/
      CalculationError: AugmentedError<ApiType>;
      /**
       * Increment account reference error.
       **/
      IncRefError: AugmentedError<ApiType>;
      /**
       * Error while setting frequency, subscription can only be invoked for frequency value >= 1.
       **/
      InvalidFrequency: AugmentedError<ApiType>;
      /**
       * Error while attempting to subscribe Account which is already subscribed.
       **/
      SubscriptionActive: AugmentedError<ApiType>;
      /**
       * Error while attempting to unsubscribe Account which is not subscribed.
       **/
      UnknownSubscription: AugmentedError<ApiType>;
      /**
       * Can't claim incentives as none is available for account at the moment.
       **/
      ZeroClaimableIncentives: AugmentedError<ApiType>;
    };
    qaTools: {
      /**
       * Error in calculations.
       **/
      ArithmeticError: AugmentedError<ApiType>;
      /**
       * Cannot register new asset because it already exists.
       **/
      AssetAlreadyExists: AugmentedError<ApiType>;
      /**
       * Cannot initialize pool with for non-divisible assets.
       **/
      AssetsMustBeDivisible: AugmentedError<ApiType>;
      /**
       * Buy price cannot be lower than sell price of an asset
       **/
      BuyLessThanSell: AugmentedError<ApiType>;
      /**
       * Did not find an order book with given id to fill. Likely an error with order book creation.
       **/
      CannotFillUnknownOrderBook: AugmentedError<ApiType>;
      /**
       * Provided range is incorrect, check that lower bound is less or equal than the upper one.
       **/
      EmptyRandomRange: AugmentedError<ApiType>;
      /**
       * Cannot initialize SBT metadata with the list of regulated assets
       **/
      FailToInitializeRegulatedAssets: AugmentedError<ApiType>;
      /**
       * TBCD must be initialized using different field/function (see `tbcd_collateral` and `TbcdCollateralInput`).
       **/
      IncorrectCollateralAsset: AugmentedError<ApiType>;
      /**
       * Price step, best price, and worst price must be a multiple of order book's tick size.
       * Price step must also be non-zero.
       **/
      IncorrectPrice: AugmentedError<ApiType>;
      /**
       * Order Book already exists
       **/
      OrderBookAlreadyExists: AugmentedError<ApiType>;
      /**
       * The range for generating order amounts must be within order book's accepted values.
       **/
      OutOfBoundsRandomRange: AugmentedError<ApiType>;
      /**
       * Cannot deduce price of synthetic base asset because there is no existing price for reference asset.
       * You can use `price_tools_set_asset_price` extrinsic to set its price.
       **/
      ReferenceAssetPriceNotFound: AugmentedError<ApiType>;
      /**
       * The count of created orders is too large.
       **/
      TooManyOrders: AugmentedError<ApiType>;
      /**
       * The count of prices to fill is too large.
       **/
      TooManyPrices: AugmentedError<ApiType>;
      /**
       * Cannot initialize MCBC for unknown asset.
       **/
      UnknownMcbcAsset: AugmentedError<ApiType>;
      /**
       * Could not find already existing synthetic.
       **/
      UnknownSynthetic: AugmentedError<ApiType>;
    };
    referrals: {
      /**
       * Account already has a referrer.
       **/
      AlreadyHasReferrer: AugmentedError<ApiType>;
      /**
       * Increment account reference error.
       **/
      IncRefError: AugmentedError<ApiType>;
      /**
       * Referrer doesn't have enough of reserved balance
       **/
      ReferrerInsufficientBalance: AugmentedError<ApiType>;
    };
    rewards: {
      /**
       * Address is not eligible for any rewards
       **/
      AddressNotEligible: AugmentedError<ApiType>;
      /**
       * Occurs if an attempt to repeat the unclaimed VAL data update is made
       **/
      IllegalCall: AugmentedError<ApiType>;
      /**
       * The account has no claimable rewards at the time of claiming request
       **/
      NothingToClaim: AugmentedError<ApiType>;
      /**
       * The signature is invalid
       **/
      SignatureInvalid: AugmentedError<ApiType>;
      /**
       * The signature verification failed
       **/
      SignatureVerificationFailed: AugmentedError<ApiType>;
    };
    scheduler: {
      /**
       * Failed to schedule a call
       **/
      FailedToSchedule: AugmentedError<ApiType>;
      /**
       * Attempt to use a non-named function on a named task.
       **/
      Named: AugmentedError<ApiType>;
      /**
       * Cannot find the scheduled call.
       **/
      NotFound: AugmentedError<ApiType>;
      /**
       * Reschedule failed because it does not change scheduled time.
       **/
      RescheduleNoChange: AugmentedError<ApiType>;
      /**
       * Given target block number is in the past.
       **/
      TargetBlockNumberInPast: AugmentedError<ApiType>;
    };
    session: {
      /**
       * Registered duplicate key.
       **/
      DuplicatedKey: AugmentedError<ApiType>;
      /**
       * Invalid ownership proof.
       **/
      InvalidProof: AugmentedError<ApiType>;
      /**
       * Key setting account is not live, so it's impossible to associate keys.
       **/
      NoAccount: AugmentedError<ApiType>;
      /**
       * No associated validator ID for account.
       **/
      NoAssociatedValidatorId: AugmentedError<ApiType>;
      /**
       * No keys are associated with this account.
       **/
      NoKeys: AugmentedError<ApiType>;
    };
    soratopia: {};
    staking: {
      /**
       * Stash is already bonded.
       **/
      AlreadyBonded: AugmentedError<ApiType>;
      /**
       * Rewards for this era have already been claimed for this validator.
       **/
      AlreadyClaimed: AugmentedError<ApiType>;
      /**
       * Controller is already paired.
       **/
      AlreadyPaired: AugmentedError<ApiType>;
      /**
       * Internal state has become somehow corrupted and the operation cannot continue.
       **/
      BadState: AugmentedError<ApiType>;
      /**
       * A nomination target was supplied that was blocked or otherwise not a validator.
       **/
      BadTarget: AugmentedError<ApiType>;
      /**
       * Some bound is not met.
       **/
      BoundNotMet: AugmentedError<ApiType>;
      /**
       * The user has enough bond and thus cannot be chilled forcefully by an external person.
       **/
      CannotChillOther: AugmentedError<ApiType>;
      /**
       * Commission is too low. Must be at least `MinCommission`.
       **/
      CommissionTooLow: AugmentedError<ApiType>;
      /**
       * Duplicate index.
       **/
      DuplicateIndex: AugmentedError<ApiType>;
      /**
       * Targets cannot be empty.
       **/
      EmptyTargets: AugmentedError<ApiType>;
      /**
       * Attempting to target a stash that still has funds.
       **/
      FundedTarget: AugmentedError<ApiType>;
      /**
       * Incorrect previous history depth input provided.
       **/
      IncorrectHistoryDepth: AugmentedError<ApiType>;
      /**
       * Incorrect number of slashing spans provided.
       **/
      IncorrectSlashingSpans: AugmentedError<ApiType>;
      /**
       * Cannot have a validator or nominator role, with value less than the minimum defined by
       * governance (see `MinValidatorBond` and `MinNominatorBond`). If unbonding is the
       * intention, `chill` first to remove one's role as validator/nominator.
       **/
      InsufficientBond: AugmentedError<ApiType>;
      /**
       * Invalid era to reward.
       **/
      InvalidEraToReward: AugmentedError<ApiType>;
      /**
       * Invalid number of nominations.
       **/
      InvalidNumberOfNominations: AugmentedError<ApiType>;
      /**
       * Slash record index out of bounds.
       **/
      InvalidSlashIndex: AugmentedError<ApiType>;
      /**
       * Can not schedule more unlock chunks.
       **/
      NoMoreChunks: AugmentedError<ApiType>;
      /**
       * Not a controller account.
       **/
      NotController: AugmentedError<ApiType>;
      /**
       * Items are not sorted and unique.
       **/
      NotSortedAndUnique: AugmentedError<ApiType>;
      /**
       * Not a stash account.
       **/
      NotStash: AugmentedError<ApiType>;
      /**
       * Can not rebond without unlocking chunks.
       **/
      NoUnlockChunk: AugmentedError<ApiType>;
      /**
       * There are too many nominators in the system. Governance needs to adjust the staking
       * settings to keep things safe for the runtime.
       **/
      TooManyNominators: AugmentedError<ApiType>;
      /**
       * Too many nomination targets supplied.
       **/
      TooManyTargets: AugmentedError<ApiType>;
      /**
       * There are too many validator candidates in the system. Governance needs to adjust the
       * staking settings to keep things safe for the runtime.
       **/
      TooManyValidators: AugmentedError<ApiType>;
    };
    substrateBridgeApp: {
      /**
       * Call encoding failed.
       **/
      CallEncodeFailed: AugmentedError<ApiType>;
      InvalidNetwork: AugmentedError<ApiType>;
      TokenAlreadyRegistered: AugmentedError<ApiType>;
      TokenIsNotRegistered: AugmentedError<ApiType>;
      UnknownPrecision: AugmentedError<ApiType>;
      WrongAccountId: AugmentedError<ApiType>;
      /**
       * Amount must be > 0
       **/
      WrongAmount: AugmentedError<ApiType>;
      WrongAssetId: AugmentedError<ApiType>;
    };
    substrateBridgeInboundChannel: {
      /**
       * Call encoding failed.
       **/
      CallEncodeFailed: AugmentedError<ApiType>;
      /**
       * This contract already exists
       **/
      ContractExists: AugmentedError<ApiType>;
      /**
       * Submitted invalid commitment type.
       **/
      InvalidCommitment: AugmentedError<ApiType>;
      /**
       * Message came from an invalid network.
       **/
      InvalidNetwork: AugmentedError<ApiType>;
      /**
       * Message has an unexpected nonce.
       **/
      InvalidNonce: AugmentedError<ApiType>;
      /**
       * Incorrect reward fraction
       **/
      InvalidRewardFraction: AugmentedError<ApiType>;
      /**
       * Message came from an invalid outbound channel on the Ethereum side.
       **/
      InvalidSourceChannel: AugmentedError<ApiType>;
    };
    substrateBridgeOutboundChannel: {
      /**
       * This channel already exists
       **/
      ChannelExists: AugmentedError<ApiType>;
      /**
       * Maximum gas for queued batch exceeds limit.
       **/
      MaxGasTooBig: AugmentedError<ApiType>;
      /**
       * Cannot pay the fee to submit a message.
       **/
      NoFunds: AugmentedError<ApiType>;
      /**
       * Cannot increment nonce
       **/
      Overflow: AugmentedError<ApiType>;
      /**
       * The message payload exceeds byte limit.
       **/
      PayloadTooLarge: AugmentedError<ApiType>;
      /**
       * No more messages can be queued for the channel during this commit cycle.
       **/
      QueueSizeLimitReached: AugmentedError<ApiType>;
      /**
       * Interval cannot be zero.
       **/
      ZeroInterval: AugmentedError<ApiType>;
    };
    sudo: {
      /**
       * Sender must be the Sudo account
       **/
      RequireSudo: AugmentedError<ApiType>;
    };
    system: {
      /**
       * The origin filter prevent the call to be dispatched.
       **/
      CallFiltered: AugmentedError<ApiType>;
      /**
       * Failed to extract the runtime version from the new runtime.
       *
       * Either calling `Core_version` or decoding `RuntimeVersion` failed.
       **/
      FailedToExtractRuntimeVersion: AugmentedError<ApiType>;
      /**
       * The name of specification does not match between the current runtime
       * and the new runtime.
       **/
      InvalidSpecName: AugmentedError<ApiType>;
      /**
       * Suicide called when the account has non-default composite data.
       **/
      NonDefaultComposite: AugmentedError<ApiType>;
      /**
       * There is a non-zero reference count preventing the account from being purged.
       **/
      NonZeroRefCount: AugmentedError<ApiType>;
      /**
       * The specification version is not allowed to decrease between the current runtime
       * and the new runtime.
       **/
      SpecVersionNeedsToIncrease: AugmentedError<ApiType>;
    };
    technical: {
      /**
       * Swap has already been claimed.
       **/
      AlreadyClaimed: AugmentedError<ApiType>;
      /**
       * Swap already exists.
       **/
      AlreadyExist: AugmentedError<ApiType>;
      /**
       * Associated `AccountId` not found with a given `TechnicalAccountId`.
       **/
      AssociatedAccountIdNotFound: AugmentedError<ApiType>;
      /**
       * Claim action mismatch.
       **/
      ClaimActionMismatch: AugmentedError<ApiType>;
      /**
       * Failed to decode `AccountId` from a hash.
       **/
      DecodeAccountIdFailed: AugmentedError<ApiType>;
      /**
       * Duration has not yet passed for the swap to be cancelled.
       **/
      DurationNotPassed: AugmentedError<ApiType>;
      /**
       * Balance too low to send value.
       **/
      InsufficientBalance: AugmentedError<ApiType>;
      /**
       * Swap proof is invalid.
       **/
      InvalidProof: AugmentedError<ApiType>;
      /**
       * This function or ablility is still not implemented.
       **/
      NotImplemented: AugmentedError<ApiType>;
      /**
       * If argument must be technical, and only regular values inside it is allowed
       **/
      OnlyPureTechnicalAccount: AugmentedError<ApiType>;
      /**
       * If argument must be technical, and only regular values inside it is allowed
       **/
      OnlyRegularAccount: AugmentedError<ApiType>;
      /**
       * If argument must be technical, and only regular values inside it is allowed
       **/
      OnlyRegularAsset: AugmentedError<ApiType>;
      /**
       * If argument must be technical, and only regular values inside it is allowed
       **/
      OnlyRegularBalance: AugmentedError<ApiType>;
      /**
       * Operation with abstract checking is impossible.
       **/
      OperationWithAbstractCheckingIsImposible: AugmentedError<ApiType>;
      /**
       * Got an overflow after adding.
       **/
      Overflow: AugmentedError<ApiType>;
      /**
       * Type must sport mapping from hash to special subset of `AccountId32`
       **/
      RepresentativeMustBeSupported: AugmentedError<ApiType>;
      /**
       * Source does not match.
       **/
      SourceMismatch: AugmentedError<ApiType>;
      /**
       * Errors should have helpful documentation associated with them.
       **/
      StorageOverflow: AugmentedError<ApiType>;
      /**
       * It is not posible to find record in storage map about `AccountId32` representation for
       * technical account.
       **/
      TechAccountIdIsNotRegistered: AugmentedError<ApiType>;
      /**
       * If argument must be technical, and only pure technical value is allowed
       **/
      TechAccountIdMustBePure: AugmentedError<ApiType>;
      /**
       * It is not posible to extract code from `AccountId32` as representation
       * or find it in storage.
       **/
      UnableToGetReprFromTechAccountId: AugmentedError<ApiType>;
    };
    technicalCommittee: {
      /**
       * Members are already initialized!
       **/
      AlreadyInitialized: AugmentedError<ApiType>;
      /**
       * Duplicate proposals not allowed
       **/
      DuplicateProposal: AugmentedError<ApiType>;
      /**
       * Duplicate vote ignored
       **/
      DuplicateVote: AugmentedError<ApiType>;
      /**
       * Account is not a member
       **/
      NotMember: AugmentedError<ApiType>;
      /**
       * Proposal must exist
       **/
      ProposalMissing: AugmentedError<ApiType>;
      /**
       * The close call was made too early, before the end of the voting.
       **/
      TooEarly: AugmentedError<ApiType>;
      /**
       * There can only be a maximum of `MaxProposals` active proposals.
       **/
      TooManyProposals: AugmentedError<ApiType>;
      /**
       * Mismatched index
       **/
      WrongIndex: AugmentedError<ApiType>;
      /**
       * The given length bound for the proposal was too low.
       **/
      WrongProposalLength: AugmentedError<ApiType>;
      /**
       * The given weight bound for the proposal was too low.
       **/
      WrongProposalWeight: AugmentedError<ApiType>;
    };
    technicalMembership: {
      /**
       * Already a member.
       **/
      AlreadyMember: AugmentedError<ApiType>;
      /**
       * Not a member.
       **/
      NotMember: AugmentedError<ApiType>;
      /**
       * Too many members.
       **/
      TooManyMembers: AugmentedError<ApiType>;
    };
    tokens: {
      /**
       * Cannot convert Amount into Balance type
       **/
      AmountIntoBalanceFailed: AugmentedError<ApiType>;
      /**
       * The balance is too low
       **/
      BalanceTooLow: AugmentedError<ApiType>;
      /**
       * Beneficiary account must pre-exist
       **/
      DeadAccount: AugmentedError<ApiType>;
      /**
       * Value too low to create account due to existential deposit
       **/
      ExistentialDeposit: AugmentedError<ApiType>;
      /**
       * Transfer/payment would kill account
       **/
      KeepAlive: AugmentedError<ApiType>;
      /**
       * Failed because liquidity restrictions due to locking
       **/
      LiquidityRestrictions: AugmentedError<ApiType>;
      /**
       * Failed because the maximum locks was exceeded
       **/
      MaxLocksExceeded: AugmentedError<ApiType>;
      TooManyReserves: AugmentedError<ApiType>;
    };
    tradingPair: {
      /**
       * The specified base asset ID for the trading pair is not allowed.
       **/
      ForbiddenBaseAssetId: AugmentedError<ApiType>;
      /**
       * The specified base asset ID is the same as target asset ID.
       **/
      IdenticalAssetIds: AugmentedError<ApiType>;
      /**
       * Trading pair is not registered for given DEXId.
       **/
      TradingPairDoesntExist: AugmentedError<ApiType>;
      /**
       * Registering trading pair already exists.
       **/
      TradingPairExists: AugmentedError<ApiType>;
    };
    utility: {
      /**
       * Too many calls batched.
       **/
      TooManyCalls: AugmentedError<ApiType>;
    };
    vestedRewards: {
      /**
       * The vested transfer amount is too low
       **/
      AmountLow: AugmentedError<ApiType>;
      /**
       * Something is wrong with arithmetic - overflow happened, for example.
       **/
      ArithmeticError: AugmentedError<ApiType>;
      /**
       * Failed to perform reward calculation.
       **/
      CantCalculateReward: AugmentedError<ApiType>;
      /**
       * Attempt to subtract more via snapshot than assigned to user.
       **/
      CantSubtractSnapshot: AugmentedError<ApiType>;
      /**
       * Account has pending rewards but it has not been vested yet.
       **/
      ClaimLimitExceeded: AugmentedError<ApiType>;
      /**
       * Crowdloan with given tag already registered
       **/
      CrowdloanAlreadyExists: AugmentedError<ApiType>;
      /**
       * Crowdloan does not exists
       **/
      CrowdloanDoesNotExists: AugmentedError<ApiType>;
      /**
       * Crowdloan rewards distribution is not started
       **/
      CrowdloanRewardsDistributionNotStarted: AugmentedError<ApiType>;
      /**
       * Increment account reference error.
       **/
      IncRefError: AugmentedError<ApiType>;
      /**
       * Insufficient amount of balance to lock
       **/
      InsufficientBalanceToLock: AugmentedError<ApiType>;
      /**
       * Failed because the maximum vesting schedules was exceeded
       **/
      MaxVestingSchedulesExceeded: AugmentedError<ApiType>;
      /**
       * There are no rewards for the asset ID.
       **/
      NoRewardsForAsset: AugmentedError<ApiType>;
      /**
       * User is not crowdloan participant
       **/
      NotCrowdloanParticipant: AugmentedError<ApiType>;
      /**
       * Account has no pending rewards to claim.
       **/
      NothingToClaim: AugmentedError<ApiType>;
      /**
       * This error appears on wrong conversion of a number into another type.
       **/
      NumberConversionError: AugmentedError<ApiType>;
      /**
       * Failed because the Schedule to unlock not exist
       **/
      PendingScheduleNotExist: AugmentedError<ApiType>;
      /**
       * Account holding dedicated reward reserves is empty. This likely means that some of
       * reward programmes have finished.
       **/
      RewardsSupplyShortage: AugmentedError<ApiType>;
      /**
       * Unable to get base asset price in XOR. XOR-base asset pair should exist on Polkaswap DEX.
       **/
      UnableToGetBaseAssetPrice: AugmentedError<ApiType>;
      /**
       * Attempt to claim rewards of type, which is not handled.
       **/
      UnhandledRewardType: AugmentedError<ApiType>;
      /**
       * Wrong crowdloan data passed
       **/
      WrongCrowdloanInfo: AugmentedError<ApiType>;
      /**
       * Failed because used not correct Schedule Variant
       **/
      WrongScheduleVariant: AugmentedError<ApiType>;
      /**
       * Number of vests is zero or less than claims
       **/
      WrongVestingPeriodCount: AugmentedError<ApiType>;
      /**
       * Vesting period is zero
       **/
      ZeroVestingPeriod: AugmentedError<ApiType>;
    };
    xorFee: {
      /**
       * Asset already in white list
       **/
      AssetAlreadyWhitelisted: AugmentedError<ApiType>;
      /**
       * Asset is not found in white list
       **/
      AssetNotFound: AugmentedError<ApiType>;
      /**
       * Failed to calculate fee in white listed asset
       **/
      FeeCalculationFailed: AugmentedError<ApiType>;
      /**
       * `SmallReferenceAmount` is unsupported
       **/
      InvalidSmallReferenceAmount: AugmentedError<ApiType>;
      /**
       * Failed to calculate new multiplier.
       **/
      MultiplierCalculationFailed: AugmentedError<ApiType>;
      /**
       * White list is filled
       **/
      WhitelistFull: AugmentedError<ApiType>;
      /**
       * Remint period should not be 0 or to be greater than 600
       **/
      WrongRemintPeriod: AugmentedError<ApiType>;
    };
    xstPool: {
      /**
       * Synthetic asset must be divisible
       **/
      CantEnableIndivisibleAsset: AugmentedError<ApiType>;
      /**
       * Liquidity source can't exchange assets with the given IDs on the given DEXId.
       **/
      CantExchange: AugmentedError<ApiType>;
      /**
       * Reference asset must be divisible
       **/
      IndivisibleReferenceAsset: AugmentedError<ApiType>;
      /**
       * Invalid fee ratio value.
       **/
      InvalidFeeRatio: AugmentedError<ApiType>;
      /**
       * Error quoting price from oracle.
       **/
      OracleQuoteError: AugmentedError<ApiType>;
      /**
       * An error occurred while calculating the price.
       **/
      PriceCalculationFailed: AugmentedError<ApiType>;
      /**
       * Indicated limits for slippage has not been met during transaction execution.
       **/
      SlippageLimitExceeded: AugmentedError<ApiType>;
      /**
       * Attempt to enable synthetic asset with symbol
       * that is already referenced to another synthetic.
       **/
      SymbolAlreadyReferencedToSynthetic: AugmentedError<ApiType>;
      /**
       * Attempt to enable synthetic asset with inexistent symbol.
       **/
      SymbolDoesNotExist: AugmentedError<ApiType>;
      /**
       * Input/output amount of synthetic base asset exceeds the limit
       **/
      SyntheticBaseBuySellLimitExceeded: AugmentedError<ApiType>;
      /**
       * Synthetic asset does not exist.
       **/
      SyntheticDoesNotExist: AugmentedError<ApiType>;
      /**
       * Attempt to disable synthetic asset that is not enabled.
       **/
      SyntheticIsNotEnabled: AugmentedError<ApiType>;
    };
  } // AugmentedErrors
} // declare module
