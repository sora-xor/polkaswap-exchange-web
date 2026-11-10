import { FPNumber } from '@sora-substrate/sdk';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { retryOnEmptyResult } from '@/indexer/queries/retry';
import { gql } from '@urql/core';
import { readMarketPrice, valueAtMarketPrice } from '@/lib/soraneo-wallet/src/services/indexer/marketPrice';
import { fetchByAssetIds, marketRequestOptions } from '@/indexer/queries/asset/batches';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { AssetEntity, ConnectionQueryResponse } from '@/lib/soraneo-wallet/src/services/indexer/types';

export type TokenData = {
  priceUSD: FPNumber | null;
  priceChangeDay: FPNumber;
  priceChangeWeek: FPNumber;
  volumeDayUSD: FPNumber;
  volumeWeekUSD: FPNumber;
  tvlUSD: FPNumber | null;
  velocity: FPNumber;
};

const makePolkaswapAssetsQuery = (exact: boolean) => gql<ConnectionQueryResponse<AssetEntity>>`
  query AssetsQuery($after: Cursor, $filter: AssetFilter) {
    data: assets(orderBy: ID_ASC, after: $after, filter: $filter) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          priceUSD
          ${exact ? 'priceUSDExact' : ''}
          priceChangeDay
          priceChangeWeek
          volumeDayUSD
          volumeWeekUSD
          liquidity
          liquidityBooks
          velocity
        }
      }
    }
  }
`;
const PolkaswapAssetsQuery = makePolkaswapAssetsQuery(false);
const ExactPolkaswapAssetsQuery = makePolkaswapAssetsQuery(true);

/** Decode the two native reserve fields using this token's chain precision. */
const parse = (item: AssetEntity, decimals: number): Record<string, TokenData> => {
  const priceUSD = readMarketPrice(item.priceUSDExact, item.priceUSD);
  const liquidityPools = FPNumber.fromCodecValue(item.liquidity ?? 0, decimals);
  const liquidityBooks = FPNumber.fromCodecValue(item.liquidityBooks ?? 0, decimals);
  const liquidity = liquidityPools.add(liquidityBooks);
  const tvlUSD = valueAtMarketPrice(liquidity, priceUSD);

  return {
    [item.id]: {
      priceUSD,
      priceChangeDay: new FPNumber(item.priceChangeDay ?? 0),
      priceChangeWeek: new FPNumber(item.priceChangeWeek ?? 0),
      volumeDayUSD: new FPNumber(item.volumeDayUSD ?? 0),
      volumeWeekUSD: new FPNumber(item.volumeWeekUSD ?? 0),
      tvlUSD,
      velocity: new FPNumber(item.velocity ?? 0),
    },
  };
};

const polkaswapAssetsFilter = (ids: string[]) => {
  const filter: any = {
    or: [{ liquidity: { greaterThan: '0' } }, { liquidityBooks: { greaterThan: '0' } }],
  };

  if (ids.length) {
    filter.id = { in: ids };
  }

  return filter;
};

export async function fetchTokensData(assets: Asset[]): Promise<Record<string, TokenData>> {
  const decimals = new Map(assets.map((asset) => [asset.address, asset.decimals]));
  const ids = [...decimals.keys()];
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const query = (await polkaswapIndexer.services.explorer.supportsExactPrices())
    ? ExactPolkaswapAssetsQuery
    : PolkaswapAssetsQuery;
  const items = await retryOnEmptyResult(
    () =>
      fetchByAssetIds(ids, (batch) =>
        polkaswapIndexer.services.explorer.fetchAllEntities(
          query,
          { filter: polkaswapAssetsFilter(batch) },
          (row) => parse(row, decimals.get(row.id) ?? FPNumber.DEFAULT_PRECISION),
          marketRequestOptions
        )
      ),
    (value) => !value?.length
  );

  if (!items) return {};

  return items.reduce((acc, item) => ({ ...acc, ...item }), {});
}
