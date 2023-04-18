import { defineGetters } from 'direct-vuex';
import { KnownAssets, KnownSymbols } from '@sora-substrate/util/build/assets/consts';
import { groupRewardsByAssetsList } from '@soramitsu/soraneo-wallet-web';
import type { RewardInfo, RewardsInfo } from '@sora-substrate/util/build/rewards/types';

import { rewardsGetterContext } from '@/store/rewards';
import { asZeroValue } from '@/utils';
import { RewardsAmountHeaderItem } from '@/types/rewards';
import type { RewardsState } from './types';

const getters = defineGetters<RewardsState>()({
  claimableRewards(...args): Array<RewardInfo | RewardsInfo> {
    const { state } = rewardsGetterContext(args);

    const buffer: Array<RewardInfo | RewardsInfo> = [
      ...state.selectedExternal,
      ...Object.values(state.selectedCrowdloan).flat(1),
    ];

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
    return getters.claimableRewards.length !== 0;
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
    return state.externalRewards.length !== 0;
  },
  crowdloanRewardsAvailable(...args): Record<string, RewardInfo[]> {
    const { state } = rewardsGetterContext(args);
    return Object.entries(state.crowdloanRewards).reduce((buffer, [tag, rewards]) => {
      if (rewards.some((reward) => !asZeroValue(reward.amount))) {
        buffer[tag] = rewards;
      }
      return buffer;
    }, {});
  },
  externalRewardsSelected(...args): boolean {
    const { state } = rewardsGetterContext(args);
    return state.selectedExternal.length !== 0;
  },
  transactionStepsCount(...args): number {
    const { getters } = rewardsGetterContext(args);
    return getters.externalRewardsSelected ? 2 : 1;
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
