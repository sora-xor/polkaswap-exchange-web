import { FPNumber } from '@sora-substrate/sdk';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { gql } from '@urql/core';
import { readMarketPrice } from '@/lib/soraneo-wallet/src/services/indexer/marketPrice';
import { fetchByAssetIds, marketRequestOptions } from '@/indexer/queries/asset/batches';

import type { CodecString } from '@sora-substrate/sdk';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { PolkaswapPoolXYKEntity } from '@/lib/soraneo-wallet/src/services/indexer/polkaswap/types';
import type { ConnectionQueryResponse, PoolXYKEntity } from '@/lib/soraneo-wallet/src/services/indexer/types';

export type PoolData = {
  baseAssetId: string;
  targetAssetId: string;
  baseAssetReserves: CodecString;
  targetAssetReserves: CodecString;
  priceUSD: FPNumber | null;
  tvlUSD: FPNumber | null;
  apy: FPNumber;
};

const makePolkaswapPoolsQuery = (exact: boolean) => gql<ConnectionQueryResponse<PolkaswapPoolXYKEntity>>`
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
          ${exact ? 'priceUSDExact liquidityUSDExact' : ''}
          liquidityUSD
          strategicBonusApy
        }
      }
    }
  }
`;
const PolkaswapPoolsQuery = makePolkaswapPoolsQuery(false);
const ExactPolkaswapPoolsQuery = makePolkaswapPoolsQuery(true);

const parse = (item: PoolXYKEntity): PoolData => {
  const apy = new FPNumber(item.strategicBonusApy ?? 0).mul(FPNumber.HUNDRED);
  const priceUSD = readMarketPrice(item.priceUSDExact, item.priceUSD);

  return {
    baseAssetId: item.baseAssetId,
    targetAssetId: item.targetAssetId,
    baseAssetReserves: item.baseAssetReserves,
    targetAssetReserves: item.targetAssetReserves,
    priceUSD,
    // A USD mark has 18 decimals; a raw reserve can have a u8 native precision.
    tvlUSD: readMarketPrice(item.liquidityUSDExact, undefined, 18 + 255),
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
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const query = (await polkaswapIndexer.services.explorer.supportsExactPrices())
    ? ExactPolkaswapPoolsQuery
    : PolkaswapPoolsQuery;
  const result = await fetchByAssetIds(ids, (batch) =>
    polkaswapIndexer.services.explorer.fetchAllEntities(
      query,
      { filter: polkaswapPoolsFilter(batch) },
      parse,
      marketRequestOptions
    )
  );

  return result ?? [];
}
