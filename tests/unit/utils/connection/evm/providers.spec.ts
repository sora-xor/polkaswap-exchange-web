import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  beforeEach(() => {
    vi.resetModules();
    walletConnectModuleState.loaded = false;
    walletConnectModuleState.getProvider.mockClear();
  });

  it('loads WalletConnect lazily when the provider is requested', async () => {
    const providersModule = await import('@/utils/connection/evm/providers');

    expect(walletConnectModuleState.loaded).toBe(false);

    await providersModule.WalletConnectProvider.getProvider({ chains: [1] });

    expect(walletConnectModuleState.loaded).toBe(true);
    expect(walletConnectModuleState.getProvider).toHaveBeenCalledWith({ chains: [1] });
  });
});
