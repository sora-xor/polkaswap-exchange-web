import { FPNumber } from '@sora-substrate/math';
import { VAL, PSWAP } from '@sora-substrate/util/build/assets/consts';
import { getCurrentIndexer, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { SubqueryIndexer, SubsquidIndexer } from '@soramitsu/soraneo-wallet-web/lib/services/indexer';
import { gql } from '@urql/core';

import store from '@/store';
import { waitForSoraNetworkFromEnv } from '@/utils';

import type { SubqueryConnectionQueryResponse } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/subquery/types';
import type { SnapshotTypes, AssetSnapshotEntity } from '@soramitsu/soraneo-wallet-web/lib/services/indexer/types';

const { IndexerType } = WALLET_CONSTS;

const CIRCULATING_DIFF = {
  [VAL.address]: 33449609.3779,
  [PSWAP.address]: 6345014420.6195,
};

export type ChartData = {
  timestamp: number;
  value: number;
  mint: number;
  burn: number;
};

const SubqueryAssetSupplyQuery = gql<SubqueryConnectionQueryResponse<AssetSnapshotEntity>>`
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

const SubsquidAssetSupplyQuery = gql<SubqueryConnectionQueryResponse<AssetSnapshotEntity>>`
  query AssetSupplyQuery($after: String, $type: SnapshotType, $id: String, $from: Int, $to: Int) {
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

const parse = (node: AssetSnapshotEntity): ChartData => {
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

  const chartData = data ?? [];

  if (![VAL.address, PSWAP.address].includes(id)) {
    return chartData;
  }
  // VAL & PSWAP have huge difference between circulating & total supply on prod env
  const env = store.state.wallet.settings.soraNetwork ?? (await waitForSoraNetworkFromEnv());
  if (env !== WALLET_CONSTS.SoraNetwork.Prod) return chartData;

  const diff = CIRCULATING_DIFF[id];
  return chartData.map((item) => ({ ...item, value: item.value - diff }));
}
