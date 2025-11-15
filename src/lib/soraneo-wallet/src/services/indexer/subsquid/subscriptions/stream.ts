import { gql } from '@urql/core';

import type { SubscriptionPayload, UpdatesStream } from '../../types';

export const PriceStreamSubscription = gql<SubscriptionPayload<UpdatesStream>>`
  subscription SubsquidPriceStreamSubscription {
    payload: updatesStreamById(id: "price") {
      id
      block
      data
    }
  }
`;

export const AssetRegistrationStreamSubscription = gql<SubscriptionPayload<UpdatesStream>>`
  subscription SubsquidAssetRegistrationStreamSubscription {
    payload: updatesStreamById(id: "assetRegistration") {
      id
      block
      data
    }
  }
`;
