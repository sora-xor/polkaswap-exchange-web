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

describe('WithKeyring signer lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defers signer attachment until a connection api exists', () => {
    const account = new WithKeyring();
    const signer = { signRaw: vi.fn() } as any;

    expect(() => account.setSigner(signer)).not.toThrow();
    expect(account.signer).toBe(signer);
  });

  it('replays a cached signer when the connection becomes available later', () => {
    const account = new WithKeyring();
    const signer = { signRaw: vi.fn() } as any;
    const setSignerSpy = vi.fn();

    account.setSigner(signer);
    account.setConnection({ api: { setSigner: setSignerSpy } } as any);

    expect(setSignerSpy).toHaveBeenCalledTimes(1);
    expect(setSignerSpy).toHaveBeenCalledWith(signer);
  });
});
