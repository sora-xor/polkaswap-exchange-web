import { FPNumber } from '@sora-substrate/util';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type { Asset } from '@sora-substrate/util/build/assets/types';
import type {
  SubqueryAssetEntity,
  SubqueryConnectionQueryResponse,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';
import type {
  SubsquidAssetEntity,
  SubsquidConnectionQueryResponse,
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

type SubqueryAssetData = SubqueryAssetEntity & {
  liquidityUSD?: number;
  priceChangeDay?: number;
  priceChangeWeek?: number;
  volumeDayUSD?: number;
  volumeWeekUSD?: number;
  velocity?: number;
};

type SubsquidAssetData = SubsquidAssetEntity & {
  liquidityUSD?: number;
  priceChangeDay?: number;
  priceChangeWeek?: number;
  volumeDayUSD?: number;
  volumeWeekUSD?: number;
  velocity?: number;
};

const SubqueryAssetsQuery = gql<SubqueryConnectionQueryResponse<SubqueryAssetData>>`
  query AssetsQuery($after: Cursor, $ids: [String!]) {
    data: assets(orderBy: ID_ASC, after: $after, filter: { id: { in: $ids } }) {
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
          liquidityUSD
          velocity
        }
      }
    }
  }
`;

const SubsquidAssetsQuery = gql<SubsquidConnectionQueryResponse<SubsquidAssetData>>`
  query AssetsConnectionQuery($after: String, $ids: [String!]) {
    data: assetsConnection(orderBy: id_ASC, after: $after, where: { AND: [{ id_in: $ids }] }) {
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
          liquidityUSD
          velocity
        }
      }
    }
  }
`;

const parse = (item: SubqueryAssetData | SubsquidAssetData): Record<string, TokenData> => {
  return {
    [item.id]: {
      priceUSD: new FPNumber(item.priceUSD ?? 0),
      priceChangeDay: new FPNumber(item.priceChangeDay ?? 0),
      priceChangeWeek: new FPNumber(item.priceChangeDay ?? 0),
      volumeDayUSD: new FPNumber(item.volumeDayUSD ?? 0),
      volumeWeekUSD: new FPNumber(item.volumeWeekUSD ?? 0),
      tvlUSD: new FPNumber(item.liquidityUSD ?? 0),
      velocity: new FPNumber(item.velocity ?? 0),
    },
  };
};

export async function fetchTokensData(whitelistAssets: Asset[]): Promise<Record<string, TokenData>> {
  const ids = whitelistAssets.map((item) => item.address); // only whitelisted assets
  const variables = { ids };
  const indexer = getCurrentIndexer();
  let items: Nullable<Record<string, TokenData>[]>;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      items = await subqueryIndexer.services.explorer.fetchAllEntities(SubqueryAssetsQuery, variables, parse);
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;
      items = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(SubsquidAssetsQuery, variables, parse);
      break;
    }
  }

  if (!items) return {};

  return items.reduce((acc, item) => ({ ...acc, ...item }), {});
}
