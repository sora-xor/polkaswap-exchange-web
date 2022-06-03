import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/math';

import { waitForAccountPair } from '@/utils';
import { demeterFarmingActionContext } from '@/store/demeterFarming';

import type { DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';
import type { DemeterLiquidityParams } from '@/store/demeterFarming/types';

const actions = defineActions({
  async subscribeOnPools(context): Promise<void> {
    const { commit } = demeterFarmingActionContext(context);

    commit.resetPoolsUpdates();

    const subscription = (await api.demeterFarming.getPoolsObservable()).subscribe((pools) => {
      commit.setPools(pools);
    });

    commit.setPoolsUpdates(subscription);
  },

  async subscribeOnTokens(context): Promise<void> {
    const { commit } = demeterFarmingActionContext(context);

    commit.resetTokensUpdates();

    const subscription = (await api.demeterFarming.getTokenInfosObservable()).subscribe((tokens) => {
      commit.setTokens(tokens);
    });

    commit.setTokensUpdates(subscription);
  },

  async subscribeOnAccountPools(context): Promise<void> {
    const { commit, rootGetters } = demeterFarmingActionContext(context);

    commit.resetAccountPoolsUpdates();

    if (!rootGetters.wallet.account.isLoggedIn) return;

    await waitForAccountPair(() => {
      const subscription = api.demeterFarming.getAccountPoolsObservable().subscribe((accountPools) => {
        commit.setAccountPools(accountPools);
      });

      commit.setAccountPoolsUpdates(subscription);
    });
  },

  unsubscribeUpdates(context): void {
    const { commit } = demeterFarmingActionContext(context);
    commit.resetPoolsUpdates();
    commit.resetTokensUpdates();
    commit.resetAccountPoolsUpdates();
  },

  async depositLiquidity(context, params: DemeterLiquidityParams): Promise<void> {
    const { rootGetters } = demeterFarmingActionContext(context);

    const { poolAsset: poolAssetAddress, rewardAsset: rewardAssetAddress } = params.pool;

    const poolAsset = rootGetters.assets.assetsDataTable[poolAssetAddress];
    const rewardAsset = rootGetters.assets.assetsDataTable[rewardAssetAddress];

    const percent = new FPNumber(params.value).div(FPNumber.HUNDRED);
    const pooledLP = params.accountPool?.pooledTokens ?? FPNumber.ZERO;
    const liquidityLP = FPNumber.fromCodecValue(params.liquidity.balance);
    const depositLP = liquidityLP.sub(pooledLP).mul(percent);
    const amount = depositLP.toString();

    await api.demeterFarming.depositLiquidity(poolAsset, rewardAsset, amount);
  },

  async withdrawLiquidity(context, params: DemeterLiquidityParams): Promise<void> {
    const { rootGetters } = demeterFarmingActionContext(context);

    const { poolAsset: poolAssetAddress, rewardAsset: rewardAssetAddress } = params.pool;

    const poolAsset = rootGetters.assets.assetsDataTable[poolAssetAddress];
    const rewardAsset = rootGetters.assets.assetsDataTable[rewardAssetAddress];

    const percent = new FPNumber(params.value).div(FPNumber.HUNDRED);
    const pooledLP = params.accountPool?.pooledTokens ?? FPNumber.ZERO;
    const withdrawLP = pooledLP.mul(percent);
    const amount = withdrawLP.toString();

    await api.demeterFarming.withdrawLiquidity(poolAsset, rewardAsset, amount);
  },

  async claimRewards(context, pool: DemeterAccountPool): Promise<void> {
    const { rootGetters } = demeterFarmingActionContext(context);

    const { poolAsset: poolAssetAddress, rewardAsset: rewardAssetAddress, isFarm, rewards } = pool;

    const poolAsset = rootGetters.assets.assetsDataTable[poolAssetAddress];
    const rewardAsset = rootGetters.assets.assetsDataTable[rewardAssetAddress];
    const amount = rewards.toString();

    await api.demeterFarming.getRewards(poolAsset, rewardAsset, isFarm, amount);
  },
});

export default actions;
