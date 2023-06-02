import last from 'lodash/fp/last';
import { gql } from '@urql/core';
import { FPNumber } from '@sora-substrate/util';
import type { Asset } from '@sora-substrate/util/build/assets/types';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import type { AssetEntity, AssetSnapshotEntity } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';
import type {
  SubqueryAssetEntity,
  SubqueryAssetSnapshotEntity,
  SubqueryConnectionQueryResponse,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';
import type {
  SubsquidAssetEntity,
  SubsquidAssetSnapshotEntity,
  SubsquidConnectionQueryResponse,
} from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subsquid/types';

const { IndexerType } = WALLET_CONSTS;

export type TokenData = {
  reserves: FPNumber;
  startPriceDay: FPNumber;
  startPriceWeek: FPNumber;
  volumeDay: FPNumber;
  volumeWeek: FPNumber;
};

type SubqueryAssetData = SubqueryAssetEntity & {
  hourSnapshots: {
    nodes: SubqueryAssetSnapshotEntity[];
  };
  daySnapshots: {
    nodes: SubqueryAssetSnapshotEntity[];
  };
};

type SubsquidAssetData = SubsquidAssetEntity & {
  hourSnapshots: {
    nodes: SubsquidAssetSnapshotEntity[];
  };
  daySnapshots: {
    nodes: SubsquidAssetSnapshotEntity[];
  };
};

type AssetData = AssetEntity & {
  hourSnapshots: {
    nodes: AssetSnapshotEntity[];
  };
  daySnapshots: {
    nodes: AssetSnapshotEntity[];
  };
};

const SubqueryAssetsQuery = gql<SubqueryConnectionQueryResponse<SubqueryAssetData>>`
  query AssetsQuery($after: Cursor, $ids: [String!], $dayTimestamp: Int, $weekTimestamp: Int) {
    data: assets(after: $after, filter: { and: [{ id: { in: $ids } }, { liquidity: { greaterThan: "1" } }] }) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          liquidity
          hourSnapshots: data(
            filter: { and: [{ timestamp: { greaterThanOrEqualTo: $dayTimestamp } }, { type: { equalTo: HOUR } }] }
            orderBy: [TIMESTAMP_DESC]
          ) {
            nodes {
              priceUSD
              volume
            }
          }
          daySnapshots: data(
            filter: { and: [{ timestamp: { greaterThanOrEqualTo: $weekTimestamp } }, { type: { equalTo: DAY } }] }
            orderBy: [TIMESTAMP_DESC]
          ) {
            nodes {
              priceUSD
              volume
            }
          }
        }
      }
    }
  }
`;

const SubsquidAssetsQuery = gql<SubsquidConnectionQueryResponse<SubsquidAssetData>>`
  query AssetsQuery($after: Cursor, $ids: [String!], $dayTimestamp: Int, $weekTimestamp: Int) {
    data: assets(after: $after, filter: { AND: [{ id_in: $ids }, { liquidity_gt: "1" }] }) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          liquidity
          hourSnapshots: data(
            where: { AND: [{ timestamp_gte: $dayTimestamp }, { type_eq: HOUR }] }
            orderBy: [timestamp_DESC]
          ) {
            priceUSD
            volume
          }
          daySnapshots: data(
            where: { AND: [{ timestamp_gte: $weekTimestamp }, { type_eq: DAY } }] }
            orderBy: [timestamp_DESC]
          ) {
            priceUSD
            volume
          }
        }
      }
    }
  }
`;

const calcVolume = (nodes: AssetSnapshotEntity[]): FPNumber => {
  return nodes.reduce((buffer, snapshot) => {
    const snapshotVolume = new FPNumber(snapshot.volume.amountUSD);

    return buffer.add(snapshotVolume);
  }, FPNumber.ZERO);
};

const parse = (item: SubqueryAssetData | SubsquidAssetData): Record<string, TokenData> => {
  function transformNode(node: SubqueryAssetSnapshotEntity | SubsquidAssetSnapshotEntity): AssetSnapshotEntity {
    return {
      ...node,
      assetId: node.asset.id,
    };
  }
  return {
    [item.id]: {
      reserves: FPNumber.fromCodecValue(item.liquidity ?? 0),
      startPriceDay: new FPNumber(last(item.hourSnapshots.nodes)?.priceUSD?.open ?? 0),
      startPriceWeek: new FPNumber(last(item.daySnapshots.nodes)?.priceUSD?.open ?? 0),
      volumeDay: calcVolume(item.hourSnapshots.nodes.map((node) => transformNode(node))),
      volumeWeek: calcVolume(item.daySnapshots.nodes.map((node) => transformNode(node))),
    },
  };
};

export async function fetchTokensData(assets: Asset[]): Promise<Record<string, TokenData>> {
  const now = Math.floor(Date.now() / (5 * 60 * 1000)) * (5 * 60); // rounded to latest 5min snapshot (unix)
  const dayTimestamp = now - 60 * 60 * 24; // latest day snapshot (unix)
  const weekTimestamp = now - 60 * 60 * 24 * 7; // latest week snapshot (unix)
  const ids = assets.map((item) => item.address); // only whitelisted assets

  const variables = { ids, dayTimestamp, weekTimestamp };
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
