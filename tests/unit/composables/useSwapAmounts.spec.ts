import { createPinia, setActivePinia } from 'pinia';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { Storage } from '@sora-substrate/sdk';

const walletApiMock = {
  divideAssets: vi.fn(() => '0'),
  swap: {
    getDexesSwapQuoteObservable: vi.fn(),
    getPriceImpact: vi.fn(() => '0'),
    getMinMaxValue: vi.fn(() => '0'),
  },
};

const walletModuleMock = {
  api: walletApiMock,
  storage: new Storage('wallet-mock'),
  settingsStorage: new Storage('settings-mock'),
};

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock(walletModuleMock);
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

vi.mock('@/utils', () => ({ asZeroValue: (value: string) => !value || Number(value) === 0 }));

const TokenBalanceSubscriptionsMock = vi
  .fn(function TokenBalanceSubscriptionsStub(this: unknown) {
    return {
      add: vi.fn(),
      remove: vi.fn(),
    };
  })
  .mockName('TokenBalanceSubscriptionsMock');

vi.mock('@/utils/subscriptions', () => ({
  TokenBalanceSubscriptions: TokenBalanceSubscriptionsMock,
}));

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

describe('useSwapAmounts', () => {
  let useSwapAmounts: (typeof import('@/composables/useSwapAmounts'))['useSwapAmounts'];
  let useSwapStore: typeof import('@/stores/swap').useSwapStore;

  beforeAll(async () => {
    ({ useSwapAmounts } = await import('@/composables/useSwapAmounts'));
    ({ useSwapStore } = await import('@/stores/swap'));
  });

  beforeEach(async () => {
    setActivePinia(createPinia());
    assetDataByAddress.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    walletApiMock.divideAssets.mockReturnValue('0');
    walletApiMock.swap.getDexesSwapQuoteObservable.mockReturnValue(undefined as any);
    walletApiMock.swap.getPriceImpact.mockReturnValue('0');
    walletApiMock.swap.getMinMaxValue.mockReturnValue('0');
    (globalThis as Record<string, any>).__ASSETS_STORE_OVERRIDE = {
      assetDataByAddress,
      registeredAssets: {},
      registeredAssetsFetching: false,
    };
  });

  afterEach(() => {
    delete (globalThis as Record<string, any>).__ASSETS_STORE_OVERRIDE;
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('exposes swap store values as computeds', async () => {
    const store = useSwapStore();
    const swap = useSwapAmounts();

    store.setTokenFromAddress('token-a');
    store.setTokenToAddress('token-b');
    store.setFromValue('12');
    store.setToValue('34');
    await nextTick();

    expect(assetDataByAddress).toHaveBeenCalledWith('token-a');
    expect(assetDataByAddress).toHaveBeenCalledWith('token-b');
    expect(store.tokenFrom?.symbol).toBe('TOKEN-A');
    expect(store.tokenTo?.symbol).toBe('TOKEN-B');

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
