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

  it('bubbles user-friendly error when provider initialisation fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof global.fetch;

    const module = await import('@/utils/connection/evm/walletconnect');
    vi.spyOn(module.WcEthereumProvider, 'init').mockRejectedValue(new Error('boom'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(module.getWcEthereumProvider()).rejects.toThrow('provider.messages.notAvailable');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('safeSubscribeModal returns a noop unsubscribe when modal subscription API is missing', async () => {
    const { safeSubscribeModal } = await import('@/utils/connection/evm/walletconnect');

    const callback = vi.fn();
    const unsub = safeSubscribeModal({ subscribeModal: true }, callback);

    expect(typeof unsub).toBe('function');
    expect(callback).not.toHaveBeenCalled();
    expect(() => unsub()).not.toThrow();
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
});
