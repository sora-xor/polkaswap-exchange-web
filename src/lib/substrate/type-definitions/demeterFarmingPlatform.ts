export default {
  rpc: {},
  types: {
    PoolData: {
      multiplier: 'u32',
      depositFee: 'Balance',
      isCore: 'bool',
      isFarm: 'bool',
      totalTokensInPool: 'Balance',
      rewards: 'Balance',
      rewardsToBeDistributed: 'Balance',
      isRemoved: 'bool',
      baseAsset: 'AssetId',
    },
    TokenInfo: {
      farmsTotalMultiplier: 'u32',
      stakingTotalMultiplier: 'u32',
      tokenPerBlock: 'Balance',
      farmsAllocation: 'Balance',
      stakingAllocation: 'Balance',
      teamAllocation: 'Balance',
      teamAccount: 'AccountId',
    },
    UserInfo: {
      poolAsset: 'AssetId',
      rewardAsset: 'AssetId',
      isFarm: 'bool',
      pooledTokens: 'Balance',
      rewards: 'Balance',
      baseAsset: 'AssetId',
    },
  },
};
