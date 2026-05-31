import type { MarketCategory } from './consts';

export interface PolkamarktMarket {
  id: string;
  chainId?: number;
  conditionId?: number;
  creator?: string;
  title: string;
  category: MarketCategory;
  description: string;
  oracle?: string;
  resolutionSource?: string;
  closeBlock?: number;
  liquidity: number;
  volume: number;
  probability?: number;
  trending?: boolean;
  status?: string;
  collateralAsset?: string;
  seedLiquidity?: number;
  creatorFees?: number;
  liquidityShares?: number;
  liquidityCollateralContributed?: number;
  resolutionOutcome?: string;
  resolutionEvidenceUri?: string;
  resolutionEvidenceHash?: string;
  resolutionEvidenceBlock?: number;
  cancellationEvidenceUri?: string;
  cancellationEvidenceHash?: string;
  cancellationEvidenceBlock?: number;
  pool?: {
    collateral?: number;
    yes?: number;
    no?: number;
  };
}

export interface MarketHistoryPoint {
  id: string;
  marketId?: number;
  timestamp?: number;
  blockHeight?: number;
  probability: number;
  priceYes?: number;
  priceNo?: number;
  liquidityUSD?: number;
  volumeUSD?: number;
  status?: string;
}

export type TradeMode = 'buy' | 'sell' | 'flip' | 'liquidity' | 'claim';
export type TicketOutcome = 'YES' | 'NO';

export interface AccountPosition {
  id: string;
  marketId?: number;
  marketTitle?: string;
  outcome?: TicketOutcome;
  shares?: number;
  yesShares?: number;
  noShares?: number;
  netCollateralPaid?: number;
  lpShares?: number;
  lpCollateralContributed?: number;
  costBasisUsd?: number;
  marketValueUsd?: number;
  realizedPnlUsd?: number;
  unrealizedPnlUsd?: number;
  claimablePayoutUsd?: number;
  lpClaimablePayoutUsd?: number;
  isCreator?: boolean;
  status?: string;
  updatedAt?: string;
}

export interface AccountTrade {
  id: string;
  marketId?: number;
  marketTitle?: string;
  side?: 'buy' | 'sell' | 'claim' | 'flip';
  outcome?: TicketOutcome;
  fromOutcome?: TicketOutcome;
  toOutcome?: TicketOutcome;
  collateralUsd?: number;
  collateralReinvestedUsd?: number;
  shares?: number;
  sharesIn?: number;
  sharesOut?: number;
  price?: number;
  feeUsd?: number;
  sellFeeUsd?: number;
  buyFeeUsd?: number;
  realizedPnlUsd?: number;
  timestamp?: string;
  blockNumber?: number;
  blockHash?: string;
  extrinsicHash?: string;
}

export interface AccountActivity {
  account: string;
  positions: AccountPosition[];
  trades: AccountTrade[];
  updatedAt?: string;
}
