import { beforeEach, describe, expect, it, vi } from 'vitest';

const getOrderBooksMock = vi.hoisted(() => vi.fn());

vi.mock('@wallet', () => ({
  api: {
    orderBook: {
      getOrderBooks: getOrderBooksMock,
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
});
