import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SubsquidAccountModule } from '@/lib/soraneo-wallet/src/services/indexer/subsquid/explorer/modules/account';

describe('SubsquidAccountModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates history queries to the explorer root methods', async () => {
    const root = {
      fetchEntities: vi.fn().mockResolvedValue({ nodes: [{ id: 'tx-1' }], totalCount: 1 }),
      fetchEntitiesConnection: vi.fn().mockResolvedValue({ edges: [], totalCount: 0 }),
    } as any;
    const module = new SubsquidAccountModule(root);

    await expect(module.getHistory({ first: 1 })).resolves.toEqual({ nodes: [{ id: 'tx-1' }], totalCount: 1 });
    await expect(module.getHistoryPaged({ after: 'cursor' })).resolves.toEqual({ edges: [], totalCount: 0 });
    expect(root.fetchEntities).toHaveBeenCalledWith(expect.anything(), { first: 1 });
    expect(root.fetchEntitiesConnection).toHaveBeenCalledWith(expect.anything(), { after: 'cursor' });
  });

  it('fetches the latest transaction inside the subscription callback before notifying consumers', async () => {
    const unsubscribe = vi.fn();
    let subscriptionHandler: ((payload: any) => Promise<void>) | undefined;
    const root = {
      subscribe: vi.fn().mockReturnValue((handler: (payload: any) => Promise<void>) => {
        subscriptionHandler = handler;
        return unsubscribe;
      }),
    } as any;
    const module = new SubsquidAccountModule(root);
    const getHistorySpy = vi.spyOn(module, 'getHistory').mockResolvedValue({
      nodes: [{ id: 'tx-latest' }],
      totalCount: 1,
    } as any);
    const handler = vi.fn();

    expect(module.createHistorySubscription('bob', handler)).toBe(unsubscribe);
    expect(root.subscribe).toHaveBeenCalledWith(expect.anything(), { id: 'bob' });

    await subscriptionHandler?.({
      data: { payload: { latestHistoryElement: { id: 'tx-2' } } },
    });

    expect(getHistorySpy).toHaveBeenCalledWith({ filter: { id_eq: 'tx-2' } });
    expect(handler).toHaveBeenCalledWith({ id: 'tx-latest' });

    handler.mockClear();
    getHistorySpy.mockClear();

    await subscriptionHandler?.({ data: {} });
    expect(getHistorySpy).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });
});
