import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const walletConnectModuleState = vi.hoisted(() => ({
  loaded: false,
  getProvider: vi.fn(async () => ({ request: vi.fn() })),
}));

vi.mock('@/utils/connection/evm/walletconnect', () => {
  walletConnectModuleState.loaded = true;

  return {
    getWcEthereumProvider: walletConnectModuleState.getProvider,
  };
});

describe('connection/evm/providers', () => {
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    vi.resetModules();
    walletConnectModuleState.loaded = false;
    walletConnectModuleState.getProvider.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUserAgent,
    });
    delete (window as typeof window & { fearlessWallet?: unknown }).fearlessWallet;
    delete (window as typeof window & { ethereum?: unknown }).ethereum;
  });

  it('loads WalletConnect lazily when the provider is requested', async () => {
    const providersModule = await import('@/utils/connection/evm/providers');

    expect(walletConnectModuleState.loaded).toBe(false);

    await providersModule.WalletConnectProvider.getProvider({ chains: [1] });

    expect(walletConnectModuleState.loaded).toBe(true);
    expect(walletConnectModuleState.getProvider).toHaveBeenCalledWith({ chains: [1] });
  });

  it('returns injected browser wallet providers for predefined extension entries', async () => {
    const fearlessProvider = { request: vi.fn() };
    const metamaskProvider = { request: vi.fn() };
    (window as typeof window & { fearlessWallet?: { provider: unknown } }).fearlessWallet = {
      provider: fearlessProvider,
    };
    (window as typeof window & { ethereum?: unknown }).ethereum = metamaskProvider;

    const providersModule = await import('@/utils/connection/evm/providers');

    await expect(providersModule.FearlessWalletProvider.getProvider()).resolves.toBe(fearlessProvider);
    await expect(providersModule.MetamaskProvider.getProvider()).resolves.toBe(metamaskProvider);
  });

  it('registers EIP-6963 provider discovery listener, requests announcements, and cleans up', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
    const onProviderAnnouncement = vi.fn();
    const providersModule = await import('@/utils/connection/evm/providers');

    const cleanup = providersModule.getProvidersList(onProviderAnnouncement);

    expect(addEventListenerSpy).toHaveBeenCalledWith('eip6963:announceProvider', onProviderAnnouncement);
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'eip6963:requestProvider' }));

    cleanup();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('eip6963:announceProvider', onProviderAnnouncement);
  });

  it('uses Firefox extension URLs when provider metadata is loaded under a Firefox user agent', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 Firefox/124.0',
    });

    const providersModule = await import('@/utils/connection/evm/providers');

    expect(providersModule.MetamaskProvider.installUrl).toBe('https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/');
  });
});
