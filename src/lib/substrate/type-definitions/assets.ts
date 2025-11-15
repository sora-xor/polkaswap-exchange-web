export default {
  rpc: {
    freeBalance: {
      description: 'Get free balance of particular asset for account.',
      params: [
        {
          name: 'accountId',
          type: 'AccountId',
        },
        {
          name: 'assetId',
          type: 'AssetId',
        },
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'Option<BalanceInfo>',
    },
    usableBalance: {
      description: 'Get usable (free and non-frozen, except for network fees) balance of particular asset for account.',
      params: [
        {
          name: 'accountId',
          type: 'AccountId',
        },
        {
          name: 'assetId',
          type: 'AssetId',
        },
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'Option<BalanceInfo>',
    },
    totalBalance: {
      description: 'Get total balance (free + reserved) of particular asset for account.',
      params: [
        {
          name: 'accountId',
          type: 'AccountId',
        },
        {
          name: 'assetId',
          type: 'AssetId',
        },
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'Option<BalanceInfo>',
    },
    totalSupply: {
      description: 'Get total supply of particular asset on chain.',
      params: [
        {
          name: 'assetId',
          type: 'AssetId',
        },
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'Option<BalanceInfo>',
    },
    listAssetIds: {
      description: 'List Ids of all assets registered on chain.',
      params: [
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'Vec<AssetId>',
    },
    listAssetInfos: {
      description: 'List Infos of all assets registered on chain.',
      params: [
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'Vec<AssetInfo>',
    },
    getAssetInfo: {
      description: 'Get Info for particular asset on chain.',
      params: [
        {
          name: 'assetId',
          type: 'AssetId',
        },
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'Option<AssetInfo>',
    },
  },
  types: {
    BalanceInfo: {
      balance: 'Balance',
    },
    AssetInfo: {
      assetId: 'AssetId',
      symbol: 'AssetSymbolStr',
      name: 'AssetNameStr',
      precision: 'u8',
      isMintable: 'bool',
    },
    AssetSymbolStr: 'String',
    AssetNameStr: 'String',
    AssetRecord: 'Null', // large structure, define properly if needed
  },
};
