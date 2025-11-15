export default {
  rpc: {
    latestDigest: {
      description: 'Get leaf provider logs.',
      params: [
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'AuxiliaryDigest',
    },
  },
  types: {
    AuxiliaryDigest: {
      logs: 'Vec<AuxiliaryDigestItem>',
    },
    AuxiliaryDigestItem: {
      _enum: {
        Commitment: '(EthNetworkId, ChannelId, H256)',
      },
    },
    EthNetworkId: 'U256',
    ChannelId: {
      _enum: {
        Basic: null,
        Incentivized: null,
      },
    },
  },
};
