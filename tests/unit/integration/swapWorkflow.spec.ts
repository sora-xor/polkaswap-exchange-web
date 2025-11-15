import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as walletModuleExports from '@wallet';

import { useSwapAmounts } from '@/composables/useSwapAmounts';
import { useSwapStore } from '@/stores/swap';

const walletModule = (walletModuleExports as { default?: any }).default ?? walletModuleExports;

const { localStorageMock } = vi.hoisted(() => {
  const storage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  vi.stubGlobal('localStorage', storage);

  return { localStorageMock: storage };
});

const assetDataByAddress = vi.hoisted(() =>
  vi.fn((address: string) => ({
    address,
    symbol: address.toUpperCase(),
    decimals: 18,
    balance: {
      transferable: '0',
    },
  }))
);

vi.mock('@sora-substrate/sdk/build/dex/consts', () => ({
  DexId: { XOR: 0 },
}));

vi.mock('@wallet', async () => {
  const { createWalletMock, withWalletMock } = await import('@tests/stubs/createWalletMock');
  const wallet = createWalletMock();

  return withWalletMock(wallet, {
    api: {
      ...wallet.api,
      divideAssets: vi.fn(() => '0'),
      swap: {
        ...(wallet.api.swap ?? {}),
        getDexesSwapQuoteObservable: vi.fn(),
        getPriceImpact: vi.fn(() => '0'),
        getMinMaxValue: vi.fn(() => '0'),
      },
    },
    storage: {
      ...wallet.storage,
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
    settingsStorage: {
      ...wallet.settingsStorage,
      set: vi.fn(),
      get: vi.fn(() => null),
    },
  });
});

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
        assetDataByAddress,
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
    assetDataByAddress.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    const walletApi = vi.mocked(walletModule.api);
    walletApi.divideAssets.mockReturnValue('0');
    walletApi.swap.getDexesSwapQuoteObservable.mockReturnValue(undefined as any);
    walletApi.swap.getPriceImpact.mockReturnValue('0');
    walletApi.swap.getMinMaxValue.mockReturnValue('0');
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('keeps composable state in sync when switching tokens', async () => {
    const store = useSwapStore();

    store.updateTokenSubscription = vi.fn();

    store.setTokenFromAddress('token-a');
    await nextTick();
    store.setTokenToAddress('token-b');
    await nextTick();
    await nextTick();
    await nextTick();

    const amounts = useSwapAmounts();
    await nextTick();

    expect(store.tokenFromAddress).toBe('token-a');
    expect(store.tokenToAddress).toBe('token-b');
    expect(store.tokenFrom?.symbol).toBe('TOKEN-A');
    expect(store.tokenTo?.symbol).toBe('TOKEN-B');
    expect(amounts.tokenFrom.value?.symbol).toBe('TOKEN-A');
    expect(amounts.tokenTo.value?.symbol).toBe('TOKEN-B');

    await store.switchTokens();
    await nextTick();
    await nextTick();
    await nextTick();
    await nextTick();
    const storeSymbols = [store.tokenFrom?.symbol, store.tokenTo?.symbol];
    const amountSymbols = [amounts.tokenFrom.value?.symbol, amounts.tokenTo.value?.symbol];

    expect(store.tokenFromAddress).toBe('token-b');
    expect(store.tokenToAddress).toBe('token-a');
    expect(store.$state.tokenFromCache?.symbol).toBe('TOKEN-B');
    expect(storeSymbols).toEqual(['TOKEN-B', 'TOKEN-A']);
    expect(amountSymbols).toEqual(['TOKEN-B', 'TOKEN-A']);
  });
});
