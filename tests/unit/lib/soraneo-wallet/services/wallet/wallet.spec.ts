import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BaseDotSamaWallet } from '@/lib/soraneo-wallet/src/services/wallet/wallet';

const walletInfo = {
  extensionName: 'test-wallet',
  title: 'Test Wallet',
  chromeUrl: 'https://chrome.example',
  mozillaUrl: 'https://firefox.example',
  logo: {
    src: '/wallet.svg',
    alt: 'Wallet',
  },
};

const setUserAgent = (value: string) => {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value,
  });
};

describe('wallet services/wallet', () => {
  beforeEach(() => {
    setUserAgent('Chrome');
    window.injectedWeb3 = {};
  });

  afterEach(() => {
    window.injectedWeb3 = {};
    vi.restoreAllMocks();
  });

  it('chooses the browser-specific install url during construction', () => {
    setUserAgent('Mozilla/5.0 Firefox/124.0');

    const wallet = new BaseDotSamaWallet(walletInfo, 'Polkaswap');

    expect(wallet.installUrl).toBe(walletInfo.mozillaUrl);
    expect(wallet.dAppName).toBe('Polkaswap');
  });

  it('enables installed extensions and exposes the normalized injected handles', async () => {
    const rawExtension = {
      version: '1.2.3',
      enable: vi.fn().mockResolvedValue({
        signer: { signPayload: vi.fn() },
        metadata: { provides: 'metadata' },
        provider: { sends: 'provider' },
        accounts: {
          get: vi.fn().mockResolvedValue([]),
          subscribe: vi.fn(),
        },
      }),
    };

    window.injectedWeb3[walletInfo.extensionName] = rawExtension as any;

    const wallet = new BaseDotSamaWallet(walletInfo, 'Polkaswap');

    expect(wallet.installed).toBe(true);
    expect(wallet.rawExtension).toBe(rawExtension);

    await wallet.enable();

    expect(rawExtension.enable).toHaveBeenCalledWith('Polkaswap');
    expect(wallet.extension).toMatchObject({
      name: walletInfo.extensionName,
      version: '1.2.3',
    });
    expect(wallet.signer).toBe(wallet.extension?.signer);
    expect(wallet.metadata).toEqual({ provides: 'metadata' });
    expect(wallet.provider).toEqual({ sends: 'provider' });
  });

  it('returns null subscriptions and accounts when the extension cannot be enabled', async () => {
    const wallet = new BaseDotSamaWallet(walletInfo);
    const callback = vi.fn();

    await expect(wallet.subscribeAccounts(callback)).resolves.toBeNull();
    await expect(wallet.getAccounts()).resolves.toBeNull();

    expect(callback).toHaveBeenCalledWith(undefined);
  });

  it('maps subscribed and fetched accounts to wallet-aware account objects', async () => {
    const injectedAccounts = [
      { address: '0x1', name: 'Alice' },
      { address: '0x2', name: 'Bob' },
    ];
    const unsubscribe = vi.fn();
    const subscribe = vi.fn((handler: (accounts: typeof injectedAccounts) => void) => {
      handler(injectedAccounts);
      return unsubscribe;
    });
    const get = vi.fn().mockResolvedValue(injectedAccounts);
    const signer = { signRaw: vi.fn() };

    window.injectedWeb3[walletInfo.extensionName] = {
      version: '2.0.0',
      enable: vi.fn().mockResolvedValue({
        signer,
        metadata: undefined,
        provider: undefined,
        accounts: {
          get,
          subscribe,
        },
      }),
    } as any;

    const wallet = new BaseDotSamaWallet(walletInfo);
    const callback = vi.fn();

    await expect(wallet.subscribeAccounts(callback)).resolves.toBe(unsubscribe);

    expect(callback).toHaveBeenCalledWith([
      expect.objectContaining({
        address: '0x1',
        name: 'Alice',
        source: walletInfo.extensionName,
        wallet,
        signer,
      }),
      expect.objectContaining({
        address: '0x2',
        name: 'Bob',
        source: walletInfo.extensionName,
        wallet,
        signer,
      }),
    ]);

    await expect(wallet.getAccounts()).resolves.toEqual([
      expect.objectContaining({
        address: '0x1',
        source: walletInfo.extensionName,
        wallet,
        signer,
      }),
      expect.objectContaining({
        address: '0x2',
        source: walletInfo.extensionName,
        wallet,
        signer,
      }),
    ]);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
