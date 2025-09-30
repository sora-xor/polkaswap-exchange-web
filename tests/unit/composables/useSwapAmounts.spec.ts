import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSwapAmounts } from '@/composables/useSwapAmounts';
import { useSwapStore } from '@/stores/swap';

vi.mock('@sora-substrate/sdk/build/dex/consts', () => ({
  DexId: { XOR: 0 },
}));

vi.mock('@/utils', () => ({ asZeroValue: (value: string) => !value || Number(value) === 0 }));

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
        account: {
          address: '',
          fiatPriceObject: {},
        },
        transactions: {
          isConfirmTxDialogDisabled: false,
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
      },
      settings: {
        debugEnabled: false,
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

describe('useSwapAmounts', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('exposes swap store values as computeds', () => {
    const store = useSwapStore();
    const swap = useSwapAmounts();

    store.setTokenFromAddress('token-a');
    store.setTokenToAddress('token-b');
    store.setFromValue('12');
    store.setToValue('34');

    expect(swap.tokenFrom.value?.symbol).toBe('TOKEN-A');
    expect(swap.tokenTo.value?.symbol).toBe('TOKEN-B');
    expect(swap.fromValue.value).toBe('12');
    expect(swap.toValue.value).toBe('34');
    expect(swap.areTokensSelected.value).toBe(true);
  });

  it('exposes zero-amount helpers', () => {
    const store = useSwapStore();
    const swap = useSwapAmounts();

    store.setFromValue('0');
    store.setToValue('');

    expect(swap.isZeroFromAmount.value).toBe(true);
    expect(swap.isZeroToAmount.value).toBe(true);
    expect(swap.hasZeroAmount.value).toBe(true);
    expect(swap.areZeroAmounts.value).toBe(true);
  });

  it('passes through setter helpers', () => {
    const store = useSwapStore();
    const swap = useSwapAmounts();

    swap.setTokenFromAddress('foo');
    swap.setTokenToAddress('bar');
    swap.setFromValue('10');
    swap.setToValue('20');

    expect(store.tokenFromAddress).toBe('foo');
    expect(store.tokenToAddress).toBe('bar');
    expect(store.fromValue).toBe('10');
    expect(store.toValue).toBe('20');
  });
});
