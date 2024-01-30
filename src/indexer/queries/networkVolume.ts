import { FPNumber } from '@sora-substrate/math';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import type {
  SnapshotTypes,
  NetworkSnapshotEntity,
  ConnectionQueryResponse,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

type ChartData = {
  timestamp: number;
  value: FPNumber;
};

const SubqueryNetworkVolumeQuery = gql<ConnectionQueryResponse<NetworkSnapshotEntity>>`
  query NetworkVolumeQuery($after: Cursor, $fees: Boolean!, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshots(
      after: $after
      orderBy: TIMESTAMP_DESC
      filter: {
        and: [
          { type: { equalTo: $type } }
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
          volumeUSD @skip(if: $fees)
          fees @include(if: $fees)
        }
      }
    }
  }
`;

const SubsquidNetworkVolumeQuery = gql<ConnectionQueryResponse<NetworkSnapshotEntity>>`
  query NetworkVolumeQuery($after: String, $fees: Boolean!, $type: SnapshotType, $from: Int, $to: Int) {
    data: networkSnapshotsConnection(
      after: $after
      orderBy: timestamp_DESC
      where: { AND: [{ type_eq: $type }, { timestamp_lte: $from }, { timestamp_gte: $to }] }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          timestamp
          volumeUSD @skip(if: $fees)
          fees @include(if: $fees)
        }
      }
    }
  }
`;

const parse =
  (fees: boolean) =>
  (node: NetworkSnapshotEntity): ChartData => {
    const value = fees ? FPNumber.fromCodecValue(node.fees) : new FPNumber(node.volumeUSD);

    return {
      timestamp: +node.timestamp * 1000,
      value: value.isFinity() ? value : FPNumber.ZERO,
    };
  };

export async function fetchData(fees: boolean, from: number, to: number, type: SnapshotTypes): Promise<ChartData[]> {
  const indexer = getCurrentIndexer();
  let data: Nullable<ChartData[]>;
  switch (indexer.type) {
    case IndexerType.SUBQUERY: {
      const subqueryIndexer = indexer as SubqueryIndexer;
      data = await subqueryIndexer.services.explorer.fetchAllEntities(
        SubqueryNetworkVolumeQuery,
        { fees, from, to, type },
        parse(fees)
      );
      break;
    }
    case IndexerType.SUBSQUID: {
      const subsquidIndexer = indexer as SubsquidIndexer;
      data = await subsquidIndexer.services.explorer.fetchAllEntitiesConnection(
        SubsquidNetworkVolumeQuery,
        { fees, from, to, type },
        parse(fees)
      );
      break;
    }
  }

  return data ?? [];
}
