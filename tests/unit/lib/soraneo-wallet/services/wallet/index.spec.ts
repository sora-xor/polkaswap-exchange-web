import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppWallet } from '@/lib/soraneo-wallet/src/consts';

const parseErrorKey = (error: unknown): string => {
  return JSON.parse((error as Error).message).key;
};

const loadWalletServices = async () => {
  vi.resetModules();
  return import('@/lib/soraneo-wallet/src/services/wallet');
};

describe('wallet services/index', () => {
  beforeEach(() => {
    window.injectedWeb3 = {};
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    window.injectedWeb3 = {};
    vi.restoreAllMocks();
  });

  it('initializes predefined and injected wallets without duplicating existing entries', async () => {
    window.injectedWeb3 = {
      [AppWallet.TalismanJS]: {} as any,
    };

    const walletServices = await loadWalletServices();

    walletServices.initializeWallets('Polkaswap');
    walletServices.initializeWallets('Polkaswap');

    const names = walletServices.getWallets().map((wallet) => wallet.extensionName);

    expect(names).toEqual(
      expect.arrayContaining([AppWallet.FearlessWallet, AppWallet.PolkadotJS, AppWallet.TalismanJS])
    );
    expect(names.filter((name) => name === AppWallet.FearlessWallet)).toHaveLength(1);
    expect(names.filter((name) => name === AppWallet.TalismanJS)).toHaveLength(1);
  });

  it('derives unknown wallet info and injects local wallets only once', async () => {
    const walletServices = await loadWalletServices();
    const walletInfo = walletServices.getWalletInfo('my-custom-wallet');
    const localWallet = {
      enable: vi.fn(),
    } as any;

    expect(walletInfo).toMatchObject({
      extensionName: 'my-custom-wallet',
      title: 'My Custom Wallet',
      logo: {
        alt: 'my-custom-wallet',
      },
    });

    walletServices.addWalletLocally(localWallet, AppWallet.GoogleDrive, 'Polkaswap', 'custom-wallet');
    walletServices.addWalletLocally(localWallet, AppWallet.GoogleDrive, 'Polkaswap', 'custom-wallet');

    expect(window.injectedWeb3?.['custom-wallet']).toBe(localWallet);
    expect(walletServices.getWalletBySource('custom-wallet')?.extensionName).toBe('custom-wallet');
    expect(console.info).toHaveBeenCalledTimes(1);
  });

  it('sorts fearless first and filters wallet groups by source helpers', async () => {
    const walletServices = await loadWalletServices();

    walletServices.addWallet(walletServices.getWalletInfo(AppWallet.TalismanJS), 'Polkaswap');
    walletServices.addWallet(walletServices.getWalletInfo(AppWallet.FearlessWallet), 'Polkaswap');
    walletServices.addWallet(walletServices.getWalletInfo(AppWallet.WalletConnect), 'Polkaswap');

    expect(walletServices.getAppWallets().map((wallet) => wallet.extensionName)).toEqual([
      AppWallet.FearlessWallet,
      AppWallet.TalismanJS,
      AppWallet.WalletConnect,
    ]);
    expect(walletServices.getAppWallets(true).map((wallet) => wallet.extensionName)).toEqual([AppWallet.WalletConnect]);
    expect(walletServices.isAppStorageSource(AppWallet.Sora)).toBe(true);
    expect(walletServices.isInternalSource(AppWallet.GoogleDrive)).toBe(true);
    expect(walletServices.isExtensionSource(AppWallet.TalismanJS)).toBe(true);
  });

  it('throws the expected localized error when a known wallet is not installed', async () => {
    const walletServices = await loadWalletServices();

    walletServices.addWallet(walletServices.getWalletInfo(AppWallet.PolkadotJS), 'Polkaswap');

    try {
      await walletServices.getWallet(AppWallet.PolkadotJS);
      throw new Error('expected getWallet to throw');
    } catch (error) {
      expect((error as Error).name).toBe('AppHandledError');
      expect(parseErrorKey(error)).toBe('polkadotjs.noExtension');
    }
  });

  it('surfaces signer and connection failures from injected wallets', async () => {
    const walletServices = await loadWalletServices();

    walletServices.addWalletLocally(
      {
        enable: vi.fn().mockRejectedValue(new Error('denied')),
      } as any,
      AppWallet.PolkadotJS,
      'Polkaswap',
      'rejecting-wallet'
    );
    walletServices.addWalletLocally(
      {
        enable: vi.fn().mockResolvedValue({
          accounts: {
            get: vi.fn().mockResolvedValue([]),
            subscribe: vi.fn(),
          },
          signer: undefined,
          metadata: undefined,
          provider: undefined,
        }),
      } as any,
      AppWallet.WalletConnect,
      'Polkaswap',
      'nosigner-wallet'
    );

    try {
      await walletServices.getWallet('rejecting-wallet');
      throw new Error('expected rejecting-wallet to throw');
    } catch (error) {
      expect(parseErrorKey(error)).toBe('polkadotjs.noSigner');
    }

    try {
      await walletServices.getWallet('nosigner-wallet');
      throw new Error('expected nosigner-wallet to throw');
    } catch (error) {
      expect(parseErrorKey(error)).toBe('polkadotjs.connectionError');
    }
  });

  it('returns enabled wallets when the injected extension exposes a signer', async () => {
    const walletServices = await loadWalletServices();
    const signer = { signPayload: vi.fn() };

    walletServices.addWalletLocally(
      {
        version: '1.0.0',
        enable: vi.fn().mockResolvedValue({
          accounts: {
            get: vi.fn().mockResolvedValue([]),
            subscribe: vi.fn(),
          },
          signer,
          metadata: { ok: true },
          provider: { ok: true },
        }),
      } as any,
      AppWallet.WalletConnect,
      'Polkaswap',
      'working-wallet'
    );

    const wallet = await walletServices.getWallet('working-wallet');

    expect(wallet.extensionName).toBe('working-wallet');
    expect(wallet.signer).toBe(signer);
    expect(wallet.extension?.name).toBe('working-wallet');
  });
});
