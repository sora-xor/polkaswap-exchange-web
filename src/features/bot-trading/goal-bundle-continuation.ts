/** Read-only continuation provenance over pinned artifacts. Never fetches markets or authorizes retry/trading. */
import {
  prepareGoalAcquisitionReplayBundle,
  assertGoalAcquisitionReplayPreparation,
  verifyGoalAcquisitionRetainedPrefix,
  type GoalAcquisitionReplayUse,
  type GoalAcquisitionReplayPreparation,
  type GoalAcquisitionRetainedResponse,
} from './goal-acquisition-replay';
import { goalRawBytesSha256, goalRawEvidenceDigest } from './goal-raw-envelope';
import type {
  GoalBundleStudyContinuation,
  GoalBundleStudyAcquisition,
  GoalBundleStudyObserver,
} from './goal-bundle-study';

const HISTORY = 'https://pi.soramitsu.io/graphql';
// The supported continuation runner declares20s. This binds its source composition, not an unrecorded start time.
const COMPOSITION_TIMEOUT_MS = 20000;
const QUERY =
  'query GoalQualificationPoolHistory($filter:AssetSnapshotFilter!,$after:Cursor){assetSnapshots(first:100,after:$after,orderBy:[TIMESTAMP_ASC],filter:$filter){pageInfo{hasNextPage endCursor}edges{node{id assetId type timestamp denominator closeEvidence}}}}';
const ASSETS = [
  '0x02000c0000000000000000000000000000000000000000000000000000000000',
  '0x0200000000000000000000000000000000000000000000000000000000000000',
];
const SHA = /^[0-9a-f]{64}$/;
const RETRY_POLICY = {
  kind: 'recorded-indexer-history-retry-v1',
  maximumAttempts: 3,
  statuses: [502, 503, 504],
  backoffMs: [1000, 3000],
};
type Json = Record<string, any>; // Bounded detached own-data records; every used field is checked below.
const utf8 = (value: string) => new TextEncoder().encode(value);
const sha = (value: string | Uint8Array) => goalRawBytesSha256(typeof value === 'string' ? utf8(value) : value);
function check(value: unknown, reason: string): asserts value {
  if (!value) throw Error(`goal-bundle-continuation:${reason}`);
}
function own(value: unknown, fields?: readonly string[]): Json {
  check(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      [Object.prototype, null].includes(Object.getPrototypeOf(value)),
    'object'
  );
  const ds = Object.getOwnPropertyDescriptors(value);
  check(
    Reflect.ownKeys(ds).every((key) => typeof key === 'string' && ds[key].enumerable && 'value' in ds[key]),
    'own-data'
  );
  if (fields)
    check(Object.keys(ds).length === fields.length && fields.every((key) => Object.hasOwn(ds, key)), 'fields');
  return Object.fromEntries(Object.entries(ds).map(([key, d]) => [key, d.value]));
}
function detached(value: unknown): Json {
  goalRawEvidenceDigest(value);
  return own(JSON.parse(JSON.stringify(value)));
}
function canonical(value: unknown): string {
  return Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical((value as Json)[key])}`)
          .join(',')}}`
      : JSON.stringify(value);
}
function historyRequest(value: unknown): { body: string; requestSha256: string } {
  const r = own(value, ['url', 'method', 'headers', 'body', 'redirect', 'credentials']);
  check(
    r.url === HISTORY &&
      r.method === 'POST' &&
      r.redirect === 'error' &&
      r.credentials === 'omit' &&
      typeof r.body === 'string' &&
      utf8(r.body).length <= 16384,
    'request'
  );
  const headers = own(r.headers);
  check(
    Object.keys(headers).every((key) => ['content-type', 'cache-control'].includes(key)) &&
      headers['content-type'] === 'application/json' &&
      (!Object.hasOwn(headers, 'cache-control') || ['no-cache', 'no-store'].includes(headers['cache-control'])),
    'request-headers'
  );
  const body = own(JSON.parse(r.body), ['query', 'variables']),
    variables = own(body.variables, ['filter', 'after']);
  check(
    body.query === QUERY &&
      (variables.after === null ||
        (typeof variables.after === 'string' && variables.after.length > 0 && variables.after.length <= 2048)),
    'history-query'
  );
  const filter = own(variables.filter, ['assetId', 'type', 'timestamp']),
    range = own(filter.timestamp, ['greaterThanOrEqualTo', 'lessThan']);
  check(
    ASSETS.includes(own(filter.assetId, ['equalTo']).equalTo) && own(filter.type, ['equalTo']).equalTo === 'HOUR',
    'history-assets'
  );
  const from = range.greaterThanOrEqualTo,
    to = range.lessThan;
  check(
    Number.isSafeInteger(from) &&
      Number.isSafeInteger(to) &&
      from >= 0 &&
      to > from &&
      from % 3600 === 0 &&
      to % 3600 === 0 &&
      to - from <= 201 * 3600,
    'history-range'
  );
  return { body: r.body, requestSha256: goalRawEvidenceDigest(r) };
}
interface Attempt {
  operation: number;
  request: number;
  attempt: number;
  carried: number;
  deadline: number;
  start: number;
  end: number;
  body: string;
  requestSha256: string;
  responseSha256: string;
  status: number;
  bytes: number;
}
function readAttempt(name: string, raw: Json): Attempt {
  const match = /^acquisition-([1-9]\d*)-([1-9]\d*)-([1-3])$/.exec(name);
  check(match, 'attempt-name');
  const v = own(raw, [
    'kind',
    'operationId',
    'requestIndex',
    'attemptIndex',
    'requestSha256',
    'carriedAttempts',
    'policySha256',
    'operationDeadlineAtMs',
    'request',
    'requestedAtMs',
    'completedAtMs',
    'outcome',
    'response',
  ]);
  const operation = Number(match[1]),
    request = Number(match[2]),
    attempt = Number(match[3]);
  check(
    Number.isSafeInteger(operation) &&
      operation <= 10000 &&
      request <= 8 &&
      v.kind === 'goal-acquisition-attempt-v1' &&
      v.operationId === `episode-history-${operation}` &&
      v.requestIndex === request &&
      v.attemptIndex === attempt &&
      [0, 1].includes(v.carriedAttempts),
    'attempt-identity'
  );
  check(v.policySha256 === goalRawEvidenceDigest(RETRY_POLICY) && v.outcome === 'response', 'attempt-policy');
  const bound = historyRequest(v.request);
  check(bound.requestSha256 === v.requestSha256, 'request-digest');
  const start = v.requestedAtMs,
    end = v.completedAtMs,
    deadline = v.operationDeadlineAtMs;
  check(
    [start, end, deadline].every((n) => Number.isSafeInteger(n) && n >= 0) &&
      start <= end &&
      end < deadline &&
      deadline - start <= COMPOSITION_TIMEOUT_MS,
    'attempt-time'
  );
  const r = own(v.response, [
    'status',
    'url',
    'redirected',
    'headers',
    'bodyBase64',
    'bytesRead',
    'retainedBytes',
    'bodySha256',
    'complete',
  ]);
  check(
    [200, 502, 503, 504].includes(r.status) &&
      (r.url === '' || r.url === HISTORY) &&
      r.redirected === false &&
      r.complete === true &&
      typeof r.bodyBase64 === 'string' &&
      r.bodyBase64.length <= 2800000,
    'attempt-response'
  );
  const headers = own(r.headers);
  check(
    Object.entries(headers).every(
      ([key, value]) => key.length > 0 && key.length <= 256 && typeof value === 'string' && value.length <= 8192
    ),
    'response-headers'
  );
  check(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(r.bodyBase64), 'response-base64');
  const binary = atob(r.bodyBase64),
    bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  check(
    btoa(binary) === r.bodyBase64 &&
      bytes.length <= 2 * 1024 * 1024 &&
      bytes.length === r.bytesRead &&
      bytes.length === r.retainedBytes &&
      sha(bytes) === r.bodySha256,
    'response-bytes'
  );
  return {
    operation,
    request,
    attempt,
    carried: v.carriedAttempts,
    deadline,
    start,
    end,
    body: bound.body,
    requestSha256: bound.requestSha256,
    responseSha256: r.bodySha256,
    status: r.status,
    bytes: bytes.length,
  };
}
/** Concrete browser dependency: validates parent prefix, actual retained retries, consumption and aggregate budgets. */
export function createGoalBundleContinuation(): GoalBundleStudyContinuation {
  return Object.freeze({
    async prepare(context) {
      const ctx = own(context, ['lineage', 'parentRequest', 'inventory', 'readParentArtifact', 'signal']);
      check(
        typeof ctx.readParentArtifact === 'function' && ctx.signal instanceof AbortSignal && !ctx.signal.aborted,
        'dependencies'
      );
      const lineage = detached(ctx.lineage),
        parentRequest = detached(ctx.parentRequest),
        inventory = detached(ctx.inventory);
      check(
        lineage.kind === 'goal-study-acquisition-continuation-v1' &&
          lineage.failedHttpStatus === 502 &&
          lineage.parentRequestSha256 === goalRawEvidenceDigest(parentRequest) &&
          inventory.requestSha256 === lineage.parentRequestSha256,
        'lineage'
      );
      const signal = ctx.signal as AbortSignal;
      const preparation = await prepareGoalAcquisitionReplayBundle(
        { requestSha256: lineage.parentRequestSha256, rawManifestSha256: lineage.parentRawManifestSha256 },
        {
          signal,
          readArtifact: async (name, readSignal) => {
            const raw = await ctx.readParentArtifact(name, readSignal);
            check(raw instanceof Uint8Array && raw.length <= 32 * 1024 * 1024, 'parent-bytes');
            return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(new Uint8Array(raw));
          },
        }
      );
      assertGoalAcquisitionReplayPreparation(preparation, {
        parentPlanSha256: lineage.parentPlanSha256,
        parentSourceSha256: lineage.parentSourceSha256,
        requestSha256: lineage.parentRequestSha256,
        accessSha256: lineage.parentAccessSha256,
        failedRecordSha256: lineage.parentFailedRecordSha256,
        rawManifestSha256: lineage.parentRawManifestSha256,
        failedHttpStatus: 502,
      });
      return createObserver({ ...parentRequest, planSha256: lineage.childPlanSha256 }, signal, preparation);
    },
  });
}

/** Verify every recorded-retry episode without carrying a parent failure or permitting prefix receipts. */
export function createGoalBundleAcquisition(): GoalBundleStudyAcquisition {
  return Object.freeze({
    async prepare(context) {
      const input = own(context, ['request', 'signal']);
      check(input.signal instanceof AbortSignal && !input.signal.aborted, 'dependencies');
      const request = detached(input.request);
      check(
        SHA.test(request.planSha256) &&
          ['training', 'validation'].includes(request.phase) &&
          Number.isSafeInteger(request.episodeIndex) &&
          request.episodeIndex >= 0,
        'episode-request'
      );
      return createObserver(request, input.signal);
    },
  });
}
/** Shared exact attempt accounting. A parent preparation adds only its verified prefix and original failed receipt. */
function createObserver(
  request: Json,
  signal: AbortSignal,
  preparation?: GoalAcquisitionReplayPreparation
): GoalBundleStudyObserver {
  const uses: GoalAcquisitionReplayUse[] = [],
    responses: GoalAcquisitionRetainedResponse[] = [],
    attempts: Attempt[] = [];
  const seen = new Set<string>();
  const historyOperations: { bytes: number; pages: number }[] = [];
  const historyRows: (GoalAcquisitionRetainedResponse & { operation: number })[] = [];
  let source: Json | undefined,
    completed: Json | undefined,
    failed = false,
    closed = false,
    logicalBytes = 0,
    logicalRequests = 0;
  const active = () => check(!failed && !closed && !signal.aborted, 'closed-or-aborted');
  const response = (lane: 'history' | 'market', body: string, raw: unknown) => {
    const row = own(raw);
    check(
      typeof body === 'string' &&
        row.httpStatus === 200 &&
        typeof row.responseBody === 'string' &&
        sha(row.responseBody) === row.responseSha256,
      'child-response'
    );
    responses.push({ lane, requestBodySha256: sha(body), responseSha256: row.responseSha256, httpStatus: 200 });
    logicalRequests++;
    logicalBytes += utf8(row.responseBody).length;
  };
  const rpc = (rows: unknown, market: boolean) => {
    check(Array.isArray(rows), 'child-rpc');
    for (const raw of rows) {
      const r = own(raw);
      const body = JSON.stringify({
        jsonrpc: '2.0',
        id: r.id,
        method: r.method,
        params: r.params ?? [r.keys, r.blockHash],
      });
      if (market) response('market', body, r);
      else {
        check(
          r.httpStatus === 200 && typeof r.responseBody === 'string' && sha(r.responseBody) === r.responseSha256,
          'child-response'
        );
        logicalRequests++;
        logicalBytes += utf8(r.responseBody).length;
      }
    }
  };
  return Object.freeze({
    observeChild(receipt, raw) {
      try {
        active();
        const pin = own(receipt, ['name', 'sha256', 'bytes']);
        check(
          typeof pin.name === 'string' &&
            pin.name.length <= 128 &&
            !seen.has(pin.name) &&
            seen.size < 16000 &&
            SHA.test(pin.sha256),
          'child-receipt'
        );
        const value = detached(raw);
        check(
          goalRawEvidenceDigest(value) === pin.sha256 && utf8(canonical(value)).length === pin.bytes,
          'child-binding'
        );
        seen.add(pin.name);
        if (/^acquisition-prefix-(market|history)-\d+$/.test(pin.name)) {
          check(pin.name === `acquisition-prefix-${value.lane}-${value.sequence}`, 'prefix-name');
          uses.push(value as GoalAcquisitionReplayUse);
        } else if (pin.name.startsWith('acquisition-')) attempts.push(readAttempt(pin.name, value));
        else if (pin.name === 'source.json') {
          check(!source && goalRawEvidenceDigest(value.request) === goalRawEvidenceDigest(request), 'child-source');
          source = value;
        } else if (pin.name === 'complete-source.json') {
          check(!completed, 'duplicate-completion');
          completed = value;
        } else if (/^history-[1-9]\d*\.json$/.test(pin.name)) {
          check(Array.isArray(value.rpcEvidence), 'child-history');
          check(value.rpcEvidence.length > 0 && value.rpcEvidence.length <= 8, 'operation-pages');
          const operation = { bytes: 0, pages: value.rpcEvidence.length };
          historyOperations.push(operation);
          for (const row of value.rpcEvidence) {
            response('history', own(row).requestBody, row);
            operation.bytes += utf8(row.responseBody).length;
            historyRows.push({ ...responses.at(-1)!, operation: historyOperations.length });
          }
          check(operation.bytes <= 8 * 1024 * 1024, 'operation-response-budget');
        } else if (/^market-schema-[1-9]\d*\.json$/.test(pin.name)) rpc(own(value.evidence).blockEvidence, true);
        else if (/^market-state-[1-9]\d*\.json$/.test(pin.name)) {
          rpc(value.blockEvidence, true);
          rpc(value.storageEvidence, true);
        } else if (/^(?:quote|fee)-[1-9]\d*\.json$/.test(pin.name)) rpc(value.rpcEvidence, false);
        check(logicalRequests <= 10000 && logicalBytes <= 256 * 1024 * 1024, 'logical-budget');
      } catch (error) {
        failed = true;
        throw error;
      }
    },
    complete() {
      try {
        active();
        check(
          source && completed && completed.requests === logicalRequests && completed.responseBytes === logicalBytes,
          'source-counts'
        );
        check(
          source.manifest.maximumHttpRequests <= 10000 && source.manifest.maximumResponseBytes <= 256 * 1024 * 1024,
          'source-limits'
        );
        attempts.sort((a, b) => a.operation - b.operation || a.request - b.request || a.attempt - b.attempt);
        const groups: Attempt[][] = [];
        for (const attempt of attempts) {
          const last = groups.at(-1);
          if (last && last[0].operation === attempt.operation && last[0].request === attempt.request)
            last.push(attempt);
          else groups.push([attempt]);
        }
        const childHistory = historyRows.slice(preparation?.inspection.historyRequests ?? 0);
        check(groups.length > 0 && groups.length === childHistory.length, 'attempt-consumption-count');
        let extraRequests = 0,
          extraBytes = 0,
          previous: Attempt | undefined;
        groups.forEach((group, index) => {
          const first = group[0],
            last = group.at(-1)!,
            carried = index === 0 && preparation ? 1 : 0;
          check(
            first.request === (previous?.operation === first.operation ? previous.request + 1 : 1),
            'request-sequence'
          );
          check(
            !previous ||
              (first.start >= previous.end &&
                (first.operation === previous.operation
                  ? first.deadline === previous.deadline
                  : first.operation === previous.operation + 1)),
            'operation-sequence'
          );
          group.forEach((a, n) => {
            check(
              a.carried === carried &&
                a.attempt === carried + n + 1 &&
                a.attempt <= 3 &&
                a.body === first.body &&
                a.requestSha256 === first.requestSha256 &&
                a.deadline === first.deadline,
              'attempt-sequence'
            );
            check(n === 0 || a.start >= group[n - 1].end + RETRY_POLICY.backoffMs[a.attempt - 2], 'retry-backoff');
            check(
              n === group.length - 1 ? a.status === 200 : RETRY_POLICY.statuses.includes(a.status),
              'attempt-status'
            );
          });
          const consumed = childHistory[index];
          check(
            consumed.operation === first.operation &&
              consumed.requestBodySha256 === sha(first.body) &&
              consumed.responseSha256 === last.responseSha256,
            'attempt-consumption'
          );
          extraRequests += group.length - 1;
          const failedBytes = group.slice(0, -1).reduce((sum, a) => sum + a.bytes, 0);
          extraBytes += failedBytes;
          const operation = historyOperations[first.operation - 1];
          operation.bytes += failedBytes + (index === 0 ? (preparation?.inspection.failedResponseBytes ?? 0) : 0);
          check(operation.bytes <= 8 * 1024 * 1024, 'operation-response-budget');
          previous = last;
        });
        const boundary = groups[0];
        if (preparation)
          verifyGoalAcquisitionRetainedPrefix(preparation, uses, responses, {
            requestBody: boundary[0].body,
            responseSha256: boundary.at(-1)!.responseSha256,
          });
        else check(uses.length === 0, 'unexpected-prefix');
        // Archive counters include all successful logical calls, including replay/cache. Restore original
        // failed response and all additional physical error attempts exactly once, as composition did.
        check(
          logicalRequests + (preparation ? 1 : 0) + extraRequests <= source.manifest.maximumHttpRequests &&
            logicalBytes + (preparation?.inspection.failedResponseBytes ?? 0) + extraBytes <=
              source.manifest.maximumResponseBytes,
          'aggregate-budget'
        );
        closed = true;
      } catch (error) {
        failed = true;
        throw error;
      }
    },
  });
}
