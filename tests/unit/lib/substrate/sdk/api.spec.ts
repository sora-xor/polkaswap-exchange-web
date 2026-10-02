import { describe, expect, it, vi } from 'vitest';

import { Api } from '@/lib/substrate/sdk/api';

describe('Api.restoreActiveAccount', () => {
  it('treats a corrupt external-account flag as legacy data and infers the account source', async () => {
    const values: Record<string, string> = {
      address: 'cnAccount',
      name: 'Alice',
      source: 'polkadot-js',
      isExternal: '{',
    };
    const api = Object.create(Api.prototype) as Api;
    const loginAccount = vi.fn(async () => undefined);
    const formatAddress = vi.fn((address?: string) => `formatted:${address ?? ''}`);

    api.storage = {
      get: (key: string) => values[key] ?? '',
    } as never;
    api.loginAccount = loginAccount as never;
    api.formatAddress = formatAddress as never;

    await expect(api.restoreActiveAccount()).resolves.toBeUndefined();

    expect(formatAddress).toHaveBeenCalledWith('cnAccount', false);
    expect(loginAccount).toHaveBeenCalledWith('formatted:cnAccount', 'Alice', 'polkadot-js', true);
  });

  it('preserves an explicit false external-account flag instead of applying legacy inference', async () => {
    const values: Record<string, string> = {
      address: 'cnAccount',
      source: 'polkadot-js',
      isExternal: 'false',
    };
    const api = Object.create(Api.prototype) as Api;
    const loginAccount = vi.fn(async () => undefined);

    api.storage = {
      get: (key: string) => values[key] ?? '',
    } as never;
    api.loginAccount = loginAccount as never;
    api.formatAddress = vi.fn((address?: string) => address ?? '') as never;

    await api.restoreActiveAccount();

    expect(loginAccount).toHaveBeenCalledWith('cnAccount', '', 'polkadot-js', false);
  });
});
