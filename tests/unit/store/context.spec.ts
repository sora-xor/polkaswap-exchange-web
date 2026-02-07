import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('store context fallbacks', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete (globalThis as any).__PS_APP_STORE__;
    vi.resetModules();
  });

  it('injects wallet state into getter contexts when missing', async () => {
    const legacyStore = { state: { wallet: { account: { address: 'addr-1' } } } };
    (globalThis as any).__PS_APP_STORE__ = legacyStore;

    const getterFactory = vi.fn((factoryArgs: [any, any, any, any]) => ({
      state: factoryArgs[0],
      getters: factoryArgs[1],
      rootState: factoryArgs[2],
      rootGetters: factoryArgs[3],
    }));

    const ctx = await import('@/store/context');
    ctx.setStoreContext(vi.fn(), getterFactory as any);

    const context = ctx.localGetterContext([{}, {}, {}, {}] as any, 'web3' as any, {});

    expect(context.rootState.wallet).toBe(legacyStore.state.wallet);
  });

  it('injects wallet state into action contexts when missing', async () => {
    const legacyStore = { state: { wallet: { account: { address: 'addr-2' } } } };
    (globalThis as any).__PS_APP_STORE__ = legacyStore;

    const actionFactory = vi.fn((factoryContext: any) => factoryContext);

    const ctx = await import('@/store/context');
    ctx.setStoreContext(actionFactory as any, vi.fn());

    const resolved = ctx.localActionContext({} as any, 'web3' as any, {});

    expect(resolved.rootState.wallet).toBe(legacyStore.state.wallet);
  });
});
