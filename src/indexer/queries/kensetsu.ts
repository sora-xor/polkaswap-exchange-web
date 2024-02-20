import { FPNumber } from '@sora-substrate/util';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type { SubqueryHistoryElement } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';
import type {
  ConnectionQueryResponse,
  HistoryElementAssetBurn,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

const KensetsuQuery = gql<ConnectionQueryResponse<SubqueryHistoryElement>>`
  query ($start: Int = 0, $end: Int = 0, $after: Cursor = "", $first: Int = 100) {
    data: historyElements(
      first: $first
      after: $after
      filter: {
        and: [
          { blockHeight: { greaterThanOrEqualTo: $start } }
          { blockHeight: { lessThanOrEqualTo: $end } }
          { module: { equalTo: "assets" } }
          { method: { equalTo: "burn" } }
          { data: { contains: { assetId: "0x0200000000000000000000000000000000000000000000000000000000000000" } } }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          address
          data
        }
      }
    }
  }
`;

type KensetsuBurn = {
  address: string;
  timestamp: number;
  amount: FPNumber;
};

const parse = (item: SubqueryHistoryElement): KensetsuBurn => {
  const data = item.data as HistoryElementAssetBurn;

  return {
    address: item.address,
    timestamp: item.timestamp,
    amount: new FPNumber(data.amount),
  };
};

export async function fetchData(start: number, end: number): Promise<KensetsuBurn[]> {
  const indexer = getCurrentIndexer();

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const variables = { start, end };
      const subqueryIndexer = indexer as SubqueryIndexer;
      const items = await subqueryIndexer.services.explorer.fetchAllEntities(KensetsuQuery, variables, parse);

      return items ?? [];
    }
  }

  return [];
}
