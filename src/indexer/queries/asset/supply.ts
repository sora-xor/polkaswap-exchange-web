import { FPNumber } from '@sora-substrate/math';
import { VAL, PSWAP, XOR } from '@sora-substrate/sdk/build/assets/consts';
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
const XOR_INDEXER_SUPPLY_REDENOMINATION_FACTOR = new FPNumber('1000000');
const XOR_CHAIN_SUPPLY_REDENOMINATION_FACTOR = new FPNumber('1000000000000');
const XOR_DELTA_REDENOMINATION_RATIO_THRESHOLD = new FPNumber('1000');
const XOR_EVENT_REDENOMINATION_FACTOR = new FPNumber('1000000');
const XOR_EVENT_REASONABLE_SUPPLY_MULTIPLIER = new FPNumber('1000');

export type ChartData = {
  timestamp: number;
  value: number;
  mint: number;
  burn: number;
};

type ParsedChartData = ChartData & {
  supplyValue?: FPNumber;
  rawSupplyValue?: FPNumber;
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

/**
 * Production XOR supply snapshots are stored with six more decimal places than
 * the user-facing XOR precision after redenomination. Decode those snapshots to
 * the same units used in balances and swap forms.
 */
const toIndexerSupplyValue = (id: string, value: string): FPNumber => {
  const fp = FPNumber.fromCodecValue(value);

  return id === XOR.address ? fp.div(XOR_INDEXER_SUPPLY_REDENOMINATION_FACTOR) : fp;
};

/**
 * The live native XOR total issuance fallback comes from `balances.totalIssuance`,
 * whose effective scale is larger than asset snapshot rows. Keep this separate
 * from snapshot decoding so one source cannot accidentally over-normalize the other.
 */
const toCurrentSupplyValue = (id: string, value: string): FPNumber => {
  const fp = FPNumber.fromCodecValue(value);

  return id === XOR.address ? fp.div(XOR_CHAIN_SUPPLY_REDENOMINATION_FACTOR) : fp;
};

const toSupplyNumber = (id: string, value: string): number => {
  const fp = toCurrentSupplyValue(id, value);

  return fp.isFinity() ? fp.toNumber() : 0;
};

/**
 * Some XOR snapshot buckets contain denomination-era event totals decoded at a
 * storage scale. Reduce only bucket amounts that are impossible relative to the
 * supply, leaving normal large burns and sub-unit burns untouched.
 */
const normalizeXorEventAmount = (id: string, value: FPNumber, supplyValue: FPNumber): FPNumber => {
  if (id !== XOR.address || !value.isFinity() || !supplyValue.isFinity() || supplyValue.isZero()) {
    return value;
  }

  const maxReasonableBucketAmount = supplyValue.mul(XOR_EVENT_REASONABLE_SUPPLY_MULTIPLIER);
  let normalized = value;

  for (let scaleCount = 0; scaleCount < 3 && FPNumber.gt(normalized, maxReasonableBucketAmount); scaleCount++) {
    normalized = normalized.div(XOR_EVENT_REDENOMINATION_FACTOR);
  }

  return normalized;
};

/** Detects whether indexer snapshots contain a supply value worth rendering. */
const hasUsableSupplyData = (items: readonly ParsedChartData[]): boolean =>
  items.some((item) => Number.isFinite(item.value) && item.value > 0);

/** Fetches the chain's current total issuance as a fallback for broken indexer snapshots. */
const fetchCurrentSupplyValue = async (id: string): Promise<Nullable<number>> => {
  try {
    const supply = await api.assets.getAssetSupply(id);
    const value = toSupplyNumber(id, supply);

    return value > 0 ? value : null;
  } catch {
    return null;
  }
};

/** Replaces an all-zero supply series with a flat current-supply series so the chart remains informative. */
const withCurrentSupplyFallback = async (
  id: string,
  timestamp: number,
  items: readonly ParsedChartData[]
): Promise<ParsedChartData[]> => {
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

const applyCirculatingDiff = (items: readonly ParsedChartData[], diff: number): ParsedChartData[] =>
  hasUsableSupplyData(items) ? items.map((item) => ({ ...item, value: item.value - diff })) : [...items];

const toChartData = ({ timestamp, value, mint, burn }: ParsedChartData): ChartData => ({ timestamp, value, mint, burn });

/**
 * XOR production snapshots need post-denomination absolute supply values, while
 * small historical raw movements can still be smaller by the redenomination
 * factor. Preserve the latest absolute value and scale only those tiny
 * historical movements so ordinary burns remain visible on the chart.
 */
const normalizeXorSupplyDeltas = (id: string, items: readonly ParsedChartData[]): ChartData[] => {
  if (id !== XOR.address || items.length < 2) {
    return items.map(({ timestamp, value, mint, burn }) => ({ timestamp, value, mint, burn }));
  }

  const anchorSupply = items[0]?.supplyValue;
  const anchorRawSupply = items[0]?.rawSupplyValue;
  if (!anchorSupply?.isFinity() || !anchorRawSupply?.isFinity()) {
    return items.map(({ timestamp, value, mint, burn }) => ({ timestamp, value, mint, burn }));
  }

  const supplyDeltas = items
    .map((item) => item.rawSupplyValue?.sub(anchorRawSupply).abs())
    .filter((item): item is FPNumber => !!item?.isFinity());
  const maxSupplyDelta = FPNumber.max(...supplyDeltas) ?? FPNumber.ZERO;
  const totalMintBurn = items.reduce(
    (total, item) => total.add(new FPNumber(item.mint).abs()).add(new FPNumber(item.burn).abs()),
    FPNumber.ZERO
  );
  const shouldScaleDeltas =
    FPNumber.gt(maxSupplyDelta, FPNumber.ZERO) &&
    FPNumber.gt(totalMintBurn, FPNumber.ZERO) &&
    FPNumber.gt(totalMintBurn.div(maxSupplyDelta), XOR_DELTA_REDENOMINATION_RATIO_THRESHOLD);

  return items.map(({ timestamp, value, mint, burn, rawSupplyValue }) => {
    if (!shouldScaleDeltas || !rawSupplyValue?.isFinity()) {
      return { timestamp, value, mint, burn };
    }

    return {
      timestamp,
      value: anchorSupply
        .add(rawSupplyValue.sub(anchorRawSupply).mul(XOR_INDEXER_SUPPLY_REDENOMINATION_FACTOR))
        .toNumber(),
      mint,
      burn,
    };
  });
};

const parse =
  (id: string) =>
  (node: AssetSnapshotEntity): ParsedChartData => {
    const supplyValue = toIndexerSupplyValue(id, node.supply);
    const rawSupplyValue = FPNumber.fromCodecValue(node.supply);
    const mint = normalizeXorEventAmount(id, toAmountValue(node.mint), supplyValue);
    const burn = normalizeXorEventAmount(id, toAmountValue(node.burn), supplyValue);

    return {
      timestamp: +node.timestamp * 1000,
      value: supplyValue.isFinity() ? supplyValue.toNumber() : 0,
      mint: mint.isFinity() ? mint.toNumber() : 0,
      burn: burn.isFinity() ? burn.toNumber() : 0,
      supplyValue,
      rawSupplyValue,
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
    parse(id)
  );

  const chartData = normalizeXorSupplyDeltas(id, data ?? []);
  const dataWithFallback = await withCurrentSupplyFallback(id, from, chartData);

  if (![VAL.address, PSWAP.address].includes(id)) {
    return dataWithFallback.map(toChartData);
  }
  // VAL & PSWAP have huge difference between circulating & total supply on prod env
  const env = await resolveSoraNetwork();
  if (env !== 'Prod') return dataWithFallback.map(toChartData);

  const diff = CIRCULATING_DIFF[id];
  return applyCirculatingDiff(dataWithFallback, diff).map(toChartData);
}
