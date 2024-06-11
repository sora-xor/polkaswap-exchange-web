import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';
import { combineLatest } from 'rxjs';

import { subscribeOnOrderBookUpdates, fetchOrderBooks } from '@/indexer/queries/orderBook';
import { TokenBalanceSubscriptions } from '@/utils/subscriptions';

import { orderBookActionContext } from '.';

import type { OrderBook } from '@sora-substrate/liquidity-proxy';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';
import type { LimitOrder } from '@sora-substrate/util/build/orderBook/types';
import type { Subscription } from 'rxjs';

const balanceSubscriptions = new TokenBalanceSubscriptions();

const actions = defineActions({
  updateBalanceSubscription(context, reset: boolean): void {
    const { commit, getters, rootGetters } = orderBookActionContext(context);

    const { baseAsset: token } = getters;
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
    const { whitelist } = rootGetters.wallet.account;
    const orderBooks = await api.orderBook.getOrderBooks();

    const orderBooksWhitelist = Object.entries(orderBooks).reduce<Record<string, OrderBook>>((buffer, [key, book]) => {
      const { base, quote } = book.orderBookId;
      if ([base, quote].every((address) => address in whitelist)) {
        buffer[key] = book;
      }
      return buffer;
    }, {});

    commit.setOrderBooks(orderBooksWhitelist);
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
            commit.setAsks(asks.toReversed());
            resolve();
          });
      }),
      new Promise<void>((resolve) => {
        bidsSubscription = api.orderBook
          .subscribeOnAggregatedBids(baseAsset.address, quoteAsset.address)
          .subscribe((bids) => {
            commit.setBids(bids.toReversed());
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
    const { commit, dispatch, getters, rootState } = orderBookActionContext(context);
    const { baseAsset, quoteAsset } = getters;
    const accountAddress = rootState.wallet.account.address;

    dispatch.unsubscribeFromUserLimitOrders();

    if (!(accountAddress && baseAsset && quoteAsset)) return;

    let subscription!: Subscription;

    await new Promise<void>((resolve) => {
      subscription = api.orderBook
        .subscribeOnUserLimitOrdersIds(baseAsset.address, quoteAsset.address, accountAddress)
        .subscribe(async (ids) => {
          const userLimitOrders = (await Promise.all(
            ids.map((id) => api.orderBook.getLimitOrder(baseAsset.address, quoteAsset.address, id))
          )) as LimitOrder[];

          const orders = userLimitOrders.map((el) => {
            const amountStr = el.amount.toString();
            const originalAmountStr = el.originalAmount.toString();
            return { ...el, amountStr, originalAmountStr };
          });

          commit.setUserLimitOrders(orders);

          resolve();
        });
    });

    commit.setUserLimitOrderUpdates(subscription);
  },

  async subscribeOnLimitOrders(context, ids: number[]): Promise<void> {
    const { commit, getters, state, rootState } = orderBookActionContext(context);
    const { baseAsset, quoteAsset } = getters;
    const accountAddress = rootState.wallet.account.address;

    if (!(accountAddress && baseAsset && quoteAsset)) return;

    let subscription!: Subscription;
    const observables = ids.map((id) => api.orderBook.subscribeOnLimitOrder(baseAsset.address, quoteAsset.address, id));

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
