import { gql } from '@urql/core';

import { PageInfoFragment } from '../../fragments/pageInfo';

import type { ConnectionQueryResponse } from '../../types';

/** Indexed reference from an account participant to its full history element. */
export type AccountHistoryReference = {
  extrinsicHash: string;
};

/**
 * Reads the account-participation index. Unlike `historyElements.address`, this
 * connection includes senders, recipients, and other indexed participants.
 */
export const AccountHistoryReferencesQuery = gql<ConnectionQueryResponse<AccountHistoryReference>>`
  query PolkaswapAccountHistoryReferences(
    $account: String!
    $first: Int = 8
    $after: Cursor = ""
    $orderBy: [OrderBy!] = [TIMESTAMP_DESC]
  ) {
    data: accountTrades(first: $first, after: $after, orderBy: $orderBy, filter: { account: { equalTo: $account } }) {
      edges {
        cursor
        node {
          extrinsicHash
        }
      }
      pageInfo {
        ...PageInfoFragment
      }
      totalCount
    }
  }
  ${PageInfoFragment}
`;
