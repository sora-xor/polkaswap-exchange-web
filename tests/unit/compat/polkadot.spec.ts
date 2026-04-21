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
    (globalThis as Record<string, unknown>).__WALLET_RUNTIME_OVERRIDE = overrideFn;
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).__WALLET_RUNTIME_OVERRIDE;
    walletOverride = undefined;
    overrideFn = undefined;
    vi.resetModules();
  });

  it('reuses the SDK ApiPromise and WsProvider constructors', async () => {
    const compatModule = await import('@/compat/polkadot');
    await compatModule.polkadotReady;

    expect(compatModule.ApiPromise).toBe(walletOverride?.connection.ApiPromise);
    expect(compatModule.WsProvider).toBe(walletOverride?.connection.WsProvider);
  });

  it('re-exports the decodeAddress helper from the ESM bundle', async () => {
    const compatModule = await import('@/compat/polkadot');

    expect(compatModule.decodeAddress).toBe(decodeAddressEsm);
  });

  it('exposes compatibility getters and the CommonJS alias through the same live object', async () => {
    const compatModule = await import('@/compat/polkadot');
    await compatModule.polkadotReady;

    expect(compatModule.polkadotCompat.ApiPromise).toBe(compatModule.ApiPromise);
    expect(compatModule.polkadotCompat.WsProvider).toBe(compatModule.WsProvider);
    expect(compatModule.polkadotCompat.decodeAddress).toBe(decodeAddressEsm);
    expect(compatModule.polkadotCjs).toBe(compatModule.polkadotCompat);
  });
});
