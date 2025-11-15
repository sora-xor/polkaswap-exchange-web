export default {
  rpc: {},
  types: {
    VotingOption: {
      _enum: ['Yes', 'No'],
    },
    HermesVotingInfo: {
      votingOption: 'VotingOption',
      numberOfHermes: 'Balance',
      hermesWithdrawn: 'bool',
    },
    HermesPollInfo: {
      creator: 'AccountId',
      hermesLocked: 'Balance',
      pollStartTimestamp: 'Moment',
      pollEndTimestamp: 'Moment',
      title: 'String',
      description: 'String',
      creatorHermesWithdrawn: 'bool',
    },
  },
};
