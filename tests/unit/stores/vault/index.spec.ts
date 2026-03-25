import { FPNumber } from '@sora-substrate/math';
import { DAI, XOR, KUSD } from '@sora-substrate/sdk/build/assets/consts';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const shared = vi.hoisted(() => {
  const walletStore = {
    isLoggedIn: true,
    accountAssetsAddressTable: {} as Record<string, unknown>,
    address: 'account-1',
  };

  const assetsStore = {
    assetDataByAddress: vi.fn((address?: string) => (address ? null : null)),
  };

  const balanceAdd = vi.fn();
  const balanceRemove = vi.fn();
  const balanceReset = vi.fn();
  const collateralsUnsubscribe = vi.fn();
  const stablecoinInfosUnsubscribe = vi.fn();
  const averagePriceUnsubscribe = vi.fn();
  const accountVaultIdsUnsubscribe = vi.fn();
  const accountVaultsUnsubscribe = vi.fn();
  const borrowTaxesUnsubscribe = vi.fn();
  const blockNumberUnsubscribe = vi.fn();
  const fetchClosedVaults = vi.fn(async () => [{ id: 'closed-1' }]);
  const getCollaterals = vi.fn(async () => ({
    'collateral,debt': { liquidationRatio: 150 } as any,
  }));
  const subscribeOnStablecoinInfos = vi.fn(async () => ({
    subscribe: (callback: (infos: Record<string, unknown>) => void) => {
      callback({ debt: { pegAsset: 'peg' } });
      return { unsubscribe: stablecoinInfosUnsubscribe };
    },
  }));
  const subscribeOnAveragePrice = vi.fn(() => ({
    subscribe: (callback: (price: FPNumber) => void) => {
      callback(FPNumber.fromNatural(2));
      return { unsubscribe: averagePriceUnsubscribe };
    },
  }));
  const subscribeOnAccountVaultIds = vi.fn(() => ({
    subscribe: (callback: (ids: number[]) => void) => {
      callback([1]);
      return { unsubscribe: accountVaultIdsUnsubscribe };
    },
  }));
  const subscribeOnVaults = vi.fn(() => ({
    subscribe: (callback: (vaults: any[]) => void) => {
      callback([
        {
          id: 1,
          lockedAssetId: 'collateral',
          debtAssetId: 'debt',
          debt: FPNumber.fromNatural(5),
        },
      ]);
      return { unsubscribe: accountVaultsUnsubscribe };
    },
  }));
  const subscribeOnBorrowTaxes = vi.fn(() => ({
    subscribe: (callback: (taxes: Record<string, number>) => void) => {
      callback({ borrowTax: 5, tbcdBorrowTax: 10, karmaBorrowTax: 15 });
      return { unsubscribe: borrowTaxesUnsubscribe };
    },
  }));
  const getLiquidationPenalty = vi.fn(async () => 15);
  const calcTax = vi.fn((_: unknown, borrowTax: number, tbcdBorrowTax: number, karmaBorrowTax: number) => {
    return borrowTax + tbcdBorrowTax + karmaBorrowTax;
  });
  const calcNewDebt = vi.fn(() => FPNumber.fromNatural(7));
  const serializeKey = vi.fn((lockedAssetId: string, debtAssetId: string) => `${lockedAssetId},${debtAssetId}`);
  const deserializeKey = vi.fn((key: string) => {
    const [lockedAssetId, debtAssetId] = key.split(',');
    return { lockedAssetId, debtAssetId };
  });
  const getBlockNumberObservable = vi.fn(() => ({
    subscribe: (callback: (value: number) => void) => {
      callback(1);
      return { unsubscribe: blockNumberUnsubscribe };
    },
  }));

  return {
    walletStore,
    assetsStore,
    balanceAdd,
    balanceRemove,
    balanceReset,
    collateralsUnsubscribe,
    stablecoinInfosUnsubscribe,
    averagePriceUnsubscribe,
    accountVaultIdsUnsubscribe,
    accountVaultsUnsubscribe,
    borrowTaxesUnsubscribe,
    blockNumberUnsubscribe,
    fetchClosedVaults,
    getCollaterals,
    subscribeOnStablecoinInfos,
    subscribeOnAveragePrice,
    subscribeOnAccountVaultIds,
    subscribeOnVaults,
    subscribeOnBorrowTaxes,
    getLiquidationPenalty,
    calcTax,
    calcNewDebt,
    serializeKey,
    deserializeKey,
    getBlockNumberObservable,
  };
});

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => shared.walletStore,
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => shared.assetsStore,
}));

vi.mock('@/indexer/queries/vault/vaults', () => ({
  fetchClosedVaults: shared.fetchClosedVaults,
}));

vi.mock('@/utils/subscriptions', () => ({
  TokenBalanceSubscriptions: class {
    add = shared.balanceAdd;
    remove = shared.balanceRemove;
    resetSubscriptions = shared.balanceReset;
  },
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');

  return createWalletMock({
    api: {
      kensetsu: {
        getCollaterals: shared.getCollaterals,
        subscribeOnStablecoinInfos: shared.subscribeOnStablecoinInfos,
        subscribeOnAveragePrice: shared.subscribeOnAveragePrice,
        subscribeOnAccountVaultIds: shared.subscribeOnAccountVaultIds,
        subscribeOnVaults: shared.subscribeOnVaults,
        subscribeOnBorrowTaxes: shared.subscribeOnBorrowTaxes,
        getLiquidationPenalty: shared.getLiquidationPenalty,
        calcTax: shared.calcTax,
        calcNewDebt: shared.calcNewDebt,
        serializeKey: shared.serializeKey,
        deserializeKey: shared.deserializeKey,
      },
      system: {
        getBlockNumberObservable: shared.getBlockNumberObservable,
      },
    },
  });
});

import { useVaultStore } from '@/stores/vault';

describe('vault store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    shared.walletStore.isLoggedIn = true;
    shared.walletStore.accountAssetsAddressTable = {};
    shared.walletStore.address = 'account-1';
    shared.assetsStore.assetDataByAddress.mockReset();
    shared.assetsStore.assetDataByAddress.mockImplementation((address?: string) => {
      switch (address) {
        case XOR.address:
          return { address: XOR.address, symbol: 'XOR', decimals: 18 };
        case KUSD.address:
          return { address: KUSD.address, symbol: 'KUSD', decimals: 18 };
        case 'collateral':
          return { address: 'collateral', symbol: 'COL', decimals: 18 };
        case 'debt':
          return { address: 'debt', symbol: 'DEBT', decimals: 18 };
        default:
          return null;
      }
    });
    shared.balanceAdd.mockClear();
    shared.balanceRemove.mockClear();
    shared.balanceReset.mockClear();
    shared.collateralsUnsubscribe.mockClear();
    shared.stablecoinInfosUnsubscribe.mockClear();
    shared.averagePriceUnsubscribe.mockClear();
    shared.accountVaultIdsUnsubscribe.mockClear();
    shared.accountVaultsUnsubscribe.mockClear();
    shared.borrowTaxesUnsubscribe.mockClear();
    shared.blockNumberUnsubscribe.mockClear();
    shared.fetchClosedVaults.mockClear();
    shared.getCollaterals.mockClear();
    shared.subscribeOnStablecoinInfos.mockClear();
    shared.subscribeOnAveragePrice.mockClear();
    shared.subscribeOnAccountVaultIds.mockClear();
    shared.subscribeOnVaults.mockClear();
    shared.subscribeOnBorrowTaxes.mockClear();
    shared.getLiquidationPenalty.mockClear();
    shared.calcTax.mockClear();
    shared.calcNewDebt.mockClear();
    shared.serializeKey.mockClear();
    shared.deserializeKey.mockClear();
    shared.getBlockNumberObservable.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('derives selected vault assets and borrow tax from local pinia state', async () => {
    const store = useVaultStore();

    await store.setCollateralTokenAddress('collateral');
    await store.setDebtTokenAddress('debt');
    store.collateralTokenBalance = { transferable: '10' } as any;
    store.debtTokenBalance = { transferable: '5' } as any;
    store.averageCollateralPrices = { 'collateral,debt': FPNumber.fromNatural(3) };
    store.borrowTax = 0.05;
    store.tbcdBorrowTax = 0.1;
    store.karmaBorrowTax = 0.15;

    expect(store.collateralToken).toEqual({
      address: 'collateral',
      symbol: 'COL',
      decimals: 18,
      balance: { transferable: '10' },
    });
    expect(store.debtToken).toEqual({
      address: 'debt',
      symbol: 'DEBT',
      decimals: 18,
      balance: { transferable: '5' },
    });
    expect(store.averageCollateralPrice?.toNumber()).toBe(3);
    expect(store.getBorrowTax('debt')).toBeCloseTo(0.3);
    expect(shared.calcTax).toHaveBeenCalledWith('debt', 0.05, 0.1, 0.15);
  });

  it('subscribes vault state through native pinia actions', async () => {
    const store = useVaultStore();

    await store.setCollateralTokenAddress('collateral');
    await store.setDebtTokenAddress('debt');
    await store.subscribeOnCollaterals();
    await Promise.resolve();
    await Promise.resolve();
    await store.subscribeOnAccountVaults();
    await store.subscribeOnBorrowTaxes();
    await store.getLiquidationPenalty();

    expect(shared.balanceAdd).toHaveBeenCalledWith(
      'collateral',
      expect.objectContaining({ token: expect.objectContaining({ address: 'collateral' }) })
    );
    expect(shared.balanceAdd).toHaveBeenCalledWith(
      'debt',
      expect.objectContaining({ token: expect.objectContaining({ address: 'debt' }) })
    );
    expect(shared.fetchClosedVaults).toHaveBeenCalledWith('account-1');
    expect(store.closedAccountVaults).toEqual([{ id: 'closed-1' }]);
    expect(store.collaterals).toEqual({ 'collateral,debt': { liquidationRatio: 150 } });
    expect(store.averageCollateralPrices['collateral,debt']?.toNumber()).toBe(2);
    expect(store.accountVaults).toEqual([
      {
        id: 1,
        lockedAssetId: 'collateral',
        debtAssetId: 'debt',
        debt: FPNumber.fromNatural(5),
      },
    ]);
    expect(store.stablecoinInfos).toEqual({ debt: { pegAsset: 'peg' } });
    expect(store.borrowTax).toBe(0.05);
    expect(store.tbcdBorrowTax).toBe(0.1);
    expect(store.karmaBorrowTax).toBe(0.15);
    expect(store.liquidationPenalty).toBe(15);
  });

  it('recalculates vault debt on interval and resets subscriptions/state', async () => {
    vi.useFakeTimers();

    const store = useVaultStore();

    await store.subscribeOnCollaterals();
    await Promise.resolve();
    await Promise.resolve();
    await store.subscribeOnAccountVaults();
    await store.subscribeOnBorrowTaxes();
    await store.subscribeOnDebtCalculation();

    vi.advanceTimersByTime(6_000);

    expect(shared.calcNewDebt).toHaveBeenCalledWith(
      { liquidationRatio: 150 },
      expect.objectContaining({ lockedAssetId: 'collateral', debtAssetId: 'debt' })
    );
    expect((store.accountVaults[0] as any).debt.toNumber()).toBe(7);

    await store.reset();

    expect(shared.balanceRemove).toHaveBeenCalledWith('debt');
    expect(shared.balanceRemove).toHaveBeenCalledWith('collateral');
    expect(shared.blockNumberUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.stablecoinInfosUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.accountVaultIdsUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.accountVaultsUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.borrowTaxesUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.averagePriceUnsubscribe).toHaveBeenCalledTimes(1);
    expect(store.collateralAddress).toBe(XOR.address);
    expect(store.debtAddress).toBe(KUSD.address);
    expect(store.collaterals).toEqual({});
    expect(store.accountVaults).toEqual([]);
    expect(store.averageCollateralPrices[`${DAI.address},${KUSD.address}`]?.toNumber()).toBe(1);
  });
});
