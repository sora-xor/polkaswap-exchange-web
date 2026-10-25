import { FPNumber } from '@sora-substrate/sdk';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { gql } from '@urql/core';

import type { CodecString } from '@sora-substrate/sdk';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { PolkaswapPoolXYKEntity } from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/types';
import type { ConnectionQueryResponse, PoolXYKEntity } from '@/lib/soraneo-wallet/src/services/indexer/types';

export type PoolData = {
  baseAssetId: string;
  targetAssetId: string;
  baseAssetReserves: CodecString;
  targetAssetReserves: CodecString;
  priceUSD: FPNumber;
  apy: FPNumber;
};

const PolkaswapPoolsQuery = gql<ConnectionQueryResponse<PolkaswapPoolXYKEntity>>`
  query PolkaswapPoolsQuery($after: Cursor, $filter: PoolXYKFilter) {
    data: poolXYKs(after: $after, filter: $filter) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          baseAssetId
          targetAssetId
          baseAssetReserves
          targetAssetReserves
          priceUSD
          liquidityUSD
          strategicBonusApy
        }
      }
    }
  }
`;

const parse = (item: PoolXYKEntity): PoolData => {
  const apy = new FPNumber(item.strategicBonusApy ?? 0).mul(FPNumber.HUNDRED);
  const priceUSD = new FPNumber(item.priceUSD ?? 0);

  return {
    baseAssetId: item.baseAssetId,
    targetAssetId: item.targetAssetId,
    baseAssetReserves: item.baseAssetReserves,
    targetAssetReserves: item.targetAssetReserves,
    priceUSD,
    apy,
  };
};

const polkaswapPoolsFilter = (ids: string[]) => {
  const filter: any = {
    baseAssetReserves: { greaterThan: '0' },
    targetAssetReserves: { greaterThan: '0' },
  };

  if (ids.length) {
    filter.targetAssetId = { in: ids };
  }

  return filter;
};

export async function fetchPoolsData(assets?: Asset[]): Promise<PoolData[]> {
  const ids = assets?.map((item) => item.address) ?? [];
  const filter = polkaswapPoolsFilter(ids);
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const result = await polkaswapIndexer.services.explorer.fetchAllEntities(PolkaswapPoolsQuery, { filter }, parse);

  return result ?? [];
}
