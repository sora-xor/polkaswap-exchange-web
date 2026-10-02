import type { CodecString } from '@sora-substrate/sdk';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import type { LPRewardsInfo } from '@sora-substrate/liquidity-proxy/build/types';

/** Exact reviewed terms are retained through asynchronous wallet preparation. */
export interface SwapReview {
  tokenFrom: AccountAsset;
  tokenTo: AccountAsset;
  fromValue: string;
  toValue: string;
  isExchangeB: boolean;
  slippage: string;
  liquiditySource?: LiquiditySourceTypes | null;
  dexId: number;
  minMaxReceived: CodecString;
  networkFee: CodecString;
  liquidityProviderFee: CodecString;
  priceImpact: string;
  price: string;
  priceReversed: string;
  route: string[];
  rewards: LPRewardsInfo[];
  account: string;
  network: string;
}

/** Compares execution bounds and signing context, not presentation or fluctuating asset balances. */
export function swapReviewKey(review: SwapReview): string {
  return JSON.stringify([
    review.tokenFrom.address,
    review.tokenTo.address,
    review.fromValue,
    review.toValue,
    review.isExchangeB,
    review.slippage,
    review.liquiditySource,
    review.dexId,
    review.minMaxReceived,
    review.networkFee,
    review.account,
    review.network,
    review.liquidityProviderFee,
    review.priceImpact,
    review.route,
  ]);
}
