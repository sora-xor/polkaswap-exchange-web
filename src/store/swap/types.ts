import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import type { LPRewardsInfo, SwapQuote, Distribution } from '@sora-substrate/liquidity-proxy/build/types';
import type { CodecString } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

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
  rewards: readonly LPRewardsInfo[];
  route: readonly string[];
  distribution: readonly Distribution[][];
  isAvailable: boolean;
  liquiditySources: LiquiditySourceTypes[];
  swapQuote: Nullable<SwapQuote>;
  selectedDexId: number;
  allowLossPopup: boolean;
};
