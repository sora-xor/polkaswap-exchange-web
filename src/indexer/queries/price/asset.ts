import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type { OCLH, SnapshotItem } from '@/types/chart';

import type {
  AssetSnapshotEntity,
  ConnectionQueryResponse,
  ConnectionQueryResponseData,
  SnapshotTypes,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

const preparePriceData = (item: AssetSnapshotEntity): OCLH => {
  const { open, close, low, high } = item.priceUSD;

  return [+open, +close, +low, +high];
};

const transformSnapshot = (item: AssetSnapshotEntity): SnapshotItem => {
  const timestamp = +item.timestamp * 1000;
  const price = preparePriceData(item);
  const volume = +item.volume.amountUSD;
  return { timestamp, price, volume };
};

const subqueryAssetPriceFilter = (assetAddress: string, type: SnapshotTypes) => {
  return {
    and: [
      {
        assetId: {
          equalTo: assetAddress,
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

const SubqueryAssetPriceQuery = gql<ConnectionQueryResponse<AssetSnapshotEntity>>`
  query SubqueryAssetPriceQuery($after: Cursor = "", $filter: AssetSnapshotFilter, $first: Int = null) {
    data: assetSnapshots(after: $after, first: $first, filter: $filter, orderBy: [TIMESTAMP_DESC]) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          priceUSD
          timestamp
          volume
        }
      }
    }
  }
`;

const subsquidAssetPriceFilter = (assetAddress: string, type: SnapshotTypes) => {
  return {
    AND: [
      {
        asset: { id_eq: assetAddress },
      },
      {
        type_eq: type,
      },
    ],
  };
};

const SubsquidAssetPriceQuery = gql<ConnectionQueryResponse<AssetSnapshotEntity>>`
  query SubsquidAssetPriceQuery($after: String = null, $filter: AssetSnapshotWhereInput, $first: Int = 1000) {
    data: assetSnapshotsConnection(after: $after, first: $first, where: $filter, orderBy: [timestamp_DESC]) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          priceUSD {
            close
            high
            low
            open
          }
          volume {
            amountUSD
          }
          timestamp
        }
      }
    }
  }
`;

export async function fetchAssetData(
  assetId: string,
  type: SnapshotTypes,
  first?: number,
  after?: string | null
): Promise<Nullable<ConnectionQueryResponseData<SnapshotItem>>> {
  const indexer = getCurrentIndexer();

  let data!: Nullable<ConnectionQueryResponseData<AssetSnapshotEntity>>;

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      const filter = subqueryAssetPriceFilter(assetId, type);
      const variables = { filter, first, after };
      data = await subqueryIndexer.services.explorer.fetchEntities(SubqueryAssetPriceQuery, variables);
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;

      if (after === '') {
        after = null;
      }

      const filter = subsquidAssetPriceFilter(assetId, type);
      const variables = { filter, first, after };
      data = await subsquidIndexer.services.explorer.fetchEntitiesConnection(SubsquidAssetPriceQuery, variables);
      break;
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
