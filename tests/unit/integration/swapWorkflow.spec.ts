import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSwapAmounts } from '@/composables/useSwapAmounts';
import { useSwapStore } from '@/stores/swap';

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

vi.mock('@/utils', () => ({
  asZeroValue: (value: string) => !value || Number(value) === 0,
}));

vi.mock('@/utils/subscriptions', () => ({
  TokenBalanceSubscriptions: vi.fn().mockImplementation(() => ({
    add: vi.fn(),
    remove: vi.fn(),
  })),
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
          fiatPriceObject: {},
        },
      },
    },
    getters: {
      assets: {
        assetDataByAddress: vi.fn((address: string) => ({
          address,
          symbol: address.toUpperCase(),
          decimals: 18,
          balance: {
            transferable: '0',
          },
        })),
        xor: { symbol: 'XOR' },
      },
      settings: {
        debugEnabled: false,
        nodeIsConnected: true,
        liquiditySource: null,
      },
      wallet: {
        account: {
          isLoggedIn: true,
          accountAssetsAddressTable: {},
        },
      },
    },
    commit: {
      wallet: {
        transactions: {
          addActiveTx: vi.fn(),
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

describe('swap workflow', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('keeps composable state in sync when switching tokens', async () => {
    const store = useSwapStore();
    const amounts = useSwapAmounts();

    store.updateTokenSubscription = vi.fn();

    store.setTokenFromAddress('token-a');
    store.setTokenToAddress('token-b');

    expect(store.tokenFromAddress).toBe('token-a');
    expect(store.tokenToAddress).toBe('token-b');
    expect(amounts.tokenFrom.value?.symbol).toBe('TOKEN-A');
    expect(amounts.tokenTo.value?.symbol).toBe('TOKEN-B');

    await store.switchTokens();

    expect(store.tokenFromAddress).toBe('token-b');
    expect(store.tokenToAddress).toBe('token-a');
    expect(amounts.tokenFrom.value?.symbol).toBe('TOKEN-B');
    expect(amounts.tokenTo.value?.symbol).toBe('TOKEN-A');
  });
});
