import { gql } from '@urql/core';

import type { SubquerySubscriptionPayload, SubqueryAccountEntityMutation } from '../types';

export const AccountHistorySubscription = gql<SubquerySubscriptionPayload<SubqueryAccountEntityMutation>>`
  subscription SubqueryAccountHistorySubscription($id: [ID!]) {
    payload: accounts(id: $id, mutation: [UPDATE, INSERT]) {
      id
      mutation_type
      _entity
    }
  }
`;
