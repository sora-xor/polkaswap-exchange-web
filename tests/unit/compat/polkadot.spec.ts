import { decodeAddress as decodeAddressEsm } from '@polkadot/util-crypto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const createWalletOverride = () => {
  class ApiPromiseStub {}
  class WsProviderStub {}

  return {
    connection: {
      ApiPromise: ApiPromiseStub,
      WsProvider: WsProviderStub,
    },
  };
};

describe('compat/polkadot', () => {
  let walletOverride: ReturnType<typeof createWalletOverride> | undefined;
  let overrideFn: (() => Promise<ReturnType<typeof createWalletOverride>>) | undefined;

  beforeEach(() => {
    walletOverride = createWalletOverride();
    overrideFn = async () => walletOverride!;
    (globalThis as Record<string, unknown>).__WALLET_MODULE_OVERRIDE = overrideFn;
    (globalThis as Record<string, unknown>).__WALLET_CORE_OVERRIDE = overrideFn;
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).__WALLET_MODULE_OVERRIDE;
    delete (globalThis as Record<string, unknown>).__WALLET_CORE_OVERRIDE;
    walletOverride = undefined;
    overrideFn = undefined;
    vi.resetModules();
  });

  it('reuses the SDK ApiPromise and WsProvider constructors', async () => {
    const compatModule = await import('@/compat/polkadot');
    await compatModule.polkadotReady;

    const { loadWalletCore } = await import('@/utils/walletCore');
    const walletModule = await loadWalletCore();

    expect(compatModule.ApiPromise).toBe(walletModule.connection?.ApiPromise);
    expect(compatModule.WsProvider).toBe(walletModule.connection?.WsProvider);
  });

  it('re-exports the decodeAddress helper from the ESM bundle', async () => {
    const compatModule = await import('@/compat/polkadot');

    expect(compatModule.decodeAddress).toBe(decodeAddressEsm);
  });
});
