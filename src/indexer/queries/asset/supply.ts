import { FPNumber } from '@sora-substrate/math';
import { VAL, PSWAP } from '@sora-substrate/sdk/build/assets/consts';
import { api } from '@/lib/soraneo-wallet/src/api';
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

/** Detects whether indexer snapshots contain a supply value worth rendering. */
const hasUsableSupplyData = (items: readonly ChartData[]): boolean =>
  items.some((item) => Number.isFinite(item.value) && item.value > 0);

/** Fetches the chain's current total issuance as a fallback for broken indexer snapshots. */
const fetchCurrentSupplyValue = async (id: string): Promise<Nullable<number>> => {
  try {
    const supply = await api.assets.getAssetSupply(id);
    const value = toNumber(supply);

    return value > 0 ? value : null;
  } catch {
    return null;
  }
};

/** Replaces an all-zero supply series with a flat current-supply series so the chart remains informative. */
const withCurrentSupplyFallback = async (
  id: string,
  timestamp: number,
  items: readonly ChartData[]
): Promise<ChartData[]> => {
  if (hasUsableSupplyData(items)) {
    return [...items];
  }

  const currentSupply = await fetchCurrentSupplyValue(id);
  if (!currentSupply) {
    return [...items];
  }

  if (!items.length) {
    return [{ timestamp: timestamp * 1000, value: currentSupply, mint: 0, burn: 0 }];
  }

  return items.map((item) => ({ ...item, value: currentSupply }));
};

const applyCirculatingDiff = (items: readonly ChartData[], diff: number): ChartData[] =>
  hasUsableSupplyData(items) ? items.map((item) => ({ ...item, value: item.value - diff })) : [...items];

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
  const dataWithFallback = await withCurrentSupplyFallback(id, from, chartData);

  if (![VAL.address, PSWAP.address].includes(id)) {
    return dataWithFallback;
  }
  // VAL & PSWAP have huge difference between circulating & total supply on prod env
  const env = await resolveSoraNetwork();
  if (env !== 'Prod') return dataWithFallback;

  const diff = CIRCULATING_DIFF[id];
  return applyCirculatingDiff(dataWithFallback, diff);
}
