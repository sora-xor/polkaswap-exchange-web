import { FPNumber } from '@sora-substrate/util';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type { Asset } from '@sora-substrate/util/build/assets/types';
import type {
  AssetEntity,
  ConnectionQueryResponse,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subsquid/types';

const { IndexerType } = WALLET_CONSTS;

export type TokenData = {
  priceUSD: FPNumber;
  priceChangeDay: FPNumber;
  priceChangeWeek: FPNumber;
  volumeDayUSD: FPNumber;
  volumeWeekUSD: FPNumber;
  tvlUSD: FPNumber;
  velocity: FPNumber;
};

const SubqueryAssetsQuery = gql<ConnectionQueryResponse<AssetEntity>>`
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

const SubsquidAssetsQuery = gql<ConnectionQueryResponse<AssetEntity>>`
  query AssetsConnectionQuery($after: String, $where: AssetWhereInput) {
    data: assetsConnection(orderBy: id_ASC, after: $after, where: $where) {
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

export async function fetchTokensData(assets: Asset[]): Promise<Record<string, TokenData>> {
  const ids = assets.map((item) => item.address);
  const indexer = getCurrentIndexer();
  let items: Nullable<Record<string, TokenData>[]>;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const filter = ids.length ? { id: { in: ids } } : undefined;
      const variables = { filter };
      const subqueryIndexer = indexer as SubqueryIndexer;
      items = await subqueryIndexer.services.explorer.fetchAllEntities(SubqueryAssetsQuery, variables, parse);
      break;
    }
    case IndexerType.SUBSQUID: {
      const where = ids.length ? { id_in: ids } : undefined;
      const variables = { where };
      const subsquidIndexer = indexer as SubsquidIndexer;
      items = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(SubsquidAssetsQuery, variables, parse);
      break;
    }
  }

  if (!items) return {};

  return items.reduce((acc, item) => ({ ...acc, ...item }), {});
}
