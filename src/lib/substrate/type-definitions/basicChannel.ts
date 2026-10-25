export default {
  rpc: {
    commitment: {
      description: 'Get basic channel messages.',
      params: [
        {
          name: 'commitmentHash',
          type: 'H256',
        },
      ],
      type: 'Option<Vec<BasicChannelMessage>>',
    },
  },
  types: {
    BasicChannelMessage: {
      networkId: 'EthNetworkId',
      target: 'H160',
      nonce: 'u64',
      payload: 'Vec<u8>',
    },
  },
};
