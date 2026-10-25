import { describe, expect, it, vi } from 'vitest';

import { WithAccountHistory } from '@/lib/substrate/sdk/apiAccount';
import { AssetsModule } from '@/lib/substrate/sdk/assets';

describe('SDK persisted account caches', () => {
  it('falls back to an empty owned-asset list for corrupt or incompatible JSON', () => {
    const get = vi.fn();
    const assets = new AssetsModule({ accountStorage: { get } } as any);

    get.mockReturnValueOnce('{');
    expect(assets.accountAssetsAddresses).toEqual([]);

    get.mockReturnValueOnce('{}');
    expect(assets.accountAssetsAddresses).toEqual([]);

    get.mockReturnValueOnce('["xor","val"]');
    expect(assets.accountAssetsAddresses).toEqual(['xor', 'val']);
  });

  it('falls back to empty transaction history for corrupt or incompatible JSON', () => {
    const get = vi.fn();
    const account = new WithAccountHistory();
    account.accountStorage = { get } as never;

    get.mockReturnValueOnce('{');
    expect(account.history).toEqual({});

    get.mockReturnValueOnce('[]');
    expect(account.history).toEqual({});

    get.mockReturnValueOnce('{"tx-1":{"id":"tx-1","type":"Transfer"}}');
    expect(account.history).toEqual({ 'tx-1': { id: 'tx-1', type: 'Transfer' } });
  });
});
