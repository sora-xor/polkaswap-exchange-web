export default {
  rpc: {
    claimableAmount: {
      description: 'Get amount of PSWAP claimable by user (liquidity provision reward).',
      params: [
        {
          name: 'accountId',
          type: 'AccountId',
        },
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'BalanceInfo',
    },
  },
  types: {},
};
