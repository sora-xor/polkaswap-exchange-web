import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchOrderBookAccountOrders } from '@/indexer/queries/orderBook/orders';
import { OrderStatus } from '@/types/orderBook';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchAllEntities: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  PolkaswapIndexer: class PolkaswapIndexer {},
}));

describe('order book account orders query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches Polkaswap account orders with an order-book filter and parses order data', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createPolkaswapOrderEntity()),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    const result = await fetchOrderBookAccountOrders('account-1', {
      dexId: 0,
      base: 'base',
      quote: 'quote',
    });

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        filter: {
          and: [
            { accountId: { equalTo: 'account-1' } },
            { status: { notEqualTo: OrderStatus.Active } },
            { orderBookId: { equalTo: '0-base-quote' } },
          ],
        },
      },
      expect.any(Function)
    );
    expect(result).toHaveLength(1);
    expect(result?.[0]).toMatchObject({
      owner: 'account-1',
      orderBookId: {
        dexId: 0,
        base: 'base',
        quote: 'quote',
      },
      time: 1_700_000,
      side: PriceVariant.Buy,
      id: 123,
      lifespan: 86_400_000,
      expiresAt: 1_786_400_000,
      status: OrderStatus.Filled,
    });
    expect(result?.[0]?.price.toString()).toBe('2.5');
    expect(result?.[0]?.originalAmount.toString()).toBe('10');
    expect(result?.[0]?.amount.toString()).toBe('6');
  });

  it('fetches Polkaswap account orders without an order-book filter when id is omitted', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue([]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.POLKASWAP);

    await expect(fetchOrderBookAccountOrders('account-1')).resolves.toEqual([]);

    expect(indexerMocks.fetchAllEntities).toHaveBeenCalledWith(
      expect.any(Object),
      {
        filter: {
          and: [{ accountId: { equalTo: 'account-1' } }, { status: { notEqualTo: OrderStatus.Active } }],
        },
      },
      expect.any(Function)
    );
  });

  
  
  });

const createIndexer = (type: unknown) => ({
  type,
  services: {
    explorer: {
      fetchAllEntities: indexerMocks.fetchAllEntities,
    },
  },
});

const createPolkaswapOrderEntity = () => ({
  type: 'Limit',
  orderId: 123,
  orderBookId: '0-base-quote',
  accountId: 'account-1',
  timestamp: 1_700,
  isBuy: true,
  price: '2.5',
  amount: '10',
  amountFilled: '4',
  lifetime: 86_400,
  expiresAt: 1_786_400,
  status: OrderStatus.Filled,
});
