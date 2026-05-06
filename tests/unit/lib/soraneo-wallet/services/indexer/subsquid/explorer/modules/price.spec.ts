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

import { SubsquidPriceModule } from '@/lib/soraneo-wallet/src/services/indexer/subsquid/explorer/modules/price';

describe('SubsquidPriceModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges fiat price chunks from connection queries and returns null when the query has no results', async () => {
    const root = {
      fetchAllEntitiesConnection: vi
        .fn()
        .mockResolvedValueOnce([{ xor: '1.23' }, { val: '0.45' }])
        .mockResolvedValueOnce(null),
    } as any;
    const module = new SubsquidPriceModule(root);

    await expect(module.getFiatPriceObject()).resolves.toEqual({ xor: '1.23', val: '0.45' });
    expect(root.fetchAllEntitiesConnection).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {},
      mocks.parseAssetFiatPriceMock
    );

    await expect(module.getFiatPriceObject()).resolves.toBeNull();
  });

  it('parses price updates and wires subscriptions through the root explorer', async () => {
    const handler = vi.fn();
    const errorHandler = vi.fn();
    const root = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ data: { raw: 'payload' } })
        .mockResolvedValueOnce(null),
      createEntitySubscription: vi.fn().mockReturnValue(mocks.unsubscribe),
    } as any;
    const module = new SubsquidPriceModule(root);

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
