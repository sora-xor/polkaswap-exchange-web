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

const createProviderAnnouncement = (uuid: string) =>
  new CustomEvent('eip6963:announceProvider', {
    detail: {
      info: {
        rdns: `io.${uuid}`,
        uuid,
        name: `Provider ${uuid}`,
        icon: `${uuid}.svg`,
      },
      provider: {
        request: vi.fn(),
      },
    },
  });

const getRequestProviderDispatchCount = (dispatchEventSpy: ReturnType<typeof vi.spyOn>): number => {
  return dispatchEventSpy.mock.calls.filter(([event]) => {
    return (event as Event).type === 'eip6963:requestProvider';
  }).length;
};

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

  it('shares EIP-6963 discovery, fans out announcements, and replays cached providers', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
    const firstSubscriber = vi.fn();
    const secondSubscriber = vi.fn();
    const providersModule = await import('@/utils/connection/evm/providers');

    const cleanupFirst = providersModule.getProvidersList(firstSubscriber);
    const cleanupSecond = providersModule.getProvidersList(secondSubscriber);

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    expect(addEventListenerSpy).toHaveBeenCalledWith('eip6963:announceProvider', expect.any(Function));
    expect(getRequestProviderDispatchCount(dispatchEventSpy)).toBe(1);

    const firstAnnouncement = createProviderAnnouncement('provider-1');
    window.dispatchEvent(firstAnnouncement);

    expect(firstSubscriber).toHaveBeenCalledWith(firstAnnouncement);
    expect(secondSubscriber).toHaveBeenCalledWith(firstAnnouncement);

    cleanupFirst();

    const secondAnnouncement = createProviderAnnouncement('provider-2');
    window.dispatchEvent(secondAnnouncement);

    expect(firstSubscriber).toHaveBeenCalledTimes(1);
    expect(secondSubscriber).toHaveBeenCalledWith(secondAnnouncement);

    cleanupSecond();

    const lateSubscriber = vi.fn();
    const cleanupLate = providersModule.getProvidersList(lateSubscriber);

    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    expect(getRequestProviderDispatchCount(dispatchEventSpy)).toBe(1);
    expect(lateSubscriber).toHaveBeenNthCalledWith(1, firstAnnouncement);
    expect(lateSubscriber).toHaveBeenNthCalledWith(2, secondAnnouncement);

    cleanupLate();
  });

  it('uses Firefox extension URLs when provider metadata is loaded under a Firefox user agent', async () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 Firefox/124.0',
    });

    const providersModule = await import('@/utils/connection/evm/providers');

    expect(providersModule.MetamaskProvider.installUrl).toBe(
      'https://addons.mozilla.org/en-US/firefox/addon/ether-metamask/'
    );
  });
});
