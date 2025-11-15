import { FPNumber } from '@sora-substrate/math';

import { Consts, PriceVariant } from '../consts';
import { safeDivide } from '../utils';

import type { QuotePayload } from '../types';

const getAssetAveragePrice = (assetId: string, priceVariant: PriceVariant, payload: QuotePayload): FPNumber => {
  return FPNumber.fromCodecValue(payload.prices[assetId][priceVariant]);
};

export const getAveragePrice = (
  inputAssetId: string,
  outputAssetId: string,
  priceVariant: PriceVariant,
  payload: QuotePayload
): FPNumber => {
  if (inputAssetId === outputAssetId) return FPNumber.ONE;

  if (inputAssetId === Consts.XOR) {
    const averagePrice = getAssetAveragePrice(outputAssetId, priceVariant, payload);

    return averagePrice;
  } else if (outputAssetId === Consts.XOR) {
    // Buy price should always be greater or equal to sell price, so we need to invert price_variant here
    const priceVariantInverted = priceVariant === PriceVariant.Buy ? PriceVariant.Sell : PriceVariant.Buy;
    const averagePrice = getAssetAveragePrice(inputAssetId, priceVariantInverted, payload);

    return safeDivide(FPNumber.ONE, averagePrice);
  } else {
    const quoteA = getAveragePrice(inputAssetId, Consts.XOR, priceVariant, payload);
    const quoteB = getAveragePrice(Consts.XOR, outputAssetId, priceVariant, payload);

    return quoteA.mul(quoteB);
  }
};
