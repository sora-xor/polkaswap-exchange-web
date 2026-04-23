import { PriceVariant } from '@sora-substrate/liquidity-proxy';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IndexerType } from '@/indexer/queries/indexerConsts';
import { fetchOrderBookAccountOrders } from '@/indexer/queries/orderBook/orders';
import { OrderStatus } from '@/types/orderBook';

const indexerMocks = vi.hoisted(() => ({
  currentIndexer: undefined as any,
  fetchAllEntities: vi.fn(),
  fetchAllEntitiesConnection: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => indexerMocks.currentIndexer,
  SubqueryIndexer: class SubqueryIndexer {},
  SubsquidIndexer: class SubsquidIndexer {},
}));

describe('order book account orders query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    indexerMocks.currentIndexer = undefined;
  });

  it('fetches SubQuery account orders with an order-book filter and parses order data', async () => {
    indexerMocks.fetchAllEntities.mockImplementation(async (_query, _variables, parse) => [
      parse(createSubqueryOrderEntity()),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

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

  it('fetches SubQuery account orders without an order-book filter when id is omitted', async () => {
    indexerMocks.fetchAllEntities.mockResolvedValue([]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBQUERY);

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

  it('fetches Subsquid account orders with an order-book filter and nested owner fields', async () => {
    indexerMocks.fetchAllEntitiesConnection.mockImplementation(async (_query, _variables, parse) => [
      parse(createSubsquidOrderEntity()),
    ]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBSQUID);

    const result = await fetchOrderBookAccountOrders('account-2', {
      dexId: 1,
      base: 'xor',
      quote: 'val',
    });

    expect(indexerMocks.fetchAllEntitiesConnection).toHaveBeenCalledWith(
      expect.any(Object),
      {
        where: {
          account: { id_eq: 'account-2' },
          status_not_eq: OrderStatus.Active,
          orderBook: { id_eq: '1-xor-val' },
        },
      },
      expect.any(Function)
    );
    expect(result).toHaveLength(1);
    expect(result?.[0]).toMatchObject({
      owner: 'account-2',
      orderBookId: {
        dexId: 1,
        base: 'xor',
        quote: 'val',
      },
      side: PriceVariant.Sell,
      id: 0,
      status: OrderStatus.Canceled,
    });
    expect(result?.[0]?.amount.toString()).toBe('2.25');
  });

  it('fetches Subsquid account orders without an order-book filter when id is omitted', async () => {
    indexerMocks.fetchAllEntitiesConnection.mockResolvedValue([]);
    indexerMocks.currentIndexer = createIndexer(IndexerType.SUBSQUID);

    await expect(fetchOrderBookAccountOrders('account-2')).resolves.toEqual([]);

    expect(indexerMocks.fetchAllEntitiesConnection).toHaveBeenCalledWith(
      expect.any(Object),
      {
        where: {
          account: { id_eq: 'account-2' },
          status_not_eq: OrderStatus.Active,
        },
      },
      expect.any(Function)
    );
  });

  it('returns null for unsupported indexer types without making requests', async () => {
    indexerMocks.currentIndexer = createIndexer('unsupported');

    await expect(fetchOrderBookAccountOrders('account-1')).resolves.toBeNull();
    expect(indexerMocks.fetchAllEntities).not.toHaveBeenCalled();
    expect(indexerMocks.fetchAllEntitiesConnection).not.toHaveBeenCalled();
  });
});

const createIndexer = (type: unknown) => ({
  type,
  services: {
    explorer: {
      fetchAllEntities: indexerMocks.fetchAllEntities,
      fetchAllEntitiesConnection: indexerMocks.fetchAllEntitiesConnection,
    },
  },
});

const createSubqueryOrderEntity = () => ({
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

const createSubsquidOrderEntity = () => ({
  type: 'Limit',
  orderId: undefined,
  orderBook: {
    id: '1-xor-val',
  },
  account: {
    id: 'account-2',
  },
  timestamp: 2_000,
  isBuy: false,
  price: '0.75',
  amount: '3',
  amountFilled: '0.75',
  lifetime: 3_600,
  expiresAt: 5_600,
  status: OrderStatus.Canceled,
});
