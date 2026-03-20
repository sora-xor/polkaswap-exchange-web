import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getOrderBooksMock = vi.hoisted(() => vi.fn());
const getAggregatedAsksMock = vi.hoisted(() => vi.fn());
const getAggregatedBidsMock = vi.hoisted(() => vi.fn());
const subscribeOnAggregatedAsksMock = vi.hoisted(() => vi.fn());
const subscribeOnAggregatedBidsMock = vi.hoisted(() => vi.fn());
const subscribeOnUserLimitOrdersIdsMock = vi.hoisted(() => vi.fn());
const getLimitOrderMock = vi.hoisted(() => vi.fn());
const getUserLimitOrdersIdsMock = vi.hoisted(() => vi.fn());
const subscribeOnLimitOrderMock = vi.hoisted(() => vi.fn());

vi.mock('@wallet', () => ({
  api: {
    orderBook: {
      getOrderBooks: getOrderBooksMock,
      getAggregatedAsks: getAggregatedAsksMock,
      getAggregatedBids: getAggregatedBidsMock,
      subscribeOnAggregatedAsks: subscribeOnAggregatedAsksMock,
      subscribeOnAggregatedBids: subscribeOnAggregatedBidsMock,
      getUserLimitOrdersIds: getUserLimitOrdersIdsMock,
      subscribeOnUserLimitOrdersIds: subscribeOnUserLimitOrdersIdsMock,
      getLimitOrder: getLimitOrderMock,
      subscribeOnLimitOrder: subscribeOnLimitOrderMock,
    },
  },
}));

vi.mock('direct-vuex', () => ({
  defineActions: (actions: Record<string, unknown>) => actions,
}));

vi.mock('@/store/orderBook', () => ({
  orderBookActionContext: (context: Record<string, unknown>) => context,
}));

import actions from '@/store/orderBook/actions';

const makeOrderBook = (base: string, quote: string, dexId = 0, status = 'Trade') => ({
  orderBookId: { base, quote, dexId },
  status,
});

describe('orderBook actions', () => {
  beforeEach(() => {
    getOrderBooksMock.mockReset();
    getAggregatedAsksMock.mockReset();
    getAggregatedBidsMock.mockReset();
    subscribeOnAggregatedAsksMock.mockReset();
    subscribeOnAggregatedBidsMock.mockReset();
    getUserLimitOrdersIdsMock.mockReset();
    subscribeOnUserLimitOrdersIdsMock.mockReset();
    getLimitOrderMock.mockReset();
    subscribeOnLimitOrderMock.mockReset();
  });

  it('commits whitelist-filtered books when matches exist', async () => {
    const accepted = makeOrderBook('base-1', 'quote-1', 0);
    const rejected = makeOrderBook('base-2', 'quote-2', 0);

    getOrderBooksMock.mockResolvedValue({
      accepted,
      rejected,
    });

    const context = {
      commit: {
        setOrderBooks: vi.fn(),
      },
      rootGetters: {
        wallet: {
          account: {
            whitelist: {
              'base-1': { address: 'base-1' },
              'quote-1': { address: 'quote-1' },
            },
          },
        },
      },
    };

    await actions.getOrderBooksInfo(context as any);

    expect(context.commit.setOrderBooks).toHaveBeenCalledTimes(1);
    expect(context.commit.setOrderBooks).toHaveBeenCalledWith({
      accepted,
    });
  });

  it('falls back to unfiltered books when whitelist filtering returns an empty set', async () => {
    const first = makeOrderBook('base-a', 'quote-a', 1);
    const second = makeOrderBook('base-b', 'quote-b', 2);

    getOrderBooksMock.mockResolvedValue({
      first,
      second,
    });

    const context = {
      commit: {
        setOrderBooks: vi.fn(),
      },
      rootGetters: {
        wallet: {
          account: {
            whitelist: {
              'some-other-asset': { address: 'some-other-asset' },
            },
          },
        },
      },
    };

    await actions.getOrderBooksInfo(context as any);

    expect(context.commit.setOrderBooks).toHaveBeenCalledTimes(1);
    expect(context.commit.setOrderBooks).toHaveBeenCalledWith({
      first,
      second,
    });
  });

  it('subscribes asks and bids using current order book dex id', async () => {
    const asks = ['ask-1', 'ask-2'] as unknown[];
    const bids = ['bid-1', 'bid-2'] as unknown[];
    const asksSubscription = { unsubscribe: vi.fn() };
    const bidsSubscription = { unsubscribe: vi.fn() };

    getAggregatedAsksMock.mockResolvedValue(asks);
    getAggregatedBidsMock.mockResolvedValue(bids);

    subscribeOnAggregatedAsksMock.mockReturnValue({
      subscribe: () => asksSubscription,
    });

    subscribeOnAggregatedBidsMock.mockReturnValue({
      subscribe: () => bidsSubscription,
    });

    const context = {
      commit: {
        setAsks: vi.fn(),
        setBids: vi.fn(),
        setOrderBookUpdates: vi.fn(),
      },
      dispatch: {
        unsubscribeFromBidsAndAsks: vi.fn(),
      },
      getters: {
        baseAsset: { address: 'base-asset' },
        quoteAsset: { address: 'quote-asset' },
      },
      state: {
        dexId: 37,
      },
    };

    await actions.subscribeToBidsAndAsks(context as any);

    expect(context.dispatch.unsubscribeFromBidsAndAsks).toHaveBeenCalledTimes(1);
    expect(getAggregatedAsksMock).toHaveBeenCalledWith('base-asset', 'quote-asset', 37);
    expect(getAggregatedBidsMock).toHaveBeenCalledWith('base-asset', 'quote-asset', 37);
    expect(subscribeOnAggregatedAsksMock).toHaveBeenCalledWith('base-asset', 'quote-asset', 37);
    expect(subscribeOnAggregatedBidsMock).toHaveBeenCalledWith('base-asset', 'quote-asset', 37);
    expect(context.commit.setAsks).toHaveBeenCalledWith(['ask-2', 'ask-1']);
    expect(context.commit.setBids).toHaveBeenCalledWith(['bid-2', 'bid-1']);
    expect(context.commit.setOrderBookUpdates).toHaveBeenCalledWith([asksSubscription, bidsSubscription]);
  });

  it('subscribes asks and bids using state addresses when action getters are unavailable', async () => {
    const asks = ['ask-state-1'] as unknown[];
    const bids = ['bid-state-1'] as unknown[];
    const asksSubscription = { unsubscribe: vi.fn() };
    const bidsSubscription = { unsubscribe: vi.fn() };

    getAggregatedAsksMock.mockResolvedValue(asks);
    getAggregatedBidsMock.mockResolvedValue(bids);

    subscribeOnAggregatedAsksMock.mockReturnValue({
      subscribe: () => asksSubscription,
    });

    subscribeOnAggregatedBidsMock.mockReturnValue({
      subscribe: () => bidsSubscription,
    });

    const context = {
      commit: {
        setAsks: vi.fn(),
        setBids: vi.fn(),
        setOrderBookUpdates: vi.fn(),
      },
      dispatch: {
        unsubscribeFromBidsAndAsks: vi.fn(),
      },
      getters: undefined,
      state: {
        dexId: 19,
        baseAssetAddress: 'state-base',
        quoteAssetAddress: 'state-quote',
      },
    };

    await actions.subscribeToBidsAndAsks(context as any);

    expect(getAggregatedAsksMock).toHaveBeenCalledWith('state-base', 'state-quote', 19);
    expect(getAggregatedBidsMock).toHaveBeenCalledWith('state-base', 'state-quote', 19);
    expect(subscribeOnAggregatedAsksMock).toHaveBeenCalledWith('state-base', 'state-quote', 19);
    expect(subscribeOnAggregatedBidsMock).toHaveBeenCalledWith('state-base', 'state-quote', 19);
    expect(context.commit.setOrderBookUpdates).toHaveBeenCalledWith([asksSubscription, bidsSubscription]);
  });

  it('keeps valid user limit orders when one order lookup fails', async () => {
    const subscription = { unsubscribe: vi.fn() };
    getUserLimitOrdersIdsMock.mockResolvedValue([101, 202]);
    subscribeOnUserLimitOrdersIdsMock.mockReturnValue({
      subscribe: ({ next }: { next: (ids: number[]) => Promise<void> }) => {
        void next([101, 202]);
        return subscription;
      },
    });

    getLimitOrderMock.mockImplementation(async (_base: string, _quote: string, id: number) => {
      if (id === 101) return null;
      return {
        id,
        amount: { toString: () => '12.34' },
        originalAmount: { toString: () => '56.78' },
      };
    });

    const context = {
      commit: {
        setUserLimitOrders: vi.fn(),
        setUserLimitOrderUpdates: vi.fn(),
      },
      dispatch: {
        unsubscribeFromUserLimitOrders: vi.fn(),
      },
      getters: {
        baseAsset: { address: 'base-asset' },
        quoteAsset: { address: 'quote-asset' },
      },
      state: {
        dexId: 7,
      },
      rootState: {
        wallet: {
          account: {
            address: '5abc',
          },
        },
      },
    };

    await actions.subscribeToUserLimitOrders(context as any);

    expect(context.dispatch.unsubscribeFromUserLimitOrders).toHaveBeenCalledTimes(1);
    expect(getUserLimitOrdersIdsMock).toHaveBeenCalledWith('base-asset', 'quote-asset', '5abc', 7);
    expect(getLimitOrderMock).toHaveBeenCalledWith('base-asset', 'quote-asset', 101, 7);
    expect(subscribeOnUserLimitOrdersIdsMock).toHaveBeenCalledWith('base-asset', 'quote-asset', '5abc', 7);
    expect(context.commit.setUserLimitOrders).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 202,
        amountStr: '12.34',
        originalAmountStr: '56.78',
      }),
    ]);
    expect(context.commit.setUserLimitOrderUpdates).toHaveBeenCalledWith(subscription);
  });

  it('handles subscription errors by clearing user limit orders', async () => {
    const subscription = { unsubscribe: vi.fn() };
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    getUserLimitOrdersIdsMock.mockResolvedValue([]);

    subscribeOnUserLimitOrdersIdsMock.mockReturnValue({
      subscribe: ({ error }: { error: (err: Error) => void }) => {
        error(new Error('subscription failed'));
        return subscription;
      },
    });

    const context = {
      commit: {
        setUserLimitOrders: vi.fn(),
        setUserLimitOrderUpdates: vi.fn(),
      },
      dispatch: {
        unsubscribeFromUserLimitOrders: vi.fn(),
      },
      getters: {
        baseAsset: { address: 'base-asset' },
        quoteAsset: { address: 'quote-asset' },
      },
      state: {
        dexId: 13,
      },
      rootState: {
        wallet: {
          account: {
            address: '5abc',
          },
        },
      },
    };

    await actions.subscribeToUserLimitOrders(context as any);

    expect(context.commit.setUserLimitOrders).toHaveBeenCalledWith([]);
    expect(context.commit.setUserLimitOrderUpdates).toHaveBeenCalledWith(subscription);
    expect(getUserLimitOrdersIdsMock).toHaveBeenCalledWith('base-asset', 'quote-asset', '5abc', 13);
    expect(subscribeOnUserLimitOrdersIdsMock).toHaveBeenCalledWith('base-asset', 'quote-asset', '5abc', 13);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('subscribes to paged limit orders with active dex id and updates tracked items', async () => {
    subscribeOnLimitOrderMock.mockImplementation((_base: string, _quote: string, id: number) => of({ id }));

    const context = {
      commit: {
        setUserLimitOrders: vi.fn(),
        setPagedUserLimitOrdersSubscription: vi.fn(),
      },
      getters: {
        baseAsset: { address: 'base-asset' },
        quoteAsset: { address: 'quote-asset' },
      },
      state: {
        dexId: 5,
        userLimitOrders: [
          { id: 101, status: 'initial' },
          { id: 202, status: 'initial' },
        ],
      },
      rootState: {
        wallet: {
          account: {
            address: '5abc',
          },
        },
      },
    };

    await actions.subscribeOnLimitOrders(context as any, [101, 202]);

    expect(subscribeOnLimitOrderMock).toHaveBeenNthCalledWith(1, 'base-asset', 'quote-asset', 101, 5);
    expect(subscribeOnLimitOrderMock).toHaveBeenNthCalledWith(2, 'base-asset', 'quote-asset', 202, 5);
    expect(context.commit.setUserLimitOrders).toHaveBeenCalledWith([
      expect.objectContaining({ id: 101 }),
      expect.objectContaining({ id: 202 }),
    ]);
    expect(context.commit.setPagedUserLimitOrdersSubscription).toHaveBeenCalledTimes(1);
  });
});
