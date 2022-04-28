import type { LiquiditySourceTypes } from '@sora-substrate/util/build/swap/consts';
import type { CodecString } from '@sora-substrate/util';
import type { QuotePaths, QuotePayload, PrimaryMarketsEnabledAssets } from '@sora-substrate/util/build/swap/types';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';
import type { LPRewardsInfo } from '@sora-substrate/util/build/rewards/types';

export type SwapState = {
  tokenFromAddress: Nullable<string>;
  tokenFromBalance: Nullable<AccountBalance>;
  tokenToAddress: Nullable<string>;
  tokenToBalance: Nullable<AccountBalance>;
  fromValue: string;
  toValue: string;
  amountWithoutImpact: CodecString;
  isExchangeB: boolean;
  liquidityProviderFee: CodecString;
  pairLiquiditySources: Array<LiquiditySourceTypes>;
  paths: QuotePaths;
  enabledAssets: PrimaryMarketsEnabledAssets;
  rewards: Array<LPRewardsInfo>;
  payload: Nullable<QuotePayload>;
};
