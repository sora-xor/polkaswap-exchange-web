import type { CodecString } from '@sora-substrate/math';

export type PolkamarktOutcome = 'Yes' | 'No';

export type RuntimeBytes = number[];

export interface PolkamarktConditionInput {
  question: RuntimeBytes;
  oracle: RuntimeBytes;
  resolutionSource: RuntimeBytes;
}

export interface PolkamarktConditionDetailsInput {
  category: RuntimeBytes;
  tags: RuntimeBytes[];
  metadataUri: RuntimeBytes;
  metadataHash: null | string;
  rulesUri: RuntimeBytes;
}

export interface EstimateMarketCreationFeeParams {
  question: string;
  oracle: string;
  resolutionSource: string;
  category?: string;
  closeBlock: number;
  seedLiquidity: CodecString;
}

export interface MarketCreationFeeEstimate {
  conditionFee: CodecString;
  marketFee: CodecString;
  totalFee: CodecString;
}

export interface CreateConditionParams {
  question: string;
  oracle: string;
  resolutionSource: string;
  category?: string;
}

export interface CreateConditionResult {
  conditionId: number;
}

export interface CreateMarketParams {
  conditionId: number;
  closeBlock: number;
  seedLiquidity: CodecString;
}

export interface CreateMarketResult {
  conditionId: number;
  marketId?: number;
  seedLiquidity: CodecString;
}

export interface SubmitBuyTradeParams {
  marketId: number;
  outcome: PolkamarktOutcome;
  collateralIn: CodecString;
  minSharesOut: CodecString;
}

export interface SubmitSellTradeParams {
  marketId: number;
  outcome: PolkamarktOutcome;
  sharesIn: CodecString;
  minCollateralOut: CodecString;
}

export interface FlipPositionParams {
  marketId: number;
  fromOutcome: PolkamarktOutcome;
  sharesIn: CodecString;
  minCollateralOut: CodecString;
  minSharesOut: CodecString;
}

export interface AddLiquidityParams {
  marketId: number;
  collateralAmount: CodecString;
  minLpShares: CodecString;
}

export interface BuyQuote {
  marketId: number;
  outcome: PolkamarktOutcome;
  collateralIn: CodecString;
  feeAmount: CodecString;
  pricingCollateral: CodecString;
  sharesOut: CodecString;
}

export interface SellQuote {
  marketId: number;
  outcome: PolkamarktOutcome;
  sharesIn: CodecString;
  grossCollateralOut: CodecString;
  feeAmount: CodecString;
  collateralOut: CodecString;
}

export interface LiquidityQuote {
  marketId: number;
  collateralIn: CodecString;
  lpSharesOut: CodecString;
  poolCollateral: CodecString;
  totalLpShares: CodecString;
}

export interface FlipQuote {
  marketId: number;
  fromOutcome: PolkamarktOutcome;
  toOutcome: PolkamarktOutcome;
  sharesIn: CodecString;
  grossCollateralOut: CodecString;
  sellFeeAmount: CodecString;
  collateralReinvested: CodecString;
  buyFeeAmount: CodecString;
  pricingCollateral: CodecString;
  sharesOut: CodecString;
}

export interface ClaimableInfo {
  marketId: number;
  account: string;
  status: string;
  resolutionOutcome?: PolkamarktOutcome;
  yesShares: CodecString;
  noShares: CodecString;
  netCollateralPaid: CodecString;
  traderPayout: CodecString;
  creatorFees: CodecString;
  creatorLiquidity: CodecString;
  isCreator: boolean;
}

export interface MarketActionResult {
  marketId: number;
  action:
    | 'claim_market'
    | 'claim_markets'
    | 'claim_creator_fees'
    | 'claim_creator_liquidity'
    | 'claim_liquidity';
}
