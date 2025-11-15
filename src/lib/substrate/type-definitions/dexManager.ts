export default {
  rpc: {
    listDEXIds: {
      description: 'Enumerate available ids of DEXes',
      params: [
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'Vec<DEXId>',
    },
    testBalance: {
      description: 'Test type of Balance',
      params: [
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'Fixed',
    },
  },
  types: {},
};
