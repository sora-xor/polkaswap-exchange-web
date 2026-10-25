export default {
  rpc: {
    rewardDoublingAssets: {
      description: 'Get list of double rewarding assets',
      params: [],
      type: 'Vec<AssetId>',
    },
  },
  types: {
    PoolFarmer: {
      account: 'AccountId',
      block: 'BlockNumber',
      weight: 'Balance',
    },
  },
};
