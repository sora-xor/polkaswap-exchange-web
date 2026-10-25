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

import { PolkaswapPriceModule } from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/explorer/modules/price';

describe('PolkaswapPriceModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merges fiat price chunks from the snapshot query', async () => {
    const root = {
      fetchAllEntities: vi.fn().mockResolvedValueOnce([{ xor: '1.23' }, { val: '0.45' }]),
      request: vi.fn(),
    } as any;
    const module = new PolkaswapPriceModule(root);

    await expect(module.getFiatPriceObject()).resolves.toEqual({ xor: '1.23', val: '0.45' });
    expect(root.fetchAllEntities).toHaveBeenNthCalledWith(1, expect.anything(), {}, mocks.parseAssetFiatPriceMock);
    expect(root.request).not.toHaveBeenCalled();
  });

  it('uses the latest price stream when the snapshot query has no prices', async () => {
    const root = {
      fetchAllEntities: vi.fn().mockResolvedValue(null),
      request: vi.fn().mockResolvedValue({ data: { raw: 'payload' } }),
    } as any;
    const module = new PolkaswapPriceModule(root);

    mocks.parsePriceStreamUpdateMock.mockReturnValueOnce({ xor: 'codec:1.23' });

    await expect(module.getFiatPriceObject()).resolves.toEqual({ xor: 'codec:1.23' });
    expect(root.request).toHaveBeenCalledWith(expect.anything());
    expect(mocks.parsePriceStreamUpdateMock).toHaveBeenCalledWith({ raw: 'payload' });
  });

  it('returns null when both the snapshot and stream payloads have no prices', async () => {
    const root = {
      fetchAllEntities: vi.fn().mockResolvedValue([]),
      request: vi.fn().mockResolvedValue({ data: { raw: 'payload' } }),
    } as any;
    const module = new PolkaswapPriceModule(root);

    mocks.parsePriceStreamUpdateMock.mockReturnValueOnce({});

    await expect(module.getFiatPriceObject()).resolves.toBeNull();
  });

  it('parses stream updates and wires entity subscriptions through the root explorer', async () => {
    const handler = vi.fn();
    const errorHandler = vi.fn();
    const root = {
      request: vi
        .fn()
        .mockResolvedValueOnce({ data: { raw: 'payload' } })
        .mockResolvedValueOnce(null),
      createEntitySubscription: vi.fn().mockReturnValue(mocks.unsubscribe),
    } as any;
    const module = new PolkaswapPriceModule(root);

    mocks.parsePriceStreamUpdateMock.mockReturnValueOnce({ xor: 'codec:1.23' });

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
