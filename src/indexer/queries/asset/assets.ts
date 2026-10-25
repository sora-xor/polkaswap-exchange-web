import { FPNumber } from '@sora-substrate/sdk';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { retryOnEmptyResult } from '@/indexer/queries/retry';
import { gql } from '@urql/core';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { AssetEntity, ConnectionQueryResponse } from '@/lib/soraneo-wallet/src/services/indexer/types';

export type TokenData = {
  priceUSD: FPNumber;
  priceChangeDay: FPNumber;
  priceChangeWeek: FPNumber;
  volumeDayUSD: FPNumber;
  volumeWeekUSD: FPNumber;
  tvlUSD: FPNumber;
  velocity: FPNumber;
};

const PolkaswapAssetsQuery = gql<ConnectionQueryResponse<AssetEntity>>`
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

const parse = (item: AssetEntity): Record<string, TokenData> => {
  const priceUSD = new FPNumber(item.priceUSD ?? 0);
  const liquidityPools = FPNumber.fromCodecValue(item.liquidity ?? 0);
  const liquidityBooks = FPNumber.fromCodecValue((item as any).liquidityBooks ?? 0);
  const liquidity = liquidityPools.add(liquidityBooks);
  const tvlUSD = liquidity.mul(priceUSD);

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
  const ids = assets.map((item) => item.address);
  const filter = polkaswapAssetsFilter(ids);
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const items = await retryOnEmptyResult(
    async () => polkaswapIndexer.services.explorer.fetchAllEntities(PolkaswapAssetsQuery, { filter }, parse),
    (value) => !value?.length
  );

  if (!items) return {};

  return items.reduce((acc, item) => ({ ...acc, ...item }), {});
}
