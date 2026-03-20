import { api } from '@wallet';
import { defineActions } from 'direct-vuex';
import { combineLatest } from 'rxjs';
import { FPNumber } from '@sora-substrate/math';

import { subscribeOnOrderBookUpdates } from '@/indexer/queries/orderBook/orderBook';
import { fetchOrderBooks } from '@/indexer/queries/orderBook/orderBooks';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';

import { orderBookActionContext } from '.';

import type { OrderBook, OrderBookPriceVolume } from '@sora-substrate/liquidity-proxy';
import type { AccountBalance } from '@sora-substrate/sdk/build/assets/types';
import type { LimitOrder } from '@sora-substrate/sdk/build/orderBook/types';
import type { Subscription } from 'rxjs';

const balanceSubscriptions = new TokenBalanceSubscriptions();
const ORDER_BOOK_SNAPSHOT_TIMEOUT_MS = 4_000;

type TimedResult<T> = {
  timedOut: boolean;
  value: T;
};

type MaybeOrderBookState = Nullable<{
  baseAssetAddress?: Nullable<string>;
  quoteAssetAddress?: Nullable<string>;
}>;

type MaybeOrderBookGetters = Nullable<{
  baseAsset?: Nullable<{ address?: string }>;
  quoteAsset?: Nullable<{ address?: string }>;
}>;

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
  rootState: any,
  side: 'asks' | 'bids',
  base: string,
  quote: string,
  dexId?: number
): Promise<Array<OrderBookPriceVolume>> => {
  const connectionApi = rootState?.settings?.appConnection?.connection?.api;
  const queryFn =
    side === 'asks' ? connectionApi?.query?.orderBook?.aggregatedAsks : connectionApi?.query?.orderBook?.aggregatedBids;

  if (typeof queryFn !== 'function') {
    return [];
  }

  const snapshot = await queryFn({ dexId: dexId ?? 0, base, quote });
  return mapAggregatedSnapshot(snapshot);
};

const resolveOrderBookAddresses = (
  state: MaybeOrderBookState,
  getters: MaybeOrderBookGetters
): { baseAssetAddress: Nullable<string>; quoteAssetAddress: Nullable<string> } => {
  const baseAssetAddress = state?.baseAssetAddress ?? getters?.baseAsset?.address ?? null;
  const quoteAssetAddress = state?.quoteAssetAddress ?? getters?.quoteAsset?.address ?? null;

  return { baseAssetAddress, quoteAssetAddress };
};

const actions = defineActions({
  updateBalanceSubscription(context, reset: boolean): void {
    const { commit, getters, rootGetters } = orderBookActionContext(context);

    const token = getters?.baseAsset;
    const { setBaseAssetBalance } = commit;
    const field = token?.address as string;

    setBaseAssetBalance(null);
    balanceSubscriptions.remove(field);

    if (reset) {
      balanceSubscriptions.resetSubscriptions();
      return;
    }

    const updateBalance = (balance: Nullable<AccountBalance>) => setBaseAssetBalance(balance);

    if (
      rootGetters.wallet.account.isLoggedIn &&
      token?.address &&
      !(token.address in rootGetters.wallet.account.accountAssetsAddressTable)
    ) {
      balanceSubscriptions.add(field, { updateBalance, token });
    }
  },

  async getOrderBooksInfo(context): Promise<void> {
    const { commit, rootGetters } = orderBookActionContext(context);
    const whitelist = rootGetters.wallet.account.whitelist ?? {};
    const orderBooks = await api.orderBook.getOrderBooks();
    const hasWhitelistEntries = Object.keys(whitelist).length > 0;

    if (!hasWhitelistEntries) {
      commit.setOrderBooks(orderBooks);
      return;
    }

    const orderBooksWhitelist = Object.entries(orderBooks).reduce<Record<string, OrderBook>>((buffer, [key, book]) => {
      const { base, quote } = book.orderBookId;
      if ([base, quote].every((address) => address in whitelist)) {
        buffer[key] = book;
      }
      return buffer;
    }, {});

    commit.setOrderBooks(Object.keys(orderBooksWhitelist).length ? orderBooksWhitelist : orderBooks);
  },

  async updateOrderBooksStats(context): Promise<void> {
    const { commit } = orderBookActionContext(context);

    const orderBooksWithStats = await fetchOrderBooks();
    const orderBooksStats = (orderBooksWithStats ?? []).reduce((buffer, item) => {
      const {
        id: { base, quote },
        stats,
      } = item;

      const key = api.orderBook.serializeKey(base, quote);
      buffer[key] = stats;
      return buffer;
    }, {});

    commit.setStats(orderBooksStats);
  },

  async subscribeToBidsAndAsks(context): Promise<void> {
    const { commit, dispatch, getters, state, rootState } = orderBookActionContext(context);
    const { baseAssetAddress, quoteAssetAddress } = resolveOrderBookAddresses(state, getters);
    const selectedDexId = Number.isFinite(state?.dexId) ? state.dexId : undefined;

    dispatch.unsubscribeFromBidsAndAsks();

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
        ? loadSnapshotFromConnection(rootState, 'asks', baseAssetAddress, quoteAssetAddress, selectedDexId)
        : asksSnapshot.value,
      bidsSnapshot.timedOut
        ? loadSnapshotFromConnection(rootState, 'bids', baseAssetAddress, quoteAssetAddress, selectedDexId)
        : bidsSnapshot.value,
    ]);

    commit.setAsks(Array.from(initialAsks).toReversed());
    commit.setBids(Array.from(initialBids).toReversed());

    const asksSubscription = api.orderBook
      .subscribeOnAggregatedAsks(baseAssetAddress, quoteAssetAddress, selectedDexId)
      .subscribe((asks) => {
        commit.setAsks(Array.from(asks).toReversed());
      });

    const bidsSubscription = api.orderBook
      .subscribeOnAggregatedBids(baseAssetAddress, quoteAssetAddress, selectedDexId)
      .subscribe((bids) => {
        commit.setBids(Array.from(bids).toReversed());
      });

    commit.setOrderBookUpdates([asksSubscription, bidsSubscription]);
  },

  unsubscribeFromBidsAndAsks(context): void {
    const { commit } = orderBookActionContext(context);

    commit.setAsks();
    commit.setBids();
    commit.resetOrderBookUpdates();
  },

  async subscribeToOrderBookStats(context): Promise<void> {
    const { commit, dispatch, getters, state } = orderBookActionContext(context);
    const { dexId } = state;
    const { baseAssetAddress, quoteAssetAddress } = resolveOrderBookAddresses(state, getters);

    dispatch.unsubscribeFromOrderBookStats();

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
        commit.setDeals(deals);
        commit.setStats({ [key]: stats });
      },
      console.error
    );

    if (!subscription) return;

    commit.setOrderBookStatsUpdates(subscription);
  },

  unsubscribeFromOrderBookStats(context): void {
    const { commit } = orderBookActionContext(context);

    commit.setDeals();
    commit.resetOrderBookStatsUpdates();
  },

  async subscribeToUserLimitOrders(context): Promise<void> {
    const { commit, dispatch, getters, rootGetters, rootState, state } = orderBookActionContext(context);
    const { baseAssetAddress, quoteAssetAddress } = resolveOrderBookAddresses(state, getters);
    const selectedDexId = Number.isFinite(state?.dexId) ? state.dexId : undefined;
    const accountAddress = rootState?.wallet?.account?.address ?? rootGetters?.wallet?.account?.address;

    dispatch.unsubscribeFromUserLimitOrders();

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
          .map((order) => {
            const amountStr = order.amount.toString();
            const originalAmountStr = order.originalAmount.toString();
            return { ...order, amountStr, originalAmountStr };
          });

        commit.setUserLimitOrders(orders);
      } catch (error) {
        console.error('[orderBook] Failed to process user limit orders payload', error);
        commit.setUserLimitOrders([]);
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
      commit.setUserLimitOrders([]);
    }

    const subscription = api.orderBook
      .subscribeOnUserLimitOrdersIds(baseAssetAddress, quoteAssetAddress, accountAddress, selectedDexId)
      .subscribe({
        next: async (ids) => {
          await syncUserLimitOrders(ids);
        },
        error: (error) => {
          console.error('[orderBook] User limit orders subscription failed', error);
          commit.setUserLimitOrders([]);
        },
      });

    commit.setUserLimitOrderUpdates(subscription);
  },

  async subscribeOnLimitOrders(context, ids: number[]): Promise<void> {
    const { commit, getters, rootGetters, state, rootState } = orderBookActionContext(context);
    const { baseAssetAddress, quoteAssetAddress } = resolveOrderBookAddresses(state, getters);
    const selectedDexId = Number.isFinite(state?.dexId) ? state.dexId : undefined;
    const accountAddress = rootState?.wallet?.account?.address ?? rootGetters?.wallet?.account?.address;

    if (!(accountAddress && baseAssetAddress && quoteAssetAddress)) return;

    let subscription!: Subscription;
    const observables = ids.map((id) =>
      api.orderBook.subscribeOnLimitOrder(baseAssetAddress, quoteAssetAddress, id, selectedDexId)
    );

    await new Promise<void>((resolve) => {
      subscription = combineLatest(observables).subscribe((updated) => {
        const updatedOrders = updated.filter((item) => !!item) as LimitOrder[];
        if (updatedOrders.length) {
          const userLimitOrders = state.userLimitOrders.map((order) => {
            const found = updatedOrders.find((item) => item.id === order.id);
            return found ?? order;
          });
          commit.setUserLimitOrders(userLimitOrders);
          resolve();
        } else {
          resolve();
        }
      });
    });

    commit.setPagedUserLimitOrdersSubscription(subscription);
  },

  unsubscribeFromUserLimitOrders(context): void {
    const { commit } = orderBookActionContext(context);

    commit.resetUserLimitOrderUpdates();
  },
});

export default actions;
