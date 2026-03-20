import { F as FPNumber, a8 as LimitOrderType, e as useSettingsStore, aA as watch, a7 as PriceVariant, h as computed, a9 as ref, Z as ZeroStringValue, d as dayjs } from "./index-73GArslZ.js";
import { u as useFormattedAmount } from "./useFormattedAmount-D-xkdlPs.js";
import { u as useOrderBookStore } from "./index-BDxnS5Vu.js";
const getPrecision = (value) => {
  return value?.toString()?.split(FPNumber.DELIMITERS_CONFIG.decimal)[1]?.length ?? 0;
};
const getAmountProportion = (currentAmount, maxAmount) => {
  if (!maxAmount || maxAmount.isZero()) return 0;
  return currentAmount.div(maxAmount).mul(FPNumber.HUNDRED).toNumber();
};
function formatOrderRows(options) {
  const { orders, tickSize, stepLotSize, selectedStep } = options;
  if (!selectedStep) return [];
  const bookPrecision = getPrecision(tickSize);
  const amountPrecision = getPrecision(stepLotSize);
  const aggregated = orders ?? [];
  const amounts = aggregated.map(([, amount]) => amount);
  const maxAmount = amounts.length ? FPNumber.max(...amounts) : FPNumber.ZERO;
  const matchesTickSize = Number(selectedStep) === Number(tickSize);
  return aggregated.filter(([, amount]) => !amount.isZero()).map(([price, amount, totalAcc]) => {
    const total = matchesTickSize ? price.mul(amount) : totalAcc ?? price.mul(amount);
    return {
      price: price.toNumber().toFixed(bookPrecision),
      amount: amount.toNumber().toFixed(amountPrecision),
      total: total.toNumber().toFixed(bookPrecision),
      filled: getAmountProportion(amount, maxAmount)
    };
  });
}
function createFillPriceHandler(limitOrderType, callbacks) {
  return (price, side) => {
    if (limitOrderType === LimitOrderType.market) return;
    callbacks.setSide(side);
    callbacks.setQuoteValue(Number(price).toString());
  };
}
async function runOrderBookSubscription(options) {
  const { withLoading, withParentLoading, subscribe } = options;
  await withLoading(async () => {
    await withParentLoading(async () => {
      await subscribe();
    });
  });
}
const ROW_HEIGHT = 24;
const passthroughLoader = async (handler) => {
  await handler();
};
const toBookPrecision = (value) => {
  return value?.toLocaleString()?.split(FPNumber.DELIMITERS_CONFIG.decimal)[1]?.length ?? 0;
};
function useOrderBook(options = {}) {
  const maxRows = options.maxRows ?? 11;
  const formattedAmount = useFormattedAmount();
  const orderBookStore = useOrderBookStore();
  const settingsStore = useSettingsStore();
  const dexId = computed(() => orderBookStore.dexId);
  const baseValue = computed({
    get: () => orderBookStore.baseValue ?? "",
    set: (value) => {
      orderBookStore.setBaseValue(value);
    }
  });
  const quoteValue = computed({
    get: () => orderBookStore.quoteValue ?? "",
    set: (value) => {
      orderBookStore.setQuoteValue(value);
    }
  });
  const amountSliderValue = computed({
    get: () => orderBookStore.amountSliderValue ?? 0,
    set: (value) => {
      orderBookStore.setAmountSliderValue(value);
    }
  });
  const limitOrderType = computed({
    get: () => orderBookStore.limitOrderType ?? LimitOrderType.limit,
    set: (value) => {
      orderBookStore.setLimitOrderType(value);
    }
  });
  const asks = computed(
    () => orderBookStore.asks ?? []
  );
  const bids = computed(
    () => orderBookStore.bids ?? []
  );
  const currentOrderBook = computed(
    () => orderBookStore.currentOrderBook ?? null
  );
  const baseAsset = computed(
    () => orderBookStore.baseAsset ?? null
  );
  const quoteAsset = computed(
    () => orderBookStore.quoteAsset ?? null
  );
  const orderBookLastDeal = computed(
    () => orderBookStore.lastDeal ?? null
  );
  const orderBookId = computed(() => orderBookStore.orderBookId ?? "");
  const orderBookStats = computed(
    () => orderBookStore.orderBookStats ?? null
  );
  const deals = computed(() => orderBookStore.deals ?? []);
  const side = computed({
    get: () => orderBookStore.side ?? PriceVariant.Buy,
    set: (value) => {
      orderBookStore.setSide(value);
    }
  });
  const setSideValue = (next) => {
    orderBookStore.setSide(next);
  };
  const baseAssetAddress = computed(() => orderBookStore.baseAssetAddress ?? null);
  const exchangeRate = computed(() => {
    const value = settingsStore.exchangeRate;
    return typeof value === "number" && value > 0 ? value : 1;
  });
  const currencySymbol = computed(() => settingsStore.currencySymbol ?? "");
  const nodeIsConnected = computed(() => settingsStore.nodeIsConnected);
  const averagePrice = computed(() => {
    const firstAsk = asks.value?.[0]?.[0];
    const firstBid = bids.value?.[0]?.[0];
    return firstAsk ?? firstBid ?? null;
  });
  const averagePricePrecision = computed(() => {
    const price = averagePrice.value;
    if (!price) return void 0;
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
  const selectedStep = ref("");
  watch(
    currentOrderBook,
    (next) => {
      selectedStep.value = next?.tickSize?.toString() ?? "";
    },
    { immediate: true, deep: true }
  );
  const steps = computed(() => {
    const precision = averagePricePrecision.value;
    const tickSize = currentOrderBook.value?.tickSize;
    if (!(precision && tickSize)) return [];
    const values = [];
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
    (options2) => {
      if (!options2.length) {
        return;
      }
      if (!options2.includes(selectedStep.value)) {
        selectedStep.value = options2[options2.length - 1];
      }
    },
    { immediate: true }
  );
  const bookPrecision = computed(() => toBookPrecision(currentOrderBook.value?.tickSize));
  const amountPrecision = computed(() => toBookPrecision(currentOrderBook.value?.stepLotSize));
  const formatOrders = (items) => formatOrderRows({
    orders: items,
    tickSize: currentOrderBook.value?.tickSize ?? 0,
    stepLotSize: currentOrderBook.value?.stepLotSize ?? 0,
    selectedStep: selectedStep.value
  });
  const asksFormatted = computed(() => formatOrders(asks.value ?? []));
  const bidsFormatted = computed(() => formatOrders(bids.value ?? []));
  const sellOrders = computed(() => asksFormatted.value.slice(-maxRows));
  const buyOrders = computed(() => bidsFormatted.value.slice(0, maxRows));
  const sellMarginStyle = computed(() => {
    const margin = Math.max(maxRows - asksFormatted.value.length, 0);
    return `height: ${margin * ROW_HEIGHT}px`;
  });
  const barStyle = (filled) => `width: ${(filled ?? 0).toString()}%`;
  const showAggregationOptions = computed(() => Boolean(asksFormatted.value.length && bidsFormatted.value.length));
  const isMarketOrder = computed(() => limitOrderType.value === LimitOrderType.market);
  const lastDealTrendsUp = computed(() => orderBookLastDeal.value?.side === PriceVariant.Buy);
  const trendIcon = computed(
    () => lastDealTrendsUp.value ? "arrows-arrow-bold-top-24" : "arrows-arrow-bold-bottom-24"
  );
  const lastDealPrice = computed(() => orderBookLastDeal.value?.price ?? FPNumber.ZERO);
  const lastPriceFormatted = computed(() => lastDealPrice.value.toLocaleString());
  const fiatValue = computed(() => {
    if (!quoteAsset.value) return ZeroStringValue;
    const fiatAmount = formattedAmount.getFiatAmount(lastDealPrice.value.toString(), quoteAsset.value) ?? "0";
    const converted = new FPNumber(fiatAmount).mul(exchangeRate.value).toLocaleString();
    return converted ? `${currencySymbol.value}${converted}` : ZeroStringValue;
  });
  const trendClass = computed(
    () => ["stock-book-delimiter", lastDealTrendsUp.value ? "stock-book-delimiter--up" : "stock-book-delimiter--down"].join(
      " "
    )
  );
  const fillPriceHandler = computed(
    () => createFillPriceHandler(limitOrderType.value, {
      setSide: (value) => orderBookStore.setSide(value),
      setQuoteValue: (value) => orderBookStore.setQuoteValue(value)
    })
  );
  const fillPrice = (price, side2) => {
    fillPriceHandler.value(price, side2);
  };
  const subscribeToOrderBook = async (loaders = {}) => {
    if (!orderBookId.value) return;
    const withLoading = loaders.withLoading ?? passthroughLoader;
    const withParentLoading = loaders.withParentLoading ?? passthroughLoader;
    await runOrderBookSubscription({
      withLoading,
      withParentLoading,
      subscribe: async () => {
        await orderBookStore.subscribeToBidsAndAsks();
      }
    });
  };
  const unsubscribeFromOrderBook = async () => {
    await orderBookStore.unsubscribeFromBidsAndAsks();
  };
  const watchOrderBookSubscription = (loaders = {}) => {
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
  const setSelectedStep = (value) => {
    selectedStep.value = value;
  };
  const completedOrders = computed(
    () => deals.value.map((deal) => {
      const timestamp = deal.timestamp ?? Date.now();
      const date = dayjs(timestamp);
      const time = date.format("M/DD HH:mm:ss");
      const amountSymbol = baseAsset.value?.symbol ?? "";
      const priceSymbol = quoteAsset.value?.symbol ?? "";
      const amount = `${deal.amount.toLocaleString()} ${amountSymbol}`;
      const price = `${deal.price.toLocaleString()} ${priceSymbol}`;
      const isBuy = deal.side === PriceVariant.Buy;
      return { time, amount, price, isBuy };
    })
  );
  return {
    baseAsset,
    quoteAsset,
    currentOrderBook,
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
    orderBookStats,
    limitOrderType,
    side,
    setSide: setSideValue,
    completedOrders,
    dexId,
    baseValue,
    quoteValue,
    amountSliderValue,
    baseAssetAddress,
    PriceVariant
  };
}
export {
  useOrderBook as u
};
