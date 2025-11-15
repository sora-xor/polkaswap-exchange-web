import type { Observable } from 'rxjs';
import type { CodecString } from '@sora-substrate/math';
import type { KeyringPair } from '@polkadot/keyring/types';
import type { AnyNumber, AnyU8a } from '@polkadot/types/types';
import type { SubmittableExtrinsic } from '@polkadot/api-base/types';
import type { AddressOrPair, SignerOptions } from '@polkadot/api/submittable/types';

import type { ReceiverHistoryItem } from './swap/types';
import type { EthHistory } from './bridgeProxy/eth/types';
import type { EvmHistory } from './bridgeProxy/evm/types';
import type { SubHistory } from './bridgeProxy/sub/types';
import type { RewardClaimHistory } from './rewards/types';
import type { OriginalIdentity, StakingHistory } from './staking/types';
import type { LimitOrderHistory } from './orderBook/types';
import type { HistoryElementTransfer, VestedTransferHistory } from './assets/types';
import type { VaultHistory } from './kensetsu/types';

export enum TransactionStatus {
  Ready = 'ready',
  Broadcast = 'broadcast',
  InBlock = 'inblock',
  Finalized = 'finalized',
  Error = 'error',
  Usurped = 'usurped', // When TX is outdated
  Invalid = 'invalid', // When something happened before sending to network
  Pending = 'pending',
}

export enum Operation {
  Swap = 'Swap',
  AddLiquidity = 'AddLiquidity',
  RemoveLiquidity = 'RemoveLiquidity',
  CreatePair = 'CreatePair',
  BatchAll = 'BatchAll',
  Faucet = 'Faucet',
  EthBridgeOutgoing = 'EthBridgeOutgoing',
  EthBridgeIncoming = 'EthBridgeIncoming',
  EvmOutgoing = 'EvmOutgoing',
  EvmIncoming = 'EvmIncoming',
  SubstrateOutgoing = 'SubstrateOutgoing',
  SubstrateIncoming = 'SubstrateIncoming',
  ClaimRewards = 'ClaimRewards',
  /** it's used for calc network fee */
  ClaimVestedRewards = 'ClaimVestedRewards',
  /** it's used for calc network fee */
  ClaimCrowdloanRewards = 'ClaimCrowdloanRewards',
  /** it's used for calc network fee */
  ClaimLiquidityProvisionRewards = 'LiquidityProvisionRewards',
  /** it's used for calc network fee */
  ClaimExternalRewards = 'ClaimExternalRewards',
  /** it's used for internal needs as the MST batch with transfers  */
  TransferAll = 'TransferAll',
  /** Complex Swap */
  SwapAndSend = 'SwapAndSend',
  SwapTransferBatch = 'SwapTransferBatch',
  /** Referral System */
  ReferralReserveXor = 'ReferralReserveXor',
  ReferralUnreserveXor = 'ReferralUnreserveXor',
  ReferralSetInvitedUser = 'ReferralSetInvitedUser',
  /** Staking */
  StakingBond = 'StakingBond',
  StakingBondAndNominate = 'StakingBondAndNominate',
  StakingBondExtra = 'StakingBondExtra',
  StakingRebond = 'StakingRebond',
  StakingUnbond = 'StakingUnbond',
  StakingWithdrawUnbonded = 'StakingWithdrawUnbonded',
  StakingNominate = 'StakingNominate',
  StakingChill = 'StakingChill',
  StakingSetPayee = 'StakingSetPayee',
  StakingSetController = 'StakingSetController',
  StakingPayout = 'StakingPayout',
  /** Demeter Farming Platform  */
  DemeterFarmingDepositLiquidity = 'DemeterFarmingDepositLiquidity',
  DemeterFarmingWithdrawLiquidity = 'DemeterFarmingWithdrawLiquidity',
  DemeterFarmingStakeToken = 'DemeterFarmingStakeToken',
  DemeterFarmingUnstakeToken = 'DemeterFarmingUnstakeToken',
  DemeterFarmingGetRewards = 'DemeterFarmingGetRewards',
  /** Ceres Liquidity Locker  */
  CeresLiquidityLockerLockLiquidity = 'CeresLiquidityLockerLockLiquidity',
  /** Order Book */
  OrderBookPlaceLimitOrder = 'OrderBookPlaceLimitOrder',
  OrderBookCancelLimitOrder = 'OrderBookCancelLimitOrder',
  OrderBookCancelLimitOrders = 'OrderBookCancelLimitOrders',
  /** Asset management */
  RegisterAsset = 'RegisterAsset',
  Transfer = 'Transfer',
  VestedTransfer = 'VestedTransfer',
  XorlessTransfer = 'XorlessTransfer',
  Mint = 'Mint',
  Burn = 'Burn',
  /** Kensetsu */
  CreateVault = 'CreateVault',
  CloseVault = 'CloseVault',
  RepayVaultDebt = 'RepayVaultDebt',
  DepositCollateral = 'DepositCollateral',
  BorrowVaultDebt = 'BorrowVaultDebt',
  /** DEFI-R */
  SetAccessExpiration = 'SetAccessExpiration',
  RegulateAsset = 'RegulateAsset',
  RegisterAndRegulateAsset = 'RegisterAndRegulateAsset',
  BindRegulatedAsset = 'BindRegulatedAsset',
  IssueSoulBoundToken = 'IssueSoulBoundToken',
  /** OTHER */
  Checkin = 'Checkin',
}

export interface OnChainIdentity {
  displayName: string;
  legalName: string;
  approved: boolean;
  identity: OriginalIdentity;
}

export type AccountWithOptions = {
  account: AddressOrPair;
  options: Partial<
    SignerOptions & {
      assetId?: AnyNumber | object;
      mode?: AnyNumber;
      metadataHash?: AnyU8a;
    }
  >;
};

export type SaveHistoryOptions = {
  wasNotGenerated?: boolean;
  toCurrentAccount?: boolean;
};

export type ErrorMessageFields = {
  section: string;
  name: string;
};

export type NetworkFeesObject = {
  [key in Operation]: CodecString;
};

export interface History {
  id?: string;
  from?: string;
  type: Operation;
  txId?: string;
  amount?: string;
  symbol?: string;
  assetAddress?: string;
  blockId?: string;
  blockHeight?: number;
  to?: string;
  receivers?: Array<ReceiverHistoryItem>;
  amount2?: string;
  symbol2?: string;
  asset2Address?: string;
  decimals?: number;
  decimals2?: number;
  startTime?: number;
  endTime?: number;
  status?: string;
  errorMessage?: ErrorMessageFields | string;
  liquiditySource?: string;
  liquidityProviderFee?: CodecString;
  soraNetworkFee?: CodecString;
  payload?: any; // can be used to integrate with third-party services
}

export type IBridgeTransaction = EvmHistory | SubHistory | EthHistory;

export type HistoryItem =
  | History
  | HistoryWithMultisig
  | IBridgeTransaction
  | RewardClaimHistory
  | StakingHistory
  | LimitOrderHistory
  | VaultHistory
  | HistoryElementTransfer
  | VestedTransferHistory;

export type CombinedHistoryItem = History &
  IBridgeTransaction &
  RewardClaimHistory &
  StakingHistory &
  LimitOrderHistory &
  VaultHistory &
  HistoryElementTransfer &
  VestedTransferHistory;

export type FnResult = void | Observable<ExtrinsicEvent>;

export type ExtrinsicEvent = [TransactionStatus, HistoryItem];

export interface ISubmitExtrinsic<T> {
  submitExtrinsic(
    extrinsic: SubmittableExtrinsic<'promise'>,
    signer: KeyringPair,
    historyData?: HistoryItem,
    unsigned?: boolean
  ): Promise<T>;
}

export type AccountHistory<T> = {
  [key: string]: T;
};

export interface Cosigners {
  [address: string]: Uint8Array;
}

export interface EncryptedKeyForCosigner {
  encryptedKey: string;
  iv: string;
}

export interface FinalEncryptedStructure {
  encryptedData: string;
  dataIv: string;
  encryptedKeys: {
    [cosignerName: string]: EncryptedKeyForCosigner;
  };
}

export interface CosignerKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

interface MultisigInfo {
  threshold: number;
  signatories: string[];
  numApprovals: number;
  walletsApproved: string[];
}

interface DeadlineTrx {
  expirationBlock: number;
  blocksRemaining: number;
  secondsRemaining: number;
}

interface HistoryWithMultisig extends History {
  multisig?: MultisigInfo;
  deadline?: DeadlineTrx;
}
