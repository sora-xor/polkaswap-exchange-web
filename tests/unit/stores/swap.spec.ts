import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSwapStore } from '@/stores/swap';
import { settingsStorage } from '@/utils/storage';

vi.mock('@sora-substrate/sdk/build/dex/consts', () => ({
  DexId: { XOR: 0 },
}));

vi.mock('@soramitsu/soraneo-wallet-web', () => ({
  api: {
    divideAssets: vi.fn(() => '0'),
    swap: {
      getDexesSwapQuoteObservable: vi.fn(),
      getPriceImpact: vi.fn(() => '0'),
      getMinMaxValue: vi.fn(() => '0'),
    },
  },
  WALLET_CONSTS: {
    TranslationConsts: {},
  },
  components: {},
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
  settingsStorage: {
    set: vi.fn(),
    get: vi.fn(() => null),
  },
}));

vi.mock('@/store', () => ({
  default: {
    state: {
      settings: {
        isWalletLoaded: true,
        slippageTolerance: '0',
      },
      wallet: {
        transactions: {
          isConfirmTxDialogDisabled: false,
        },
        account: {
          address: '',
        },
      },
    },
    getters: {
      assets: {
        assetDataByAddress: vi.fn(() => null),
        xor: {},
      },
      settings: {
        debugEnabled: false,
        nodeIsConnected: true,
        liquiditySource: null,
      },
      wallet: {
        account: {
          isLoggedIn: false,
          accountAssetsAddressTable: {},
        },
      },
    },
    commit: {
      wallet: {
        transactions: {
          addActiveTx: vi.fn(),
          removeActiveTxs: vi.fn(),
        },
      },
    },
    dispatch: {
      wallet: {
        account: {
          logout: vi.fn(),
        },
      },
    },
  },
}));

vi.mock('@/utils/storage', async (original) => {
  const mod = await original();
  return {
    ...mod,
    settingsStorage: {
      ...mod.settingsStorage,
      set: vi.fn(),
    },
  };
});

describe('swap store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initializes with default state', () => {
    const store = useSwapStore();

    expect(store.tokenFromAddress).toBe('');
    expect(store.tokenToAddress).toBe('');
    expect(store.fromValue).toBe('');
    expect(store.toValue).toBe('');
    expect(store.isExchangeB).toBe(false);
    expect(store.allowLossPopup).toBe(true);
  });

  it('sets token addresses without touching other fields', () => {
    const store = useSwapStore();
    store.updateTokenSubscription = vi.fn();

    store.setTokenFromAddress('foo');
    store.setTokenToAddress('bar');

    expect(store.tokenFromAddress).toBe('foo');
    expect(store.tokenToAddress).toBe('bar');
  });

  it('resets swap values but keeps selected tokens', () => {
    const store = useSwapStore();
    store.updateTokenSubscription = vi.fn();

    store.setTokenFromAddress('foo');
    store.setTokenToAddress('bar');
    store.setFromValue('10');
    store.setToValue('20');
    store.setExchangeB(true);

    store.reset();

    expect(store.tokenFromAddress).toBe('foo');
    expect(store.tokenToAddress).toBe('bar');
    expect(store.fromValue).toBe('');
    expect(store.toValue).toBe('');
    expect(store.isExchangeB).toBe(false);
  });

  it('persists the loss warning flag', () => {
    const store = useSwapStore();
    const setSpy = settingsStorage.set as unknown as ReturnType<typeof vi.fn>;

    store.setAllowLossPopup(false);

    expect(store.allowLossPopup).toBe(false);
    expect(setSpy).toHaveBeenCalledWith('allowSwapLossPopup', false);
  });
});
