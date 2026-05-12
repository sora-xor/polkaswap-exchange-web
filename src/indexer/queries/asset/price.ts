import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { retryOnEmptyResult } from '@/indexer/queries/retry';
import { gql } from '@urql/core';

import type { OCLH, SnapshotItem } from '@/types/chart';

import type {
  AssetSnapshotEntity,
  ConnectionQueryResponse,
  ConnectionQueryResponseData,
  SnapshotTypes,
} from '@/lib/soraneo-wallet/src/services/indexer/types';

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

const polkaswapAssetPriceFilter = (assetAddress: string, type: SnapshotTypes) => {
  return {
    assetId: {
      equalTo: assetAddress,
    },
    type: {
      equalTo: type,
    },
  };
};

const PolkaswapAssetPriceQuery = gql<ConnectionQueryResponse<AssetSnapshotEntity>>`
  query PolkaswapAssetPriceQuery($after: Cursor = "", $filter: AssetSnapshotFilter, $first: Int = null) {
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

export async function fetchAssetPriceData(
  entityId: string,
  type: SnapshotTypes,
  first?: number,
  after?: string | null
): Promise<Nullable<ConnectionQueryResponseData<SnapshotItem>>> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const filter = polkaswapAssetPriceFilter(entityId, type);
  const data = await retryOnEmptyResult(
    async () =>
      polkaswapIndexer.services.explorer.fetchEntities(PolkaswapAssetPriceQuery, {
        filter,
        first,
        after,
      }),
    (value) => !value?.edges?.length
  );

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
