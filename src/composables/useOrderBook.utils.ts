import { FPNumber } from '@sora-substrate/sdk';
import type { PriceVariant, OrderBookPriceVolume } from '@sora-substrate/liquidity-proxy';

import type { AsyncFnWithoutArgs } from '@/types/common';
import { LimitOrderType } from '@/consts';

export type LimitOrderForm = {
  price: string;
  amount: string;
  total: string;
  filled: number;
};

export type OrderBookPriceVolumeAggregated = [FPNumber, FPNumber, FPNumber?];

type FormatOrderRowsOptions = {
  orders: OrderBookPriceVolumeAggregated[];
  tickSize: number;
  stepLotSize: number;
  selectedStep: string;
};

const getPrecision = (value: number): number => {
  return value?.toString()?.split(FPNumber.DELIMITERS_CONFIG.decimal)[1]?.length ?? 0;
};

const getAmountProportion = (currentAmount: FPNumber, maxAmount: FPNumber): number => {
  if (!maxAmount || maxAmount.isZero()) return 0;

  return currentAmount.div(maxAmount).mul(FPNumber.HUNDRED).toNumber();
};

/**
 * Normalises raw order book entries into table-friendly rows with formatted strings.
 */
export function formatOrderRows(options: FormatOrderRowsOptions): LimitOrderForm[] {
  const { orders, tickSize, stepLotSize, selectedStep } = options;

  if (!selectedStep) return [];

  const bookPrecision = getPrecision(tickSize);
  const amountPrecision = getPrecision(stepLotSize);
  const aggregated = orders ?? [];
  const amounts = aggregated.map(([, amount]) => amount);
  const maxAmount = amounts.length ? (FPNumber.max(...amounts) as FPNumber) : FPNumber.ZERO;
  const matchesTickSize = Number(selectedStep) === Number(tickSize);

  return aggregated
    .filter(([, amount]) => !amount.isZero())
    .map(([price, amount, totalAcc]) => {
      const total = matchesTickSize ? price.mul(amount) : (totalAcc ?? price.mul(amount));

      return {
        price: price.toNumber().toFixed(bookPrecision),
        amount: amount.toNumber().toFixed(amountPrecision),
        total: total.toNumber().toFixed(bookPrecision),
        filled: getAmountProportion(amount, maxAmount),
      };
    });
}

type FillPriceCallbacks = {
  setSide: (side: PriceVariant) => void;
  setQuoteValue: (value: string) => void;
};

/**
 * Creates a click handler that mirrors the slot behaviour from the Options API widget.
 */
export function createFillPriceHandler(limitOrderType: LimitOrderType, callbacks: FillPriceCallbacks) {
  return (price: string, side: PriceVariant) => {
    if (limitOrderType === LimitOrderType.market) return;

    callbacks.setSide(side);
    callbacks.setQuoteValue(Number(price).toString());
  };
}

type SubscriptionOptions = {
  withLoading: (handler: AsyncFnWithoutArgs) => Promise<void>;
  withParentLoading: (handler: AsyncFnWithoutArgs) => Promise<void>;
  subscribe: AsyncFnWithoutArgs;
};

/**
 * Wraps the order book subscription call with both widget-level and parent-level loaders.
 */
export async function runOrderBookSubscription(options: SubscriptionOptions): Promise<void> {
  const { withLoading, withParentLoading, subscribe } = options;

  await withLoading(async () => {
    await withParentLoading(async () => {
      await subscribe();
    });
  });
}

export type { OrderBookPriceVolumeAggregated, OrderBookPriceVolume };
