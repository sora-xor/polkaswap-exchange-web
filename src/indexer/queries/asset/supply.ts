import { FPNumber } from '@sora-substrate/math';
import { VAL, PSWAP } from '@sora-substrate/sdk/build/assets/consts';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { gql } from '@urql/core';

import { useSettingsStore } from '@/stores/settings';
import { waitForSoraNetworkFromEnv } from '@/utils';

import type {
  SnapshotTypes,
  AssetSnapshotEntity,
  ConnectionQueryResponse,
} from '@/lib/soraneo-wallet/src/services/indexer/types';

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

const PolkaswapAssetSupplyQuery = gql<ConnectionQueryResponse<AssetSnapshotEntity>>`
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

const resolveSoraNetwork = async (): Promise<string> => {
  try {
    return useSettingsStore().soraNetwork ?? (await waitForSoraNetworkFromEnv());
  } catch {
    return waitForSoraNetworkFromEnv();
  }
};

export async function fetchAssetSupplyData(
  id: string,
  from: number,
  to: number,
  type: SnapshotTypes
): Promise<ChartData[]> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const data = await polkaswapIndexer.services.explorer.fetchAllEntities(
    PolkaswapAssetSupplyQuery,
    { id, from, to, type },
    parse
  );

  const chartData = data ?? [];

  if (![VAL.address, PSWAP.address].includes(id)) {
    return chartData;
  }
  // VAL & PSWAP have huge difference between circulating & total supply on prod env
  const env = await resolveSoraNetwork();
  if (env !== 'Prod') return chartData;

  const diff = CIRCULATING_DIFF[id];
  return chartData.map((item) => ({ ...item, value: item.value - diff }));
}
