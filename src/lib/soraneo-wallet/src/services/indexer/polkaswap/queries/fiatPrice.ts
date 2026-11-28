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

/** Returns the complete current exact-price map when supported by the configured indexer. */
export const ExactFiatPriceStreamQuery = gql<QueryData<UpdatesStream>>`
  query PolkaswapExactFiatPriceStreamQuery {
    data: updatesStream(id: "price") {
      block
      pricesExact
    }
  }
`;
