import { gql } from '@urql/core';

import type { PolkaswapSubscriptionPayload, PolkaswapAccountEntityMutation } from '../types';

export const AccountHistorySubscription = gql<PolkaswapSubscriptionPayload<PolkaswapAccountEntityMutation>>`
  subscription PolkaswapAccountHistorySubscription($id: [ID!]) {
    payload: accounts(id: $id, mutation: [UPDATE, INSERT]) {
      id
      mutation_type
      _entity
    }
  }
`;
