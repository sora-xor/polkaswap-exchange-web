import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/sdk';

import type { OrderBook, OrderBookPriceVolume } from '@sora-substrate/liquidity-proxy';

/**
 * Trims user input to the precision allowed by the selected order book.
 */
export const formatOrderBookInputValue = (value: string, precision: number): string => {
  if (!value) return '';

  const [, decimal] = value.split('.');

  if (value.endsWith('.') && precision === 0) return value.slice(0, -1);

  return value.endsWith('.') || decimal?.length <= precision ? value : new FPNumber(value).dp(precision).toString();
};

/**
 * Converts a base-asset amount into its slider percentage.
 */
export const calculateOrderBookSliderPercent = (value: string, maxPossibleAmount: FPNumber): number => {
  if (!value) return 0;

  return new FPNumber(value).div(maxPossibleAmount).mul(FPNumber.HUNDRED).toNumber();
};

/**
 * Converts a slider percentage into a base-asset amount.
 */
export const calculateOrderBookSliderAmount = (
  percent: string,
  maxPossibleAmount: FPNumber,
  precision: number
): FPNumber => {
  return new FPNumber(percent).div(FPNumber.HUNDRED).mul(maxPossibleAmount).dp(precision);
};

/**
 * Checks whether a stated price is absent from the relevant order-book side.
 */
export const isOrderBookPriceUnique = (
  priceVolumes: ReadonlyArray<OrderBookPriceVolume>,
  statedPrice: string
): boolean => {
  const prices = priceVolumes.map((priceVolume) => priceVolume[0].toString());

  return !prices.includes(statedPrice);
};

/**
 * Checks whether a limit price would cross the spread in place-and-cancel mode.
 */
export const doesOrderBookPriceExceedSpread = ({
  asks,
  bids,
  quoteValue,
  side,
}: {
  asks: ReadonlyArray<OrderBookPriceVolume>;
  bids: ReadonlyArray<OrderBookPriceVolume>;
  quoteValue: string;
  side: PriceVariant;
}): boolean => {
  if (!quoteValue) return false;

  if (side === PriceVariant.Buy) {
    const bestAsk = asks[asks.length - 1]?.[0];
    if (!bestAsk) return false;

    return FPNumber.gte(new FPNumber(quoteValue), bestAsk);
  }

  const bestBid = bids[0]?.[0];
  if (!bestBid) return false;

  return FPNumber.lte(new FPNumber(quoteValue), bestBid);
};

/**
 * Checks whether an amount is outside the order-book min/max/step constraints.
 */
export const isOrderBookAmountOutOfBounds = (orderBook: OrderBook | null | undefined, amountValue: string): boolean => {
  if (!orderBook) return false;

  const { maxLotSize, minLotSize, stepLotSize } = orderBook;
  const amount = new FPNumber(amountValue || '0');

  return !(FPNumber.lte(amount, maxLotSize) && FPNumber.gte(amount, minLotSize) && amount.isZeroMod(stepLotSize));
};
