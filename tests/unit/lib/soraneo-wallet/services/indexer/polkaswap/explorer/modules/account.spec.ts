import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PolkaswapAccountModule } from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/explorer/modules/account';
import { AccountHistoryReferencesQuery } from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/queries/accountHistoryReferences';
import { HistoryElementsQuery } from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/queries/historyElements';

describe('PolkaswapAccountModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes nested call nodes in history results and delegates paged history fetches', async () => {
    const root = {
      fetchEntities: vi
        .fn()
        .mockResolvedValueOnce({
          edges: [{ node: { id: 'tx-1', calls: { nodes: [{ id: 'call-1' }] } } }, { node: { id: 'tx-2' } }],
          totalCount: 2,
        })
        .mockResolvedValueOnce({ edges: [], totalCount: 0 }),
    } as any;
    const module = new PolkaswapAccountModule(root);

    await expect(module.getHistory({ first: 2 })).resolves.toEqual({
      nodes: [
        { id: 'tx-1', calls: [{ id: 'call-1' }] },
        { id: 'tx-2', calls: [] },
      ],
      totalCount: 2,
    });
    await expect(module.getHistoryPaged({ offset: 2 })).resolves.toEqual({ edges: [], totalCount: 0 });
  });

  it('loads the latest history element inside the subscription callback before notifying consumers', async () => {
    const unsubscribe = vi.fn();
    let subscriptionHandler: ((payload: any) => Promise<void>) | undefined;
    const root = {
      subscribe: vi.fn().mockReturnValue((handler: (payload: any) => Promise<void>) => {
        subscriptionHandler = handler;
        return unsubscribe;
      }),
    } as any;
    const module = new PolkaswapAccountModule(root);
    const getHistorySpy = vi.spyOn(module, 'getHistory').mockResolvedValue({
      nodes: [{ id: 'tx-latest' }],
      totalCount: 1,
    } as any);
    const handler = vi.fn();

    expect(module.createHistorySubscription('alice', handler)).toBe(unsubscribe);
    expect(root.subscribe).toHaveBeenCalledWith(expect.anything(), { id: ['alice'] });

    await subscriptionHandler?.({
      data: { payload: { _entity: { latest_history_element_id: 'tx-1' } } },
    });

    expect(getHistorySpy).toHaveBeenCalledWith({ filter: { id: { equalTo: 'tx-1' } } });
    expect(handler).toHaveBeenCalledWith({ id: 'tx-latest' });

    handler.mockClear();
    getHistorySpy.mockClear();

    await subscriptionHandler?.({});
    expect(getHistorySpy).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it('hydrates incoming recipient activity through the indexed account references', async () => {
    const operationFilter = { and: [{ module: { equalTo: 'assets' } }] };
    const root = {
      fetchEntities: vi
        .fn()
        .mockResolvedValueOnce({
          edges: [
            {
              cursor: 'account-cursor',
              node: { extrinsicHash: ' tx-incoming ' },
            },
          ],
          pageInfo: { hasNextPage: false, endCursor: 'account-cursor' },
          totalCount: 1,
        })
        .mockResolvedValueOnce({
          edges: [
            {
              node: {
                id: 'tx-incoming',
                address: 'sender',
                dataTo: 'recipient',
                calls: { nodes: [{ module: 'assets', method: 'transfer' }] },
              },
            },
          ],
          totalCount: 1,
        }),
    } as any;
    const module = new PolkaswapAccountModule(root);

    await expect(
      module.getAccountHistory(' recipient ', {
        filter: operationFilter,
        first: 8,
        offset: 0,
        orderBy: ['TIMESTAMP_DESC', 'ID_DESC'],
      })
    ).resolves.toEqual({
      nodes: [
        {
          id: 'tx-incoming',
          address: 'sender',
          dataTo: 'recipient',
          calls: [{ module: 'assets', method: 'transfer' }],
        },
      ],
      totalCount: 1,
    });
    expect(root.fetchEntities).toHaveBeenNthCalledWith(1, AccountHistoryReferencesQuery, {
      account: 'recipient',
      first: 8,
      after: '',
      orderBy: ['TIMESTAMP_DESC'],
    });
    expect(root.fetchEntities).toHaveBeenNthCalledWith(2, HistoryElementsQuery, {
      filter: {
        and: [{ module: { equalTo: 'assets' } }, { id: { in: ['tx-incoming'] } }],
      },
      first: 1,
    });
  });

  it('keeps account-reference ordering while emulating offset pagination', async () => {
    const root = {
      fetchEntities: vi
        .fn()
        .mockResolvedValueOnce({
          edges: ['tx-1', 'tx-2', 'tx-3', 'tx-4'].map((extrinsicHash) => ({
            cursor: `${extrinsicHash}-cursor`,
            node: { extrinsicHash },
          })),
          pageInfo: { hasNextPage: true, endCursor: 'tx-4-cursor' },
          totalCount: 10,
        })
        .mockResolvedValueOnce({
          edges: [{ node: { id: 'tx-4' } }, { node: { id: 'tx-3' } }],
          totalCount: 2,
        }),
    } as any;
    const module = new PolkaswapAccountModule(root);

    await expect(module.getAccountHistory('account', { first: 2, offset: 2 })).resolves.toEqual({
      nodes: [
        { id: 'tx-3', calls: [] },
        { id: 'tx-4', calls: [] },
      ],
      totalCount: 10,
    });
    expect(root.fetchEntities).toHaveBeenNthCalledWith(1, AccountHistoryReferencesQuery, {
      account: 'account',
      first: 4,
      after: '',
      orderBy: ['TIMESTAMP_DESC'],
    });
  });

  it('uses the exact filtered count when the full participant history fits on one page', async () => {
    const root = {
      fetchEntities: vi
        .fn()
        .mockResolvedValueOnce({
          edges: ['tx-supported', 'tx-unsupported'].map((extrinsicHash) => ({ node: { extrinsicHash } })),
          pageInfo: { hasNextPage: false, endCursor: '' },
          totalCount: 2,
        })
        .mockResolvedValueOnce({
          edges: [{ node: { id: 'tx-supported' } }],
          totalCount: 1,
        }),
    } as any;
    const module = new PolkaswapAccountModule(root);

    await expect(module.getAccountHistory('recipient', { first: 8 })).resolves.toEqual({
      nodes: [{ id: 'tx-supported', calls: [] }],
      totalCount: 1,
    });
  });

  it('does not query the indexer for a blank participant account', async () => {
    const root = { fetchEntities: vi.fn() } as any;
    const module = new PolkaswapAccountModule(root);

    await expect(module.getAccountHistory('   ', { first: 8 })).resolves.toEqual({
      nodes: [],
      totalCount: 0,
    });
    expect(root.fetchEntities).not.toHaveBeenCalled();
  });
});
