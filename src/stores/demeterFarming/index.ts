import { FPNumber } from '@sora-substrate/math';
import { defineStore } from 'pinia';

import { api } from '@/lib/soraneo-wallet/src/api';
import type { DemeterFarmingState, DemeterLiquidityParams } from '@/stores/demeterFarming/types';
import { useWalletStore } from '@/stores/wallet';
import { waitForAccountPair } from '@/utils';
import { subscribeAndWaitForFirst } from '@/utils/subscriptions';

import type {
  DemeterAccountPool,
  DemeterPool,
  DemeterRewardToken,
} from '@sora-substrate/sdk/build/demeterFarming/types';
import type { Subscription } from 'rxjs';

const INITIAL_EMISSION_TIMEOUT_MS = 8_000;

const EMPTY_POOLS: readonly DemeterPool[] = [];
const EMPTY_TOKENS: readonly DemeterRewardToken[] = [];
const EMPTY_ACCOUNT_POOLS: readonly DemeterAccountPool[] = [];

type DemeterSubscriptionKind = 'pools' | 'tokens' | 'accountPools';

const subscriptionGenerations: Record<DemeterSubscriptionKind, WeakMap<object, number>> = {
  pools: new WeakMap(),
  tokens: new WeakMap(),
  accountPools: new WeakMap(),
};

/** Invalidates an in-flight subscription initializer and returns its replacement generation. */
const invalidateSubscription = (store: object, kind: DemeterSubscriptionKind): number => {
  const generations = subscriptionGenerations[kind];
  const generation = (generations.get(store) ?? 0) + 1;
  generations.set(store, generation);
  return generation;
};

const isCurrentSubscription = (store: object, kind: DemeterSubscriptionKind, generation: number): boolean => {
  return subscriptionGenerations[kind].get(store) === generation;
};

const initialState = (): DemeterFarmingState => ({
  pools: [],
  poolsUpdates: null,
  tokens: [],
  tokensUpdates: null,
  accountPools: [],
  accountPoolsUpdates: null,
});

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
      const generation = invalidateSubscription(this, 'pools');
      const isCurrent = (): boolean => isCurrentSubscription(this, 'pools', generation);
      this.poolsUpdates = resetSubscription(this.poolsUpdates);

      try {
        const observable = await api.demeterFarming.getPoolsObservable();

        if (!isCurrent()) return;

        if (!observable) {
          this.pools = EMPTY_POOLS;
          return;
        }

        const subscription = await subscribeAndWaitForFirst(
          observable,
          (pools) => {
            if (isCurrent()) this.pools = Object.freeze([...pools]);
          },
          INITIAL_EMISSION_TIMEOUT_MS
        );

        if (!isCurrent()) {
          subscription.unsubscribe();
          return;
        }

        this.poolsUpdates = subscription;
      } catch (error) {
        if (!isCurrent()) return;
        console.warn('[demeterFarming] subscribeOnPools skipped', error);
        this.pools = EMPTY_POOLS;
      }
    },
    async subscribeOnTokens(): Promise<void> {
      const generation = invalidateSubscription(this, 'tokens');
      const isCurrent = (): boolean => isCurrentSubscription(this, 'tokens', generation);
      this.tokensUpdates = resetSubscription(this.tokensUpdates);

      try {
        const observable = await api.demeterFarming.getTokenInfosObservable();

        if (!isCurrent()) return;

        if (!observable) {
          this.tokens = EMPTY_TOKENS;
          return;
        }

        const subscription = await subscribeAndWaitForFirst(
          observable,
          (tokens) => {
            if (isCurrent()) this.tokens = Object.freeze([...tokens]);
          },
          INITIAL_EMISSION_TIMEOUT_MS
        );

        if (!isCurrent()) {
          subscription.unsubscribe();
          return;
        }

        this.tokensUpdates = subscription;
      } catch (error) {
        if (!isCurrent()) return;
        console.warn('[demeterFarming] subscribeOnTokens skipped', error);
        this.tokens = EMPTY_TOKENS;
      }
    },
    async subscribeOnAccountPools(): Promise<void> {
      const walletStore = useWalletStore();
      const generation = invalidateSubscription(this, 'accountPools');
      const isCurrent = (): boolean => isCurrentSubscription(this, 'accountPools', generation);

      this.accountPoolsUpdates = resetSubscription(this.accountPoolsUpdates);

      if (!walletStore.isLoggedIn) {
        this.accountPools = EMPTY_ACCOUNT_POOLS;
        return;
      }

      try {
        await waitForAccountPair();

        if (!isCurrent()) return;

        const observable = api.demeterFarming.getAccountPoolsObservable();

        const subscription = await subscribeAndWaitForFirst(
          observable,
          (accountPools) => {
            if (isCurrent()) this.accountPools = Object.freeze([...accountPools]);
          },
          INITIAL_EMISSION_TIMEOUT_MS
        );

        if (!isCurrent()) {
          subscription.unsubscribe();
          return;
        }

        this.accountPoolsUpdates = subscription;
      } catch (error) {
        if (!isCurrent()) return;
        console.warn('[demeterFarming] subscribeOnAccountPools skipped', error);
        this.accountPools = EMPTY_ACCOUNT_POOLS;
      }
    },
    async unsubscribeUpdates(): Promise<void> {
      invalidateSubscription(this, 'pools');
      invalidateSubscription(this, 'tokens');
      invalidateSubscription(this, 'accountPools');
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
