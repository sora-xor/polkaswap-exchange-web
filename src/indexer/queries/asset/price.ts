import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { retryOnEmptyResult } from '@/indexer/queries/retry';
import { gql } from '@urql/core';
import { resolveGlobalPinia } from '@/plugins/pinia';
import { useWalletStore } from '@/stores/wallet';
import { IndexerType } from '@/indexer/queries/indexerConsts';

import type { OCLH, SnapshotItem } from '@/types/chart';

import type {
  AssetSnapshotEntity,
  ConnectionQueryResponse,
  ConnectionQueryResponseData,
  SnapshotTypes,
} from '@/lib/soraneo-wallet/src/services/indexer/types';

/** Chart conversion accepts observed decimals only; null never means a zero price or volume. */
function chartDecimal(value: unknown, allowZero = false): number | null {
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    (typeof value === 'string' && (value.length > 160 || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)))
  )
    return null;
  const result = Number(value);
  return Number.isFinite(result) && (allowZero ? result >= 0 : result > 0) ? result : null;
}

/** Recognizes the indexer's completed, priced close and its adjacent-block boundary evidence. */
function hasFinalizedPricedClose(item: AssetSnapshotEntity, seconds: number): boolean {
  const evidence = (item as AssetSnapshotEntity & { closeEvidence?: unknown }).closeEvidence;
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return false;
  const proof = evidence as Record<string, unknown>;
  const { blockHeight, nextBlockHeight, nextTimestamp, completedAt } = proof;
  return (
    proof.kind === 'finalized-hour-close' &&
    proof.availability === 'priced' &&
    proof.timestamp === seconds &&
    typeof blockHeight === 'number' &&
    Number.isSafeInteger(blockHeight) &&
    blockHeight > 0 &&
    nextBlockHeight === blockHeight + 1 &&
    typeof completedAt === 'number' &&
    completedAt === (Math.floor(seconds / 3600) + 1) * 3600 &&
    typeof nextTimestamp === 'number' &&
    Number.isSafeInteger(nextTimestamp) &&
    nextTimestamp >= completedAt &&
    typeof proof.blockHash === 'string' &&
    /^0x[0-9a-f]{64}$/.test(proof.blockHash) &&
    typeof proof.nextBlockHash === 'string' &&
    /^0x[0-9a-f]{64}$/.test(proof.nextBlockHash)
  );
}

/** A candle requires its actual OHLC and volume; completed-close-only evidence is not a candle. */
function transformSnapshot(item: AssetSnapshotEntity): SnapshotItem | null {
  if (!item || typeof item !== 'object' || !item.priceUSD || !item.volume) return null;
  const { open, close, low, high } = item.priceUSD;
  const values = [open, close, low, high].map((value) => chartDecimal(value));
  const volume = chartDecimal(item.volume.amountUSD, true);
  const seconds = chartDecimal(item.timestamp, true);
  if (
    values.some((value) => value === null) ||
    volume === null ||
    seconds === null ||
    !Number.isSafeInteger(seconds * 1000)
  )
    return null;
  const price = values as OCLH;
  if (price[2] > price[0] || price[3] < price[0] || price[2] > price[3]) return null;
  // Legacy extrema may be rounded or predate the verified close. Include that observed close only.
  if (hasFinalizedPricedClose(item, seconds)) {
    price[2] = Math.min(price[2], price[1]);
    price[3] = Math.max(price[3], price[1]);
  }
  if (price[2] > Math.min(price[0], price[1]) || price[3] < Math.max(price[0], price[1]) || price[2] > price[3])
    return null;
  return { timestamp: seconds * 1000, price, volume };
}

const polkaswapAssetPriceFilter = (assetAddress: string, type: SnapshotTypes) => {
  return {
    assetId: {
      equalTo: assetAddress,
    },
    type: {
      equalTo: type,
    },
  };
};

/** Known production schema URLs support close evidence; other indexers retain the legacy query. */
function supportsCloseEvidence(): boolean {
  try {
    const endpoint = useWalletStore(resolveGlobalPinia()).indexers?.[IndexerType.POLKASWAP]?.endpoint;
    return endpoint === 'https://mof.sora.org/graphql' || endpoint === 'https://pi.soramitsu.io/graphql';
  } catch {
    return false;
  }
}

/** Keep older indexer schemas compatible by omitting fields they have not deployed. */
const createAssetPriceQuery = (withCloseEvidence: boolean) => gql<ConnectionQueryResponse<AssetSnapshotEntity>>`
  query PolkaswapAssetPriceQuery($after: Cursor = "", $filter: AssetSnapshotFilter, $first: Int = null) {
    data: assetSnapshots(after: $after, first: $first, filter: $filter, orderBy: [TIMESTAMP_DESC]) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          priceUSD
          ${withCloseEvidence ? 'closeEvidence' : ''}
          timestamp
          volume
        }
      }
    }
  }
`;

const PolkaswapAssetPriceQuery = createAssetPriceQuery(false);
const PolkaswapAssetPriceWithEvidenceQuery = createAssetPriceQuery(true);

export async function fetchAssetPriceData(
  entityId: string,
  type: SnapshotTypes,
  first?: number,
  after?: string | null
): Promise<Nullable<ConnectionQueryResponseData<SnapshotItem>>> {
  const polkaswapIndexer = getCurrentIndexer() as PolkaswapIndexer;
  const filter = polkaswapAssetPriceFilter(entityId, type);
  const query = supportsCloseEvidence() ? PolkaswapAssetPriceWithEvidenceQuery : PolkaswapAssetPriceQuery;
  const data = await retryOnEmptyResult(
    async () =>
      polkaswapIndexer.services.explorer.fetchEntities(query, {
        filter,
        first,
        after,
      }),
    (value) => !value?.edges?.length
  );

  if (!data) return null;

  return {
    ...data,
    edges: data.edges.flatMap((edge) => {
      const node = transformSnapshot(edge.node);
      return node ? [{ ...edge, node }] : [];
    }),
  };
}
