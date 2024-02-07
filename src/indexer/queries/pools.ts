import { FPNumber } from '@sora-substrate/util';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type { CodecString } from '@sora-substrate/util';
import type { Asset } from '@sora-substrate/util/build/assets/types';
import type { SubqueryPoolXYKEntity } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';
import type { SubsquidPoolXYKEntity } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subsquid/types';
import type { ConnectionQueryResponse, PoolXYKEntity } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

export type PoolData = {
  baseAssetId: string;
  targetAssetId: string;
  baseAssetReserves: CodecString;
  targetAssetReserves: CodecString;
  priceUSD: FPNumber;
  apy: FPNumber;
};

const SubqueryPoolsQuery = gql<ConnectionQueryResponse<SubqueryPoolXYKEntity>>`
  query SubqueryPoolsQuery($after: Cursor, $filter: PoolXYKFilter) {
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
          strategicBonusApy
        }
      }
    }
  }
`;

const SubsquidPoolsQuery = gql<ConnectionQueryResponse<SubsquidPoolXYKEntity>>`
  query SubsquidPoolsQuery($after: String, $where: PoolXYKWhereInput) {
    data: poolXyksConnection(after: $after, where: $where) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          baseAsset {
            id
          }
          targetAsset {
            id
          }
          baseAssetReserves
          targetAssetReserves
          priceUSD
          strategicBonusApy
        }
      }
    }
  }
`;

const parse = (item: PoolXYKEntity): PoolData => {
  const apy = new FPNumber(item.strategicBonusApy ?? 0).mul(FPNumber.HUNDRED);
  const priceUSD = new FPNumber(item.priceUSD ?? 0);

  const baseAssetId = 'baseAssetId' in item ? item.baseAssetId : item.baseAsset.id;
  const targetAssetId = 'targetAssetId' in item ? item.targetAssetId : item.targetAsset.id;

  return {
    baseAssetId,
    targetAssetId,
    baseAssetReserves: item.baseAssetReserves,
    targetAssetReserves: item.targetAssetReserves,
    priceUSD,
    apy,
  };
};

export async function fetchPoolsData(assets?: Asset[]): Promise<PoolData[]> {
  const ids = assets?.map((item) => item.address) ?? [];
  const indexer = getCurrentIndexer();

  let result: Nullable<PoolData[]>;

  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const filter = ids.length ? { targetAssetId: { in: ids }, targetAssetReserves: { greaterThan: '0' } } : undefined;
      const variables = { filter };
      const subqueryIndexer = indexer as SubqueryIndexer;
      result = await subqueryIndexer.services.explorer.fetchAllEntities(SubqueryPoolsQuery, variables, parse);
      break;
    }
    case IndexerType.SUBSQUID: {
      const where = ids.length ? { targetAsset: { id_in: ids }, targetAssetReserves_gt: '0' } : undefined;
      const variables = { where };
      const subsquidIndexer = indexer as SubsquidIndexer;
      result = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(SubsquidPoolsQuery, variables, parse);
      break;
    }
  }

  return result ?? [];
}
