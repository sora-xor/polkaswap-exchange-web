import { afterEach, describe, expect, it, vi } from 'vitest';

describe('tests/stubs/rootStore', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('merges wrapper and original getters when an override store is registered', async () => {
    const { getRootStore, setRootStoreOverride } = await import('@tests/stubs/rootStore');

    setRootStoreOverride({
      getters: {
        settings: {
          liquiditySource: 'xyk',
        },
      },
      state: {
        settings: {
          liquiditySource: 'xyk',
        },
      },
      original: {
        getters: {
          'wallet/account/whitelist': {
            xor: { symbol: 'XOR' },
          },
        },
        state: {
          wallet: {
            account: {
              isLoggedIn: true,
            },
          },
        },
      },
    } as any);

    const store = getRootStore() as any;

    expect(store.getters.settings.liquiditySource).toBe('xyk');
    expect(store.getters['wallet/account/whitelist']).toEqual({
      xor: { symbol: 'XOR' },
    });
  });

  it('registers the runtime store in the local root-store accessor', async () => {
    const { getRootStore, setRootStore } = await import('@tests/stubs/rootStore');
    const runtimeStore = {
      state: { settings: { language: 'en' } },
      getters: {},
      commit: {},
      dispatch: {},
    };

    setRootStore(runtimeStore as any);

    expect(getRootStore()).toBe(runtimeStore);
  });
});
