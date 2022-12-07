import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';

import { waitForAccountPair } from '@/utils';
import { demeterFarmingActionContext } from '@/store/demeterFarming';

import type { Subscription } from 'rxjs';
import type { DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';
import type { DemeterLiquidityParams } from '@/store/demeterFarming/types';

const actions = defineActions({
  async subscribeOnPools(context): Promise<void> {
    const { commit } = demeterFarmingActionContext(context);

    commit.resetPoolsUpdates();

    const observable = await api.demeterFarming.getPoolsObservable();

    if (!observable) return;

    let subscription!: Subscription;

    await new Promise<void>((resolve) => {
      subscription = observable.subscribe((pools) => {
        commit.setPools(pools);
        resolve();
      });
    });

    commit.setPoolsUpdates(subscription);
  },

  async subscribeOnTokens(context): Promise<void> {
    const { commit } = demeterFarmingActionContext(context);

    commit.resetTokensUpdates();

    const observable = await api.demeterFarming.getTokenInfosObservable();

    if (!observable) return;

    let subscription!: Subscription;

    await new Promise<void>((resolve) => {
      subscription = observable.subscribe((tokens) => {
        commit.setTokens(tokens);
        resolve();
      });
    });

    commit.setTokensUpdates(subscription);
  },

  async subscribeOnAccountPools(context): Promise<void> {
    const { commit, rootGetters } = demeterFarmingActionContext(context);

    commit.resetAccountPoolsUpdates();

    if (!rootGetters.wallet.account.isLoggedIn) return;

    await waitForAccountPair();

    const observable = api.demeterFarming.getAccountPoolsObservable();

    let subscription!: Subscription;

    await new Promise<void>((resolve) => {
      subscription = observable.subscribe((accountPools) => {
        commit.setAccountPools(accountPools);
        resolve();
      });
    });

    commit.setAccountPoolsUpdates(subscription);
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

    const {
      baseAsset: baseAssetAddress,
      poolAsset: poolAssetAddress,
      rewardAsset: rewardAssetAddress,
      isFarm,
    } = params.pool;

    const baseAsset = rootGetters.assets.assetsDataTable[baseAssetAddress];
    const poolAsset = rootGetters.assets.assetsDataTable[poolAssetAddress];
    const rewardAsset = rootGetters.assets.assetsDataTable[rewardAssetAddress];
    const desiredAmount = params.value.toString();

    if (isFarm) {
      await api.demeterFarming.depositLiquidity(desiredAmount, poolAsset, rewardAsset, baseAsset);
    } else {
      await api.demeterFarming.stake(poolAsset, rewardAsset, desiredAmount);
    }
  },

  async withdraw(context, params: DemeterLiquidityParams): Promise<void> {
    const { rootGetters } = demeterFarmingActionContext(context);

    const {
      baseAsset: baseAssetAddress,
      poolAsset: poolAssetAddress,
      rewardAsset: rewardAssetAddress,
      isFarm,
    } = params.pool;

    const baseAsset = rootGetters.assets.assetsDataTable[baseAssetAddress];
    const poolAsset = rootGetters.assets.assetsDataTable[poolAssetAddress];
    const rewardAsset = rootGetters.assets.assetsDataTable[rewardAssetAddress];
    const desiredAmount = params.value.toString();

    if (isFarm) {
      await api.demeterFarming.withdrawLiquidity(desiredAmount, poolAsset, rewardAsset, baseAsset);
    } else {
      await api.demeterFarming.unstake(poolAsset, rewardAsset, desiredAmount);
    }
  },

  async claimRewards(context, pool: DemeterAccountPool): Promise<void> {
    const { rootGetters } = demeterFarmingActionContext(context);

    const {
      baseAsset: baseAssetAddress,
      poolAsset: poolAssetAddress,
      rewardAsset: rewardAssetAddress,
      isFarm,
      rewards,
    } = pool;

    const baseAsset = rootGetters.assets.assetsDataTable[baseAssetAddress];
    const poolAsset = rootGetters.assets.assetsDataTable[poolAssetAddress];
    const rewardAsset = rootGetters.assets.assetsDataTable[rewardAssetAddress];
    const amount = rewards.toString();

    await api.demeterFarming.getRewards(isFarm, poolAsset, rewardAsset, baseAsset, amount);
  },
});

export default actions;
