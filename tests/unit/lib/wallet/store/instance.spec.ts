import { describe, expect, it, vi } from 'vitest';

import type { WalletStore } from '@wallet/src/store';

const loadInstanceModule = async () => {
  vi.resetModules();
  return (await import('@wallet/src/store/instance')) as typeof import('@wallet/src/store/instance');
};

describe('wallet store instance helper', () => {
  it('throws when the wallet store has not been registered', async () => {
    const { getWalletStore } = await loadInstanceModule();

    expect(() => getWalletStore()).toThrowError('Wallet store has not been initialised.');
  });

  it('returns the wallet store after registration', async () => {
    const { setWalletStore, getWalletStore } = await loadInstanceModule();
    const walletStore = { state: { wallet: {} } } as unknown as WalletStore;

    setWalletStore(walletStore);

    expect(getWalletStore()).toBe(walletStore);
  });

  it('overwrites the wallet store when set is called repeatedly', async () => {
    const { setWalletStore, getWalletStore } = await loadInstanceModule();
    const firstStore = { state: { wallet: { version: 1 } } } as unknown as WalletStore;
    const secondStore = { state: { wallet: { version: 2 } } } as unknown as WalletStore;

    setWalletStore(firstStore);
    setWalletStore(secondStore);

    expect(getWalletStore()).toBe(secondStore);
  });
});
