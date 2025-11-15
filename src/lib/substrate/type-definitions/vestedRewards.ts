export default {
  rpc: {
    crowdloanClaimable: {
      description: 'Get available crowdloan reward for a user.',
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
    crowdloanLease: {
      description: 'Get crowdloan rewards lease period info.',
      params: [
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'CrowdloanLease',
    },
  },
  types: {
    CrowdloanLease: {
      startBlock: 'String',
      totalDays: 'String',
      blocksPerDay: 'String',
    },
  },
};
