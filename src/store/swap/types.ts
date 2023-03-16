import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import type { CodecString } from '@sora-substrate/util';
import type {
  QuotePaths,
  QuotePayload,
  PrimaryMarketsEnabledAssets,
  LPRewardsInfo,
} from '@sora-substrate/liquidity-proxy/build/types';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

export type DexQuoteData = {
  pairLiquiditySources: Array<LiquiditySourceTypes>;
  paths: QuotePaths;
  payload: Nullable<QuotePayload>;
};

export type SwapState = {
  tokenFromAddress: Nullable<string>;
  tokenFromBalance: Nullable<AccountBalance>;
  tokenToAddress: Nullable<string>;
  tokenToBalance: Nullable<AccountBalance>;
  fromValue: string;
  toValue: string;
  amountWithoutImpact: CodecString;
  liquidityProviderFee: CodecString;
  isExchangeB: boolean;
  enabledAssets: PrimaryMarketsEnabledAssets;
  rewards: Array<LPRewardsInfo>;
  route: string[];
  selectedDexId: number;
  dexQuoteData: Record<number, DexQuoteData>;
};
