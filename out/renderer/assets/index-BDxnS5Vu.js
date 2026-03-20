import { p as defineStore, a7 as PriceVariant, a8 as LimitOrderType, r as requireLegacyStore } from "./index-73GArslZ.js";
const WARN_PREFIX = "[orderBookStore]";
let warnedMissingModule = false;
const getLegacyStore = () => {
  const legacyStore = requireLegacyStore();
  if (!legacyStore?.state?.orderBook) {
    if (!warnedMissingModule) {
      console.warn(`${WARN_PREFIX} Legacy order book module is not ready yet.`);
      warnedMissingModule = true;
    }
    return null;
  }
  warnedMissingModule = false;
  return legacyStore;
};
const readOrderBookState = () => {
  const legacyStore = getLegacyStore();
  if (!legacyStore) return null;
  const state = legacyStore.state?.orderBook;
  if (!state) {
    console.warn(`${WARN_PREFIX} Legacy order book state is unavailable.`);
    return null;
  }
  return state;
};
const readOrderBookGetters = () => {
  const legacyStore = getLegacyStore();
  if (!legacyStore) return null;
  const getters = legacyStore.getters?.orderBook;
  if (!getters) {
    console.warn(`${WARN_PREFIX} Legacy order book getters are unavailable.`);
    return null;
  }
  return getters;
};
const accessState = (selector, fallback) => {
  const state = readOrderBookState();
  if (!state) return fallback;
  try {
    return selector(state);
  } catch (error) {
    console.warn(`${WARN_PREFIX} Failed to access legacy state.`, error);
    return fallback;
  }
};
const accessGetter = (selector, fallback) => {
  const getters = readOrderBookGetters();
  if (!getters) return fallback;
  try {
    return selector(getters);
  } catch (error) {
    console.warn(`${WARN_PREFIX} Failed to access legacy getters.`, error);
    return fallback;
  }
};
const callLegacyMethod = (kind, method, args = []) => {
  const legacyStore = getLegacyStore();
  if (!legacyStore) return void 0;
  const container = legacyStore[kind]?.orderBook;
  const handler = container?.[method];
  if (typeof handler !== "function") {
    console.warn(`${WARN_PREFIX} Legacy ${kind}.orderBook.${method} is not available.`);
    return void 0;
  }
  return handler(...args);
};
const useOrderBookStore = defineStore("orderBook", {
  state: () => ({}),
  getters: {
    orderBooks: () => accessState((state) => state.orderBooks, {}),
    orderBookId: () => accessGetter((getters) => getters.orderBookId ?? "", ""),
    dexId: () => accessState((state) => state.dexId, null),
    baseAsset: () => accessGetter(
      (getters) => getters.baseAsset ?? null,
      null
    ),
    quoteAsset: () => accessGetter(
      (getters) => getters.quoteAsset ?? null,
      null
    ),
    currentOrderBook: () => accessGetter((getters) => getters.currentOrderBook ?? null, null),
    orderBookStats: () => accessGetter(
      (getters) => getters.orderBookStats ?? null,
      null
    ),
    lastDeal: () => accessGetter(
      (getters) => getters.orderBookLastDeal ?? null,
      null
    ),
    deals: () => accessState((state) => state.deals, []),
    asks: () => accessState((state) => state.asks, []),
    bids: () => accessState((state) => state.bids, []),
    limitOrderType: () => accessState((state) => state.limitOrderType ?? LimitOrderType.limit, LimitOrderType.limit),
    baseValue: () => accessState((state) => state.baseValue, ""),
    quoteValue: () => accessState((state) => state.quoteValue, ""),
    amountSliderValue: () => accessState((state) => state.amountSliderValue, 0),
    side: () => accessState((state) => state.side, PriceVariant.Buy),
    baseAssetAddress: () => accessState((state) => state.baseAssetAddress, null),
    quoteAssetAddress: () => accessState((state) => state.quoteAssetAddress, null),
    baseAssetBalance: () => accessState((state) => state.baseAssetBalance, null),
    orderBooksStats: () => accessState((state) => state.orderBooksStats, {}),
    userLimitOrders: () => accessState((state) => state.userLimitOrders, []),
    ordersToBeCancelled: () => accessState((state) => state.ordersToBeCancelled, []),
    orderBookUpdates: () => accessState((state) => state.orderBookUpdates, []),
    orderBookStatsUpdates: () => accessState((state) => state.orderBookStatsUpdates, null),
    userLimitOrderUpdates: () => accessState((state) => state.userLimitOrderUpdates, null),
    pagedUserLimitOrdersSubscription: () => accessState((state) => state.pagedUserLimitOrdersSubscription, null)
  },
  actions: {
    async getOrderBooksInfo() {
      await callLegacyMethod("dispatch", "getOrderBooksInfo");
    },
    async subscribeToOrderBookStats() {
      await callLegacyMethod("dispatch", "subscribeToOrderBookStats");
    },
    async unsubscribeFromOrderBookStats() {
      await callLegacyMethod("dispatch", "unsubscribeFromOrderBookStats");
    },
    async subscribeToBidsAndAsks() {
      await callLegacyMethod("dispatch", "subscribeToBidsAndAsks");
    },
    async unsubscribeFromBidsAndAsks() {
      await callLegacyMethod("dispatch", "unsubscribeFromBidsAndAsks");
    },
    async updateBalanceSubscription(reset = false) {
      await callLegacyMethod("dispatch", "updateBalanceSubscription", [reset]);
    },
    async updateOrderBooksStats() {
      await callLegacyMethod("dispatch", "updateOrderBooksStats");
    },
    async subscribeToUserLimitOrders() {
      await callLegacyMethod("dispatch", "subscribeToUserLimitOrders");
    },
    async unsubscribeFromUserLimitOrders() {
      await callLegacyMethod("dispatch", "unsubscribeFromUserLimitOrders");
    },
    async subscribeOnLimitOrders(ids) {
      await callLegacyMethod("dispatch", "subscribeOnLimitOrders", [ids]);
    },
    setCurrentOrderBook(orderBookId) {
      callLegacyMethod("commit", "setCurrentOrderBook", [orderBookId]);
    },
    setBaseValue(value) {
      callLegacyMethod("commit", "setBaseValue", [value]);
    },
    setQuoteValue(value) {
      callLegacyMethod("commit", "setQuoteValue", [value]);
    },
    setAmountSliderValue(value) {
      callLegacyMethod("commit", "setAmountSliderValue", [value]);
    },
    setLimitOrderType(value) {
      callLegacyMethod("commit", "setLimitOrderType", [value]);
    },
    setSide(value) {
      callLegacyMethod("commit", "setSide", [value]);
    },
    setOrdersToBeCancelled(orders) {
      callLegacyMethod("commit", "setOrdersToBeCancelled", [orders]);
    },
    resetPagedUserLimitOrdersSubscription() {
      callLegacyMethod("commit", "resetPagedUserLimitOrdersSubscription");
    }
  }
});
export {
  useOrderBookStore as u
};
