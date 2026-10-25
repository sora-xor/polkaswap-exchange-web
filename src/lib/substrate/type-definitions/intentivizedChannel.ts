export default {
  rpc: {
    commitment: {
      description: 'Get intentivized channel messages.',
      params: [
        {
          name: 'commitmentHash',
          type: 'H256',
        },
      ],
      type: 'Option<Vec<IntentivizedChannelMessage>>',
    },
  },
  types: {
    IntentivizedChannelMessage: {
      networkId: 'EthNetworkId',
      target: 'H160',
      nonce: 'u64',
      fee: 'U256',
      payload: 'Vec<u8>',
    },
  },
};
