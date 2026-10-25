export default {
  rpc: {
    claimables: {
      description: 'Get claimable rewards',
      params: [
        {
          name: 'ethAddress',
          type: 'EthAddress',
        },
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'Vec<BalanceInfo>',
    },
  },
  types: {},
};
