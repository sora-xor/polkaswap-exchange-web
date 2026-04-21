import { FPNumber as MathFPNumber } from '@sora-substrate/math';
import { FPNumber as SDKFPNumber } from '@sora-substrate/sdk';
import { createPinia, setActivePinia } from 'pinia';
import { ReplaySubject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePoolStore } from '@/stores/pool';

const shared = vi.hoisted(() => {
  const walletStore = {
    isLoggedIn: true,
    accountAssetsAddressTable: {} as Record<string, unknown>,
  };

  const settingsStore = {
    slippageTolerance: '0.01',
  };

  const assetsStore = {
    assetDataByAddress: vi.fn((address?: string) => (address ? null : null)),
  };

  const demeterFarmingStore = {
    getLockedAmount: vi.fn(() => SDKFPNumber.ZERO),
  };

  const balanceAdd = vi.fn();
  const balanceRemove = vi.fn();

  const userPoolsUnsubscribe = vi.fn();
  const poolUpdatesUnsubscribe = vi.fn();
  const lockedLiquidityUnsubscribe = vi.fn();
  const availabilityUnsubscribe = vi.fn();
  const reservesUnsubscribe = vi.fn();
  const totalSupplyUnsubscribe = vi.fn();
  const poolApyUnsubscribe = vi.fn();

  const divideAssets = vi.fn((_a, _b, first: string, second: string, reversed: boolean) =>
    reversed ? `${second}/${first}` : `${first}/${second}`
  );
  const estimatePoolTokensMinted = vi.fn(() => ['10']);
  const add = vi.fn(async () => undefined);
  const create = vi.fn(async () => undefined);
  const remove = vi.fn(async () => undefined);
  const getUserPoolsSubscription = vi.fn(() => ({ unsubscribe: userPoolsUnsubscribe }));
  const unsubscribeFromAllUpdates = vi.fn();
  const getPoolPropertiesObservable = vi.fn(() => ({
    subscribe: (callback: (value: unknown) => void) => {
      callback(true);
      return { unsubscribe: availabilityUnsubscribe };
    },
  }));
  const getReservesObservable = vi.fn(() => ({
    subscribe: (callback: (value: string[]) => void) => {
      callback(['100', '200']);
      return { unsubscribe: reservesUnsubscribe };
    },
  }));
  const getTotalSupplyObservable = vi.fn(() => ({
    subscribe: (callback: (value: string) => void) => {
      callback('300');
      return { unsubscribe: totalSupplyUnsubscribe };
    },
  }));
  let accountLiquidityLoaded: {
    subscribe: (observer: ((value: boolean) => void) | { next?: (value: boolean) => void; complete?: () => void }) => {
      unsubscribe: ReturnType<typeof vi.fn>;
    };
  } = {
    subscribe: (observer: ((value: boolean) => void) | { next?: (value: boolean) => void; complete?: () => void }) => {
      if (typeof observer === 'function') {
        observer(true);
      } else {
        observer.next?.(true);
        observer.complete?.();
      }
      return { unsubscribe: vi.fn() };
    },
  };
  const updated = {
    subscribe: (callback: () => void) => {
      callback();
      return { unsubscribe: poolUpdatesUnsubscribe };
    },
  };
  let accountLiquidity: Array<any> = [
    {
      firstAddress: 'base',
      secondAddress: 'quote',
      balance: '40000000000000000000',
      totalSupply: '100000000000000000000',
      reserveA: '50000000000000000000',
      reserveB: '80000000000000000000',
      firstBalance: '20000000000000000000',
      secondBalance: '32000000000000000000',
    },
  ];

  const getLockerDataObservable = vi.fn(() => ({
    subscribe: (callback: (data: Array<any>) => void) => {
      callback([{ assetA: 'base', assetB: 'quote', poolTokens: MathFPNumber.fromNatural(5) }]);
      return { unsubscribe: lockedLiquidityUnsubscribe };
    },
  }));

  const getAssetInfo = vi.fn(async (address: string) => ({ address }));

  const getPoolsApyObject = vi.fn(async () => ({ '0xpool': '0.12' }));
  const createPoolsApySubscription = vi.fn((handler: (value: Record<string, string>) => void) => {
    handler({ '0xpool': '0.25' });
    return poolApyUnsubscribe;
  });
  const dexUpdate = vi.fn(async () => undefined);
  const waitUntil = vi.fn(async (condition: () => boolean) => {
    if (!condition()) {
      throw new Error('waitUntil predicate was not satisfied in the pool store test');
    }
  });
  let baseAssetsIds = ['base'];

  return {
    walletStore,
    settingsStore,
    assetsStore,
    demeterFarmingStore,
    balanceAdd,
    balanceRemove,
    userPoolsUnsubscribe,
    poolUpdatesUnsubscribe,
    lockedLiquidityUnsubscribe,
    availabilityUnsubscribe,
    reservesUnsubscribe,
    totalSupplyUnsubscribe,
    poolApyUnsubscribe,
    divideAssets,
    estimatePoolTokensMinted,
    add,
    create,
    remove,
    getUserPoolsSubscription,
    unsubscribeFromAllUpdates,
    getPoolPropertiesObservable,
    getReservesObservable,
    getTotalSupplyObservable,
    get accountLiquidityLoaded() {
      return accountLiquidityLoaded;
    },
    set accountLiquidityLoaded(value) {
      accountLiquidityLoaded = value;
    },
    updated,
    getLockerDataObservable,
    getAssetInfo,
    getPoolsApyObject,
    createPoolsApySubscription,
    dexUpdate,
    waitUntil,
    get baseAssetsIds() {
      return baseAssetsIds;
    },
    set baseAssetsIds(value: string[]) {
      baseAssetsIds = value;
    },
    get accountLiquidity() {
      return accountLiquidity;
    },
    set accountLiquidity(value: Array<any>) {
      accountLiquidity = value;
    },
  };
});

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => shared.walletStore,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => shared.settingsStore,
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => shared.assetsStore,
}));

vi.mock('@/stores/demeterFarming', () => ({
  useDemeterFarmingStore: () => shared.demeterFarmingStore,
}));

vi.mock('@/utils', async () => {
  const actual = await vi.importActual<typeof import('@/utils')>('@/utils');

  return {
    ...actual,
    waitForAccountPair: async (fn?: () => Promise<void> | void) => await fn?.(),
    waitUntil: shared.waitUntil,
  };
});

vi.mock('@/utils/subscriptions', () => ({
  TokenBalanceSubscriptions: class {
    add = shared.balanceAdd;
    remove = shared.balanceRemove;
  },
}));

vi.mock('@/indexer/queries/pool/apy', () => ({
  getPoolsApyObject: shared.getPoolsApyObject,
  createPoolsApySubscription: shared.createPoolsApySubscription,
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    divideAssets: shared.divideAssets,
    dex: {
      update: shared.dexUpdate,
      get baseAssetsIds() {
        return shared.baseAssetsIds;
      },
    },
    poolXyk: {
      estimatePoolTokensMinted: shared.estimatePoolTokensMinted,
      add: shared.add,
      create: shared.create,
      remove: shared.remove,
      getUserPoolsSubscription: shared.getUserPoolsSubscription,
      unsubscribeFromAllUpdates: shared.unsubscribeFromAllUpdates,
      getPoolPropertiesObservable: shared.getPoolPropertiesObservable,
      getReservesObservable: shared.getReservesObservable,
      getTotalSupplyObservable: shared.getTotalSupplyObservable,
      accountLiquidityLoaded: shared.accountLiquidityLoaded,
      updated: shared.updated,
      get accountLiquidity() {
        return shared.accountLiquidity;
      },
    },
    ceresLiquidityLocker: {
      getLockerDataObservable: shared.getLockerDataObservable,
    },
    assets: {
      getAssetInfo: shared.getAssetInfo,
    },
  },
}));

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');

  return createWalletMock({
    api: {
      divideAssets: shared.divideAssets,
      dex: {
        update: shared.dexUpdate,
        get baseAssetsIds() {
          return shared.baseAssetsIds;
        },
      },
      poolXyk: {
        estimatePoolTokensMinted: shared.estimatePoolTokensMinted,
        add: shared.add,
        create: shared.create,
        remove: shared.remove,
        getUserPoolsSubscription: shared.getUserPoolsSubscription,
        unsubscribeFromAllUpdates: shared.unsubscribeFromAllUpdates,
        getPoolPropertiesObservable: shared.getPoolPropertiesObservable,
        getReservesObservable: shared.getReservesObservable,
        getTotalSupplyObservable: shared.getTotalSupplyObservable,
        accountLiquidityLoaded: shared.accountLiquidityLoaded,
        updated: shared.updated,
        get accountLiquidity() {
          return shared.accountLiquidity;
        },
      },
      ceresLiquidityLocker: {
        getLockerDataObservable: shared.getLockerDataObservable,
      },
      assets: {
        getAssetInfo: shared.getAssetInfo,
      },
    },
  });
});

describe('pool store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    shared.walletStore.isLoggedIn = true;
    shared.walletStore.accountAssetsAddressTable = {};
    shared.settingsStore.slippageTolerance = '0.01';
    shared.assetsStore.assetDataByAddress.mockReset();
    shared.assetsStore.assetDataByAddress.mockImplementation((address?: string) => {
      switch (address) {
        case 'base':
          return { address: 'base', symbol: 'BASE', decimals: 18 };
        case 'quote':
          return { address: 'quote', symbol: 'QUOTE', decimals: 18 };
        default:
          return null;
      }
    });
    shared.demeterFarmingStore.getLockedAmount.mockReset();
    shared.demeterFarmingStore.getLockedAmount.mockReturnValue(SDKFPNumber.ZERO);
    shared.balanceAdd.mockClear();
    shared.balanceRemove.mockClear();
    shared.userPoolsUnsubscribe.mockClear();
    shared.poolUpdatesUnsubscribe.mockClear();
    shared.lockedLiquidityUnsubscribe.mockClear();
    shared.availabilityUnsubscribe.mockClear();
    shared.reservesUnsubscribe.mockClear();
    shared.totalSupplyUnsubscribe.mockClear();
    shared.poolApyUnsubscribe.mockClear();
    shared.divideAssets.mockClear();
    shared.estimatePoolTokensMinted.mockClear();
    shared.add.mockClear();
    shared.create.mockClear();
    shared.remove.mockClear();
    shared.getUserPoolsSubscription.mockClear();
    shared.unsubscribeFromAllUpdates.mockClear();
    shared.getPoolPropertiesObservable.mockClear();
    shared.getReservesObservable.mockClear();
    shared.getTotalSupplyObservable.mockClear();
    shared.getLockerDataObservable.mockClear();
    shared.getAssetInfo.mockClear();
    shared.getPoolsApyObject.mockClear();
    shared.createPoolsApySubscription.mockClear();
    shared.dexUpdate.mockClear();
    shared.waitUntil.mockReset();
    shared.waitUntil.mockImplementation(async (condition: () => boolean) => {
      if (!condition()) {
        throw new Error('waitUntil predicate was not satisfied in the pool store test');
      }
    });
    shared.baseAssetsIds = ['base'];
    const codec = (value: number) => SDKFPNumber.fromNatural(value).toCodecString();

    shared.accountLiquidity = [
      {
        firstAddress: 'base',
        secondAddress: 'quote',
        balance: codec(40),
        totalSupply: codec(100),
        reserveA: codec(50),
        reserveB: codec(80),
        firstBalance: codec(20),
        secondBalance: codec(32),
      },
    ];
  });

  it('derives native pool, add-liquidity, and remove-liquidity state through Pinia', async () => {
    const store = usePoolStore();

    store.accountLiquidity = shared.accountLiquidity as any;
    store.accountLockedLiquidity = [
      { assetA: 'base', assetB: 'quote', poolTokens: MathFPNumber.fromNatural(5) },
    ] as any;
    store.addLiquidity.firstTokenAddress = 'base';
    store.addLiquidity.secondTokenAddress = 'quote';
    store.addLiquidity.firstTokenValue = '10';
    store.addLiquidity.secondTokenValue = '20';
    store.addLiquidity.firstTokenBalance = { transferable: '100' } as any;
    store.addLiquidity.secondTokenBalance = { transferable: '200' } as any;
    store.addLiquidity.reserve = ['100', '200'];
    store.addLiquidity.totalSupply = '300';
    store.addLiquidity.isAvailable = true;
    store.removeLiquidity.firstTokenAddress = 'base';
    store.removeLiquidity.secondTokenAddress = 'quote';
    store.removeLiquidity.removePart = '25';
    store.removeLiquidity.liquidityAmount = '10';
    store.removeLiquidity.firstTokenAmount = '5';
    store.removeLiquidity.secondTokenAmount = '8';

    expect(store.getLockedAmount('base', 'quote').toNumber()).toBe(5);
    expect(store.addLiquidityFirstTokenValue).toBe('10');
    expect(store.addLiquiditySecondTokenValue).toBe('20');
    expect(store.addLiquidityFirstToken).toEqual({
      address: 'base',
      symbol: 'BASE',
      decimals: 18,
      balance: { transferable: '100' },
    });
    expect(store.addLiquiditySecondToken).toEqual({
      address: 'quote',
      symbol: 'QUOTE',
      decimals: 18,
      balance: { transferable: '200' },
    });
    expect(store.addLiquidityIsAvailable).toBe(true);
    expect(store.addLiquidityLiquidityInfo).toEqual(shared.accountLiquidity[0]);
    expect(store.addLiquidityPrice).toBe('10/20');
    expect(store.addLiquidityPriceReversed).toBe('20/10');
    expect(store.removeLiquidityLiquidity).toEqual(shared.accountLiquidity[0]);
    expect(store.removeLiquidityFirstToken?.symbol).toBe('BASE');
    expect(store.removeLiquiditySecondToken?.symbol).toBe('QUOTE');
    expect(store.removeLiquidityPrice).toBe(
      `${shared.accountLiquidity[0].firstBalance}/${shared.accountLiquidity[0].secondBalance}`
    );
    expect(store.removeLiquidityPriceReversed).toBe(
      `${shared.accountLiquidity[0].secondBalance}/${shared.accountLiquidity[0].firstBalance}`
    );
  });

  it('subscribes native pool state and strategic apy without the legacy bridge', async () => {
    const store = usePoolStore();

    await store.subscribeOnAccountLiquidityList();
    await store.subscribeOnAccountLiquidityUpdates();
    await store.subscribeOnAccountLockedLiquidity();
    await store.subscribeOnPoolsApy();

    expect(shared.getUserPoolsSubscription).toHaveBeenCalledTimes(1);
    expect(store.accountLiquidity).toEqual(shared.accountLiquidity);
    expect(shared.getLockerDataObservable).toHaveBeenCalledTimes(1);
    expect(store.accountLockedLiquidity).toEqual([
      { assetA: 'base', assetB: 'quote', poolTokens: MathFPNumber.fromNatural(5) },
    ]);
    expect(shared.getPoolsApyObject).toHaveBeenCalledTimes(1);
    expect(shared.createPoolsApySubscription).toHaveBeenCalledTimes(1);
    expect(store.poolApyObject).toEqual({ '0xpool': '0.25' });

    await store.unsubscribeAccountLiquidityListAndUpdates();

    expect(shared.userPoolsUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.poolUpdatesUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.lockedLiquidityUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.poolApyUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.unsubscribeFromAllUpdates).toHaveBeenCalledTimes(1);
    expect(store.accountLiquidity).toEqual([]);
    expect(store.accountLockedLiquidity).toEqual([]);
    expect(store.poolApyObject).toEqual({});
  });

  it('waits for dex base assets before subscribing to account liquidity data', async () => {
    const store = usePoolStore();

    shared.baseAssetsIds = [];
    shared.waitUntil.mockImplementationOnce(async (condition: () => boolean) => {
      expect(condition()).toBe(false);
      shared.baseAssetsIds = ['base'];
      expect(condition()).toBe(true);
    });

    await store.subscribeOnAccountLiquidityList();

    expect(shared.waitUntil).toHaveBeenCalledTimes(1);
    expect(shared.getUserPoolsSubscription).toHaveBeenCalledTimes(1);
    expect(store.accountLiquidity).toEqual(shared.accountLiquidity);

    shared.baseAssetsIds = [];
    shared.waitUntil.mockImplementationOnce(async (condition: () => boolean) => {
      expect(condition()).toBe(false);
      shared.baseAssetsIds = ['base'];
      expect(condition()).toBe(true);
    });

    await store.subscribeOnAccountLiquidityUpdates();

    expect(shared.waitUntil).toHaveBeenCalledTimes(2);
    expect(store.accountLiquidity).toEqual(shared.accountLiquidity);
  });

  it('hydrates account liquidity when the initial loaded signal completes before the store awaits it', async () => {
    const store = usePoolStore();

    shared.getUserPoolsSubscription.mockImplementationOnce(() => {
      const loaded = new ReplaySubject<void>(1);
      shared.accountLiquidityLoaded = loaded as unknown as typeof shared.accountLiquidityLoaded;
      loaded.next();
      loaded.complete();
      return { unsubscribe: shared.userPoolsUnsubscribe };
    });

    await store.subscribeOnAccountLiquidityList();

    expect(shared.getUserPoolsSubscription).toHaveBeenCalledTimes(1);
    expect(store.accountLiquidity).toEqual(shared.accountLiquidity);
  });

  it('updates add-liquidity values and dispatches pool add/create calls natively', async () => {
    const store = usePoolStore();

    await store.setAddLiquidityFirstTokenAddress('base');
    await store.setAddLiquiditySecondTokenAddress('quote');
    await store.setAddLiquiditySecondTokenValue('20');

    expect(store.addLiquidityFirstToken?.address).toBe('base');
    expect(store.addLiquiditySecondToken?.address).toBe('quote');
    expect(shared.balanceAdd).toHaveBeenCalledWith(
      'firstTokenValue',
      expect.objectContaining({ token: expect.objectContaining({ address: 'base' }) })
    );
    expect(shared.balanceAdd).toHaveBeenCalledWith(
      'secondTokenValue',
      expect.objectContaining({ token: expect.objectContaining({ address: 'quote' }) })
    );
    expect(store.addLiquidityIsAvailable).toBe(true);
    expect(store.addLiquidityFirstTokenValue).toBe('10');

    await store.submitAddLiquidity();

    expect(shared.add).toHaveBeenCalledWith(
      expect.objectContaining({ address: 'base' }),
      expect.objectContaining({ address: 'quote' }),
      '10',
      '20',
      '0.01'
    );

    store.addLiquidity.isAvailable = false;
    await store.submitAddLiquidity();

    expect(shared.create).toHaveBeenCalledTimes(1);

    await store.setAddLiquidityDataFromLiquidity({ firstAddress: 'base', secondAddress: 'quote' });
    expect(shared.getAssetInfo).toHaveBeenCalledWith('base');
    expect(shared.getAssetInfo).toHaveBeenCalledWith('quote');

    await store.resetAddLiquidityData();
    expect(store.addLiquidity.firstTokenAddress).toBe('');
    expect(store.addLiquidity.secondTokenAddress).toBe('');
  });

  it('updates remove-liquidity amounts and dispatches native remove calls', async () => {
    const store = usePoolStore();
    store.accountLiquidity = shared.accountLiquidity as any;
    store.setRemoveLiquidityAddresses({ firstAddress: 'base', secondAddress: 'quote' });

    await store.setRemoveLiquidityPart('50');

    expect(store.removeLiquidityLiquidityAmount).toBe('20');
    expect(store.removeLiquidityFirstTokenAmount).toBe('10');
    expect(store.removeLiquiditySecondTokenAmount).toBe('16');

    await store.setRemoveLiquidityFirstTokenAmount('5');
    await Promise.resolve();
    expect(store.removeLiquiditySecondTokenAmount).toBe('8');

    await store.submitRemoveLiquidity();

    expect(shared.remove).toHaveBeenCalledWith(
      expect.objectContaining({ address: 'base' }),
      expect.objectContaining({ address: 'quote' }),
      '10',
      shared.accountLiquidity[0].reserveA,
      shared.accountLiquidity[0].reserveB,
      shared.accountLiquidity[0].totalSupply,
      '0.01'
    );

    await store.resetRemoveLiquidityData();
    expect(store.removeLiquidityRemovePart).toBe('');
    expect(store.removeLiquidityLiquidityAmount).toBe('');
    expect(store.removeLiquidityFirstTokenAmount).toBe('');
    expect(store.removeLiquiditySecondTokenAmount).toBe('');
    expect(store.removeLiquidityFocusedField).toBeNull();
  });
});
