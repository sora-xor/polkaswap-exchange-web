export default {
  rpc: {
    testMultiply2: {
      description: 'Test type of Balance',
      params: [
        {
          name: 'amount',
          type: 'String',
        },
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'Option<CustomInfo>',
    },
  },
  types: {
    CustomInfo: {
      amount: 'Balance',
    },
  },
};
