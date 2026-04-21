import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { FPNumber } from '@sora-substrate/math';
import { DexId } from '@sora-substrate/sdk/build/dex/consts';
import { defineStore } from 'pinia';
import { combineLatest } from 'rxjs';

import { LimitOrderType } from '@/consts';
import { api } from '@/lib/soraneo-wallet/src/api';
import { subscribeOnOrderBookUpdates } from '@/indexer/queries/orderBook/orderBook';
import { fetchOrderBooks } from '@/indexer/queries/orderBook/orderBooks';
import { useAssetsStore } from '@/stores/assets';
import type { OrderBookState } from '@/stores/orderBook/types';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import type { OrderBookDealData, OrderBookStats } from '@/types/orderBook';
import type { Nullable } from '@/types/common';
import { getBookDecimals } from '@/utils/orderBook';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';

import type { OrderBook, OrderBookId, OrderBookPriceVolume } from '@sora-substrate/liquidity-proxy';
import type { AccountBalance, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { LimitOrder } from '@sora-substrate/sdk/build/orderBook/types';
import type { Subscription } from 'rxjs';

const ORDER_BOOK_BASE_BALANCE_SUBSCRIPTION_KEY = 'order-book-base-balance';
const ORDER_BOOK_SNAPSHOT_TIMEOUT_MS = 4_000;
const ORDER_BOOK_API_READY_TIMEOUT_MS = 12_000;
const ORDER_BOOK_API_READY_POLL_MS = 100;

const balanceSubscriptions = new TokenBalanceSubscriptions();

const buildInitialState = (): OrderBookState => ({
  orderBooks: {},
  dexId: DexId.XOR,
  baseAssetAddress: null,
  quoteAssetAddress: null,
  limitOrderType: LimitOrderType.limit,
  orderBooksStats: {},
  deals: [],
  asks: [],
  bids: [],
  userLimitOrders: [],
  baseValue: '',
  quoteValue: '',
  side: PriceVariant.Buy,
  orderBookUpdates: [],
  orderBookStatsUpdates: null,
  userLimitOrderUpdates: null,
  pagedUserLimitOrdersSubscription: null,
  ordersToBeCancelled: [],
  amountSliderValue: 0,
  baseAssetBalance: null,
});

type TimedResult<T> = {
  timedOut: boolean;
  value: T;
};

type AddressWhitelistEntry = {
  address?: Nullable<string>;
};

type ChainApiLike = {
  isReady?: unknown;
  query?: {
    orderBook?: {
      orderBooks?: {
        entries?: unknown;
      };
      aggregatedAsks?: unknown;
      aggregatedBids?: unknown;
    };
  };
};

const clearSubscription = <T extends { unsubscribe?: () => void }>(subscription: Nullable<T>): null => {
  subscription?.unsubscribe?.();
  return null;
};

const clearCallback = (callback: Nullable<VoidFunction>): null => {
  callback?.();
  return null;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = <T>(promise: Promise<T>, fallback: T): Promise<TimedResult<T>> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve({ timedOut: true, value: fallback });
    }, ORDER_BOOK_SNAPSHOT_TIMEOUT_MS);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve({ timedOut: false, value });
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

const toFpNumber = (value: unknown): FPNumber => {
  if (value instanceof FPNumber) return value;

  const codecValue = value as Nullable<{ inner?: { toString?: () => string }; isDivisible?: { isTrue?: boolean } }>;
  const inner = codecValue?.inner?.toString?.();

  if (inner !== undefined) {
    const decimals = codecValue?.isDivisible?.isTrue ? FPNumber.DEFAULT_PRECISION : 0;
    return FPNumber.fromCodecValue(inner, decimals);
  }

  return new FPNumber((value as string | number | bigint | undefined) ?? 0);
};

const mapAggregatedSnapshot = (snapshot: unknown): Array<OrderBookPriceVolume> => {
  const result: Array<OrderBookPriceVolume> = [];
  const maybeIterable = snapshot as Nullable<{ forEach?: (cb: (value: unknown, key: unknown) => void) => void }>;

  if (typeof maybeIterable?.forEach !== 'function') {
    return result;
  }

  maybeIterable.forEach((value, key) => {
    result.push([toFpNumber(key), toFpNumber(value)]);
  });

  return result;
};

const loadSnapshotFromConnection = async (
  side: 'asks' | 'bids',
  base: string,
  quote: string,
  dexId?: number
): Promise<Array<OrderBookPriceVolume>> => {
  const settingsStore = useSettingsStore();
  const connectionApi = settingsStore.appConnection?.connection?.api;
  const queryFn =
    side === 'asks' ? connectionApi?.query?.orderBook?.aggregatedAsks : connectionApi?.query?.orderBook?.aggregatedBids;

  if (typeof queryFn !== 'function') {
    return [];
  }

  const snapshot = await queryFn({ dexId: dexId ?? 0, base, quote });
  return mapAggregatedSnapshot(snapshot);
};

const getConnectedChainApi = (): ChainApiLike | null => {
  const settingsStore = useSettingsStore();
  const settingsConnectionApi = settingsStore.appConnection?.connection?.api as ChainApiLike | undefined;

  if (settingsConnectionApi) return settingsConnectionApi;

  const connectionApi = (api as { connection?: { api?: ChainApiLike | null } }).connection?.api;

  if (connectionApi) return connectionApi;

  const directApi = (api as { api?: ChainApiLike | null }).api;

  if (directApi) return directApi;

  return null;
};

const hasOrderBookEntriesQuery = (chainApi: Nullable<ChainApiLike>): boolean => {
  return typeof chainApi?.query?.orderBook?.orderBooks?.entries === 'function';
};

const waitForOrderBookApiReady = async (): Promise<boolean> => {
  const timeoutAt = Date.now() + ORDER_BOOK_API_READY_TIMEOUT_MS;

  while (Date.now() < timeoutAt) {
    const chainApi = getConnectedChainApi();
    const isReady = chainApi?.isReady as PromiseLike<unknown> | undefined;

    if (typeof isReady?.then === 'function') {
      await Promise.race([Promise.resolve(isReady), sleep(ORDER_BOOK_API_READY_POLL_MS)]).catch(() => undefined);
    }

    if (hasOrderBookEntriesQuery(chainApi)) {
      return true;
    }

    await sleep(ORDER_BOOK_API_READY_POLL_MS);
  }

  return hasOrderBookEntriesQuery(getConnectedChainApi());
};

const hasWhitelistEntries = (whitelist: unknown): boolean => {
  if (Array.isArray(whitelist)) {
    return whitelist.length > 0;
  }

  return Boolean(whitelist && typeof whitelist === 'object' && Object.keys(whitelist).length > 0);
};

const isAddressWhitelisted = (whitelist: unknown, address: string): boolean => {
  if (Array.isArray(whitelist)) {
    return whitelist.some((item) => {
      if (typeof item === 'string') {
        return item === address;
      }

      return (item as AddressWhitelistEntry)?.address === address;
    });
  }

  return Boolean(whitelist && typeof whitelist === 'object' && address in (whitelist as Record<string, unknown>));
};

const normalizeLimitOrder = (order: LimitOrder): LimitOrder => {
  const amount = order.amount?.toString?.() ?? (order as LimitOrder & { amountStr?: string }).amountStr ?? '';
  const originalAmount =
    order.originalAmount?.toString?.() ??
    (order as LimitOrder & { originalAmountStr?: string }).originalAmountStr ??
    '';

  return {
    ...order,
    amountStr: amount,
    originalAmountStr: originalAmount,
  } as LimitOrder;
};

/**
 * Native Pinia store for order-book state and subscriptions.
 * Replaces the bridge-backed facade while keeping the existing public store API stable.
 */
export const useOrderBookStore = defineStore('orderBook', {
  state: (): OrderBookState => buildInitialState(),
  getters: {
    orderBookId(state): string {
      if (!(state.baseAssetAddress && state.quoteAssetAddress)) return '';

      return api.orderBook.serializeKey(state.baseAssetAddress, state.quoteAssetAddress);
    },
    baseAsset(state): Nullable<RegisteredAccountAsset> {
      if (!state.baseAssetAddress) return null;

      const assetsStore = useAssetsStore();
      const token = assetsStore.assetDataByAddress(state.baseAssetAddress);

      if (!token) return token ?? null;
      if (!state.baseAssetBalance) return token;

      return { ...token, balance: state.baseAssetBalance } as RegisteredAccountAsset;
    },
    quoteAsset(state): Nullable<RegisteredAccountAsset> {
      if (!state.quoteAssetAddress) return null;

      const assetsStore = useAssetsStore();
      return assetsStore.assetDataByAddress(state.quoteAssetAddress) ?? null;
    },
    currentOrderBook(): Nullable<OrderBook> {
      if (!this.orderBookId) return null;
      return this.orderBooks[this.orderBookId] ?? null;
    },
    orderBookStats(): Nullable<OrderBookStats> {
      if (!this.orderBookId) return null;
      return this.orderBooksStats[this.orderBookId] ?? null;
    },
    orderBookLastDeal(): Nullable<OrderBookDealData> {
      return this.deals[0] ?? null;
    },
    lastDeal(): Nullable<OrderBookDealData> {
      return this.orderBookLastDeal;
    },
    orderBookDecimals(): number {
      return getBookDecimals(this.currentOrderBook);
    },
  },
  actions: {
    setOrderBooks(orderBooks: Record<string, OrderBook>): void {
      this.orderBooks = Object.freeze({ ...orderBooks });
    },
    setCurrentOrderBook(orderBookId: OrderBookId): void {
      this.dexId = orderBookId.dexId;
      this.baseAssetAddress = orderBookId.base;
      this.quoteAssetAddress = orderBookId.quote;
    },
    setBaseValue(value: string): void {
      this.baseValue = value;
    },
    setQuoteValue(value: string): void {
      this.quoteValue = value;
    },
    setSide(side: PriceVariant): void {
      this.side = side;
    },
    setLimitOrderType(type: LimitOrderType): void {
      this.limitOrderType = type;
    },
    setAsks(asks: readonly OrderBookPriceVolume[] = []): void {
      this.asks = Object.freeze([...asks]);
    },
    setBids(bids: readonly OrderBookPriceVolume[] = []): void {
      this.bids = Object.freeze([...bids]);
    },
    setDeals(deals: readonly OrderBookDealData[] = []): void {
      this.deals = Object.freeze([...deals]);
    },
    setStats(stats: Record<string, OrderBookStats>): void {
      this.orderBooksStats = Object.freeze({ ...this.orderBooksStats, ...stats });
    },
    setUserLimitOrders(limitOrders: LimitOrder[] = []): void {
      this.userLimitOrders = Object.freeze([...limitOrders]);
    },
    setOrderBookUpdates(subscriptions: Array<Subscription>): void {
      this.orderBookUpdates = [...subscriptions];
    },
    resetOrderBookUpdates(): void {
      this.orderBookUpdates.forEach((subscription) => subscription?.unsubscribe?.());
      this.orderBookUpdates = [];
    },
    setOrderBookStatsUpdates(subscription: VoidFunction): void {
      this.orderBookStatsUpdates = subscription;
    },
    resetOrderBookStatsUpdates(): void {
      this.orderBookStatsUpdates = clearCallback(this.orderBookStatsUpdates);
    },
    setUserLimitOrderUpdates(subscription: Subscription): void {
      this.userLimitOrderUpdates = subscription;
    },
    resetUserLimitOrderUpdates(): void {
      this.userLimitOrderUpdates = clearSubscription(this.userLimitOrderUpdates);
    },
    setPagedUserLimitOrdersSubscription(subscription: Subscription): void {
      this.pagedUserLimitOrdersSubscription = subscription;
    },
    resetPagedUserLimitOrdersSubscription(): void {
      this.pagedUserLimitOrdersSubscription = clearSubscription(this.pagedUserLimitOrdersSubscription);
    },
    setOrdersToBeCancelled(orders: LimitOrder[]): void {
      this.ordersToBeCancelled = [...orders];
    },
    setAmountSliderValue(percent: number): void {
      this.amountSliderValue = percent;
    },
    setBaseAssetBalance(balance: Nullable<AccountBalance>): void {
      this.baseAssetBalance = balance;
    },
    async getOrderBooksInfo(): Promise<void> {
      if (!(await waitForOrderBookApiReady())) return;

      const walletStore = useWalletStore();
      const whitelist = walletStore.whitelist ?? {};
      const orderBooks = await api.orderBook.getOrderBooks();

      if (!hasWhitelistEntries(whitelist)) {
        this.setOrderBooks(orderBooks);
        return;
      }

      const orderBooksWhitelist = Object.entries(orderBooks).reduce<Record<string, OrderBook>>(
        (buffer, [key, book]) => {
          const { base, quote } = book.orderBookId;

          if ([base, quote].every((address) => isAddressWhitelisted(whitelist, address))) {
            buffer[key] = book;
          }

          return buffer;
        },
        {}
      );

      this.setOrderBooks(Object.keys(orderBooksWhitelist).length ? orderBooksWhitelist : orderBooks);
    },
    async updateBalanceSubscription(reset = false): Promise<void> {
      const walletStore = useWalletStore();
      const token = this.baseAsset;

      this.setBaseAssetBalance(null);
      balanceSubscriptions.remove(ORDER_BOOK_BASE_BALANCE_SUBSCRIPTION_KEY);

      if (reset) {
        balanceSubscriptions.resetSubscriptions();
        return;
      }

      if (walletStore.isLoggedIn && token?.address && !(token.address in walletStore.accountAssetsAddressTable)) {
        balanceSubscriptions.add(ORDER_BOOK_BASE_BALANCE_SUBSCRIPTION_KEY, {
          token,
          updateBalance: (balance) => {
            this.setBaseAssetBalance(balance);
          },
        });
      }
    },
    async updateOrderBooksStats(): Promise<void> {
      const orderBooksWithStats = await fetchOrderBooks();
      const orderBooksStats = (orderBooksWithStats ?? []).reduce<Record<string, OrderBookStats>>((buffer, item) => {
        const {
          id: { base, quote },
          stats,
        } = item;

        const key = api.orderBook.serializeKey(base, quote);
        buffer[key] = stats;
        return buffer;
      }, {});

      this.setStats(orderBooksStats);
    },
    async subscribeToBidsAndAsks(): Promise<void> {
      const { baseAssetAddress, quoteAssetAddress } = this;
      const selectedDexId = Number.isFinite(this.dexId) ? this.dexId : undefined;

      this.unsubscribeFromBidsAndAsks();

      if (!(baseAssetAddress && quoteAssetAddress)) return;

      const [asksSnapshot, bidsSnapshot] = await Promise.all([
        withTimeout(
          api.orderBook.getAggregatedAsks(baseAssetAddress, quoteAssetAddress, selectedDexId),
          [] as Array<OrderBookPriceVolume>
        ),
        withTimeout(
          api.orderBook.getAggregatedBids(baseAssetAddress, quoteAssetAddress, selectedDexId),
          [] as Array<OrderBookPriceVolume>
        ),
      ]);

      const [initialAsks, initialBids] = await Promise.all([
        asksSnapshot.timedOut
          ? loadSnapshotFromConnection('asks', baseAssetAddress, quoteAssetAddress, selectedDexId)
          : asksSnapshot.value,
        bidsSnapshot.timedOut
          ? loadSnapshotFromConnection('bids', baseAssetAddress, quoteAssetAddress, selectedDexId)
          : bidsSnapshot.value,
      ]);

      this.setAsks(Array.from(initialAsks).toReversed());
      this.setBids(Array.from(initialBids).toReversed());

      const asksSubscription = api.orderBook
        .subscribeOnAggregatedAsks(baseAssetAddress, quoteAssetAddress, selectedDexId)
        .subscribe((asks) => {
          this.setAsks(Array.from(asks).toReversed());
        });

      const bidsSubscription = api.orderBook
        .subscribeOnAggregatedBids(baseAssetAddress, quoteAssetAddress, selectedDexId)
        .subscribe((bids) => {
          this.setBids(Array.from(bids).toReversed());
        });

      this.setOrderBookUpdates([asksSubscription, bidsSubscription]);
    },
    unsubscribeFromBidsAndAsks(): void {
      this.setAsks();
      this.setBids();
      this.resetOrderBookUpdates();
    },
    async subscribeToOrderBookStats(): Promise<void> {
      const { dexId, baseAssetAddress, quoteAssetAddress } = this;

      this.unsubscribeFromOrderBookStats();

      if (!(baseAssetAddress && quoteAssetAddress)) return;

      const orderBookId = [dexId, baseAssetAddress, quoteAssetAddress].join('-');
      const subscription = await subscribeOnOrderBookUpdates(
        orderBookId,
        (data) => {
          const {
            id: { base, quote },
            stats,
            deals,
          } = data;
          const key = api.orderBook.serializeKey(base, quote);
          this.setDeals(deals);
          this.setStats({ [key]: stats });
        },
        () => {
          console.error('[orderBook] Failed to receive order book stats update');
        }
      );

      if (!subscription) return;

      this.setOrderBookStatsUpdates(subscription);
    },
    unsubscribeFromOrderBookStats(): void {
      this.setDeals();
      this.resetOrderBookStatsUpdates();
    },
    async subscribeToUserLimitOrders(): Promise<void> {
      const walletStore = useWalletStore();
      const { baseAssetAddress, quoteAssetAddress } = this;
      const selectedDexId = Number.isFinite(this.dexId) ? this.dexId : undefined;
      const accountAddress = walletStore.address || walletStore.account?.address;

      this.unsubscribeFromUserLimitOrders();

      if (!(accountAddress && baseAssetAddress && quoteAssetAddress)) return;

      const syncUserLimitOrders = async (ids: number[]): Promise<void> => {
        try {
          const userLimitOrders = await Promise.all(
            ids.map(async (id) => {
              try {
                return await api.orderBook.getLimitOrder(baseAssetAddress, quoteAssetAddress, id, selectedDexId);
              } catch (error) {
                console.error('[orderBook] Failed to fetch limit order', { id, error });
                return null;
              }
            })
          );

          const orders = userLimitOrders
            .filter((order): order is LimitOrder => !!order)
            .map((order) => normalizeLimitOrder(order));

          this.setUserLimitOrders(orders);
        } catch (error) {
          console.error('[orderBook] Failed to process user limit orders payload', error);
          this.setUserLimitOrders([]);
        }
      };

      try {
        const ids = await api.orderBook.getUserLimitOrdersIds(
          baseAssetAddress,
          quoteAssetAddress,
          accountAddress,
          selectedDexId
        );
        await syncUserLimitOrders(ids);
      } catch (error) {
        console.error('[orderBook] Failed to load initial user limit orders', error);
        this.setUserLimitOrders([]);
      }

      const subscription = api.orderBook
        .subscribeOnUserLimitOrdersIds(baseAssetAddress, quoteAssetAddress, accountAddress, selectedDexId)
        .subscribe({
          next: async (ids) => {
            await syncUserLimitOrders(ids);
          },
          error: (error) => {
            console.error('[orderBook] User limit orders subscription failed', error);
            this.setUserLimitOrders([]);
          },
        });

      this.setUserLimitOrderUpdates(subscription);
    },
    async subscribeOnLimitOrders(ids: Array<number | string>): Promise<void> {
      const walletStore = useWalletStore();
      const { baseAssetAddress, quoteAssetAddress } = this;
      const selectedDexId = Number.isFinite(this.dexId) ? this.dexId : undefined;
      const accountAddress = walletStore.address || walletStore.account?.address;

      if (!(accountAddress && baseAssetAddress && quoteAssetAddress)) return;

      this.resetPagedUserLimitOrdersSubscription();

      const limitOrderIds = ids.map((id) => Number(id)).filter((id) => Number.isFinite(id));

      if (!limitOrderIds.length) return;

      let subscription!: Subscription;
      const observables = limitOrderIds.map((id) =>
        api.orderBook.subscribeOnLimitOrder(baseAssetAddress, quoteAssetAddress, id, selectedDexId)
      );

      await new Promise<void>((resolve) => {
        subscription = combineLatest(observables).subscribe((updated) => {
          const updatedOrders = updated.filter((item) => !!item) as LimitOrder[];

          if (updatedOrders.length) {
            const userLimitOrders = this.userLimitOrders.map((order) => {
              const found = updatedOrders.find((item) => item.id === order.id);
              return found ? normalizeLimitOrder({ ...order, ...found } as LimitOrder) : order;
            });

            this.setUserLimitOrders(userLimitOrders as LimitOrder[]);
          }

          resolve();
        });
      });

      this.setPagedUserLimitOrdersSubscription(subscription);
    },
    unsubscribeFromUserLimitOrders(): void {
      this.resetUserLimitOrderUpdates();
    },
  },
});
