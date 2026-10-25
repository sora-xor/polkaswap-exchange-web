export default {
  rpc: {
    canExchange: {
      description: 'Query capability to exchange particular tokens on DEX.',
      params: [
        {
          name: 'dexId',
          type: 'DEXId',
        },
        {
          name: 'liquiditySourceType',
          type: 'LiquiditySourceType',
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
    listSupportedSources: {
      description: 'List liquidity source types enabled on chain.',
      params: [
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'Vec<LiquiditySourceType>',
    },
    quote: {
      description: 'Get price for a given input or output token amount.',
      params: [
        {
          name: 'dexId',
          type: 'DEXId',
        },
        {
          name: 'liquiditySourceType',
          type: 'LiquiditySourceType',
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
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'Option<SwapOutcomeInfo>',
    },
  },
  types: {},
};
