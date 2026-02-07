import { FPNumber } from '@sora-substrate/math';
import { createPinia, setActivePinia } from 'pinia';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSwapStore } from '@/stores/swap';
import { settingsStorage } from '@/utils/storage';
import { setLegacyStoreOverride } from '@/utils/legacy-store';

type SwapMathDeps = {
  store: ReturnType<typeof useSwapStore>;
  rootStore: ReturnType<typeof createLegacyStoreMock>;
};

vi.mock('@sora-substrate/sdk/build/dex/consts', () => ({
  DexId: { XOR: 0 },
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

const { walletApiMock, walletSettingsStorageMock, walletStorageMock } = vi.hoisted(() => {
  const api = {
    divideAssets: vi.fn(() => '0'),
    swap: {
      getDexesSwapQuoteObservable: vi.fn(),
      getPriceImpact: vi.fn(() => '0'),
      getMinMaxValue: vi.fn(() => '0'),
    },
    assets: {
      getAssetBalanceObservable: vi.fn(),
    },
  };

  const settingsStorage = {
    set: vi.fn(),
    get: vi.fn(() => null),
    remove: vi.fn(),
  };

  const storage = {
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
  };

  return {
    walletApiMock: api,
    walletSettingsStorageMock: settingsStorage,
    walletStorageMock: storage,
  };
});

function createLegacyStoreMock() {
  return {
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
  };
}

const resetLegacyStoreMock = () => {
  const next = createLegacyStoreMock();
  legacyStoreMock.state = next.state;
  legacyStoreMock.getters = next.getters;
  legacyStoreMock.commit = next.commit;
  legacyStoreMock.dispatch = next.dispatch;
};

const { legacyStoreMock } = vi.hoisted(() => ({
  legacyStoreMock: createLegacyStoreMock(),
}));

vi.mock('@wallet', async () => {
  const walletStub = await vi.importActual<typeof import('@tests/stubs/@wallet')>('@tests/stubs/@wallet');
  return {
    ...walletStub,
    api: walletApiMock,
    settingsStorage: walletSettingsStorageMock,
    storage: walletStorageMock,
    default: {
      ...(walletStub as { default?: Record<string, unknown> }).default,
      api: walletApiMock,
      settingsStorage: walletSettingsStorageMock,
      storage: walletStorageMock,
    },
  };
});

vi.mock('@/store', () => ({
  __esModule: true,
  default: legacyStoreMock,
}));

describe('swap store', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    resetLegacyStoreMock();
    setLegacyStoreOverride(legacyStoreMock as any);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  const setupSwapMath = async (): Promise<SwapMathDeps> => {
    const store = useSwapStore();
    const rootStore = legacyStoreMock;
    const wallet = await import('@wallet');
    const divideAssets = vi.mocked(wallet.api.divideAssets);
    const priceImpactMock = vi.mocked(wallet.api.swap.getPriceImpact);
    const minMaxMock = vi.mocked(wallet.api.swap.getMinMaxValue);

    divideAssets.mockImplementation(
      (tokenFrom: any, tokenTo: any, fromValue: string, toValue: string, reversed: boolean) => {
        const from = new FPNumber(fromValue || '0', tokenFrom?.decimals ?? 18);
        const to = new FPNumber(toValue || '0', tokenTo?.decimals ?? 18);

        if (from.isZero() || to.isZero()) return '0';

        const ratio = reversed ? from.div(to) : to.div(from);
        return ratio.toString();
      }
    );

    priceImpactMock.mockImplementation(
      (tokenFrom: any, tokenTo: any, fromValue: string, toValue: string, amountWithoutImpact: string) => {
        const to = new FPNumber(toValue || '0', tokenTo?.decimals ?? 18);
        const withoutImpact = new FPNumber(amountWithoutImpact || '0', tokenTo?.decimals ?? 18);
        if (to.isZero()) return '0';

        return to.sub(withoutImpact).div(to).toString();
      }
    );

    minMaxMock.mockImplementation(
      (
        tokenFrom: any,
        tokenTo: any,
        fromValue: string,
        toValue: string,
        isExchangeB: boolean,
        slippageTolerance: string
      ) => {
        const base = isExchangeB
          ? new FPNumber(fromValue || '0', tokenFrom?.decimals ?? 18)
          : new FPNumber(toValue || '0', tokenTo?.decimals ?? 18);
        const slippage = new FPNumber(slippageTolerance || '0');
        const factor = FPNumber.ONE.sub(slippage);
        return base.mul(factor).toString();
      }
    );

    return { store, rootStore };
  };

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
    const setSpy = vi.spyOn(settingsStorage, 'set');

    store.setAllowLossPopup(false);

    expect(store.allowLossPopup).toBe(false);
    expect(setSpy).toHaveBeenCalledWith('allowSwapLossPopup', false);
    setSpy.mockRestore();
  });

  it('derives price, reversed price, price impact, and min/max received with FPNumber precision', async () => {
    const { store, rootStore } = await setupSwapMath();

    const tokenFrom = { address: 'AAA', decimals: 12 };
    const tokenTo = { address: 'BBB', decimals: 18 };

    store.tokenFromAddress = tokenFrom.address;
    store.tokenToAddress = tokenTo.address;
    store.tokenFromCache = tokenFrom as any;
    store.tokenToCache = tokenTo as any;
    store.setFromValue('10');
    store.setToValue('5');
    store.setAmountWithoutImpact('4.8');
    store.setExchangeB(false);

    rootStore.state.settings.slippageTolerance = '0.01';

    const price = new FPNumber(store.price);
    const priceReversed = new FPNumber(store.priceReversed);
    const priceImpact = new FPNumber(store.priceImpact);
    const minMax = new FPNumber(store.minMaxReceived);

    const expectedPrice = new FPNumber('5', tokenTo.decimals).div(new FPNumber('10', tokenFrom.decimals));
    const expectedReversed = new FPNumber('10', tokenFrom.decimals).div(new FPNumber('5', tokenTo.decimals));
    const expectedImpact = new FPNumber('5').sub(new FPNumber('4.8')).div(new FPNumber('5'));
    const expectedMinMax = new FPNumber('5').mul(FPNumber.ONE.sub(new FPNumber('0.01')));

    expect(price.eq(expectedPrice)).toBe(true);
    expect(priceReversed.eq(expectedReversed)).toBe(true);
    expect(priceImpact.eq(expectedImpact)).toBe(true);
    expect(minMax.eq(expectedMinMax)).toBe(true);
  });

  it('maintains precision when swapping by output (exchange B) with heterogeneous decimals', async () => {
    const { store, rootStore } = await setupSwapMath();

    const tokenFrom = { address: 'CCC', decimals: 18 };
    const tokenTo = { address: 'DDD', decimals: 8 };

    store.tokenFromAddress = tokenFrom.address;
    store.tokenToAddress = tokenTo.address;
    store.tokenFromCache = tokenFrom as any;
    store.tokenToCache = tokenTo as any;
    store.setExchangeB(true);
    store.setFromValue('2.34567890123456789');
    store.setToValue('0.12345678');
    store.setAmountWithoutImpact('0.11845678');

    rootStore.state.settings.slippageTolerance = '0.005'; // 0.5%

    const price = new FPNumber(store.price, tokenTo.decimals);
    const priceReversed = new FPNumber(store.priceReversed, tokenFrom.decimals);
    const priceImpact = new FPNumber(store.priceImpact);
    const minMax = new FPNumber(store.minMaxReceived, tokenFrom.decimals);

    const expectedPrice = new FPNumber('0.12345678', tokenTo.decimals).div(
      new FPNumber('2.34567890123456789', tokenFrom.decimals)
    );
    const expectedReversed = new FPNumber('2.34567890123456789', tokenFrom.decimals).div(
      new FPNumber('0.12345678', tokenTo.decimals)
    );
    const expectedImpact = new FPNumber('0.12345678', tokenTo.decimals)
      .sub(new FPNumber('0.11845678', tokenTo.decimals))
      .div(new FPNumber('0.12345678', tokenTo.decimals));
    const expectedMinMax = new FPNumber('2.34567890123456789', tokenFrom.decimals).mul(
      FPNumber.ONE.sub(new FPNumber(rootStore.state.settings.slippageTolerance))
    );

    expect(price.eq(expectedPrice)).toBe(true);
    expect(priceReversed.eq(expectedReversed)).toBe(true);
    expect(priceImpact.eq(expectedImpact)).toBe(true);
    expect(minMax.eq(expectedMinMax)).toBe(true);
  });

  it('skips balance subscriptions when wallet API is unavailable', async () => {
    const { store } = await setupSwapMath();
    const wallet = await import('@wallet');
    const legacyStore = legacyStoreMock;

    legacyStore.getters.wallet.account.isLoggedIn = true;
    legacyStore.getters.wallet.account.accountAssetsAddressTable = {};

    store.tokenFromCache = { address: '0xTOKEN' } as any;

    const originalAssets = wallet.api.assets;

    // @ts-expect-error intentional to simulate missing API segment
    delete wallet.api.assets;

    expect(() => store.updateTokenSubscription('from')).not.toThrow();

    if (originalAssets === undefined) {
      delete wallet.api.assets;
    } else {
      wallet.api.assets = originalAssets;
    }
    store.resetSubscriptions();
    legacyStore.getters.wallet.account.isLoggedIn = false;
  });
});
