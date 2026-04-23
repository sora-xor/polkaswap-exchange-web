import { beforeEach, afterEach, afterAll, describe, expect, it, vi } from 'vitest';

const mockAppKit = {
  open: vi.fn(),
  close: vi.fn(),
  subscribeState: vi.fn(() => () => undefined),
  setRequestedCaipNetworks: vi.fn(),
  getCaipNetwork: vi.fn(() => ({ id: 1 })),
};

const ensureAppKitMock = vi.fn(async () => mockAppKit);

vi.mock('@walletconnect/ethereum-provider', () => {
  class MockEthereumProvider {
    public static init = vi.fn();
  }

  return {
    EthereumProvider: MockEthereumProvider,
  };
});

vi.mock('@/utils/connection/evm/appkit', () => ({
  ensureAppKit: ensureAppKitMock,
}));

const originalFetch = global.fetch;

describe('walletconnect utils', () => {
  let setWalletConnectProjectId: typeof import('@/lib/soraneo-wallet/src/services/walletconnect/config').setWalletConnectProjectId;
  let resetWalletConnectProjectIdCache: typeof import('@/utils/connection/evm/walletconnectProject').resetWalletConnectProjectIdCache;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    ({ setWalletConnectProjectId } = await import('@/lib/soraneo-wallet/src/services/walletconnect/config'));
    ({ resetWalletConnectProjectIdCache } = await import('@/utils/connection/evm/walletconnectProject'));
    mockAppKit.open.mockReset();
    mockAppKit.close.mockReset();
    mockAppKit.subscribeState.mockImplementation(() => () => undefined);
    mockAppKit.setRequestedCaipNetworks.mockReset();
    mockAppKit.getCaipNetwork.mockReset();
    ensureAppKitMock.mockClear();
    setWalletConnectProjectId('mock-project-id');
    resetWalletConnectProjectIdCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('reads WalletConnect project id from the wallet config owner', async () => {
    const { getWalletConnectProjectId } = await import('@/utils/connection/evm/walletconnect');

    const first = await getWalletConnectProjectId();
    const second = await getWalletConnectProjectId();

    expect(first).toBe(second);
    expect(first).toBe('mock-project-id');
  });

  it('throws when WalletConnect project id is not configured', async () => {
    setWalletConnectProjectId('');
    resetWalletConnectProjectIdCache();

    const { getWalletConnectProjectId } = await import('@/utils/connection/evm/walletconnect');

    await expect(getWalletConnectProjectId()).rejects.toThrow('WalletConnect projectId is not configured');
  });

  it('checks WalletConnect availability using resolved project id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof global.fetch;

    const { checkWalletConnectAvailability } = await import('@/utils/connection/evm/walletconnect');

    await checkWalletConnectAvailability({ chains: [137] });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://rpc.walletconnect.com/v1/?chainId=eip155:137&projectId=mock-project-id',
      {
        method: 'POST',
        body: JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'test', params: [] }),
      }
    );
  });

  it('checks WalletConnect availability with default and optional-only chain props', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof global.fetch;

    const { checkWalletConnectAvailability } = await import('@/utils/connection/evm/walletconnect');

    await checkWalletConnectAvailability();
    await checkWalletConnectAvailability({ optionalChains: [42161] });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://rpc.walletconnect.com/v1/?chainId=eip155:1&projectId=mock-project-id',
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://rpc.walletconnect.com/v1/?chainId=eip155:42161&projectId=mock-project-id',
      expect.any(Object)
    );
  });

  it('falls back to mainnet when chain props have no usable probe chain', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof global.fetch;

    const { checkWalletConnectAvailability } = await import('@/utils/connection/evm/walletconnect');

    await checkWalletConnectAvailability({ chains: { length: 1 } } as any);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://rpc.walletconnect.com/v1/?chainId=eip155:1&projectId=mock-project-id',
      expect.any(Object)
    );
  });

  it('uses mainnet fallback for sparse chain arrays', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof global.fetch;

    const { checkWalletConnectAvailability } = await import('@/utils/connection/evm/walletconnect');

    await checkWalletConnectAvailability({ chains: Array(1) as number[] });
    await checkWalletConnectAvailability({ optionalChains: Array(1) as number[] });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://rpc.walletconnect.com/v1/?chainId=eip155:1&projectId=mock-project-id',
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://rpc.walletconnect.com/v1/?chainId=eip155:1&projectId=mock-project-id',
      expect.any(Object)
    );
  });

  it('initialises the WalletConnect provider with the resolved project id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof global.fetch;

    const module = await import('@/utils/connection/evm/walletconnect');
    const providerMock = {} as InstanceType<typeof module.WcEthereumProvider>;
    const initSpy = vi.spyOn(module.WcEthereumProvider, 'init').mockResolvedValue(providerMock);

    const result = await module.getWcEthereumProvider({ chains: [5], optionalChains: [137] });

    expect(initSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'mock-project-id',
        chains: [5],
        showQrModal: true,
      })
    );
    expect(ensureAppKitMock).toHaveBeenCalledWith({ chains: [5], optionalChains: [137] });
    expect((result as any).modal).toBe(mockAppKit);
  });

  it('initialises the WalletConnect provider with default chain props when none are supplied', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof global.fetch;

    const module = await import('@/utils/connection/evm/walletconnect');
    const providerMock = {} as InstanceType<typeof module.WcEthereumProvider>;
    const initSpy = vi.spyOn(module.WcEthereumProvider, 'init').mockResolvedValue(providerMock);

    await module.getWcEthereumProvider();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://rpc.walletconnect.com/v1/?chainId=eip155:1&projectId=mock-project-id',
      expect.any(Object)
    );
    expect(ensureAppKitMock).toHaveBeenCalledWith({ chains: [1] });
    expect(initSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        chains: [1],
        qrModalOptions: {
          themeVariables: {
            '--wcm-z-index': '9999',
          },
        },
      })
    );
  });

  it('bubbles user-friendly error when provider initialisation fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof global.fetch;

    const module = await import('@/utils/connection/evm/walletconnect');
    vi.spyOn(module.WcEthereumProvider, 'init').mockRejectedValue(new Error('boom'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(module.getWcEthereumProvider()).rejects.toThrow('provider.messages.notAvailable');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('WcEthereumProvider.init calls initialize and returns a subclass instance', async () => {
    const { WcEthereumProvider } = await import('@/utils/connection/evm/walletconnect');
    const initialize = vi.fn().mockResolvedValue(undefined);
    Object.getPrototypeOf(WcEthereumProvider.prototype).initialize = initialize;

    const result = await WcEthereumProvider.init({ projectId: 'mock-project-id', chains: [1] } as any);

    expect(result).toBeInstanceOf(WcEthereumProvider);
    expect(initialize).toHaveBeenCalledWith({ projectId: 'mock-project-id', chains: [1] });
  });

  it('ignores empty app sessions when setting WalletConnect state', async () => {
    const { WcEthereumProvider } = await import('@/utils/connection/evm/walletconnect');
    const provider = new WcEthereumProvider() as any;

    await provider.setAppSession(undefined);

    expect(provider.session).toBeUndefined();
  });

  it('safeSubscribeModal returns a noop unsubscribe when modal subscription API is missing', async () => {
    const { safeSubscribeModal } = await import('@/utils/connection/evm/walletconnect');

    const callback = vi.fn();
    const unsub = safeSubscribeModal({ subscribeModal: true }, callback);

    expect(typeof unsub).toBe('function');
    expect(callback).not.toHaveBeenCalled();
    expect(() => unsub()).not.toThrow();
  });

  it('safeSubscribeModal returns valid unsubscribe handlers from compatible modals', async () => {
    const { safeSubscribeModal } = await import('@/utils/connection/evm/walletconnect');

    const callback = vi.fn();
    const unsubscribe = vi.fn();
    const modal = {
      subscribeModal: vi.fn(function (this: typeof modal, cb: typeof callback) {
        expect(this).toBe(modal);
        cb({ open: true });
        return unsubscribe;
      }),
    };

    const unsub = safeSubscribeModal(modal, callback);
    unsub();

    expect(callback).toHaveBeenCalledWith({ open: true });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('safeSubscribeModal normalizes invalid unsubscribe handlers', async () => {
    const { safeSubscribeModal } = await import('@/utils/connection/evm/walletconnect');

    const callback = vi.fn();
    const subscribeModal = vi.fn().mockReturnValue('not-a-function');
    const unsub = safeSubscribeModal({ subscribeModal }, callback);

    expect(subscribeModal).toHaveBeenCalledWith(callback);
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  it('safeDisconnectSigner swallows sync disconnect failures', async () => {
    const { safeDisconnectSigner } = await import('@/utils/connection/evm/walletconnect');
    const signer = {
      disconnect: vi.fn(() => {
        throw new Error('Please call connect() before enable()');
      }),
    };

    await expect(safeDisconnectSigner(signer)).resolves.toBeUndefined();
    expect(signer.disconnect).toHaveBeenCalled();
  });

  it('safeDisconnectSigner ignores missing disconnect handlers and awaits successful promises', async () => {
    const { safeDisconnectSigner } = await import('@/utils/connection/evm/walletconnect');
    const signer = {
      disconnect: vi.fn().mockResolvedValue(undefined),
    };

    await expect(safeDisconnectSigner(null)).resolves.toBeUndefined();
    await expect(safeDisconnectSigner({})).resolves.toBeUndefined();
    await expect(safeDisconnectSigner(signer)).resolves.toBeUndefined();

    expect(signer.disconnect).toHaveBeenCalledTimes(1);
  });

  it('safeDisconnectSigner swallows rejected disconnect promises', async () => {
    const { safeDisconnectSigner } = await import('@/utils/connection/evm/walletconnect');
    const signer = {
      disconnect: vi.fn(async () => {
        throw new Error('Please call connect() before enable()');
      }),
    };

    await expect(safeDisconnectSigner(signer)).resolves.toBeUndefined();
    expect(signer.disconnect).toHaveBeenCalled();
  });

  it('restoreAppSession activates a matching WalletConnect pairing', async () => {
    const { WcEthereumProvider } = await import('@/utils/connection/evm/walletconnect');
    const matchingSession = {
      topic: 'session-topic',
      pairingTopic: 'pairing-topic',
      namespaces: {
        eip155: {
          chains: ['eip155:137'],
        },
      },
    };
    const provider = new WcEthereumProvider() as any;
    provider.chainId = 137;
    provider.namespace = 'eip155';
    provider.formatChainId = vi.fn((chainId: number) => `eip155:${chainId}`);
    provider.signer = {
      client: {
        session: {
          values: [
            { topic: 'ignored-no-namespace', pairingTopic: 'ignored-1', namespaces: {} },
            { topic: 'ignored-chain', pairingTopic: 'ignored-2', namespaces: { eip155: { chains: ['eip155:1'] } } },
            matchingSession,
          ],
        },
        core: {
          pairing: {
            activate: vi.fn().mockResolvedValue(undefined),
            updateExpiry: vi.fn().mockResolvedValue(undefined),
          },
        },
        disconnect: vi.fn(),
      },
    };
    vi.spyOn(console, 'info').mockImplementation(() => undefined);

    await provider.restoreAppSession();

    expect(provider.session).toBe(matchingSession);
    expect(provider.signer.client.core.pairing.activate).toHaveBeenCalledWith({ topic: 'pairing-topic' });
    expect(provider.signer.client.core.pairing.updateExpiry).toHaveBeenCalledWith({
      topic: 'pairing-topic',
      expiry: expect.any(Number),
    });
    expect(provider.signer.client.disconnect).not.toHaveBeenCalled();
  });

  it('restoreAppSession skips lookup when the app session is already set', async () => {
    const { WcEthereumProvider } = await import('@/utils/connection/evm/walletconnect');
    const provider = new WcEthereumProvider() as any;
    provider._session = { topic: 'existing' };
    provider.formatChainId = vi.fn();
    provider.signer = {
      client: {
        session: { values: [] },
      },
    };

    await provider.restoreAppSession();

    expect(provider.formatChainId).not.toHaveBeenCalled();
    expect(provider.session).toEqual({ topic: 'existing' });
  });

  it('restoreAppSession disconnects matching sessions when pairing activation fails', async () => {
    const { WcEthereumProvider } = await import('@/utils/connection/evm/walletconnect');
    const provider = new WcEthereumProvider() as any;
    provider.chainId = 137;
    provider.namespace = 'eip155';
    provider.formatChainId = vi.fn((chainId: number) => `eip155:${chainId}`);
    provider.signer = {
      client: {
        session: {
          values: [
            {
              topic: 'stale-session',
              pairingTopic: 'stale-pairing',
              namespaces: { eip155: { chains: ['eip155:137'] } },
            },
          ],
        },
        core: {
          pairing: {
            activate: vi.fn().mockRejectedValue(new Error('pairing inactive')),
            updateExpiry: vi.fn(),
          },
        },
        disconnect: vi.fn().mockRejectedValue(new Error('ignore disconnect failure')),
      },
    };
    vi.spyOn(console, 'info').mockImplementation(() => undefined);

    await provider.restoreAppSession();

    expect(provider.session).toBeUndefined();
    expect(provider.signer.client.disconnect).toHaveBeenCalledWith({
      topic: 'stale-session',
      reason: {
        code: 6000,
        message: 'Disconnected by dApp',
      },
    });
  });

  it('restoreAppSession supports stale-session cleanup with synchronous disconnects', async () => {
    const { WcEthereumProvider } = await import('@/utils/connection/evm/walletconnect');
    const provider = new WcEthereumProvider() as any;
    provider.chainId = 137;
    provider.namespace = 'eip155';
    provider.formatChainId = vi.fn((chainId: number) => `eip155:${chainId}`);
    provider.signer = {
      client: {
        session: {
          values: [
            {
              topic: 'stale-session',
              pairingTopic: 'stale-pairing',
              namespaces: { eip155: { chains: ['eip155:137'] } },
            },
          ],
        },
        core: {
          pairing: {
            activate: vi.fn().mockRejectedValue(new Error('pairing inactive')),
            updateExpiry: vi.fn(),
          },
        },
        disconnect: vi.fn(),
      },
    };
    vi.spyOn(console, 'info').mockImplementation(() => undefined);

    await expect(provider.restoreAppSession()).resolves.toBeUndefined();

    expect(provider.signer.client.disconnect).toHaveBeenCalledWith({
      topic: 'stale-session',
      reason: {
        code: 6000,
        message: 'Disconnected by dApp',
      },
    });
  });

  it('connect rejects and aborts pairing when the modal closes before an ethereum session exists', async () => {
    const { WcEthereumProvider } = await import('@/utils/connection/evm/walletconnect');
    const provider = new WcEthereumProvider() as any;
    const unsubscribe = vi.fn();
    provider.namespace = 'eip155';
    provider.modal = {
      subscribeModal: vi.fn((callback: (state: { open: boolean }) => void) => {
        queueMicrotask(() => callback({ open: false }));
        return unsubscribe;
      }),
    };
    provider.signer = {
      session: {
        namespaces: {},
      },
      abortPairingAttempt: vi.fn(),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };
    provider.restoreAppSession = vi.fn().mockImplementation(() => new Promise(() => undefined));

    await expect(provider.connect()).rejects.toThrow('Connection request reset. Please try again.');

    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(provider.signer.abortPairingAttempt).toHaveBeenCalledTimes(1);
  });

  it('connect restores existing sessions without calling the base provider connect', async () => {
    const { WcEthereumProvider } = await import('@/utils/connection/evm/walletconnect');
    const provider = new WcEthereumProvider() as any;
    const baseConnect = vi.fn().mockResolvedValue(undefined);
    const unsubscribe = vi.fn();
    Object.getPrototypeOf(WcEthereumProvider.prototype).connect = baseConnect;
    provider.namespace = 'eip155';
    provider.modal = {
      subscribeModal: vi.fn((callback: (state: { open: boolean }) => void) => {
        queueMicrotask(() => callback({ open: false }));
        return unsubscribe;
      }),
    };
    provider.signer = {
      session: {
        namespaces: { eip155: {} },
      },
      abortPairingAttempt: vi.fn(),
      disconnect: vi.fn(),
    };
    provider.restoreAppSession = vi.fn().mockImplementation(async () => {
      provider._session = { topic: 'restored' };
    });

    await expect(provider.connect({ chains: [1] } as any)).resolves.toBeUndefined();

    expect(baseConnect).not.toHaveBeenCalled();
    expect(provider.session).toEqual({ topic: 'restored' });
    expect(unsubscribe).not.toHaveBeenCalled();
    expect(provider.signer.abortPairingAttempt).not.toHaveBeenCalled();
  });

  it('connect stores signer session after a successful base provider connection', async () => {
    const { WcEthereumProvider } = await import('@/utils/connection/evm/walletconnect');
    const provider = new WcEthereumProvider() as any;
    const connectedSession = { topic: 'connected', namespaces: { eip155: {} } };
    const baseConnect = vi.fn(function (this: typeof provider) {
      this.signer.session = connectedSession;
      return Promise.resolve();
    });
    Object.getPrototypeOf(WcEthereumProvider.prototype).connect = baseConnect;
    provider.namespace = 'eip155';
    provider.modal = {
      subscribeModal: vi.fn(() => vi.fn()),
    };
    provider.signer = {
      session: undefined,
      abortPairingAttempt: vi.fn(),
      disconnect: vi.fn(),
    };
    provider.restoreAppSession = vi.fn().mockResolvedValue(undefined);

    await expect(provider.connect({ chains: [137] } as any)).resolves.toBeUndefined();

    expect(baseConnect).toHaveBeenCalledWith({ chains: [137] });
    expect(provider.session).toBe(connectedSession);
  });

  it('connect disconnects the signer and rethrows when base provider connect fails', async () => {
    const { WcEthereumProvider } = await import('@/utils/connection/evm/walletconnect');
    const provider = new WcEthereumProvider() as any;
    const error = new Error('connect failed');
    Object.getPrototypeOf(WcEthereumProvider.prototype).connect = vi.fn().mockRejectedValue(error);
    provider.namespace = 'eip155';
    provider.modal = {
      subscribeModal: vi.fn(() => vi.fn()),
    };
    provider.signer = {
      session: undefined,
      abortPairingAttempt: vi.fn(),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };
    provider.restoreAppSession = vi.fn().mockResolvedValue(undefined);

    await expect(provider.connect()).rejects.toBe(error);

    expect(provider.signer.disconnect).toHaveBeenCalledTimes(1);
  });
});
