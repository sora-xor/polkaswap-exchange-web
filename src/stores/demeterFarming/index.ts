import { FPNumber } from '@sora-substrate/math';
import { defineStore } from 'pinia';

import { api } from '@/lib/soraneo-wallet/src/api';
import type { DemeterFarmingState, DemeterLiquidityParams } from '@/stores/demeterFarming/types';
import { useWalletStore } from '@/stores/wallet';
import type { FnWithoutArgs } from '@/types/common';
import { waitForAccountPair } from '@/utils';

import type {
  DemeterAccountPool,
  DemeterPool,
  DemeterRewardToken,
} from '@sora-substrate/sdk/build/demeterFarming/types';
import type { Observable, Subscription } from 'rxjs';

const INITIAL_EMISSION_TIMEOUT_MS = 8_000;

const EMPTY_POOLS: readonly DemeterPool[] = [];
const EMPTY_TOKENS: readonly DemeterRewardToken[] = [];
const EMPTY_ACCOUNT_POOLS: readonly DemeterAccountPool[] = [];

const initialState = (): DemeterFarmingState => ({
  pools: [],
  poolsUpdates: null,
  tokens: [],
  tokensUpdates: null,
  accountPools: [],
  accountPoolsUpdates: null,
});

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const subscribeWithInitialEmissionGuard = async <T>({
  observable,
  onValue,
  onTimeout,
  timeoutMs = INITIAL_EMISSION_TIMEOUT_MS,
}: {
  observable: Observable<T>;
  onValue: (value: T) => void;
  onTimeout?: FnWithoutArgs;
  timeoutMs?: number;
}): Promise<Subscription> => {
  let didReceiveFirstValue = false;
  let resolveFirstValue!: FnWithoutArgs;

  const firstValuePromise = new Promise<void>((resolve) => {
    resolveFirstValue = resolve;
  });

  const subscription = observable.subscribe((value) => {
    onValue(value);
    if (!didReceiveFirstValue) {
      didReceiveFirstValue = true;
      resolveFirstValue();
    }
  });

  await Promise.race([firstValuePromise, wait(timeoutMs)]);

  if (!didReceiveFirstValue) {
    onTimeout?.();
  }

  return subscription;
};

const resetSubscription = (subscription: Nullable<Subscription>): null => {
  subscription?.unsubscribe();
  return null;
};

export const useDemeterFarmingStore = defineStore('demeter-farming', {
  state: (): DemeterFarmingState => initialState(),
  getters: {
    getLockedAmount(state): (baseAsset: string, poolAsset: string, isFarm: boolean) => FPNumber {
      return (baseAsset: string, poolAsset: string, isFarm = true) => {
        return state.accountPools.reduce((value, accountPool) => {
          if (
            accountPool.baseAsset === baseAsset &&
            accountPool.poolAsset === poolAsset &&
            accountPool.isFarm === isFarm
          ) {
            return FPNumber.max(value, accountPool.pooledTokens) as FPNumber;
          }

          return value;
        }, FPNumber.ZERO);
      };
    },
  },
  actions: {
    async subscribeOnPools(): Promise<void> {
      this.poolsUpdates = resetSubscription(this.poolsUpdates);

      try {
        const observable = await api.demeterFarming.getPoolsObservable();

        if (!observable) {
          this.pools = EMPTY_POOLS;
          return;
        }

        this.poolsUpdates = await subscribeWithInitialEmissionGuard({
          observable,
          onValue: (pools) => {
            this.pools = Object.freeze([...pools]);
          },
          onTimeout: () => {
            console.warn(
              `[demeterFarming] subscribeOnPools initial emission timed out after ${INITIAL_EMISSION_TIMEOUT_MS}ms`
            );
            this.pools = EMPTY_POOLS;
          },
        });
      } catch (error) {
        console.warn('[demeterFarming] subscribeOnPools skipped', error);
        this.pools = EMPTY_POOLS;
      }
    },
    async subscribeOnTokens(): Promise<void> {
      this.tokensUpdates = resetSubscription(this.tokensUpdates);

      try {
        const observable = await api.demeterFarming.getTokenInfosObservable();

        if (!observable) {
          this.tokens = EMPTY_TOKENS;
          return;
        }

        this.tokensUpdates = await subscribeWithInitialEmissionGuard({
          observable,
          onValue: (tokens) => {
            this.tokens = Object.freeze([...tokens]);
          },
          onTimeout: () => {
            console.warn(
              `[demeterFarming] subscribeOnTokens initial emission timed out after ${INITIAL_EMISSION_TIMEOUT_MS}ms`
            );
            this.tokens = EMPTY_TOKENS;
          },
        });
      } catch (error) {
        console.warn('[demeterFarming] subscribeOnTokens skipped', error);
        this.tokens = EMPTY_TOKENS;
      }
    },
    async subscribeOnAccountPools(): Promise<void> {
      const walletStore = useWalletStore();

      this.accountPoolsUpdates = resetSubscription(this.accountPoolsUpdates);

      if (!walletStore.isLoggedIn) {
        this.accountPools = EMPTY_ACCOUNT_POOLS;
        return;
      }

      try {
        await waitForAccountPair();

        const observable = api.demeterFarming.getAccountPoolsObservable();

        this.accountPoolsUpdates = await subscribeWithInitialEmissionGuard({
          observable,
          onValue: (accountPools) => {
            this.accountPools = Object.freeze([...accountPools]);
          },
          onTimeout: () => {
            console.warn(
              `[demeterFarming] subscribeOnAccountPools initial emission timed out after ${INITIAL_EMISSION_TIMEOUT_MS}ms`
            );
            this.accountPools = EMPTY_ACCOUNT_POOLS;
          },
        });
      } catch (error) {
        console.warn('[demeterFarming] subscribeOnAccountPools skipped', error);
        this.accountPools = EMPTY_ACCOUNT_POOLS;
      }
    },
    async unsubscribeUpdates(): Promise<void> {
      this.poolsUpdates = resetSubscription(this.poolsUpdates);
      this.tokensUpdates = resetSubscription(this.tokensUpdates);
      this.accountPoolsUpdates = resetSubscription(this.accountPoolsUpdates);
      this.pools = EMPTY_POOLS;
      this.tokens = EMPTY_TOKENS;
      this.accountPools = EMPTY_ACCOUNT_POOLS;
    },
    async deposit(params: DemeterLiquidityParams): Promise<void> {
      const walletStore = useWalletStore();
      const table = walletStore.assetsDataTable;
      const {
        baseAsset: baseAssetAddress,
        poolAsset: poolAssetAddress,
        rewardAsset: rewardAssetAddress,
        isFarm,
      } = params.pool;

      const baseAsset = table[baseAssetAddress];
      const poolAsset = table[poolAssetAddress];
      const rewardAsset = table[rewardAssetAddress];
      const desiredAmount = params.value.toString();

      if (isFarm) {
        await api.demeterFarming.depositLiquidity(desiredAmount, poolAsset, rewardAsset, baseAsset);
      } else {
        await api.demeterFarming.stake(poolAsset, rewardAsset, desiredAmount);
      }
    },
    async withdraw(params: DemeterLiquidityParams): Promise<void> {
      const walletStore = useWalletStore();
      const table = walletStore.assetsDataTable;
      const {
        baseAsset: baseAssetAddress,
        poolAsset: poolAssetAddress,
        rewardAsset: rewardAssetAddress,
        isFarm,
      } = params.pool;

      const baseAsset = table[baseAssetAddress];
      const poolAsset = table[poolAssetAddress];
      const rewardAsset = table[rewardAssetAddress];
      const desiredAmount = params.value.toString();

      if (isFarm) {
        await api.demeterFarming.withdrawLiquidity(desiredAmount, poolAsset, rewardAsset, baseAsset);
      } else {
        await api.demeterFarming.unstake(poolAsset, rewardAsset, desiredAmount);
      }
    },
    async claimRewards(pool: DemeterAccountPool): Promise<void> {
      const walletStore = useWalletStore();
      const table = walletStore.assetsDataTable;
      const {
        baseAsset: baseAssetAddress,
        poolAsset: poolAssetAddress,
        rewardAsset: rewardAssetAddress,
        isFarm,
        rewards,
      } = pool;

      const baseAsset = table[baseAssetAddress];
      const poolAsset = table[poolAssetAddress];
      const rewardAsset = table[rewardAssetAddress];

      await api.demeterFarming.getRewards(isFarm, poolAsset, rewardAsset, baseAsset, rewards.toString());
    },
  },
});

export type DemeterFarmingStore = ReturnType<typeof useDemeterFarmingStore>;
