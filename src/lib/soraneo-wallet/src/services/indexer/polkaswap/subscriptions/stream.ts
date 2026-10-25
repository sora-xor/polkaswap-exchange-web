import { gql } from '@urql/core';

import { UpdatesStream } from '../../types';

import type { PolkaswapSubscriptionPayload } from '../types';

export const PriceStreamSubscription = gql<PolkaswapSubscriptionPayload<UpdatesStream>>`
  subscription PolkaswapPriceStreamSubscription {
    payload: updatesStreams(id: "price", mutation: [UPDATE, INSERT]) {
      id
      mutation_type
      _entity
    }
  }
`;

export const AssetRegistrationStreamSubscription = gql<PolkaswapSubscriptionPayload<UpdatesStream>>`
  subscription PolkaswapAssetRegistrationStreamSubscription {
    payload: updatesStreams(id: "assetRegistration", mutation: [UPDATE, INSERT]) {
      id
      mutation_type
      _entity
    }
  }
`;
