import { MAX_TIMESTAMP } from '@sora-substrate/util/build/orderBook/consts';
import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';

import { subscribeOnOrderBookUpdates, fetchOrderBooks } from '@/indexer/queries/orderBook';
import { serializeKey, deserializeKey } from '@/utils/orderBook';

import { orderBookActionContext } from '.';

import type { Subscription } from 'rxjs';

const actions = defineActions({
  async getOrderBooksInfo(context): Promise<void> {
    const { commit, rootGetters } = orderBookActionContext(context);
    const [orderBooks, orderBooksWithStats] = await Promise.all([api.orderBook.getOrderBooks(), fetchOrderBooks()]);

    const orderBooksStats = (orderBooksWithStats ?? []).reduce((buffer, item) => {
      const {
        id: { base, quote },
        stats,
      } = item;
      const key = serializeKey(base, quote);
      buffer[key] = stats;
      return buffer;
    }, {});

    // TODO: move to lib
    const whitelistAddresses = Object.keys(rootGetters.wallet.account.whitelist);

    const whitelistOrderBook = Object.keys(orderBooks)
      .filter((key) => {
        const { base } = deserializeKey(key);
        return whitelistAddresses.includes(base);
      })
      .reduce((current, key) => {
        return Object.assign(current, { [key]: orderBooks[key] });
      }, {});

    const [orderBookId] = Object.keys(whitelistOrderBook);

    if (!orderBookId) return;

    commit.setOrderBooks(whitelistOrderBook);
    commit.setStats(orderBooksStats);
    commit.setCurrentOrderBook(orderBookId);
  },

  async getPlaceOrderNetworkFee(context, timestamp = MAX_TIMESTAMP): Promise<void> {
    const { commit } = orderBookActionContext(context);
    const codecFee = await api.orderBook.getPlaceOrderNetworkFee(timestamp);

    commit.setPlaceOrderNetworkFee(codecFee);
  },

  async subscribeToOrderBook(context, { base, quote }): Promise<void> {
    const { commit, getters, dispatch } = orderBookActionContext(context);

    commit.resetAsks();
    commit.resetBids();
    commit.resetOrderBookUpdates();

    if (!quote) quote = getters.quoteAsset?.address;

    const asksSubscription = api.orderBook.subscribeOnAggregatedAsks(base, quote).subscribe((asks) => {
      commit.setAsks(asks.reverse());
    });

    const bidsSubscription = api.orderBook.subscribeOnAggregatedBids(base, quote).subscribe((bids) => {
      commit.setBids(bids.reverse());
    });

    const subscriptions: Array<Subscription | VoidFunction> = [asksSubscription, bidsSubscription];

    const statsAndDealsSubscription = await subscribeOnOrderBookUpdates(
      0,
      base,
      quote,
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

    if (statsAndDealsSubscription) {
      subscriptions.push(statsAndDealsSubscription);
    }

    commit.setOrderBookUpdates(subscriptions);
  },

  subscribeToUserLimitOrders(context, { base, quote }): void {
    const { commit, getters } = orderBookActionContext(context);

    commit.resetUserLimitOrderUpdates();

    const address = getters.accountAddress;

    if (!address) return;

    if (!quote) quote = getters.quoteAsset?.address;

    let userLimitOrders: Array<any> = [];

    const subscription = api.orderBook.subscribeOnUserLimitOrdersIds(base, quote, address).subscribe((ids) => {
      userLimitOrders = [];

      ids.forEach(async (id) => {
        const order = await api.orderBook.getLimitOrder(base, quote, id);
        userLimitOrders.push(order);
      });

      commit.setUserLimitOrders(userLimitOrders);
    });

    commit.setUserLimitOrderUpdates(subscription);
  },

  unsubscribeFromOrderBook(context): void {
    const { commit } = orderBookActionContext(context);
    commit.resetAsks();
    commit.resetBids();
    commit.resetUserLimitOrderUpdates();
    commit.resetUserLimitOrders();
    commit.resetOrderBookUpdates();
  },
});

export default actions;
