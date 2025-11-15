import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/sdk';
import dayjs from 'dayjs/esm';
import { computed, nextTick, ref, watch } from 'vue';

import { LimitOrderType, ZeroStringValue } from '@/consts';
import store from '@/store';
import { useFormattedAmount } from '@/composables/useFormattedAmount';
import {
  createFillPriceHandler,
  formatOrderRows,
  runOrderBookSubscription,
  type LimitOrderForm,
  type OrderBookPriceVolumeAggregated,
} from '@/composables/useOrderBook.utils';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { OrderBookDealData } from '@/types/orderBook';
import type { AsyncFnWithoutArgs, Nullable } from '@/types/common';

const ROW_HEIGHT = 24;

type SubscriptionLoaders = {
  withLoading?: (handler: AsyncFnWithoutArgs) => Promise<void>;
  withParentLoading?: (handler: AsyncFnWithoutArgs) => Promise<void>;
};

const passthroughLoader = async (handler: AsyncFnWithoutArgs): Promise<void> => {
  await handler();
};

const toBookPrecision = (value: Nullable<number>): number => {
  return value?.toLocaleString()?.split(FPNumber.DELIMITERS_CONFIG.decimal)[1]?.length ?? 0;
};

const resolveNodeConnection = (): boolean => {
  const connection = (store.getters?.settings as Record<string, unknown> | undefined)?.nodeIsConnected;

  if (typeof connection === 'boolean') return connection;
  if (connection && typeof (connection as { value?: unknown }).value === 'boolean') {
    return Boolean((connection as { value?: boolean }).value);
  }

  return true;
};

export function useOrderBook(options: { maxRows?: number } = {}) {
  const maxRows = options.maxRows ?? 11;
  const formattedAmount = useFormattedAmount();

  const orderBookState = store.state.orderBook;

  const limitOrderType = computed<LimitOrderType>(() => orderBookState.limitOrderType as LimitOrderType);
  const asks = computed<OrderBookPriceVolumeAggregated[]>(
    () => (orderBookState.asks as OrderBookPriceVolumeAggregated[]) ?? []
  );
  const bids = computed<OrderBookPriceVolumeAggregated[]>(
    () => (orderBookState.bids as OrderBookPriceVolumeAggregated[]) ?? []
  );

  const orderBookGetters = store.getters?.orderBook as Record<string, unknown>;
  const walletGetter = store.getters?.wallet as Record<string, any> | undefined;

  const currentOrderBook = computed<Nullable<OrderBook>>(
    () => (orderBookGetters?.currentOrderBook as Nullable<OrderBook>) ?? null
  );
  const baseAsset = computed<Nullable<AccountAsset>>(
    () => (orderBookGetters?.baseAsset as Nullable<AccountAsset>) ?? null
  );
  const quoteAsset = computed<Nullable<AccountAsset>>(
    () => (orderBookGetters?.quoteAsset as Nullable<AccountAsset>) ?? null
  );
  const orderBookLastDeal = computed<Nullable<OrderBookDealData>>(
    () => (orderBookGetters?.orderBookLastDeal as Nullable<OrderBookDealData>) ?? null
  );
  const orderBookId = computed(() => (orderBookGetters?.orderBookId as string) ?? '');
  const deals = computed<OrderBookDealData[]>(() => (store.state.orderBook?.deals as OrderBookDealData[]) ?? []);
  const side = computed<PriceVariant>(() => store.state.orderBook?.side ?? PriceVariant.Buy);

  const setSide = (next: PriceVariant) => {
    store.commit.orderBook?.setSide?.(next);
  };

  const exchangeRate = computed<number>(() => {
    const fromGetter = walletGetter?.settings?.exchangeRate;
    if (typeof fromGetter === 'number') return fromGetter;
    const fromState = store.state.wallet?.settings?.exchangeRate;
    return typeof fromState === 'number' ? fromState : 1;
  });

  const currencySymbol = computed<string>(() => {
    const fromGetter = walletGetter?.settings?.currencySymbol;
    if (typeof fromGetter === 'string') return fromGetter;
    const fromState = store.state.wallet?.settings?.currencySymbol;
    return typeof fromState === 'string' ? fromState : '';
  });

  const nodeIsConnected = ref(resolveNodeConnection());

  const averagePrice = computed<Nullable<FPNumber>>(() => {
    const firstAsk = asks.value?.[0]?.[0];
    const firstBid = bids.value?.[0]?.[0];
    return firstAsk ?? firstBid ?? null;
  });

  const averagePricePrecision = computed<number | undefined>(() => {
    const price = averagePrice.value;
    if (!price) return undefined;

    let result = price;
    let max = FPNumber.ONE;

    if (price.isLessThan(FPNumber.ONE)) {
      const order = new FPNumber(0.1);
      max = order;
      while (result.isLessThan(FPNumber.ONE)) {
        result = price.div(max);
        if (result.isGreaterThanOrEqualTo(FPNumber.ONE)) break;
        max = max.mul(order);
      }
    } else if (price.isGreaterThan(FPNumber.TEN)) {
      const order = FPNumber.TEN;
      max = order;
      while (result.isGreaterThan(FPNumber.ONE)) {
        result = price.div(max);
        if (result.isLessThan(FPNumber.TEN)) break;
        max = max.mul(order);
      }
    }

    return max.toNumber();
  });

  const selectedStep = ref('');

  watch(
    currentOrderBook,
    (next) => {
      selectedStep.value = next?.tickSize?.toString() ?? '';
    },
    { immediate: true, deep: true }
  );

  const steps = computed<string[]>(() => {
    const precision = averagePricePrecision.value;
    const tickSize = currentOrderBook.value?.tickSize;
    if (!(precision && tickSize)) return [];

    const values: string[] = [];
    const min = tickSize;
    const max = new FPNumber(precision);

    for (let inBetweenStep = max; inBetweenStep.isGreaterThanOrEqualTo(min); ) {
      values.push(inBetweenStep.toString());
      inBetweenStep = inBetweenStep.div(FPNumber.TEN);
    }

    return values.slice(-6);
  });

  watch(
    steps,
    (options) => {
      if (!options.length) {
        return;
      }

      if (!options.includes(selectedStep.value)) {
        selectedStep.value = options[options.length - 1];
      }
    },
    { immediate: true }
  );

  const bookPrecision = computed(() => toBookPrecision(currentOrderBook.value?.tickSize));
  const amountPrecision = computed(() => toBookPrecision(currentOrderBook.value?.stepLotSize));

  const formatOrders = (items: OrderBookPriceVolumeAggregated[]) =>
    formatOrderRows({
      orders: items,
      tickSize: currentOrderBook.value?.tickSize ?? 0,
      stepLotSize: currentOrderBook.value?.stepLotSize ?? 0,
      selectedStep: selectedStep.value,
    });

  const asksFormatted = computed<LimitOrderForm[]>(() => formatOrders(asks.value ?? []));
  const bidsFormatted = computed<LimitOrderForm[]>(() => formatOrders(bids.value ?? []));

  const sellOrders = computed<LimitOrderForm[]>(() => asksFormatted.value.slice(-maxRows));
  const buyOrders = computed<LimitOrderForm[]>(() => bidsFormatted.value.slice(0, maxRows));

  const sellMarginStyle = computed(() => {
    const margin = Math.max(maxRows - asksFormatted.value.length, 0);
    return `height: ${margin * ROW_HEIGHT}px`;
  });

  const barStyle = (filled?: number): string => `width: ${(filled ?? 0).toString()}%`;
  const showAggregationOptions = computed(() => Boolean(asksFormatted.value.length && bidsFormatted.value.length));
  const isMarketOrder = computed(() => limitOrderType.value === LimitOrderType.market);

  const lastDealTrendsUp = computed(() => orderBookLastDeal.value?.side === PriceVariant.Buy);
  const trendIcon = computed(() =>
    lastDealTrendsUp.value ? 'arrows-arrow-bold-top-24' : 'arrows-arrow-bold-bottom-24'
  );
  const lastDealPrice = computed(() => orderBookLastDeal.value?.price ?? FPNumber.ZERO);
  const lastPriceFormatted = computed(() => lastDealPrice.value.toLocaleString());

  const fiatValue = computed(() => {
    if (!quoteAsset.value) return ZeroStringValue;
    const fiatAmount = formattedAmount.getFiatAmount(lastDealPrice.value.toString(), quoteAsset.value) ?? '0';
    const converted = new FPNumber(fiatAmount).mul(exchangeRate.value).toLocaleString();
    return converted ? `${currencySymbol.value}${converted}` : ZeroStringValue;
  });

  const trendClass = computed(() =>
    ['stock-book-delimiter', lastDealTrendsUp.value ? 'stock-book-delimiter--up' : 'stock-book-delimiter--down'].join(
      ' '
    )
  );

  const fillPriceHandler = computed(() =>
    createFillPriceHandler(limitOrderType.value, {
      setSide: (side) => store.commit.orderBook?.setSide?.(side),
      setQuoteValue: (value) => store.commit.orderBook?.setQuoteValue?.(value),
    })
  );

  const fillPrice = (price: string, side: PriceVariant): void => {
    fillPriceHandler.value(price, side);
  };

  const subscribeToOrderBook = async (loaders: SubscriptionLoaders = {}): Promise<void> => {
    if (!orderBookId.value) return;

    const withLoading = loaders.withLoading ?? passthroughLoader;
    const withParentLoading = loaders.withParentLoading ?? passthroughLoader;

    await runOrderBookSubscription({
      withLoading,
      withParentLoading,
      subscribe: async () => {
        await store.dispatch.orderBook?.subscribeToBidsAndAsks?.();
      },
    });
  };

  const unsubscribeFromOrderBook = async (): Promise<void> => {
    await store.dispatch.orderBook?.unsubscribeFromBidsAndAsks?.();
  };

  const watchOrderBookSubscription = (loaders: SubscriptionLoaders = {}) => {
    return watch(
      [orderBookId, nodeIsConnected],
      async ([id, connected]) => {
        if (!id || !connected) {
          await unsubscribeFromOrderBook();
          return;
        }

        await subscribeToOrderBook(loaders);
      },
      { immediate: true }
    );
  };

  watch(
    () => (store.getters?.settings as Record<string, unknown> | undefined)?.nodeIsConnected,
    async () => {
      nodeIsConnected.value = resolveNodeConnection();
      await nextTick();
    }
  );

  const isBookPrecisionEqual = (precision: string): boolean => {
    return precision === (currentOrderBook.value?.tickSize?.toString() ?? '');
  };

  const setSelectedStep = (value: string) => {
    selectedStep.value = value;
  };

  const completedOrders = computed(() =>
    deals.value.map((deal) => {
      const timestamp = deal.timestamp ?? Date.now();
      const date = dayjs(timestamp);
      const time = date.format('M/DD HH:mm:ss');
      const amountSymbol = baseAsset.value?.symbol ?? '';
      const priceSymbol = quoteAsset.value?.symbol ?? '';

      const amount = `${deal.amount.toLocaleString()} ${amountSymbol}`;
      const price = `${deal.price.toLocaleString()} ${priceSymbol}`;
      const isBuy = deal.side === PriceVariant.Buy;

      return { time, amount, price, isBuy };
    })
  );

  return {
    baseAsset,
    quoteAsset,
    asks,
    bids,
    asksFormatted,
    bidsFormatted,
    sellOrders,
    buyOrders,
    sellMarginStyle,
    barStyle,
    showAggregationOptions,
    isMarketOrder,
    steps,
    selectedStep,
    setSelectedStep,
    bookPrecision,
    amountPrecision,
    lastDealTrendsUp,
    trendIcon,
    trendClass,
    lastPriceFormatted,
    fiatValue,
    fillPrice,
    subscribeToOrderBook,
    unsubscribeFromOrderBook,
    watchOrderBookSubscription,
    orderBookId,
    limitOrderType,
    side,
    setSide,
    completedOrders,
    PriceVariant,
  };
}

export type OrderBookComposable = ReturnType<typeof useOrderBook>;
