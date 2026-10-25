import { gql } from '@urql/core';

import { PageInfoFragment } from '../../fragments/pageInfo';

import type { QueryData, ConnectionQueryResponse, UpdatesStream } from '../../types';
import type { PolkaswapAssetEntity } from '../types';

export const FiatPriceQuery = gql<ConnectionQueryResponse<PolkaswapAssetEntity>>`
  query PolkaswapFiatPriceQuery($after: Cursor = "", $first: Int = 100) {
    data: assets(first: $first, after: $after, filter: { priceUSD: { greaterThan: "0" } }) {
      pageInfo {
        ...PageInfoFragment
      }
      edges {
        node {
          id
          priceUSD
        }
      }
    }
  }
  ${PageInfoFragment}
`;

export const FiatPriceStreamQuery = gql<QueryData<UpdatesStream>>`
  query PolkaswapFiatPriceStreamQuery {
    data: updatesStream(id: "price") {
      block
      data
    }
  }
`;
