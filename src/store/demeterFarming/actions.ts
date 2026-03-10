import { api } from '@wallet';
import { defineActions } from 'direct-vuex';

import { demeterFarmingActionContext } from '@/store/demeterFarming';
import type { DemeterLiquidityParams } from '@/store/demeterFarming/types';
import type { FnWithoutArgs } from '@/types/common';
import { waitForAccountPair } from '@/utils';

import type { DemeterAccountPool } from '@sora-substrate/sdk/build/demeterFarming/types';
import type { Observable, Subscription } from 'rxjs';

const INITIAL_EMISSION_TIMEOUT_MS = 8_000;

const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

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

const actions = defineActions({
  async subscribeOnPools(context): Promise<void> {
    const { commit } = demeterFarmingActionContext(context);

    commit.resetPoolsUpdates();

    try {
      const observable = await api.demeterFarming.getPoolsObservable();

      if (!observable) {
        commit.setPools([]);
        return;
      }

      const subscription = await subscribeWithInitialEmissionGuard({
        observable,
        onValue: (pools) => commit.setPools(pools),
        onTimeout: () => {
          console.warn(
            `[demeterFarming] subscribeOnPools initial emission timed out after ${INITIAL_EMISSION_TIMEOUT_MS}ms`
          );
          commit.setPools([]);
        },
      });

      commit.setPoolsUpdates(subscription);
    } catch (error) {
      console.warn('[demeterFarming] subscribeOnPools skipped', error);
      commit.setPools([]);
    }
  },

  async subscribeOnTokens(context): Promise<void> {
    const { commit } = demeterFarmingActionContext(context);

    commit.resetTokensUpdates();

    try {
      const observable = await api.demeterFarming.getTokenInfosObservable();

      if (!observable) {
        commit.setTokens([]);
        return;
      }

      const subscription = await subscribeWithInitialEmissionGuard({
        observable,
        onValue: (tokens) => commit.setTokens(tokens),
        onTimeout: () => {
          console.warn(
            `[demeterFarming] subscribeOnTokens initial emission timed out after ${INITIAL_EMISSION_TIMEOUT_MS}ms`
          );
          commit.setTokens([]);
        },
      });

      commit.setTokensUpdates(subscription);
    } catch (error) {
      console.warn('[demeterFarming] subscribeOnTokens skipped', error);
      commit.setTokens([]);
    }
  },

  async subscribeOnAccountPools(context): Promise<void> {
    const { commit, rootGetters } = demeterFarmingActionContext(context);

    commit.resetAccountPoolsUpdates();

    if (!rootGetters.wallet.account.isLoggedIn) {
      commit.setAccountPools([]);
      return;
    }

    try {
      await waitForAccountPair();

      const observable = api.demeterFarming.getAccountPoolsObservable();

      const subscription = await subscribeWithInitialEmissionGuard({
        observable,
        onValue: (accountPools) => commit.setAccountPools(accountPools),
        onTimeout: () => {
          console.warn(
            `[demeterFarming] subscribeOnAccountPools initial emission timed out after ${INITIAL_EMISSION_TIMEOUT_MS}ms`
          );
          commit.setAccountPools([]);
        },
      });

      commit.setAccountPoolsUpdates(subscription);
    } catch (error) {
      console.warn('[demeterFarming] subscribeOnAccountPools skipped', error);
      commit.setAccountPools([]);
    }
  },

  unsubscribeUpdates(context): void {
    const { commit } = demeterFarmingActionContext(context);
    commit.resetPoolsUpdates();
    commit.resetTokensUpdates();
    commit.resetAccountPoolsUpdates();
    commit.setPools([]);
    commit.setTokens([]);
    commit.setAccountPools([]);
  },

  async deposit(context, params: DemeterLiquidityParams): Promise<void> {
    const { rootGetters } = demeterFarmingActionContext(context);
    const { assetsDataTable: table } = rootGetters.wallet.account;

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

  async withdraw(context, params: DemeterLiquidityParams): Promise<void> {
    const { rootGetters } = demeterFarmingActionContext(context);
    const { assetsDataTable: table } = rootGetters.wallet.account;

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

  async claimRewards(context, pool: DemeterAccountPool): Promise<void> {
    const { rootGetters } = demeterFarmingActionContext(context);
    const { assetsDataTable: table } = rootGetters.wallet.account;

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
    const amount = rewards.toString();

    await api.demeterFarming.getRewards(isFarm, poolAsset, rewardAsset, baseAsset, amount);
  },
});

export default actions;
