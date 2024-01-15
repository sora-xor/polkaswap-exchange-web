import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type { OCLH, SnapshotItem } from '@/types/chart';

import type { SubqueryConnectionQueryResponse } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';
import type {
  OrderBookSnapshotEntity,
  ConnectionQueryResponseData,
  SnapshotTypes,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

const preparePriceData = (item: OrderBookSnapshotEntity): OCLH => {
  const { open, close, low, high } = item.price;

  return [+open, +close, +low, +high];
};

const transformSnapshot = (item: OrderBookSnapshotEntity): SnapshotItem => {
  const timestamp = +item.timestamp * 1000;
  const price = preparePriceData(item);
  const volume = +item.volumeUSD;
  return { timestamp, price, volume };
};

const subqueryOrderBookPriceFilter = (orderBookId: string, type: SnapshotTypes) => {
  return {
    and: [
      {
        orderBookId: {
          equalTo: orderBookId,
        },
      },
      {
        type: {
          equalTo: type,
        },
      },
    ],
  };
};

const SubqueryOrderBookPriceQuery = gql<SubqueryConnectionQueryResponse<OrderBookSnapshotEntity>>`
  query SubqueryOrderBookPriceQuery($after: Cursor = "", $filter: OrderBookSnapshotFilter, $first: Int = null) {
    data: orderBookSnapshots(after: $after, first: $first, filter: $filter, orderBy: [TIMESTAMP_DESC]) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        node {
          price
          timestamp
          volumeUSD
        }
      }
    }
  }
`;

export async function fetchOrderBookData(
  orderBookId: string,
  type: SnapshotTypes,
  first?: number,
  after?: string | null
): Promise<Nullable<ConnectionQueryResponseData<SnapshotItem>>> {
  const indexer = getCurrentIndexer();

  let data!: Nullable<ConnectionQueryResponseData<OrderBookSnapshotEntity>>;

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      const filter = subqueryOrderBookPriceFilter(orderBookId, type);
      const variables = { filter, first, after };
      data = await subqueryIndexer.services.explorer.fetchEntities(SubqueryOrderBookPriceQuery, variables);
      break;
    }
    case IndexerType.SUBSQUID: {
      return null;
    }
  }

  if (!data) return null;

  return {
    ...data,
    edges: data.edges.map((edge) => {
      return {
        ...edge,
        node: transformSnapshot(edge.node),
      };
    }),
  };
}
