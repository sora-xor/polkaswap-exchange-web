import type { LiquiditySourceTypes } from '@/lib/substrate/liquidity-proxy/consts';
import type { LPRewardsInfo, SwapQuote, Distribution } from '@/lib/substrate/liquidity-proxy/types';
import type { CodecString } from '@/lib/substrate/sdk';
import type { AccountBalance, RegisteredAccountAsset } from '@/lib/substrate/sdk/assets/types';

export type SwapState = {
  tokenFromAddress: Nullable<string>;
  tokenFromBalance: Nullable<AccountBalance>;
  tokenFromCache: Nullable<RegisteredAccountAsset>;
  tokenToAddress: Nullable<string>;
  tokenToBalance: Nullable<AccountBalance>;
  tokenToCache: Nullable<RegisteredAccountAsset>;
  fromValue: string;
  toValue: string;
  amountWithoutImpact: CodecString;
  liquidityProviderFee: CodecString;
  isExchangeB: boolean;
  rewards: readonly LPRewardsInfo[];
  route: readonly string[];
  distribution: readonly Distribution[][];
  isPathAvailable: boolean;
  isAvailable: boolean;
  quoteError: boolean;
  liquiditySources: LiquiditySourceTypes[];
  swapQuote: Nullable<SwapQuote>;
  selectedDexId: number;
  allowLossPopup: boolean;
};
