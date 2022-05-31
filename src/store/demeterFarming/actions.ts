import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/math';

import { combineLatest } from '@polkadot/x-rxjs';
import { map } from '@polkadot/x-rxjs/operators';

import { waitForAccountPair } from '@/utils';
import { demeterFarmingActionContext } from '@/store/demeterFarming';

import type { DemeterLiquidityParams } from '@/store/demeterFarming/types';

const actions = defineActions({
  async getPools(context): Promise<void> {
    const { commit } = demeterFarmingActionContext(context);

    try {
      const data = await api.api.query.demeterFarmingPlatform.pools.entries();

      const pools = data.reduce<any>((buffer, [key, value]) => {
        const [poolAsset, rewardAsset] = key.toHuman() as any;
        const poolsData = value.toJSON() as Array<any>;

        poolsData.forEach((poolData) => {
          buffer.push({
            poolAsset,
            rewardAsset,
            multiplier: poolData.multiplier,
            isCore: poolData.is_core,
            isFarm: poolData.is_farm,
            isRemoved: poolData.is_removed,
            depositFee: FPNumber.fromCodecValue(poolData.deposit_fee).toNumber(),
            totalTokensInPool: FPNumber.fromCodecValue(poolData.total_tokens_in_pool),
            rewards: FPNumber.fromCodecValue(poolData.rewards),
            rewardsToBeDistributed: FPNumber.fromCodecValue(poolData.rewards_to_be_distributed),
          });
        });

        return buffer;
      }, []);

      commit.setPools(pools);
    } catch (error) {
      console.error(error);
      commit.setPools([]);
    }
  },

  async getTokens(context): Promise<void> {
    const { commit } = demeterFarmingActionContext(context);

    try {
      const data = await api.api.query.demeterFarmingPlatform.tokenInfos.entries();

      const keys = await api.api.query.demeterFarmingPlatform.tokenInfos.keys();
      const doubleKeys = keys.map((item) => {
        const [assetId] = item.args;
        return assetId.toString();
      });

      console.log(doubleKeys);

      const tokens = data.map(([key, value]) => {
        const [assetId] = key.toHuman() as Array<string>;
        const data = (value as any).unwrap();

        return {
          assetId,
          tokenPerBlock: FPNumber.fromCodecValue(data.token_per_block),
          farmsTotalMultiplier: Number(data.farms_total_multiplier),
          stakingTotalMultiplier: Number(data.staking_total_multiplier),
          farmsAllocation: FPNumber.fromCodecValue(data.farms_allocation),
          stakingAllocation: FPNumber.fromCodecValue(data.staking_allocation),
          teamAllocation: FPNumber.fromCodecValue(data.team_allocation),
        };
      });

      commit.setTokens(tokens);
    } catch (error) {
      console.error(error);
      commit.setTokens([]);
    }
  },

  async subscribeOnPools(context): Promise<void> {
    const { commit } = demeterFarmingActionContext(context);

    const data = await api.api.query.demeterFarmingPlatform.pools.keys();
    const doubleKeys = data.map((item) => {
      const [poolAsset, rewardAsset] = item.args;
      return {
        poolAsset: poolAsset.toString(),
        rewardAsset: rewardAsset.toString(),
      };
    });

    const getPoolObservable = (poolAsset: string, rewardAsset: string) =>
      api.apiRx.query.demeterFarmingPlatform.pools(poolAsset, rewardAsset).pipe(
        map((value) => {
          const poolsData = (value as any).toArray();

          return (value as any).map((poolData) => ({
            poolAsset,
            rewardAsset,
            multiplier: Number(poolData.multiplier),
            isCore: poolData.is_core.isTrue,
            isFarm: poolData.is_farm.isTrue,
            isRemoved: poolData.is_removed.isTrue,
            depositFee: new FPNumber(poolData.deposit_fee).toNumber(),
            totalTokensInPool: new FPNumber(poolData.total_tokens_in_pool),
            rewards: new FPNumber(poolData.rewards),
            rewardsToBeDistributed: new FPNumber(poolData.rewards_to_be_distributed),
          }));
        })
      );

    const poolsObservables = doubleKeys.map(({ poolAsset, rewardAsset }) => getPoolObservable(poolAsset, rewardAsset));

    const subscription = combineLatest(poolsObservables).subscribe((pools) => {
      commit.setPools(pools.flat());
    });
  },

  async subscribeOnAccountPools(context): Promise<void> {
    const { commit, rootGetters } = demeterFarmingActionContext(context);
    commit.resetAccountPoolsUpdates();

    if (!rootGetters.wallet.account.isLoggedIn) return;

    await waitForAccountPair(() => {
      const account = rootGetters.wallet.account.account.address;

      const observable = api.apiRx.query.demeterFarmingPlatform.userInfos(account).pipe(
        map((userInfoVec) => {
          return (userInfoVec as any).map((data) => ({
            isFarm: data.is_farm.isTrue,
            poolAsset: data.pool_asset.toString(),
            pooledTokens: new FPNumber(data.pooled_tokens),
            rewardAsset: data.reward_asset.toString(),
            rewards: new FPNumber(data.rewards),
          }));
        })
      );

      const subscription = observable.subscribe((pools) => {
        commit.setAccountPools(pools);
      });

      commit.setAccountPoolsUpdates(subscription);
    });
  },

  async deposit(context, params: DemeterLiquidityParams) {
    const percent = new FPNumber(params.value).div(FPNumber.HUNDRED);
    const pooledLP = params.accountPool?.pooledTokens ?? FPNumber.ZERO;
    const liquidityLP = FPNumber.fromCodecValue(params.liquidity.balance);
    const depositLP = liquidityLP.sub(pooledLP).mul(percent);
    const { poolAsset, rewardAsset, isFarm } = params.pool;

    const args = [poolAsset, rewardAsset, isFarm, depositLP.toCodecString()];

    console.log(args);

    await api.submitExtrinsic(api.api.tx.demeterFarmingPlatform.deposit(...args), api.account.pair);
  },

  async withdraw(context, params: DemeterLiquidityParams) {
    const percent = new FPNumber(params.value).div(FPNumber.HUNDRED);
    const pooledLP = params.accountPool?.pooledTokens ?? FPNumber.ZERO;
    const withdrawLP = pooledLP.mul(percent);
    const { poolAsset, rewardAsset, isFarm } = params.pool;

    const args = [poolAsset, rewardAsset, withdrawLP.toCodecString(), isFarm];

    console.log(args);

    await api.submitExtrinsic(api.api.tx.demeterFarmingPlatform.withdraw(...args), api.account.pair);
  },
});

export default actions;
