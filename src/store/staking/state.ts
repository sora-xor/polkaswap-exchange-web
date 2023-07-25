import type { StakingState } from './types';

function initialState(): StakingState {
  return {
    pools: [
      {
        baseAsset: 'XOR',
        poolAsset: 'XOR',
        rewardAsset: 'VAL',
      },
    ],
    // tokens: [],
    accountPools: [],
  };
}

const state = initialState();

export default state;
