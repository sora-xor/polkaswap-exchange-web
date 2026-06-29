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

const toAmountValue = (value: string): FPNumber =>
  value.includes('.') ? new FPNumber(value) : FPNumber.fromCodecValue(value);

/** Detects whether indexer snapshots contain a supply value worth rendering. */
const hasUsableSupplyData = (items: readonly ChartData[]): boolean =>
  items.some((item) => Number.isFinite(item.value) && item.value > 0);

const applyCirculatingDiff = (items: readonly ChartData[], diff: number): ChartData[] =>
  hasUsableSupplyData(items) ? items.map((item) => ({ ...item, value: item.value - diff })) : [...items];

const parse = (node: AssetSnapshotEntity): ChartData => {
  const supplyValue = FPNumber.fromCodecValue(node.supply);
  const mint = toAmountValue(node.mint);
  const burn = toAmountValue(node.burn);

  return {
    timestamp: +node.timestamp * 1000,
    value: supplyValue.isFinity() ? supplyValue.toNumber() : 0,
    mint: mint.isFinity() ? mint.toNumber() : 0,
    burn: burn.isFinity() ? burn.toNumber() : 0,
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

  const indexedData = data ?? [];

  if (![VAL.address, PSWAP.address].includes(id)) {
    return indexedData;
  }
  // VAL & PSWAP have huge difference between circulating & total supply on prod env
  const env = await resolveSoraNetwork();
  if (env !== 'Prod') return indexedData;

  const diff = CIRCULATING_DIFF[id];
  return applyCirculatingDiff(indexedData, diff);
}
