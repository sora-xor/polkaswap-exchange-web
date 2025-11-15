export default {
  rpc: {
    quote: {
      description: 'Get price with indicated Asset amount and direction, filtered by selected_types',
      params: [
        {
          name: 'dexId',
          type: 'DEXId',
        },
        {
          name: 'inputAssetId',
          type: 'AssetId',
        },
        {
          name: 'outputAssetId',
          type: 'AssetId',
        },
        {
          name: 'amount',
          type: 'String',
        },
        {
          name: 'swapVariant',
          type: 'SwapVariant',
        },
        {
          name: 'selectedSourceTypes',
          type: 'Vec<LiquiditySourceType>',
        },
        {
          name: 'filterMode',
          type: 'FilterMode',
        },
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'Option<LPSwapOutcomeInfo>',
    },
    isPathAvailable: {
      description: 'Check if given two arbitrary tokens can be exchanged via any liquidity sources',
      params: [
        {
          name: 'dexId',
          type: 'DEXId',
        },
        {
          name: 'inputAssetId',
          type: 'AssetId',
        },
        {
          name: 'outputAssetId',
          type: 'AssetId',
        },
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'bool',
    },
    listEnabledSourcesForPath: {
      description: 'Given two arbitrary tokens, list liquidity sources that can be used along the path.',
      params: [
        {
          name: 'dexId',
          type: 'DEXId',
        },
        {
          name: 'inputAssetId',
          type: 'AssetId',
        },
        {
          name: 'outputAssetId',
          type: 'AssetId',
        },
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'Vec<LiquiditySourceType>',
    },
  },
  types: {
    OutcomeFee: 'BTreeMap<AssetId, Balance>',
    LPSwapOutcomeInfo: {
      amount: 'Balance',
      amountWithoutImpact: 'Balance',
      fee: 'OutcomeFee',
      rewards: 'Vec<LPRewardsInfo>',
      route: 'Vec<AssetId>',
    },
    LPRewardsInfo: {
      amount: 'Balance',
      currency: 'AssetId',
      reason: 'RewardReason',
    },
    LiquiditySourceIdOf: {
      dexId: 'DEXId',
      liquiditySourceIndex: 'LiquiditySourceType',
    },
  },
};
