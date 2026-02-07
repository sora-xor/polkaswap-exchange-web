import { KnownAssets, KnownSymbols } from '@sora-substrate/sdk/build/assets/consts';
import { groupRewardsByAssetsList } from '@wallet';
import { defineGetters } from 'direct-vuex';

import { rewardsGetterContext } from '@/store/rewards';
import { RewardsAmountHeaderItem } from '@/types/rewards';
import { asZeroValue } from '@/utils';

import type { RewardsState } from './types';
import type { RewardInfo, RewardsInfo } from '@sora-substrate/sdk/build/rewards/types';

const getters = defineGetters<RewardsState>()({
  claimableRewards(...args): Array<RewardInfo | RewardsInfo> {
    const { state } = rewardsGetterContext(args);

    const selectedExternal = Array.isArray(state.selectedExternal) ? state.selectedExternal : [];
    const selectedCrowdloan = state.selectedCrowdloan ? Object.values(state.selectedCrowdloan).flat(1) : [];

    const buffer: Array<RewardInfo | RewardsInfo> = [...selectedExternal, ...selectedCrowdloan];

    if (state.selectedInternal) {
      buffer.push(state.selectedInternal);
    }

    if (state.selectedVested) {
      buffer.push(state.selectedVested);
    }

    return buffer;
  },
  rewardsAvailable(...args): boolean {
    const { getters } = rewardsGetterContext(args);
    return (getters.claimableRewards?.length ?? 0) !== 0;
  },
  internalRewardsAvailable(...args): boolean {
    const { state } = rewardsGetterContext(args);
    return !asZeroValue(state.internalRewards?.amount);
  },
  vestedRewardsAvailable(...args): boolean {
    const { state } = rewardsGetterContext(args);
    return !asZeroValue(state.vestedRewards?.limit);
  },
  externalRewardsAvailable(...args): boolean {
    const { state } = rewardsGetterContext(args);
    return Array.isArray(state.externalRewards) && state.externalRewards.length !== 0;
  },
  crowdloanRewardsAvailable(...args): string[] {
    const { state } = rewardsGetterContext(args);
    const rewardsEntries = state.crowdloanRewards ? Object.entries(state.crowdloanRewards) : [];
    return rewardsEntries.reduce<string[]>((buffer, [tag, rewards]) => {
      if (rewards.some((reward) => !asZeroValue(reward.amount))) {
        buffer.push(tag);
      }
      return buffer;
    }, []);
  },
  externalRewardsSelected(...args): boolean {
    const { state } = rewardsGetterContext(args);
    return Array.isArray(state.selectedExternal) && state.selectedExternal.length !== 0;
  },
  rewardsByAssetsList(...args): Array<RewardsAmountHeaderItem> {
    const { getters } = rewardsGetterContext(args);
    if (!getters.rewardsAvailable) {
      return [
        {
          asset: KnownAssets.get(KnownSymbols.PSWAP),
          symbol: KnownSymbols.PSWAP,
          amount: '',
        } as RewardsAmountHeaderItem,
      ];
    }

    return groupRewardsByAssetsList([...getters.claimableRewards]);
  },
});

export default getters;
