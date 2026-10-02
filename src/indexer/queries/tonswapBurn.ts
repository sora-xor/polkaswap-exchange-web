import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { decodeAddress } from '@polkadot/util-crypto';

import { TONSWAP_START_BLOCK, allocateTonswapBurns, type TonswapBurn } from '@/features/misc/lib/tonswapBurn';

import { resolveGlobalPinia } from '@/plugins/pinia';
import { useWalletStore } from '@/stores/wallet';
import { IndexerType } from '@/indexer/queries/indexerConsts';
import { resolvePolkaswapIndexerEndpoint } from '@/utils/indexerEndpoint';
export const TONSWAP_MAINNET_GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const MAX_SNAPSHOT_AGE_MS = 60_000;
const MAX_PAGES = 10_000;
const SNAPSHOT_QUERY = `query TonswapBurnSnapshot($after: Cursor, $atBlock: Int, $allowStale: Boolean) {
  tonswapBurnSnapshot(first: 100, after: $after, atBlock: $atBlock, allowStale: $allowStale) {
    genesisHash startBlock indexedThroughBlock checkpointBlock checkpointTimestamp fresh
    nodes { address amount assetId blockHeight campaign extrinsicIndex txHash }
    pageInfo { hasNextPage endCursor }
  }
}`;

type SnapshotPage = {
  genesisHash: string;
  startBlock: number;
  indexedThroughBlock: number;
  checkpointBlock: number;
  checkpointTimestamp: number;
  fresh: boolean;
  nodes: Record<string, unknown>[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

export type TonswapBurnSnapshot = { burns: TonswapBurn[]; indexedThroughBlock: number; fresh: boolean };

/** Checks the destination-free campaign's finalized global snapshot metadata. */
function validateSnapshotPage(value: unknown, atBlock?: number): SnapshotPage {
  const page = value as SnapshotPage | undefined;
  const now = Math.floor(Date.now() / 1_000);
  if (
    !page ||
    page.genesisHash !== TONSWAP_MAINNET_GENESIS ||
    page.startBlock !== TONSWAP_START_BLOCK ||
    !Number.isSafeInteger(page.indexedThroughBlock) ||
    page.indexedThroughBlock < TONSWAP_START_BLOCK ||
    (atBlock !== undefined && page.indexedThroughBlock !== atBlock) ||
    !Number.isSafeInteger(page.checkpointBlock) ||
    page.checkpointBlock < page.indexedThroughBlock ||
    !Number.isSafeInteger(page.checkpointTimestamp) ||
    page.checkpointTimestamp <= 0 ||
    page.checkpointTimestamp - now > 15 ||
    typeof page.fresh !== 'boolean' ||
    (page.fresh && now - page.checkpointTimestamp > 60) ||
    !Array.isArray(page.nodes) ||
    page.nodes.length > 100 ||
    typeof page.pageInfo?.hasNextPage !== 'boolean' ||
    (page.pageInfo.endCursor !== null && typeof page.pageInfo.endCursor !== 'string')
  ) {
    throw new Error('Complete fresh TONSWAP burn statistics are unavailable');
  }
  return page;
}

/** Decodes a successful indexed burn without accepting missing ordering or lossy amounts. */
function parseTonswapBurn(row: Record<string, unknown>, through: number): TonswapBurn {
  if (
    row.campaign !== 'tonswap' ||
    row.assetId !== XOR.address ||
    typeof row.address !== 'string' ||
    typeof row.amount !== 'string' ||
    !/^(0|[1-9]\d{0,77})(\.\d{1,18})?$/.test(row.amount) ||
    typeof row.txHash !== 'string' ||
    !/^0x[0-9a-f]{64}$/.test(row.txHash) ||
    !Number.isSafeInteger(row.blockHeight) ||
    Number(row.blockHeight) < TONSWAP_START_BLOCK ||
    Number(row.blockHeight) > through ||
    !Number.isSafeInteger(row.extrinsicIndex) ||
    Number(row.extrinsicIndex) < 0
  ) {
    throw new Error('Invalid TONSWAP burn evidence');
  }
  try {
    if (decodeAddress(row.address).length !== 32) throw new Error('Invalid source account');
  } catch {
    throw new Error('Invalid TONSWAP source account');
  }
  const amount = new FPNumber(row.amount, XOR.decimals);
  if (!amount.isFinity() || !amount.gt(FPNumber.ZERO)) throw new Error('Invalid TONSWAP burn amount');
  return {
    address: row.address,
    amount,
    txHash: row.txHash,
    blockHeight: Number(row.blockHeight),
    extrinsicIndex: Number(row.extrinsicIndex),
  };
}

/**
 * Fetches every page of a frozen, complete finalized mainnet campaign snapshot.
 * Certified older snapshots remain available for history, marked `fresh: false`.
 * Callers can opt into time freshness with `requireFresh`; burn submission does
 * not depend on this display query. Transport, evidence and pagination failures
 * always reject; incomplete snapshots never become displayed totals.
 */
export async function fetchTonswapBurnSnapshot(options: { requireFresh?: boolean } = {}): Promise<TonswapBurnSnapshot> {
  const startedAt = Date.now();
  // Freeze the configured transport across every page of this finalized snapshot.
  let endpoint: string;
  try {
    endpoint = resolvePolkaswapIndexerEndpoint(
      useWalletStore(resolveGlobalPinia()).indexers?.[IndexerType.POLKASWAP]?.endpoint
    );
  } catch {
    throw new Error('TONSWAP burn indexer is unavailable');
  }
  if (!endpoint) throw new Error('TONSWAP burn indexer is unavailable');
  const burns: TonswapBurn[] = [];
  const seenCursors = new Set<string>();
  let after: string | null = null;
  let atBlock: number | undefined;
  let fresh = true;
  let oldestCheckpointTimestamp = Number.POSITIVE_INFINITY;
  for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber += 1) {
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'omit',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: SNAPSHOT_QUERY, variables: { after, atBlock, allowStale: !options.requireFresh } }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error('TONSWAP burn indexer is unavailable');
    const payload = await response.json();
    if (payload.errors?.length) throw new Error('TONSWAP burn indexer could not prove complete coverage');
    const page = validateSnapshotPage(payload.data?.tonswapBurnSnapshot, atBlock);
    fresh &&= page.fresh;
    oldestCheckpointTimestamp = Math.min(oldestCheckpointTimestamp, page.checkpointTimestamp);
    if (options.requireFresh && !fresh) throw new Error('Fresh TONSWAP burn statistics are unavailable');
    atBlock = page.indexedThroughBlock;
    burns.push(...page.nodes.map((row) => parseTonswapBurn(row, atBlock as number)));
    if (Date.now() - startedAt > MAX_SNAPSHOT_AGE_MS) throw new Error('TONSWAP burn snapshot expired');
    if (!page.pageInfo.hasNextPage) {
      allocateTonswapBurns(burns); // Reject conflicting global transaction identities or execution positions.
      fresh &&= Math.floor(Date.now() / 1_000) - oldestCheckpointTimestamp <= 60;
      if (options.requireFresh && !fresh) throw new Error('TONSWAP burn snapshot expired');
      return { burns, indexedThroughBlock: atBlock, fresh };
    }
    const cursor = page.pageInfo.endCursor;
    if (!cursor || seenCursors.has(cursor)) throw new Error('Incomplete TONSWAP burn pagination');
    seenCursors.add(cursor);
    after = cursor;
  }
  throw new Error('TONSWAP burn snapshot exceeds the supported pagination bound');
}
