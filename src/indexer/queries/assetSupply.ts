import { gql } from '@urql/core';
import { FPNumber } from '@sora-substrate/math';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import type { SnapshotTypes } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';
import type {
  SubqueryAssetSnapshotEntity,
  SubqueryConnectionQueryResponse,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';
import { SubsquidAssetSnapshotEntity } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subsquid/types';

const { IndexerType } = WALLET_CONSTS;

export type ChartData = {
  timestamp: number;
  value: number;
  mint: number;
  burn: number;
};

const SubqueryAssetSupplyQuery = gql<SubqueryConnectionQueryResponse<SubqueryAssetSnapshotEntity>>`
  query AssetSupplyQuery($after: Cursor, $type: SnapshotType, $id: String, $from: Int, $to: Int) {
    data: assetSnapshots(
      after: $after
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: $type } }
          { assetId: { equalTo: $id } }
          { timestamp: { lessThanOrEqualTo: $from } }
          { timestamp: { greaterThanOrEqualTo: $to } }
        ]
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          supply
          mint
          burn
        }
      }
    }
  }
`;

const SubsquidAssetSupplyQuery = gql<SubqueryConnectionQueryResponse<SubsquidAssetSnapshotEntity>>`
  query AssetSupplyQuery($after: Cursor, $type: SnapshotType, $id: String, $from: Int, $to: Int) {
    data: assetSnapshotsConnection(
      after: $after
      orderBy: timestamp_DESC
      where: { AND: [{ type_eq: $type }, { asset: { id_eq: $id } }, { timestamp_lte: $from }, { timestamp_gte: $to }] }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          supply
          mint
          burn
        }
      }
    }
  }
`;

const toNumber = (value: string): number => {
  const fp = FPNumber.fromCodecValue(value);

  return fp.isFinity() ? fp.toNumber() : 0;
};

const parse = (node: SubqueryAssetSnapshotEntity | SubsquidAssetSnapshotEntity): ChartData => {
  return {
    timestamp: +node.timestamp * 1000,
    value: toNumber(node.supply),
    mint: toNumber(node.mint),
    burn: toNumber(node.burn),
  };
};

export async function fetchData(id: string, from: number, to: number, type: SnapshotTypes): Promise<ChartData[]> {
  const indexer = getCurrentIndexer();
  let data: Nullable<ChartData[]>;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      data = await subqueryIndexer.services.explorer.fetchAllEntities(
        SubqueryAssetSupplyQuery,
        { id, from, to, type },
        parse
      );
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;
      data = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(
        SubsquidAssetSupplyQuery,
        { id, from, to, type },
        parse
      );
      break;
    }
  }

  return data ?? [];
}
