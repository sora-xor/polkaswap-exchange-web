/** Browser-only re-verification of original retained indexer history. No fetching or trading surface. */
import {
  readGoalRawEnvelope,
  goalRawEvidenceDigest,
  goalRawBytesSha256,
  type GoalRawEnvelopeBinding,
} from './goal-raw-envelope';
import { parseIndexedPoolHistoryWithEvidence, type IndexedPoolHistoryRow } from './pool-history';
import type { GoalEpisodeHistoryEvidence } from './goal-episode-evaluator';
import type { GoalQualificationClockBlock } from './goal-qualification-clock';
import type { BotDefinition } from './types';

const HOUR = 3600000,
  HOURS = 201;
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const XOR = {
  address: '0x0200000000000000000000000000000000000000000000000000000000000000',
  symbol: 'XOR',
  decimals: 18,
};
const KUSD = {
  address: '0x02000c0000000000000000000000000000000000000000000000000000000000',
  symbol: 'KUSD',
  decimals: 18,
};
const HASH = /^0x[0-9a-f]{64}$/;
const QUERY =
  'query GoalQualificationPoolHistory($filter:AssetSnapshotFilter!,$after:Cursor){assetSnapshots(first:100,after:$after,orderBy:[TIMESTAMP_ASC],filter:$filter){pageInfo{hasNextPage endCursor}edges{node{id assetId type timestamp denominator closeEvidence}}}}';
/** Supplied by the future causal v2 source after its original plan, clock and source metadata verification. */
export interface GoalHistoryArtifactContext {
  checkId: number;
  checkedAtMs: number;
  cutoffAtMs: number;
  completedAtMs: number;
  genesisHash: string;
  denominator: string;
  historyReadMs: number;
  finalityDelayMs: number;
  indexerPublicationDelayMs: number;
}
/** Trusted metadata lookup, not JSON asserting that blocks were verified. */
export interface GoalHistoryArtifactMetadata {
  /** Exact inclusive coverage of the owned canonical callback metadata collection. */
  firstHeight: number;
  lastHeight: number;
  blockAtHeight(height: number): Readonly<GoalQualificationClockBlock> | undefined;
}
function check(value: unknown, reason: string): asserts value {
  if (!value) throw Error(`goal-bundle-history:${reason}`);
}
function own(value: unknown, fields?: readonly string[]): Record<string, unknown> {
  check(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      [Object.prototype, null].includes(Object.getPrototypeOf(value)),
    'own-data'
  );
  const descriptors = Object.getOwnPropertyDescriptors(value),
    keys = Reflect.ownKeys(descriptors);
  check(
    keys.every((k) => typeof k === 'string' && descriptors[k].enumerable && 'value' in descriptors[k]),
    'own-data'
  );
  if (fields) check(keys.length === fields.length && fields.every((k) => Object.hasOwn(descriptors, k)), 'fields');
  return Object.fromEntries(Object.entries(descriptors).map(([k, d]) => [k, d.value]));
}
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
/** Minimal idle parser carrier; this object is never saved, funded, signed or exposed as a live goal. */
function parserBot(): BotDefinition {
  return {
    version: 1,
    id: 'raw-history-parser',
    name: '',
    mode: 'paper',
    status: 'idle',
    account: '',
    network: GENESIS,
    assetIn: KUSD,
    assetOut: XOR,
    strategy: {
      kind: 'dca',
      amount: '0',
      intervalMs: HOUR,
      threshold: '0',
      direction: 'below',
      fastWindow: 2,
      slowWindow: 3,
      prompt: '',
    },
    policy: {
      feeAsset: XOR,
      maxTradeCodec: {},
      slippagePercent: '0.5',
      maxPriceImpactPercent: '1',
      feeBudgetCodec: '0',
      sessionDurationMs: 0,
    },
    portfolio: { initial: {}, holdings: {}, feesPaidCodec: '0', trades: 0 },
    state: { lastEvaluatedAt: 0, lastTradeAt: 0 },
    provider: 'custom',
    model: '',
    endpoint: '',
    createdAt: 0,
    sessionExpiresAt: 0,
    activity: [],
    equity: [],
    apiUsage: { inputTokens: 0, outputTokens: 0, requests: 0 },
  };
}
/**
 * Reconstruct the original 200 warmup hours plus latest hour from exact raw GraphQL receipts. Original
 * acquisition timestamps are preserved in the hashed envelope, never substituted for modeled availability.
 * Hashes authenticate retained bytes only: the caller must own the causal context and verified metadata.
 */
export function verifyGoalHistoryArtifact(
  bytes: Uint8Array,
  binding: GoalRawEnvelopeBinding,
  rawContext: GoalHistoryArtifactContext,
  rawMetadata: GoalHistoryArtifactMetadata
): Readonly<GoalEpisodeHistoryEvidence> {
  const context = own(rawContext, [
    'checkId',
    'checkedAtMs',
    'cutoffAtMs',
    'completedAtMs',
    'genesisHash',
    'denominator',
    'historyReadMs',
    'finalityDelayMs',
    'indexerPublicationDelayMs',
  ]) as unknown as GoalHistoryArtifactContext;
  check(
    integer(context.checkId) &&
      context.checkId > 0 &&
      integer(context.checkedAtMs) &&
      integer(context.cutoffAtMs) &&
      integer(context.completedAtMs) &&
      context.completedAtMs >= HOURS * HOUR &&
      context.completedAtMs === Math.floor(context.checkedAtMs / HOUR) * HOUR &&
      context.cutoffAtMs >= context.checkedAtMs &&
      context.cutoffAtMs - context.checkedAtMs <= 60000 &&
      context.genesisHash === GENESIS &&
      typeof context.denominator === 'string' &&
      /^[1-9]\d{0,38}$/.test(context.denominator) &&
      BigInt(context.denominator) < 1n << 128n,
    'context'
  );
  for (const n of [context.historyReadMs, context.finalityDelayMs, context.indexerPublicationDelayMs])
    check(integer(n) && n <= 60000, 'context');
  const metadata = own(rawMetadata, ['firstHeight', 'lastHeight', 'blockAtHeight']);
  check(
    integer(metadata.firstHeight) &&
      metadata.firstHeight > 0 &&
      integer(metadata.lastHeight) &&
      metadata.lastHeight >= metadata.firstHeight &&
      metadata.lastHeight <= 0xffffffff &&
      typeof metadata.blockAtHeight === 'function',
    'metadata'
  );
  const firstHeight = metadata.firstHeight,
    lastHeight = metadata.lastHeight;
  const blockAtHeight = metadata.blockAtHeight as GoalHistoryArtifactMetadata['blockAtHeight'];
  const raw = own(readGoalRawEnvelope(bytes, binding), ['history', 'rpcEvidence']);
  check(binding.name === `history-${context.checkId}.json`, 'name');
  check(Array.isArray(raw.rpcEvidence) && raw.rpcEvidence.length >= 2 && raw.rpcEvidence.length <= 8, 'receipts');
  const evidence = raw.rpcEvidence;
  const startAtMs = context.completedAtMs - HOURS * HOUR;
  const rows = new Map<string, IndexedPoolHistoryRow[]>();
  let index = 0,
    totalBytes = 0,
    previousAcquired = -1,
    startedAcquired = -1;
  for (const asset of [KUSD, XOR]) {
    const selected: IndexedPoolHistoryRow[] = [],
      seenIds = new Set<string>(),
      cursors = new Set<string>();
    let after: string | null = null,
      previous = -1,
      finished = false;
    for (let page = 0; !finished; page++) {
      check(index < evidence.length, 'missing-page');
      const receipt = own(evidence[index], [
        'index',
        'assetId',
        'page',
        'requestBody',
        'requestedAtMs',
        'completedAtMs',
        'httpStatus',
        'responseBody',
        'responseSha256',
        'bytes',
        'complete',
      ]);
      check(
        receipt.index === index &&
          receipt.assetId === asset.address &&
          receipt.page === page &&
          receipt.httpStatus === 200 &&
          receipt.complete === true,
        'receipt-identity'
      );
      check(
        integer(receipt.requestedAtMs) &&
          integer(receipt.completedAtMs) &&
          receipt.completedAtMs >= receipt.requestedAtMs &&
          receipt.requestedAtMs >= previousAcquired,
        'acquisition-time'
      );
      if (index === 0) startedAcquired = receipt.requestedAtMs;
      check(receipt.completedAtMs - startedAcquired < 30000, 'acquisition-duration');
      previousAcquired = receipt.completedAtMs;
      const expectedRequest = JSON.stringify({
        query: QUERY,
        variables: {
          filter: {
            assetId: { equalTo: asset.address },
            type: { equalTo: 'HOUR' },
            timestamp: { greaterThanOrEqualTo: startAtMs / 1000, lessThan: context.completedAtMs / 1000 },
          },
          after,
        },
      });
      check(receipt.requestBody === expectedRequest, 'request');
      check(typeof receipt.responseBody === 'string', 'body');
      const bodyBytes = new TextEncoder().encode(receipt.responseBody);
      totalBytes += bodyBytes.length;
      check(
        bodyBytes.length > 0 &&
          bodyBytes.length <= 2097152 &&
          totalBytes <= 8388608 &&
          receipt.bytes === bodyBytes.length &&
          receipt.responseSha256 === goalRawBytesSha256(bodyBytes),
        'body-hash'
      );
      let parsed: unknown;
      try {
        parsed = JSON.parse(receipt.responseBody);
      } catch {
        throw Error('goal-bundle-history:body-json');
      }
      const body = own(parsed);
      check(!Object.hasOwn(body, 'errors'), 'graphql');
      const data = own(own(body.data).assetSnapshots),
        info = own(data.pageInfo);
      check(Array.isArray(data.edges) && data.edges.length <= 100 && typeof info.hasNextPage === 'boolean', 'page');
      for (const edge of data.edges) {
        const row = own(own(edge).node),
          ts = row.timestamp;
        check(
          typeof row.id === 'string' &&
            row.id.length <= 256 &&
            row.assetId === asset.address &&
            row.type === 'HOUR' &&
            integer(ts) &&
            ts >= startAtMs / 1000 &&
            ts < context.completedAtMs / 1000 &&
            ts > previous &&
            !seenIds.has(row.id),
          'row'
        );
        check(row.id === `asset-${asset.address}-HOUR-${Math.floor(ts / 3600) * 3600}`, 'row-id');
        seenIds.add(row.id);
        previous = ts;
        selected.push(row as unknown as IndexedPoolHistoryRow);
        check(selected.length <= HOURS, 'hours');
      }
      index++;
      if (!info.hasNextPage) {
        check(selected.length === HOURS, 'hours');
        finished = true;
      } else {
        const cursor = info.endCursor;
        check(
          data.edges.length > 0 &&
            typeof cursor === 'string' &&
            cursor.length > 0 &&
            cursor.length <= 4096 &&
            !cursors.has(cursor),
          'cursor'
        );
        cursors.add(cursor);
        after = cursor;
      }
    }
    rows.set(asset.address, selected);
  }
  check(index === evidence.length, 'extra-page');
  const history = parseIndexedPoolHistoryWithEvidence(rows, parserBot(), {
    startAt: startAtMs,
    endAt: context.completedAtMs,
    genesisHash: context.genesisHash,
    denominator: context.denominator,
  });
  check(
    history.history.missing === 0 &&
      history.history.denominationVerified &&
      history.history.candles.length === HOURS &&
      history.boundaries.length === HOURS,
    'history'
  );
  check(goalRawEvidenceDigest(history) === goalRawEvidenceDigest(raw.history), 'projection');
  let latestSuccessorUpperBound = 0;
  for (const [index, boundary] of history.boundaries.entries()) {
    const canonical = (expected: typeof boundary.closing) => {
      check(expected.height <= lastHeight, 'metadata-coverage');
      if (expected.height < firstHeight) {
        // The original source had indexer attestations, but no callback collection, for earlier warmup.
        check(index < history.boundaries.length - 1, 'latest-metadata-coverage');
        return undefined;
      }
      const block = own(blockAtHeight(expected.height), ['height', 'hash', 'parentHash', 'timestampMs']);
      check(
        block.height === expected.height &&
          block.hash === expected.hash &&
          typeof block.hash === 'string' &&
          HASH.test(block.hash) &&
          typeof block.parentHash === 'string' &&
          HASH.test(block.parentHash) &&
          integer(block.timestampMs) &&
          Math.floor(block.timestampMs / 1000) === expected.timestampSeconds,
        'metadata-boundary'
      );
      return block as unknown as Readonly<GoalQualificationClockBlock>;
    };
    const closing = canonical(boundary.closing),
      successor = canonical(boundary.successor);
    if (closing) check(closing.timestampMs < boundary.completedAtMs, 'metadata-adjacency');
    if (successor)
      check(
        successor.parentHash === boundary.closing.hash &&
          successor.height === boundary.closing.height + 1 &&
          successor.timestampMs >= boundary.completedAtMs,
        'metadata-adjacency'
      );
    latestSuccessorUpperBound = Math.max(latestSuccessorUpperBound, boundary.successor.timestampSeconds * 1000 + 999);
  }
  const publishedAtMs = latestSuccessorUpperBound + context.finalityDelayMs + context.indexerPublicationDelayMs;
  check(integer(publishedAtMs) && context.checkedAtMs >= publishedAtMs, 'awaiting-history');
  const availableAtMs = Math.max(context.checkedAtMs + context.historyReadMs, publishedAtMs);
  check(integer(availableAtMs) && availableAtMs <= context.cutoffAtMs, 'availability');
  // The parser returns a mutable history array; freeze the independently reconstructed projection.
  for (const candle of history.history.candles) Object.freeze(candle);
  Object.freeze(history.history.candles);
  Object.freeze(history.history.identity);
  Object.freeze(history.history);
  return Object.freeze({ history, availableAtMs, evidenceSha256: binding.valueSha256 });
}
