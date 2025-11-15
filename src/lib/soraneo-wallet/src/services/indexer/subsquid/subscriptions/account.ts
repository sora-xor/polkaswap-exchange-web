import { gql } from '@urql/core';

import type { SubscriptionPayload } from '../../types';
import type { SubsquidAccountEntityMutation } from '../types';

export const AccountHistorySubscription = gql<SubscriptionPayload<SubsquidAccountEntityMutation>>`
  subscription SubsquidAccountHistorySubscription($id: String!) {
    payload: accountById(id: $id) {
      id
      latestHistoryElement {
        id
      }
    }
  }
`;
