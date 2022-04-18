import type { RewardsState } from './types';

export function initialState(): RewardsState {
  return {
    fee: '',
    feeFetching: false,
    externalRewards: [],
    internalRewards: null,
    vestedRewards: null,
    crowdloanRewards: [],
    selectedVestedRewards: null,
    selectedInternalRewards: null,
    selectedExternalRewards: [],
    selectedCrowdloanRewards: [],
    rewardsFetching: false,
    rewardsClaiming: false,
    rewardsRecieved: false,
    transactionError: false,
    transactionStep: 1,
    signature: '',
    accountMarketMakerInfo: null,
    accountMarketMakerUpdates: null,
  };
}

const state = initialState();

export default state;
