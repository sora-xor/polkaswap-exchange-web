import {
  SubqueryAccountEntity,
  SubqueryAssetEntity,
  SubqueryOrderBookEntity,
  SubqueryOrderBookSnapshotEntity,
  SubqueryOrderBookOrderEntity,
  SubqueryPoolXYKEntity,
  SubqueryVaultEntity,
  SubqueryVaultEventEntity,
  SubqueryAccountLiquidityEntity,
  SubqueryAccountLiquiditySnapshotEntity,
  SubqueryPoolSnapshotEntity,
} from '../subquery/types';
import {
  SubsquidAccountEntity,
  SubsquidAssetEntity,
  SubsquidOrderBookEntity,
  SubsquidOrderBookSnapshotEntity,
  SubsquidOrderBookOrderEntity,
  SubsquidPoolXYKEntity,
  SubsquidVaultEntity,
  SubsquidVaultEventEntity,
} from '../subsquid/types';

import type { PriceVariant, OrderBookStatus } from '@sora-substrate/liquidity-proxy';
import type { CodecString } from '@sora-substrate/sdk';
import type { StakingRewardsDestination } from '@sora-substrate/sdk/build/staking/types';

// Indexer Enums
export enum SnapshotTypes {
  DEFAULT = 'DEFAULT',
  HOUR = 'HOUR',
  DAY = 'DAY',
  MONTH = 'MONTH',
  BLOCK = 'BLOCK',
}

export enum HistoryElementType {
  CALL = 'CALL',
  EVENT = 'EVENT',
}

export enum PayeeType {
  STAKED = 'STAKED',
  STASH = 'STASH',
  CONTROLLER = 'CONTROLLER',
  ACCOUNT = 'ACCOUNT',
  NONE = 'NONE',
}

export enum OrderStatus {
  Active = 'Active',
  Aligned = 'Aligned',
  Canceled = 'Canceled',
  Expired = 'Expired',
  Filled = 'Filled',
}

export enum OrderType {
  Limit = 'Limit',
  Market = 'Market',
}

export enum VaultType {
  Type1 = 'Type1',
  Type2 = 'Type2',
}

export enum VaultStatus {
  Opened = 'Opened',
  Closed = 'Closed',
  Liquidated = 'Liquidated',
}

export enum VaultEventType {
  Created = 'Created',
  Closed = 'Closed',
  CollateralDeposit = 'CollateralDeposit',
  DebtIncreased = 'DebtIncreased',
  DebtPayment = 'DebtPayment',
  Liquidated = 'Liquidated',
}

// Indexer Models

export type PriceSnapshot = {
  low: string;
  high: string;
  open: string;
  close: string;
};

export type AssetVolume = {
  amount: string;
  amountUSD: string;
};

export type AccountMetaEventCounter = {
  created: number;
  closed: number;
  amountUSD: string;
};

export type AccountMetaGovernance = {
  votes: number;
  amount: string;
  amountUSD: string;
};

export type AccountMetaDeposit = {
  incomingUSD: string;
  outgoingUSD: string;
};

export type AccountBaseEntity = {
  id: string;
};

export type AssetBaseEntity = {
  id: string;
  priceUSD: string;
  supply: CodecString;
  liquidity?: CodecString; // in pools
  liquidityBooks?: CodecString; // in order books
  priceChangeDay?: number;
  priceChangeWeek?: number;
  volumeDayUSD?: number;
  volumeWeekUSD?: number;
  velocity?: number;
};

export type AssetSnapshotBaseEntity = {
  id: string;
  assetId: string;
  timestamp: number;
  type: SnapshotTypes;
  supply: CodecString;
  mint: CodecString;
  burn: CodecString;
  priceUSD: PriceSnapshot;
  volume: AssetVolume;
};

export type PoolXYKBaseEntity = {
  id: string;
  baseAssetReserves: CodecString;
  targetAssetReserves: CodecString;
  chameleonAssetReserves: Nullable<CodecString>;
  multiplier: number;
  priceUSD: Nullable<string>;
  strategicBonusApy: Nullable<string>;
  poolTokenSupply: CodecString;
  poolTokenPriceUSD: string;
  liquidityUSD: string;
};

export type PoolSnapshotBaseEntity = {
  id: string;
  poolId: string;
  timestamp: number;
  type: SnapshotTypes;
  priceUSD: PriceSnapshot;
  baseAssetReserves: CodecString;
  targetAssetReserves: CodecString;
  chameleonAssetReserves: CodecString;
  baseAssetVolume: string;
  targetAssetVolume: string;
  chameleonAssetVolume: string;
  poolTokenSupply: CodecString;
  poolTokenPriceUSD: string;
  liquidityUSD: string;
  volumeUSD: string;
};

export type AccountLiquidityBaseEntity = {
  id: string;
  poolTokens: CodecString;
  liquidityUSD: string;
};

export type AccountLiquiditySnapshotBaseEntity = {
  id: string;
  timestamp: number;
  type: SnapshotTypes;
  poolTokens: CodecString;
  liquidityUSD: string;
};

export type NetworkStatsEntity = {
  id: string;
  totalFees: CodecString;
  totalAccounts: number;
  totalTransactions: number;
  totalBridgeIncomingTransactions: number;
  totalBridgeOutgoingTransactions: number;
};

export type NetworkSnapshotEntity = {
  id: string;
  type: SnapshotTypes;
  timestamp: number;
  accounts: number;
  transactions: number;
  fees: CodecString;
  liquidityUSD: string;
  volumeUSD: string;
  bridgeIncomingTransactions: number;
  bridgeOutgoingTransactions: number;
};

export type OrderBookDealEntity = {
  orderId: number;
  timestamp: number;
  isBuy: boolean;
  amount: string;
  price: string;
};

export type OrderBookOrderBaseEntity = {
  id: string;
  type: OrderType;
  orderId: Nullable<number>;
  createdAtBlock: number;
  timestamp: number;
  isBuy: boolean;
  amount: string;
  price: string;
  lifetime: number;
  expiresAt: number;
  amountFilled: string;
  status: OrderStatus;
  updatedAtBlock: number;
};

export type OrderBookBaseEntity = {
  id: string;
  dexId: number;
  baseAssetReserves: CodecString;
  quoteAssetReserves: CodecString;
  status: OrderBookStatus;
  price?: string;
  priceChangeDay?: number;
  volumeDayUSD?: string;
  lastDeals?: string; // stringified JSON OrderBookDealEntity[]
  updatedAtBlock: number;
};

export type OrderBookSnapshotBaseEntity = {
  id: string;
  timestamp: number;
  type: SnapshotTypes;
  price: PriceSnapshot;
  baseAssetVolume: string;
  quoteAssetVolume: string;
  volumeUSD: string;
  liquidityUSD: string;
};

export type VaultBaseEntity = {
  id: string;
  type: VaultType;
  status: VaultStatus;
  collateralAmountReturned: Nullable<string>;
  createdAtBlock: number;
  updatedAtBlock: number;
};

export type VaultEventBaseEntity = {
  id: string;
  type: VaultEventType;
  timestamp: number;
  block: number;
  amount: string;
};

export type ReferrerRewardEntity = {
  id: string;
  referral: string;
  referrer: string;
  updated: number;
  amount: CodecString;
};

export type HistoryElementError = {
  moduleErrorId: number;
  moduleErrorIndex: number;
};

export type HistoryElementExecution = {
  success: boolean;
  error?: HistoryElementError;
};

export type HistoryElementSwap = {
  baseAssetAmount: string;
  baseAssetAmountUSD: string;
  baseAssetId: string;
  selectedMarket: string;
  targetAssetAmount: string;
  targetAssetAmountUSD: string;
  targetAssetId: string;
};

export type HistoryElementSwapTransfer = HistoryElementSwap & {
  to: string;
};

export type SwapTransferReceiver = {
  accountId: string;
  amount: string;
  amountUSD: string;
  assetId: string;
};

export type SwapTransferBatchTransferParam = {
  from: string;
  to: string;
  amount: string;
  assetId: string;
};

export type HistoryElementSwapTransferBatch = {
  assetId: string;
  selectedMarket: string;
  maxInputAmount: string;
  blockNumber: string;
  from: string;
  receivers: SwapTransferReceiver[];
  adarFee?: string;
  actualFee?: string;
  inputAmount?: string;
  comment?: string; // stringified JSON
};

export type HistoryElementTransfer = {
  amount: string;
  amountUSD: string;
  assetId: string;
  from: string;
  to: string;
  assetFee?: string; // only in xorless transfer
  xorFee?: string; // only in xorless transfer
  comment?: string; // only in xorless transfer
};

export type HistoryElementVestedTransfer = {
  amount: string;
  amountUSD: string;
  assetId: string;
  from: string;
  to: string;
  period: number;
  percent: number;
};

export type HistoryElementLiquidityOperation = {
  baseAssetAmount: string;
  baseAssetAmountUSD: string;
  baseAssetId: string;
  targetAssetAmount: string;
  targetAssetAmountUSD: string;
  targetAssetId: string;
  type: string;
};

export type HistoryElementAssetRegistration = {
  assetId: string;
};

export type HistoryElementAssetBurn = {
  amount: string;
  amountUSD: string;
  assetId: string;
};

export type HistoryElementAssetMint = HistoryElementAssetBurn & {
  to: string;
};

export type HistoryElementDemeterFarming = {
  amount: string;
  amountUSD: string;
  assetId: string;
  isFarm: boolean;
  rewardAssetId?: string;
  baseAssetId?: string;
};

export type ClaimedRewardItem = {
  assetId: string;
  amount: string;
  amountUSD: string;
};

export type HistoryElementRewardsClaim = Nullable<ClaimedRewardItem[]>;

export type ExtrinsicEvent = {
  method: string;
  section: string;
  data: any[];
};

export type HistoryElementEthBridgeOutgoing = {
  amount: string;
  assetId: string;
  sidechainAddress: string;
  requestHash?: string;
};

export type HistoryElementEthBridgeIncoming = {
  amount: string;
  assetId: string;
  requestHash: string;
  to: string;
};

export type HistoryElementReferralSetReferrer = {
  from: string; // referral
  to: string; // referrer
};

export type HistoryElementReferrerReserve = {
  from: string;
  to: string;
  amount: string;
  amountUSD: string;
};

export type HistoryElementPlaceLimitOrder = {
  dexId: number;
  baseAssetId: string;
  quoteAssetId: string;
  orderId: number | undefined;
  price: string;
  amount: string;
  amountUSD: string;
  side: PriceVariant;
  lifetime: number | undefined;
};

export type HistoryElementCancelLimitOrder = Array<{
  dexId: number;
  baseAssetId: string;
  quoteAssetId: string;
  orderId: number;
}>;

export type HistoryElementStakingBondExtra = {
  amount: string;
  amountUSD: string;
};

export type HistoryElementStakingBond = HistoryElementStakingBondExtra & {
  controller: string;
  payee: {
    kind: StakingRewardsDestination;
    value?: string;
  };
};

export type HistoryElementStakingRebond = {
  value: string;
  amountUSD: string;
};

export type HistoryElementStakingUnbond = {
  amount: string;
  amountUSD: string;
};

export type HistoryElementStakingNominate = {
  targets: string[];
};

export type HistoryElementStakingWithdrawUnbonded = {
  amount: string;
  amountUSD: string;
  numSlashingSpans: number;
};

// [Staking] "staking.chill" call doesn't have any parameters
export type HistoryElementStakingChill = Record<string, never>;

export type HistoryElementStakingSetPayee = {
  payeeType: StakingRewardsDestination;
  payee: string;
};

export type HistoryElementStakingSetController = {
  controller: string;
};

export type HistoryElementStakingPayout = {
  validatorStash: string;
  era: number;
};

export type HistoryElementVaultCreate = {
  id?: string; // exists on success
  collateralAssetId: string;
  collateralAmount: string;
  collateralAmountUSD: string;
  debtAssetId: string;
  debtAmount: string;
  debtAmountUSD: string;
};

export type HistoryElementVaultDepositCollateral = {
  id: string;
  collateralAssetId: string;
  collateralAmount: string;
  collateralAmountUSD: string;
};

export type HistoryElementVaultDebt = {
  id: string;
  debtAssetId: string;
  debtAmount: string;
  debtAmountUSD: string;
};

export type HistoryElementVaultClose = Required<HistoryElementVaultCreate>;

export type HistoryElementDataBase = Nullable<
  | HistoryElementReferralSetReferrer
  | HistoryElementReferrerReserve
  | HistoryElementSwap
  | HistoryElementSwapTransfer
  | HistoryElementSwapTransferBatch
  | HistoryElementTransfer
  | HistoryElementVestedTransfer
  | HistoryElementLiquidityOperation
  | HistoryElementAssetRegistration
  | HistoryElementEthBridgeOutgoing
  | HistoryElementEthBridgeIncoming
  | HistoryElementRewardsClaim
  | HistoryElementDemeterFarming
  | HistoryElementPlaceLimitOrder
  | HistoryElementCancelLimitOrder
  | HistoryElementStakingBond
  | HistoryElementStakingBondExtra
  | HistoryElementStakingRebond
  | HistoryElementStakingUnbond
  | HistoryElementStakingNominate
  | HistoryElementStakingWithdrawUnbonded
  | HistoryElementStakingChill
  | HistoryElementStakingSetPayee
  | HistoryElementStakingSetController
  | HistoryElementStakingPayout
  | HistoryElementVaultCreate
  | HistoryElementVaultDepositCollateral
  | HistoryElementVaultDebt
  | HistoryElementVaultClose
>;

export type HistoryElementBase = {
  id: string;
  blockHash: string;
  blockHeight: string;
  module: string;
  method: string;
  address: string;
  networkFee: string;
  execution: HistoryElementExecution;
  timestamp: number;
  dataFrom?: string;
  dataTo?: string;
};

type Arg = string | number;

export type CallArgs = Omit<Record<string, Arg | Arg[]>, 'args'>;

export type HistoryElementBatchCall = {
  data: CallArgs | { args: CallArgs };
  hash: string;
  module: string;
  method: string;
};

export type HistoryElement = HistoryElementBase & {
  data: HistoryElementDataBase;
  calls: HistoryElementBatchCall[];
};

export type UpdatesStream = {
  id: string;
  block: number;
  data: string; // stringified JSON
};

// export unions
export type AssetEntity = SubqueryAssetEntity | SubsquidAssetEntity;

export type AssetSnapshotEntity = AssetSnapshotBaseEntity & {
  asset: AssetBaseEntity;
};

export type PoolXYKEntity = SubqueryPoolXYKEntity | SubsquidPoolXYKEntity;

export type PoolSnapshotEntity = SubqueryPoolSnapshotEntity;

export type OrderBookEntity = SubqueryOrderBookEntity | SubsquidOrderBookEntity;

export type OrderBookSnapshotEntity = SubqueryOrderBookSnapshotEntity | SubsquidOrderBookSnapshotEntity;

export type OrderBookOrderEntity = SubqueryOrderBookOrderEntity | SubsquidOrderBookOrderEntity;

export type VaultEntity = SubqueryVaultEntity | SubsquidVaultEntity;

export type VaultEventEntity = SubqueryVaultEventEntity | SubsquidVaultEventEntity;

export type AccountEntity = SubqueryAccountEntity | SubsquidAccountEntity;

export type AccountLiquidityEntity = SubqueryAccountLiquidityEntity;

export type AccountLiquiditySnapshotEntity = SubqueryAccountLiquiditySnapshotEntity;

export type AccountMetaEntity = {
  id: string; // account id
  createdAtBlock: number;
  xorFees: AssetVolume;
  xorBurned: AssetVolume;
  xorStakingValRewards: AssetVolume;
  orderBook: AccountMetaEventCounter;
  vault: AccountMetaEventCounter;
  governance: AccountMetaGovernance;
  deposit: AccountMetaDeposit;
};
