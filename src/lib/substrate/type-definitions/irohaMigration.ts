export default {
  rpc: {
    needsMigration: {
      description: 'Check if the account needs migration',
      params: [
        {
          name: 'irohaAddress',
          type: 'String',
        },
        {
          name: 'at',
          type: 'BlockHash',
          isOptional: true,
        },
      ],
      type: 'bool',
    },
  },
  types: {
    PendingMultisigAccount: {
      approvingAccounts: 'Vec<AccountId>',
      migrateAt: 'Option<BlockNumber>',
    },
  },
};
