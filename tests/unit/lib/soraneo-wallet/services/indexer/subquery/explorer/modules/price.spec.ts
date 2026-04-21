import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  parseAssetFiatPriceMock: vi.fn(),
  parsePriceStreamUpdateMock: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('@/lib/soraneo-wallet/src/services/indexer/explorer/utils', () => ({
  parseAssetFiatPrice: mocks.parseAssetFiatPriceMock,
  parsePriceStreamUpdate: mocks.parsePriceStreamUpdateMock,
}));

import { SubqueryPriceModule } from '@/lib/soraneo-wallet/src/services/indexer/subquery/explorer/modules/price';

describe('SubqueryPriceModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges fiat price chunks and returns null when the query has no results', async () => {
    const root = {
      fetchAllEntities: vi
        .fn()
        .mockResolvedValueOnce([{ xor: '1.23' }, { val: '0.45' }])
        .mockResolvedValueOnce(null),
    } as any;
    const module = new SubqueryPriceModule(root);

    await expect(module.getFiatPriceObject()).resolves.toEqual({ xor: '1.23', val: '0.45' });
    expect(root.fetchAllEntities).toHaveBeenNthCalledWith(1, expect.anything(), {}, mocks.parseAssetFiatPriceMock);

    await expect(module.getFiatPriceObject()).resolves.toBeNull();
  });

  it('parses stream updates and wires entity subscriptions through the root explorer', async () => {
    const handler = vi.fn();
    const errorHandler = vi.fn();
    const root = {
      request: vi.fn().mockResolvedValueOnce({ data: { raw: 'payload' } }).mockResolvedValueOnce(null),
      createEntitySubscription: vi.fn().mockReturnValue(mocks.unsubscribe),
    } as any;
    const module = new SubqueryPriceModule(root);

    mocks.parsePriceStreamUpdateMock.mockReturnValue({ xor: 'codec:1.23' });

    await expect(module.getFiatPriceUpdates()).resolves.toEqual({ xor: 'codec:1.23' });
    expect(mocks.parsePriceStreamUpdateMock).toHaveBeenCalledWith({ raw: 'payload' });

    await expect(module.getFiatPriceUpdates()).resolves.toBeNull();

    expect(module.createFiatPriceSubscription(handler, errorHandler)).toBe(mocks.unsubscribe);
    expect(root.createEntitySubscription).toHaveBeenCalledWith(
      expect.anything(),
      {},
      mocks.parsePriceStreamUpdateMock,
      handler,
      errorHandler
    );
  });
});
