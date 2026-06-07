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

export interface CreateMarketParams extends CreateConditionParams {
  closeBlock: number;
}

export interface CreateMarketResult {
  conditionId?: number;
  marketId?: number;
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

export interface PolkamarktEvidenceInput {
  uri: RuntimeBytes;
  hash: null | RuntimeBytes;
}

export interface EvidenceParams {
  uri: string;
  hash?: string;
}

export interface ReportEarlyResolutionParams {
  marketId: number;
  outcome: PolkamarktOutcome;
  evidence: EvidenceParams;
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

export interface MarketState {
  marketId: number;
  mechanism: string;
  virtualDepth: CodecString;
  realYesShares: CodecString;
  realNoShares: CodecString;
  dpmCollateral: CodecString;
  marginalYesPriceBps: number;
  marginalNoPriceBps: number;
  impliedYesProbabilityBps: number;
  impliedNoProbabilityBps: number;
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
  claimablePayout?: CodecString;
  creatorFees: CodecString;
  isCreator: boolean;
}

export interface EarlyResolutionReport {
  marketId: number;
  reporter: string;
  outcome: PolkamarktOutcome;
  bond: CodecString;
  evidenceUri?: string;
  evidenceHash?: string;
  evidenceBlock?: number;
}

export interface MarketActionResult {
  marketId: number;
  action: 'claim_market' | 'claim_markets' | 'claim_creator_fees' | 'report_early_resolution';
}
