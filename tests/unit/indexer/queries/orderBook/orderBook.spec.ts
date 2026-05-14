import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { subscribeOnOrderBookUpdates } from '@/indexer/queries/orderBook/orderBook';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  request: vi.fn(),
  createEntitySubscription: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  PolkaswapIndexer: class PolkaswapIndexer {},
}));

describe('order book update subscription query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('requests the current Polkaswap order book state before subscribing to mutations', async () => {
    const unsubscribe = vi.fn();
    const handler = vi.fn();
    const errorHandler = vi.fn();

    indexerMocks.request.mockResolvedValue({
      data: createOrderBookEntity({
        lastDeals: JSON.stringify([{ price: '2', amount: '3', isBuy: true, timestamp: 1_700 }]),
      }),
    });
    indexerMocks.createEntitySubscription.mockReturnValue(unsubscribe);
    indexerMocks.currentIndexer = createIndexer('polkaswap');

    const result = await subscribeOnOrderBookUpdates('0-base-quote', handler, errorHandler);

    expect(result).toBe(unsubscribe);
    expect(indexerMocks.request).toHaveBeenCalledWith(expect.any(Object), {
      id: '0-base-quote',
    });
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        id: {
          dexId: 0,
          base: 'base',
          quote: 'quote',
        },
        stats: expect.objectContaining({
          status: 'Trade',
        }),
      })
    );
    expect(handler.mock.calls[0]?.[0].stats.price.toString()).toBe('1.5');
    expect(handler.mock.calls[0]?.[0].deals[0].side).toBe(PriceVariant.Buy);
    expect(handler.mock.calls[0]?.[0].deals[0].timestamp).toBe(1_700_000);
    expect(indexerMocks.createEntitySubscription).toHaveBeenCalledWith(
      expect.any(Object),
      {
        id: ['0-base-quote'],
      },
      expect.any(Function),
      handler,
      errorHandler
    );

    const parseMutation = indexerMocks.createEntitySubscription.mock.calls[0]?.[2] as Fn;
    const update = parseMutation({
      price: '3.5',
      price_change_day: -0.25,
      volume_day_u_s_d: '90',
      status: 'OnlyCancel',
      last_deals: JSON.stringify([{ isBuy: false, timestamp: 1_701 }]),
    });

    expect(update.stats.price.toString()).toBe('3.5');
    expect(update.stats.priceChange.toString()).toBe('-0.25');
    expect(update.stats.volume.toString()).toBe('90');
    expect(update.deals[0].price.toString()).toBe('0');
    expect(update.deals[0].amount.toString()).toBe('0');
    expect(update.deals[0].side).toBe(PriceVariant.Sell);
    expect(update.deals[0].timestamp).toBe(1_701_000);

    const emptyUpdate = parseMutation({
      price: null,
      price_change_day: null,
      volume_day_u_s_d: null,
      status: 'Trade',
      last_deals: undefined,
    } as any);

    expect(emptyUpdate.stats.price.toString()).toBe('0');
    expect(emptyUpdate.stats.priceChange.toString()).toBe('0');
    expect(emptyUpdate.stats.volume.toString()).toBe('0');
    expect(emptyUpdate.deals).toEqual([]);
  });

  it('does not subscribe when the Polkaswap initial request returns no data', async () => {
    indexerMocks.request.mockResolvedValue(null);
    indexerMocks.currentIndexer = createIndexer('polkaswap');

    await expect(subscribeOnOrderBookUpdates('0-base-quote', vi.fn(), vi.fn())).resolves.toBeNull();
    expect(indexerMocks.createEntitySubscription).not.toHaveBeenCalled();
  });



  });

const createIndexer = (type: unknown) => ({
  type,
  services: {
    explorer: {
      request: indexerMocks.request,
      createEntitySubscription: indexerMocks.createEntitySubscription,
    },
  },
});

const createOrderBookEntity = (overrides: Record<string, unknown> = {}) => ({
  price: '1.5',
  priceChangeDay: '0.1',
  volumeDayUSD: '42',
  status: 'Trade',
  lastDeals: undefined,
  ...overrides,
});
