import type { RewardsState } from './types';

export function initialState(): RewardsState {
  return {
    fee: '',
    feeFetching: false,
    externalRewards: [],
    internalRewards: null,
    vestedRewards: null,
    crowdloanRewards: {},
    selectedInternal: null,
    selectedExternal: [],
    selectedVested: null,
    selectedCrowdloan: {},
    rewardsFetching: false,
    rewardsClaiming: false,
    receivedRewards: [],
    transactionError: false,
    transactionStep: 1,
    signature: '',
    liquidityProvisionRewardsSubscription: null,
    vestedRewardsSubscription: null,
    crowdloanRewardsSubscription: null,
  };
}

const state = initialState();

export default state;
