import { gql } from '@urql/core';

import { UpdatesStream } from '../../types';

import type { SubquerySubscriptionPayload } from '../types';

export const PriceStreamSubscription = gql<SubquerySubscriptionPayload<UpdatesStream>>`
  subscription SubqueryPriceStreamSubscription {
    payload: updatesStreams(id: "price", mutation: [UPDATE, INSERT]) {
      id
      mutation_type
      _entity
    }
  }
`;

export const AssetRegistrationStreamSubscription = gql<SubquerySubscriptionPayload<UpdatesStream>>`
  subscription SubqueryAssetRegistrationStreamSubscription {
    payload: updatesStreams(id: "assetRegistration", mutation: [UPDATE, INSERT]) {
      id
      mutation_type
      _entity
    }
  }
`;
