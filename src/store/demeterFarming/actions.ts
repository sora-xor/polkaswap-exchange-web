import { defineActions } from 'direct-vuex';
import { api } from '@soramitsu/soraneo-wallet-web';
import { FPNumber } from '@sora-substrate/math';

import { waitForAccountPair } from '@/utils';
import { demeterFarmingActionContext } from '@/store/demeterFarming';

const actions = defineActions({
  async getPools(context): Promise<void> {
    const { commit } = demeterFarmingActionContext(context);

    try {
      const data = await api.api.query.demeterFarmingPlatform.pools.entries();

      const pools = data.reduce<any>((buffer, [key, value]) => {
        const [poolAssetId, rewardAssetId] = key.toHuman() as any;
        const poolsData = value.toJSON() as Array<any>;

        poolsData.forEach((poolData) => {
          buffer.push({
            ...poolData,
            poolAssetId,
            rewardAssetId,
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

  async subscribeOnAccountPools(context): Promise<void> {
    const { commit, rootGetters } = demeterFarmingActionContext(context);
    commit.resetAccountPoolsUpdates();

    if (!rootGetters.wallet.account.isLoggedIn) return;

    await waitForAccountPair(() => {
      const account = rootGetters.wallet.account.account.address;
      const subscription = api.apiRx.query.demeterFarmingPlatform.userInfos(account).subscribe((data) => {
        const pools = (data as any).map((item) => item.toJSON());
        commit.setAccountPools(pools);
      });

      commit.setAccountPoolsUpdates(subscription);
    });
  },
});

export default actions;
