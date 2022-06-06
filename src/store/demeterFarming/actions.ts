import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/math';

import { waitForAccountPair } from '@/utils';
import { demeterFarmingActionContext } from '@/store/demeterFarming';

import type { DemeterAccountPool } from '@sora-substrate/util/build/demeterFarming/types';
import type { DemeterLiquidityParams } from '@/store/demeterFarming/types';
import type { Asset } from '@sora-substrate/util/build/assets/types';

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
    commit.setPools([]);
    commit.setTokens([]);
    commit.setAccountPools([]);
  },

  async deposit(context, params: DemeterLiquidityParams): Promise<void> {
    const { rootGetters } = demeterFarmingActionContext(context);

    const { poolAsset: poolAssetAddress, rewardAsset: rewardAssetAddress } = params.pool;

    const poolAsset = rootGetters.assets.assetsDataTable[poolAssetAddress];
    const rewardAsset = rootGetters.assets.assetsDataTable[rewardAssetAddress];

    const balanceAmount = params.liquidity
      ? FPNumber.fromCodecValue(params.liquidity.balance)
      : FPNumber.fromCodecValue(poolAsset.balance.transferable);

    const percent = new FPNumber(params.value).div(FPNumber.HUNDRED);
    const pooledAmount = params.accountPool?.pooledTokens ?? FPNumber.ZERO;
    const desiredAmount = balanceAmount.sub(pooledAmount).mul(percent);
    const args: [Asset, Asset, string] = [poolAsset, rewardAsset, desiredAmount.toString()];

    if (params.liquidity) {
      await api.demeterFarming.depositLiquidity(...args);
    } else {
      await api.demeterFarming.stake(...args);
    }
  },

  async withdraw(context, params: DemeterLiquidityParams): Promise<void> {
    const { rootGetters } = demeterFarmingActionContext(context);

    const { poolAsset: poolAssetAddress, rewardAsset: rewardAssetAddress } = params.pool;

    const poolAsset = rootGetters.assets.assetsDataTable[poolAssetAddress];
    const rewardAsset = rootGetters.assets.assetsDataTable[rewardAssetAddress];

    const percent = new FPNumber(params.value).div(FPNumber.HUNDRED);
    const pooledAmount = params.accountPool?.pooledTokens ?? FPNumber.ZERO;
    const desiredAmount = pooledAmount.mul(percent);
    const args: [Asset, Asset, string] = [poolAsset, rewardAsset, desiredAmount.toString()];

    if (params.liquidity) {
      await api.demeterFarming.withdrawLiquidity(...args);
    } else {
      await api.demeterFarming.unstake(...args);
    }
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
