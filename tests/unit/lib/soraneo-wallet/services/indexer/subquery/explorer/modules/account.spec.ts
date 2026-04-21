import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SubqueryAccountModule } from '@/lib/soraneo-wallet/src/services/indexer/subquery/explorer/modules/account';

describe('SubqueryAccountModule', () => {
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
    const module = new SubqueryAccountModule(root);

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
    const module = new SubqueryAccountModule(root);
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
});
