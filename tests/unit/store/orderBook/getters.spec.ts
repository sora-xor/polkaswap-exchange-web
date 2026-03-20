import { beforeEach, describe, expect, it, vi } from 'vitest';

const serializeKeyMock = vi.hoisted(() => vi.fn((base: string, quote: string) => `${base},${quote}`));

vi.mock('@wallet', () => ({
  api: {
    orderBook: {
      serializeKey: serializeKeyMock,
    },
  },
}));

vi.mock('@/store/direct-vuex', () => ({
  defineGetters: () => (getters: Record<string, unknown>) => getters,
}));

vi.mock('@/store/orderBook', () => ({
  orderBookGetterContext: (args: unknown[]) => args[0],
}));

import getters from '@/store/orderBook/getters';

describe('orderBook getters', () => {
  beforeEach(() => {
    serializeKeyMock.mockClear();
  });

  it('builds orderBookId from selected pair addresses in state', () => {
    const context = {
      state: {
        baseAssetAddress: 'base-asset',
        quoteAssetAddress: 'quote-asset',
      },
    };

    const result = (getters.orderBookId as (...args: unknown[]) => string)(context);

    expect(result).toBe('base-asset,quote-asset');
    expect(serializeKeyMock).toHaveBeenCalledWith('base-asset', 'quote-asset');
  });

  it('returns empty orderBookId when selected pair addresses are missing', () => {
    const context = {
      state: {
        baseAssetAddress: null,
        quoteAssetAddress: null,
      },
    };

    const result = (getters.orderBookId as (...args: unknown[]) => string)(context);

    expect(result).toBe('');
    expect(serializeKeyMock).not.toHaveBeenCalled();
  });

  it('resolves currentOrderBook using computed orderBookId key', () => {
    const context = {
      state: {
        baseAssetAddress: 'base-asset',
        quoteAssetAddress: 'quote-asset',
        orderBooks: {
          'base-asset,quote-asset': {
            orderBookId: { base: 'base-asset', quote: 'quote-asset', dexId: 0 },
            status: 'Trade',
          },
        },
      },
    };

    const result = (getters.currentOrderBook as (...args: unknown[]) => unknown)(context);

    expect(result).toEqual({
      orderBookId: { base: 'base-asset', quote: 'quote-asset', dexId: 0 },
      status: 'Trade',
    });
  });

  it('resolves orderBookStats using selected pair addresses from state', () => {
    const context = {
      state: {
        baseAssetAddress: 'base-asset',
        quoteAssetAddress: 'quote-asset',
        orderBooksStats: {
          'base-asset,quote-asset': {
            price: '100',
          },
        },
      },
    };

    const result = (getters.orderBookStats as (...args: unknown[]) => unknown)(context);

    expect(result).toEqual({ price: '100' });
    expect(serializeKeyMock).toHaveBeenCalledWith('base-asset', 'quote-asset');
  });
});
