import { beforeEach, describe, expect, it, vi } from 'vitest';

const parseAssetRegistrationStreamUpdateMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/soraneo-wallet/src/services/indexer/explorer/utils', () => ({
  parseAssetRegistrationStreamUpdate: parseAssetRegistrationStreamUpdateMock,
}));

import { PolkaswapAssetModule } from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/explorer/modules/asset';

describe('PolkaswapAssetModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards asset stream subscriptions to the explorer root', () => {
    const unsubscribe = vi.fn();
    const root = {
      createEntitySubscription: vi.fn().mockReturnValue(unsubscribe),
    } as any;
    const handler = vi.fn();
    const errorHandler = vi.fn();
    const module = new PolkaswapAssetModule(root);

    expect(module.createNewAssetsSubscription(handler, errorHandler)).toBe(unsubscribe);
    expect(root.createEntitySubscription).toHaveBeenCalledWith(
      expect.anything(),
      {},
      parseAssetRegistrationStreamUpdateMock,
      handler,
      errorHandler
    );
  });
});
