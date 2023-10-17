import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';

import { orderBookActionContext } from '.';

function deserializeKey(key: string) {
  const [base, quote] = key.split(',');
  return { base, quote };
}

const actions = defineActions({
  async getOrderBooksInfo(context): Promise<void> {
    const { commit, rootGetters } = orderBookActionContext(context);

    const orderBooks = await api.orderBook.getOrderBooks();

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
    commit.setCurrentOrderBook(orderBookId);
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

    commit.setOrderBookUpdates([asksSubscription, bidsSubscription]);
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

  async unsubscribeFromOrderBook(context): Promise<void> {
    const { commit } = orderBookActionContext(context);
    commit.resetAsks();
    commit.resetBids();
    commit.resetUserLimitOrderUpdates();
    commit.resetUserLimitOrders();
    commit.resetOrderBookUpdates();
  },
});

export default actions;
