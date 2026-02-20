import { beforeEach, describe, expect, it, vi } from 'vitest';

const cryptoWaitReadyMock = vi.hoisted(() => vi.fn());
const loadAllMock = vi.hoisted(() => vi.fn());

vi.mock('@polkadot/util-crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@polkadot/util-crypto')>();

  return {
    ...actual,
    cryptoWaitReady: cryptoWaitReadyMock,
  };
});

vi.mock('@polkadot/ui-keyring', () => ({
  Keyring: class {
    public loadAll = loadAllMock;

    public getAccounts = vi.fn(() => []);
  },
}));

import { KeyringType, WithKeyring } from '@/lib/substrate/sdk/apiAccount';

describe('WithKeyring.initKeyring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes keyring when wasm crypto is ready', async () => {
    cryptoWaitReadyMock.mockResolvedValue(true);
    const account = new WithKeyring();

    await expect(account.initKeyring()).resolves.toBeUndefined();

    expect(cryptoWaitReadyMock).toHaveBeenCalledTimes(1);
    expect(loadAllMock).toHaveBeenCalledWith({ type: KeyringType });
  });

  it('falls back to JS crypto when wasm init fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    cryptoWaitReadyMock.mockRejectedValueOnce(new Error('blocked by csp'));
    const account = new WithKeyring();

    await expect(account.initKeyring()).resolves.toBeUndefined();

    expect(loadAllMock).toHaveBeenCalledWith({ type: KeyringType });
    expect(warnSpy).toHaveBeenCalledWith(
      '[wallet] WASM crypto initialization failed. Falling back to JS crypto.',
      expect.any(Error)
    );

    warnSpy.mockRestore();
  });
});
