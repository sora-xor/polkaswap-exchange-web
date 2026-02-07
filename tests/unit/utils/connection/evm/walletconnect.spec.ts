import { beforeEach, afterEach, afterAll, describe, expect, it, vi } from 'vitest';

import { resetWalletConnectProjectIdCache } from '@/utils/connection/evm/walletconnectProject';

const walletModuleLoadCount = vi.hoisted(() => ({ value: 0 }));

const buildWalletModule = async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');

  return createWalletMock({
    WC: {
      WcProvider: {
        projectId: 'mock-project-id',
      },
    },
  });
};

const mockAppKit = {
  open: vi.fn(),
  close: vi.fn(),
  subscribeState: vi.fn(() => () => undefined),
  setRequestedCaipNetworks: vi.fn(),
  getCaipNetwork: vi.fn(() => ({ id: 1 })),
};

const ensureAppKitMock = vi.fn(async () => mockAppKit);

vi.mock('@wallet', async () => {
  walletModuleLoadCount.value += 1;
  return await buildWalletModule();
});
vi.mock('@wallet/core', async () => buildWalletModule());

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
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    walletModuleLoadCount.value = 0;
    mockAppKit.open.mockReset();
    mockAppKit.close.mockReset();
    mockAppKit.subscribeState.mockImplementation(() => () => undefined);
    mockAppKit.setRequestedCaipNetworks.mockReset();
    mockAppKit.getCaipNetwork.mockReset();
    ensureAppKitMock.mockClear();
    resetWalletConnectProjectIdCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('resolves WalletConnect project id once per module evaluation', async () => {
    const { getWalletConnectProjectId } = await import('@/utils/connection/evm/walletconnect');

    const first = await getWalletConnectProjectId();
    const second = await getWalletConnectProjectId();

    expect(first).toBe(second);
    expect(walletModuleLoadCount.value).toBeLessThanOrEqual(1);
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
});
