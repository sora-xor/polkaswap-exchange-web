import type { FPNumber, CodecString, NumberLike } from '@sora-substrate/math';
import type { LiquiditySourceTypes, RewardReason, PriceVariant } from './consts';
import type { OrderBookAggregated } from './pallets/orderBook/types';

export type TradingPair = {
  baseAssetId: string;
  targetAssetId: string;
};

export type PrimaryMarketsEnabledAssets = {
  tbc: string[];
  xst: Record<
    string,
    {
      referenceSymbol: string;
      feeRatio: FPNumber;
    }
  >;
};

export interface LPRewardsInfo {
  amount: CodecString;
  currency: string;
  reason: RewardReason;
}

export type DistributionChunk = {
  // [Rename]: source
  market: LiquiditySourceTypes;
  income: FPNumber;
  outcome: FPNumber;
  fee: FPNumber;
};

export type Distribution = DistributionChunk & {
  input: string;
  output: string;
};

export type QuoteIntermediate = {
  amount: FPNumber;
  fee: FPNumber;
  rewards: LPRewardsInfo[];
  route: string[];
  amountWithoutImpact: FPNumber;
  distribution: Distribution[][];
};

export interface SwapResult {
  amount: CodecString;
  fee: CodecString | LiquidityProviderFee[];
  rewards: LPRewardsInfo[];
  route?: string[];
  amountWithoutImpact?: CodecString;
  distribution?: Distribution[][];
}

export type LiquidityProviderFee = { assetId: string; value: CodecString };

export type SwapQuote = (
  inputAssetAddress: string,
  outputAssetAddress: string,
  value: NumberLike,
  isExchangeB: boolean,
  selectedSources?: LiquiditySourceTypes[],
  deduceFee?: boolean
) => {
  result: SwapResult;
  dexId: number;
};

export type QuotePaths = {
  [key: string]: Array<LiquiditySourceTypes>;
};

export type OracleRate = {
  value: CodecString;
  lastUpdated: number;
  dynamicFee: CodecString;
};

export type QuotePayload = {
  enabledAssets: PrimaryMarketsEnabledAssets;
  enabledSources: Array<LiquiditySourceTypes>;
  lockedSources: Array<LiquiditySourceTypes>;
  sources: PathsAndPairLiquiditySources;
  rates: Record<string, OracleRate>;
  reserves: {
    xyk: {
      [key: string]: {
        base: CodecString;
        target: CodecString;
        chameleon: CodecString;
      };
    };
    tbc: {
      [key: string]: CodecString;
    };
    orderBook: {
      [key: string]: OrderBookAggregated | null;
    };
  };
  prices: {
    [key: string]: {
      [PriceVariant.Buy]: CodecString;
      [PriceVariant.Sell]: CodecString;
    };
  };
  issuances: {
    [key: string]: CodecString;
  };
  consts: {
    tbc: {
      initialPrice: CodecString;
      priceChangeStep: CodecString;
      priceChangeRate: CodecString;
      sellPriceCoefficient: CodecString;
      referenceAsset: string;
    };
    xst: {
      floorPrice: CodecString;
      referenceAsset: string;
      syntheticBaseBuySellLimit: CodecString;
    };
    band: {
      rateStalePeriod: number;
    };
  };
};

export type QuoteSingleResult = {
  amount: FPNumber;
  fee: FPNumber;
  distribution: Array<Distribution>;
};

export type QuoteResult = QuoteSingleResult & {
  rewards: Array<LPRewardsInfo>;
};

export type PathsAndPairLiquiditySources = {
  isAvailable: boolean;
  liquiditySources: Array<LiquiditySourceTypes>;
};
