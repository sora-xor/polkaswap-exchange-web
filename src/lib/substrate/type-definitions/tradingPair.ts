export default {
  rpc: {
    listEnabledPairs: {
      description: 'List enabled trading pairs for DEX.',
      params: [
        {
          name: 'dexId',
          type: 'DEXId',
        },
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'Vec<TradingPair>',
    },
    isPairEnabled: {
      description: 'Query if particular trading pair is enabled for DEX.',
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
    listEnabledSourcesForPair: {
      description: 'List enabled liquidity sources for trading pair.',
      params: [
        {
          name: 'dexId',
          type: 'DEXId',
        },
        {
          name: 'baseAssetId',
          type: 'AssetId',
        },
        {
          name: 'targetAssetId',
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
    isSourceEnabledForPair: {
      description: 'Query if particular liquidity source is enabled for pair.',
      params: [
        {
          name: 'dexId',
          type: 'DEXId',
        },
        {
          name: 'baseAssetId',
          type: 'AssetId',
        },
        {
          name: 'targetAssetId',
          type: 'AssetId',
        },
        {
          name: 'liquiditySourceType',
          type: 'LiquiditySourceType',
        },
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'bool',
    },
  },
  types: {
    TP: 'TradingPair', // TODO: fix `TP` abbr in pallet to avoid confusion
  },
};
