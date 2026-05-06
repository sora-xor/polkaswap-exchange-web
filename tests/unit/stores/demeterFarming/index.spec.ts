import { FPNumber } from '@sora-substrate/math';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const shared = vi.hoisted(() => {
  const walletStore = {
    isLoggedIn: true,
    assetsDataTable: {
      A: { address: 'A' },
      B: { address: 'B' },
      R: { address: 'R' },
    } as Record<string, Record<string, unknown>>,
  };
  const poolsUnsubscribe = vi.fn();
  const tokensUnsubscribe = vi.fn();
  const accountPoolsUnsubscribe = vi.fn();
  const getPoolsObservable = vi.fn(async () => ({
    subscribe: (callback: (value: unknown[]) => void) => {
      callback([{ baseAsset: 'A', poolAsset: 'B', rewardAsset: 'R', isFarm: true }]);
      return { unsubscribe: poolsUnsubscribe };
    },
  }));
  const getTokenInfosObservable = vi.fn(async () => ({
    subscribe: (callback: (value: unknown[]) => void) => {
      callback([{ assetId: 'R' }]);
      return { unsubscribe: tokensUnsubscribe };
    },
  }));
  const getAccountPoolsObservable = vi.fn(() => ({
    subscribe: (callback: (value: unknown[]) => void) => {
      callback([
        { baseAsset: 'A', poolAsset: 'B', rewardAsset: 'R', isFarm: true, pooledTokens: FPNumber.fromNatural(5) },
      ]);
      return { unsubscribe: accountPoolsUnsubscribe };
    },
  }));
  const depositLiquidity = vi.fn(async () => undefined);
  const stake = vi.fn(async () => undefined);
  const withdrawLiquidity = vi.fn(async () => undefined);
  const unstake = vi.fn(async () => undefined);
  const getRewards = vi.fn(async () => undefined);
  const waitForAccountPair = vi.fn(async () => undefined);

  return {
    walletStore,
    poolsUnsubscribe,
    tokensUnsubscribe,
    accountPoolsUnsubscribe,
    getPoolsObservable,
    getTokenInfosObservable,
    getAccountPoolsObservable,
    depositLiquidity,
    stake,
    withdrawLiquidity,
    unstake,
    getRewards,
    waitForAccountPair,
  };
});

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => shared.walletStore,
}));

vi.mock('@/utils', async () => {
  const actual = await vi.importActual<typeof import('@/utils')>('@/utils');
  return {
    ...actual,
    waitForAccountPair: shared.waitForAccountPair,
  };
});

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    api: {
      demeterFarming: {
        getPoolsObservable: shared.getPoolsObservable,
        getTokenInfosObservable: shared.getTokenInfosObservable,
        getAccountPoolsObservable: shared.getAccountPoolsObservable,
        depositLiquidity: shared.depositLiquidity,
        stake: shared.stake,
        withdrawLiquidity: shared.withdrawLiquidity,
        unstake: shared.unstake,
        getRewards: shared.getRewards,
      },
    },
  });
});

import { useDemeterFarmingStore } from '@/stores/demeterFarming';

describe('demeter farming store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    shared.walletStore.isLoggedIn = true;
    shared.walletStore.assetsDataTable = {
      A: { address: 'A' },
      B: { address: 'B' },
      R: { address: 'R' },
    };
    shared.poolsUnsubscribe.mockReset();
    shared.tokensUnsubscribe.mockReset();
    shared.accountPoolsUnsubscribe.mockReset();
    shared.getPoolsObservable.mockClear();
    shared.getTokenInfosObservable.mockClear();
    shared.getAccountPoolsObservable.mockClear();
    shared.depositLiquidity.mockReset();
    shared.stake.mockReset();
    shared.withdrawLiquidity.mockReset();
    shared.unstake.mockReset();
    shared.getRewards.mockReset();
    shared.waitForAccountPair.mockReset();
    shared.waitForAccountPair.mockResolvedValue(undefined);
  });

  it('subscribes demeter state through local pinia state', async () => {
    const store = useDemeterFarmingStore();

    await store.subscribeOnPools();
    await store.subscribeOnTokens();
    await store.subscribeOnAccountPools();

    expect(store.pools).toEqual([{ baseAsset: 'A', poolAsset: 'B', rewardAsset: 'R', isFarm: true }]);
    expect(store.tokens).toEqual([{ assetId: 'R' }]);
    expect(store.accountPools).toEqual([
      { baseAsset: 'A', poolAsset: 'B', rewardAsset: 'R', isFarm: true, pooledTokens: FPNumber.fromNatural(5) },
    ]);
    expect(store.getLockedAmount('A', 'B', true).toNumber()).toBe(5);
    expect(shared.waitForAccountPair).toHaveBeenCalledTimes(1);
  });

  it('clears subscriptions and cached values on unsubscribe', async () => {
    const store = useDemeterFarmingStore();

    await store.subscribeOnPools();
    await store.subscribeOnTokens();
    await store.subscribeOnAccountPools();
    await store.unsubscribeUpdates();

    expect(shared.poolsUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.tokensUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.accountPoolsUnsubscribe).toHaveBeenCalledTimes(1);
    expect(store.pools).toEqual([]);
    expect(store.tokens).toEqual([]);
    expect(store.accountPools).toEqual([]);
  });

  it('routes deposit/withdraw/claimRewards through wallet api', async () => {
    const store = useDemeterFarmingStore();
    const params = {
      pool: { baseAsset: 'A', poolAsset: 'B', rewardAsset: 'R', isFarm: true },
      value: FPNumber.fromNatural(1),
    } as any;
    const pool = {
      baseAsset: 'A',
      poolAsset: 'B',
      rewardAsset: 'R',
      isFarm: true,
      rewards: FPNumber.fromNatural(2),
    } as any;

    await store.deposit(params);
    await store.withdraw(params);
    await store.claimRewards(pool);

    expect(shared.depositLiquidity).toHaveBeenCalledWith('1', { address: 'B' }, { address: 'R' }, { address: 'A' });
    expect(shared.withdrawLiquidity).toHaveBeenCalledWith('1', { address: 'B' }, { address: 'R' }, { address: 'A' });
    expect(shared.getRewards).toHaveBeenCalledWith(true, { address: 'B' }, { address: 'R' }, { address: 'A' }, '2');
  });

  it('uses stake and unstake for non-farm pools', async () => {
    const store = useDemeterFarmingStore();
    const params = {
      pool: { baseAsset: 'A', poolAsset: 'B', rewardAsset: 'R', isFarm: false },
      value: FPNumber.fromNatural(3),
    } as any;

    await store.deposit(params);
    await store.withdraw(params);

    expect(shared.stake).toHaveBeenCalledWith({ address: 'B' }, { address: 'R' }, '3');
    expect(shared.unstake).toHaveBeenCalledWith({ address: 'B' }, { address: 'R' }, '3');
  });
});
