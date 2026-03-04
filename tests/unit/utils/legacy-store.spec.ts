import { afterEach, describe, expect, it } from 'vitest';

import { requireLegacyStore, setLegacyStoreOverride } from '@/utils/legacy-store';

type StoreLike = {
  getters: Record<string, unknown>;
  state: Record<string, unknown>;
  original?: {
    getters: Record<string, unknown>;
    state: Record<string, unknown>;
  };
};

describe('legacy-store compatibility', () => {
  afterEach(() => {
    setLegacyStoreOverride(null);
  });

  it('exposes wrapper-style and original string getters together', () => {
    const wrapperStore: StoreLike = {
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
    };

    setLegacyStoreOverride(wrapperStore as any);
    const legacyStore = requireLegacyStore() as any;

    expect(legacyStore.getters.settings.liquiditySource).toBe('xyk');
    expect(legacyStore.getters['wallet/account/whitelist']).toEqual({
      xor: { symbol: 'XOR' },
    });
  });
});
