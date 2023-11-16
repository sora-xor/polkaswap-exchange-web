import { MAX_TIMESTAMP } from '@sora-substrate/util/build/orderBook/consts';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';

import { subscribeOnOrderBookUpdates, fetchOrderBooks } from '@/indexer/queries/orderBook';
import { serializeKey } from '@/utils/orderBook';

import { orderBookActionContext } from '.';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';
import type { Subscription } from 'rxjs';

const actions = defineActions({
  async getOrderBooksInfo(context): Promise<void> {
    const { commit, rootGetters } = orderBookActionContext(context);
    const { whitelist } = rootGetters.wallet.account;
    const orderBooks = await api.orderBook.getOrderBooks();

    // const orderBooksAllowed = Object.entries(orderBooks).reduce<Record<string, OrderBook>>((buffer, [key, book]) => {
    //   const { base, quote } = book.orderBookId;
    //   if ([base, quote].every((address) => address in whitelist)) {
    //     buffer[key] = book;
    //   }
    //   return buffer;
    // }, {});

    // commit.setOrderBooks(orderBooksAllowed);

    commit.setOrderBooks(orderBooks);
  },

  async updateOrderBooksStats(context): Promise<void> {
    const { commit } = orderBookActionContext(context);

    const orderBooksWithStats = await fetchOrderBooks();
    const orderBooksStats = (orderBooksWithStats ?? []).reduce((buffer, item) => {
      const {
        id: { base, quote },
        stats,
      } = item;
      const key = serializeKey(base, quote);
      buffer[key] = stats;
      return buffer;
    }, {});

    commit.setStats(orderBooksStats);
  },

  async getPlaceOrderNetworkFee(context, timestamp = MAX_TIMESTAMP): Promise<void> {
    const { commit } = orderBookActionContext(context);
    const codecFee = await api.orderBook.getPlaceOrderNetworkFee(timestamp);

    commit.setPlaceOrderNetworkFee(codecFee);
  },

  async subscribeToBidsAndAsks(context): Promise<void> {
    const { commit, dispatch, getters } = orderBookActionContext(context);
    const { baseAsset, quoteAsset } = getters;

    dispatch.unsubscribeFromBidsAndAsks();

    if (!(baseAsset && quoteAsset)) return;

    let asksSubscription!: Subscription;
    let bidsSubscription!: Subscription;

    await Promise.all([
      new Promise<void>((resolve) => {
        asksSubscription = api.orderBook
          .subscribeOnAggregatedAsks(baseAsset.address, quoteAsset.address)
          .subscribe((asks) => {
            commit.setAsks(asks.reverse());
            resolve();
          });
      }),
      new Promise<void>((resolve) => {
        bidsSubscription = api.orderBook
          .subscribeOnAggregatedBids(baseAsset.address, quoteAsset.address)
          .subscribe((bids) => {
            commit.setBids(bids.reverse());
            resolve();
          });
      }),
    ]);

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
    const { baseAsset, quoteAsset } = getters;

    dispatch.unsubscribeFromOrderBookStats();

    if (!(baseAsset && quoteAsset)) return;

    const subscription = await subscribeOnOrderBookUpdates(
      dexId,
      baseAsset.address,
      quoteAsset.address,
      (data) => {
        const {
          id: { base, quote },
          stats,
          deals,
        } = data;
        const key = serializeKey(base, quote);
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
    const { commit, dispatch, getters } = orderBookActionContext(context);
    const { baseAsset, quoteAsset, accountAddress } = getters;

    dispatch.unsubscribeFromUserLimitOrders();

    if (!(accountAddress && baseAsset && quoteAsset)) return;

    let subscription!: Subscription;

    await new Promise<void>((resolve) => {
      subscription = api.orderBook
        .subscribeOnUserLimitOrdersIds(baseAsset.address, quoteAsset.address, accountAddress)
        .subscribe(async (ids) => {
          const userLimitOrders = await Promise.all(
            ids.map((id) => api.orderBook.getLimitOrder(baseAsset.address, quoteAsset.address, id))
          );

          commit.setUserLimitOrders(userLimitOrders);

          resolve();
        });
    });

    commit.setUserLimitOrderUpdates(subscription);
  },

  unsubscribeFromUserLimitOrders(context): void {
    const { commit } = orderBookActionContext(context);

    commit.setUserLimitOrders();
    commit.resetUserLimitOrderUpdates();
  },
});

export default actions;
