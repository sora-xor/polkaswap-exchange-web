/** Exact, read-only replay of a failed first training acquisition. Never a market fallback or qualification. */
import { goalRawBytesSha256, goalRawEvidenceDigest } from './goal-raw-envelope';

const SHA = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const HISTORY = 'https://pi.soramitsu.io/graphql';
const MARKET = 'https://mof2.sora.org/';
const HISTORY_QUERY =
  'query GoalQualificationPoolHistory($filter:AssetSnapshotFilter!,$after:Cursor){assetSnapshots(first:100,after:$after,orderBy:[TIMESTAMP_ASC],filter:$filter){pageInfo{hasNextPage endCursor}edges{node{id assetId type timestamp denominator closeEvidence}}}}';
const ASSETS = [
  '0x02000c0000000000000000000000000000000000000000000000000000000000',
  '0x0200000000000000000000000000000000000000000000000000000000000000',
];
const MAX_FILE = 32 * 1024 * 1024;
const MAX_TOTAL = 512 * 1024 * 1024;
type Json = Record<string, any>; // Parsed bounded JSON; only validated fields reach a transport.
type Lane = 'history' | 'market';
export interface GoalAcquisitionReplayBindings {
  readonly parentPlanSha256: string;
  readonly parentSourceSha256: string;
  readonly requestSha256: string;
  /** Canonical store record digest, not the digest of its trailing file newline. */
  readonly accessSha256: string;
  readonly failedRecordSha256: string;
  readonly rawManifestSha256: string;
  readonly failedHttpStatus: 502;
}
export interface GoalAcquisitionReplayFile {
  /** registration, access, failed, or raw/<original receipt.name>; adapters never receive caller paths. */
  name: string;
  sha256: string;
  bytes: number;
}
export interface GoalAcquisitionReplayPreparation {
  readonly kind: 'goal-acquisition-replay-preparation-v1';
  readonly bindings: Readonly<GoalAcquisitionReplayBindings>;
  readonly inspection: Readonly<{
    rawEnvelopes: number;
    metadataRequests: number;
    poolRequests: number;
    historyRequests: number;
    successfulRequests: number;
    failedRequestSha256: string;
    responseBytes: number;
    failedResponseBytes: number;
    /** Original network starts exclude returned metadata-cache responses. */
    originalPhysicalStarts: number;
  }>;
}
export interface GoalAcquisitionReplayCompletion {
  readonly kind: 'goal-acquisition-replay-completion-v1';
  readonly bindings: Readonly<GoalAcquisitionReplayBindings>;
}
export interface GoalAcquisitionReplayUse {
  kind: 'goal-acquisition-prefix-use-v1';
  bindings: Readonly<GoalAcquisitionReplayBindings>;
  lane: Lane;
  sequence: number;
  originalName: string;
  originalValueSha256: string;
  requestSha256: string;
  responseSha256: string;
  cacheEvidenceName: string | null;
  originalHttpStatus: number;
  use: 'replay' | 'failed-request-boundary';
  historicalArrivalKnown: false;
}
interface Call {
  name: string;
  valueSha256: string;
  url: string;
  body: string;
  response: string;
  responseSha256: string;
  status: number;
  cacheName: string | null;
}
interface Prepared {
  history: readonly Call[];
  market: readonly Call[];
  failure: Call;
  claimed: boolean;
}
const preparations = new WeakMap<object, Prepared>();
const completions = new WeakMap<object, { preparation: GoalAcquisitionReplayPreparation; valid: () => boolean }>();
const utf8 = (value: string) => new TextEncoder().encode(value);
const byteLength = (value: string) => utf8(value).length;
const sha = (value: string | Uint8Array) => goalRawBytesSha256(typeof value === 'string' ? utf8(value) : value);
const canonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((v as Json)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
const digest = (v: unknown) => sha(canonical(v));
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);
function check(value: unknown, reason: string): asserts value {
  if (!value) throw Error(`goal-acquisition-replay:${reason}`);
}
function own(value: unknown, fields?: readonly string[]): Json {
  check(value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype, 'own-data');
  const ds = Object.getOwnPropertyDescriptors(value);
  check(
    Reflect.ownKeys(ds).every((k) => typeof k === 'string' && ds[k].enumerable && 'value' in ds[k]),
    'own-data'
  );
  if (fields) check(Object.keys(ds).length === fields.length && fields.every((k) => ds[k]), 'fields');
  return Object.fromEntries(Object.entries(ds).map(([k, d]) => [k, d.value]));
}
function freeze<T>(v: T): T {
  if (v && typeof v === 'object') {
    Object.values(v).forEach(freeze);
    Object.freeze(v);
  }
  return v;
}
function parse(text: string): Json {
  check(typeof text === 'string' && byteLength(text) <= MAX_FILE, 'file-size');
  let parsed: Json;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw Error('goal-acquisition-replay:invalid-json');
  }
  // Re-encoding is intentional: files retain their exact bytes separately; canonical digests bind store values.
  check(parsed && typeof parsed === 'object' && !Array.isArray(parsed), 'json-object');
  return parsed;
}
function safeFile(entry: unknown): GoalAcquisitionReplayFile {
  const e = own(entry, ['name', 'sha256', 'bytes']);
  check(
    typeof e.name === 'string' && /^(?:registration|access|failed|raw\/[A-Za-z0-9][A-Za-z0-9._-]{0,127})$/.test(e.name),
    'file-name'
  );
  check(SHA.test(e.sha256) && Number.isSafeInteger(e.bytes) && e.bytes > 0 && e.bytes <= MAX_FILE, 'file-binding');
  return e as GoalAcquisitionReplayFile;
}
/** Make a metadata-only file inventory. The trusted caller must enumerate the complete original raw directory. */
export function buildGoalAcquisitionReplayManifest(
  requestSha256: string,
  entries: readonly GoalAcquisitionReplayFile[]
) {
  check(
    SHA.test(requestSha256) && Array.isArray(entries) && entries.length >= 4 && entries.length <= 16003,
    'manifest'
  );
  const files = entries.map(safeFile).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  check(
    new Set(files.map((f) => f.name)).size === files.length && files.reduce((n, f) => n + f.bytes, 0) <= MAX_TOTAL,
    'manifest-files'
  );
  check(
    ['registration', 'access', 'failed', 'raw/failure.json', 'raw/source.json', 'raw/metadata-cache-binding'].every(
      (n) => files.some((f) => f.name === n)
    ),
    'manifest-required'
  );
  return freeze({ kind: 'goal-acquisition-prefix-manifest-v1' as const, requestSha256, files });
}
async function bounded<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener('abort', abort);
      reject(Error('goal-acquisition-replay:aborted'));
    };
    signal.addEventListener('abort', abort, { once: true });
    work.then(
      (v) => {
        signal.removeEventListener('abort', abort);
        signal.aborted ? abort() : resolve(v);
      },
      (e) => {
        signal.removeEventListener('abort', abort);
        reject(e);
      }
    );
    if (signal.aborted) abort();
  });
}
/** Validate immutable raw envelopes without printing bodies, evaluating a strategy, or reading another partition. */
export async function prepareGoalAcquisitionReplay(
  input: { requestSha256: string; rawManifestSha256: string },
  options: { readArtifact(name: string, signal: AbortSignal): Promise<string>; signal?: AbortSignal }
): Promise<GoalAcquisitionReplayPreparation> {
  return prepare(input, options, 'operation');
}
/** Pinned artifact distribution uses a separate per-file timeout; original acquisition clocks are untouched. */
export async function prepareGoalAcquisitionReplayBundle(
  input: { requestSha256: string; rawManifestSha256: string },
  options: { readArtifact(name: string, signal: AbortSignal): Promise<string>; signal?: AbortSignal }
): Promise<GoalAcquisitionReplayPreparation> {
  return prepare(input, options, 'artifact');
}
async function prepare(
  input: { requestSha256: string; rawManifestSha256: string },
  options: { readArtifact(name: string, signal: AbortSignal): Promise<string>; signal?: AbortSignal },
  timeoutScope: 'operation' | 'artifact'
): Promise<GoalAcquisitionReplayPreparation> {
  const i = own(input, ['requestSha256', 'rawManifestSha256']);
  check(SHA.test(i.requestSha256) && SHA.test(i.rawManifestSha256), 'input');
  const opts = own(options);
  check(
    Object.keys(opts).every((k) => ['readArtifact', 'signal'].includes(k)) && typeof opts.readArtifact === 'function',
    'options'
  );
  check(opts.signal === undefined || opts.signal instanceof AbortSignal, 'signal');
  const lifetime = opts.signal as AbortSignal | undefined;
  const overall = timeoutScope === 'operation' ? AbortSignal.timeout(30000) : undefined;
  const read = async (name: string) => {
    const signal = AbortSignal.any([...(lifetime ? [lifetime] : []), overall ?? AbortSignal.timeout(30000)]);
    check(!signal.aborted, 'aborted');
    return bounded(
      Promise.resolve().then(() => opts.readArtifact(name, signal)),
      signal
    );
  };
  const rawManifest = await read('manifest');
  check(sha(rawManifest) === i.rawManifestSha256, 'manifest-hash');
  const parsed = own(parse(rawManifest), ['kind', 'requestSha256', 'files']);
  const manifest = buildGoalAcquisitionReplayManifest(i.requestSha256, parsed.files);
  check(same(parsed, manifest), 'manifest-binding');
  const files = new Map<string, { value: Json; sha256: string }>();
  let registration!: Json, access!: Json, failed!: Json;
  for (const entry of manifest.files) {
    const text = await read(entry.name);
    check(byteLength(text) === entry.bytes && sha(text) === entry.sha256, 'file-hash');
    const data = parse(text);
    if (!entry.name.startsWith('raw/')) {
      if (entry.name === 'registration') registration = data;
      if (entry.name === 'access') access = data;
      if (entry.name === 'failed') failed = data;
      continue;
    }
    own(data, ['kind', 'name', 'requestSha256', 'sha256', 'value']);
    check(
      data.kind === 'goal-study-raw-evidence-v1' &&
        data.requestSha256 === i.requestSha256 &&
        entry.name === `raw/${data.name}` &&
        SHA.test(data.sha256) &&
        digest(data.value) === data.sha256,
      'raw-envelope'
    );
    check(data.value && typeof data.value === 'object' && !Array.isArray(data.value), 'raw-value');
    files.set(data.name, { value: data.value, sha256: data.sha256 });
  }
  own(registration, ['kind', 'plan', 'sourceSha256', 'registeredAt', 'registration']);
  own(access, ['kind', 'recordedAt', 'registrationSha256', 'request', 'selectionSha256']);
  own(failed, ['kind', 'requestSha256', 'accessSha256']);
  const request = own(access.request, [
    'candidate',
    'candidateSha256',
    'endAtMs',
    'episodeIndex',
    'partitionIdentitySha256',
    'phase',
    'planSha256',
    'startAtMs',
  ]);
  check(
    registration.kind === 'goal-study-registration-v1' &&
      access.kind === 'goal-study-evaluation-access-v1' &&
      failed.kind === 'goal-study-evaluation-failed-v1',
    'record-kind'
  );
  check(
    request.phase === 'training' &&
      request.episodeIndex === 0 &&
      access.selectionSha256 === null &&
      request.planSha256 === digest(registration.plan) &&
      digest(request) === i.requestSha256 &&
      failed.requestSha256 === i.requestSha256 &&
      failed.accessSha256 === digest(access),
    'first-training'
  );
  const plan = registration.plan,
    reg = registration.registration;
  check(plan.protocol === 'finalized-xyk-qualification-v2', 'protocol');
  check(
    reg.registrationSha256 ===
      digest({
        kind: registration.kind,
        sourceSha256: registration.sourceSha256,
        registeredAt: registration.registeredAt,
        planSha256: request.planSha256,
        trainingIdentitySha256: plan.training.identitySha256,
        validationIdentitySha256: plan.validation.identitySha256,
      }),
    'registration-digest'
  );
  check(
    Array.isArray(plan.candidates) &&
      same(request.candidate, plan.candidates[0]) &&
      request.candidateSha256 === digest(plan.candidates[0]) &&
      request.partitionIdentitySha256 === plan.training.identitySha256 &&
      request.startAtMs === plan.training.startAtMs &&
      request.endAtMs === request.startAtMs + 86400000,
    'training-binding'
  );
  check(
    SHA.test(registration.sourceSha256) &&
      plan.source.evaluatorSha256 === registration.sourceSha256 &&
      reg.planSha256 === request.planSha256 &&
      access.registrationSha256 === reg.registrationSha256,
    'source-binding'
  );
  const source = files.get('source.json')!.value;
  check(
    same(source.request, request) &&
      same(source.registration, reg) &&
      source.selection === null &&
      source.transactionSubmitted === false,
    'source-record'
  );
  const cacheBinding = files.get('metadata-cache-binding')!.value;
  check(
    cacheBinding.binding?.partition === 'training' && cacheBinding.bindingSha256 === digest(cacheBinding.binding),
    'cache-binding'
  );
  const schemas = [...files]
    .filter(([n]) => /^market-schema-\d+\.json$/.test(n))
    .sort((a, b) => Number(a[0].split('-')[2].split('.')[0]) - Number(b[0].split('-')[2].split('.')[0]));
  const cache = [...files]
    .filter(([n]) => /^cache-\d+$/.test(n))
    .sort((a, b) => Number(a[0].slice(6)) - Number(b[0].slice(6)));
  const market: Call[] = [],
    history: Call[] = [];
  let ci = 0,
    poolCount = 0;
  const successBody = (r: Json, isHistory: boolean) => {
    check(
      r.httpStatus === 200 &&
        typeof r.responseBody === 'string' &&
        SHA.test(r.responseSha256) &&
        sha(r.responseBody) === r.responseSha256 &&
        r.responseBodyBase64 === undefined &&
        r.failure === undefined,
      'successful-response'
    );
    const start = isHistory ? r.requestedAtMs : Date.parse(r.requestedAt),
      end = isHistory ? r.completedAtMs : Date.parse(r.completedAt);
    check(Number.isSafeInteger(start) && Number.isSafeInteger(end) && end >= start, 'receipt-time');
    if (isHistory) check(r.complete === true && r.bytes === byteLength(r.responseBody), 'history-complete');
    else {
      const response = parse(r.responseBody);
      check(
        response.jsonrpc === '2.0' &&
          response.id === r.id &&
          Object.hasOwn(response, 'result') &&
          !Object.hasOwn(response, 'error'),
        'rpc-response'
      );
    }
  };
  const metadata = (r: Json, owner: { value: Json; sha256: string }, name: string) => {
    successBody(r, false);
    check(
      [
        'chain_getBlockHash',
        'chain_getFinalizedHead',
        'chain_getHeader',
        'state_getRuntimeVersion',
        'state_getStorageHash',
        'state_getMetadata',
        'state_getStorage',
      ].includes(r.method) && Array.isArray(r.params),
      'metadata-method'
    );
    const next = cache[ci++];
    check(next && next[0] === `cache-${ci}`, 'cache-sequence');
    const c = next[1].value;
    check(
      c.kind === 'verified-metadata-cache-hit' &&
        c.bindingSha256 === cacheBinding.bindingSha256 &&
        c.callerId === r.id &&
        c.method === r.method &&
        same(c.params, r.params) &&
        c.returnedProjectionSha256 === r.responseSha256 &&
        c.arrivalTimeKnown === false &&
        Array.isArray(c.wireMatches) &&
        c.wireMatches.length > 0,
      'cache-response-join'
    );
    market.push({
      name,
      valueSha256: owner.sha256,
      url: MARKET,
      body: JSON.stringify({ jsonrpc: '2.0', id: r.id, method: r.method, params: r.params }),
      response: r.responseBody,
      responseSha256: r.responseSha256,
      status: 200,
      cacheName: next[0],
    });
  };
  check(schemas.length > 0, 'no-market-prefix');
  for (let s = 0; s < schemas.length; s++) {
    const [name, schema] = schemas[s];
    check(
      name === `market-schema-${s + 1}.json` &&
        schema.value.evidence?.blockEvidence?.length === 10 &&
        schema.value.evidence.storageEvidence?.length === 0,
      'schema-sequence'
    );
    let rpcId = 0;
    for (const r of schema.value.evidence.blockEvidence) {
      check(r.id === ++rpcId, 'rpc-sequence');
      metadata(r, schema, name);
    }
    const states = [...files]
      .filter(([n, v]) => /^market-state-\d+\.json$/.test(n) && v.value.schemaSha256 === schema.sha256)
      .sort((a, b) => a[1].value.storageEvidence[0].id - b[1].value.storageEvidence[0].id);
    check(
      states.length > 0 && states.length <= 64 && (s === schemas.length - 1 || states.length === 64),
      'shard-completeness'
    );
    for (let n = 0; n < states.length; n++) {
      const [name, state] = states[n],
        v = state.value;
      check(v.blockEvidence?.length === 4 && v.storageEvidence?.length === 1, 'state-receipts');
      for (const r of v.blockEvidence) {
        check(r.id === ++rpcId, 'rpc-sequence');
        metadata(r, state, name);
      }
      const r = v.storageEvidence[0];
      successBody(r, false);
      check(
        r.id === n + 1 &&
          r.method === 'state_queryStorageAt' &&
          HASH.test(r.blockHash) &&
          Array.isArray(r.keys) &&
          r.keys.length === 7 &&
          new Set(r.keys).size === 7 &&
          r.keys.every((k: unknown) => typeof k === 'string' && /^0x[0-9a-f]+$/.test(k)),
        'pool-request'
      );
      market.push({
        name,
        valueSha256: state.sha256,
        url: MARKET,
        body: JSON.stringify({ jsonrpc: '2.0', id: r.id, method: r.method, params: [r.keys, r.blockHash] }),
        response: r.responseBody,
        responseSha256: r.responseSha256,
        status: 200,
        cacheName: null,
      });
      poolCount++;
    }
  }
  check(
    ci === cache.length && poolCount === [...files.keys()].filter((n) => /^market-state-\d+\.json$/.test(n)).length,
    'prefix-orphans'
  );
  const historyFiles = [...files]
    .filter(([n]) => /^history-\d+\.json$/.test(n))
    .sort((a, b) => Number(a[0].split('-')[1].split('.')[0]) - Number(b[0].split('-')[1].split('.')[0]));
  const addHistory = (
    r: Json,
    owner: { value: Json; sha256: string },
    name: string,
    index: number,
    failed = false
  ): Call => {
    check(r.index === index && typeof r.requestBody === 'string', 'history-sequence');
    const body = parse(r.requestBody);
    own(body, ['query', 'variables']);
    const variables = own(body.variables, ['filter', 'after']);
    const filter = own(variables.filter, ['assetId', 'type', 'timestamp']);
    own(filter.assetId, ['equalTo']);
    own(filter.type, ['equalTo']);
    const time = own(filter.timestamp, ['greaterThanOrEqualTo', 'lessThan']);
    check(
      body.query === HISTORY_QUERY &&
        filter.type.equalTo === 'HOUR' &&
        ASSETS.includes(filter.assetId.equalTo) &&
        filter.assetId.equalTo === r.assetId &&
        Number.isSafeInteger(r.page) &&
        r.page >= 0 &&
        r.page < 8 &&
        (variables.after === null || typeof variables.after === 'string') &&
        [time.greaterThanOrEqualTo, time.lessThan].every((t) => Number.isSafeInteger(t) && t >= 0 && t % 3600 === 0) &&
        time.lessThan > time.greaterThanOrEqualTo &&
        time.lessThan - time.greaterThanOrEqualTo <= 201 * 3600 &&
        time.lessThan <= request.endAtMs / 1000,
      'history-request'
    );
    if (!failed) successBody(r, true);
    else
      check(
        r.httpStatus === 502 &&
          r.complete === true &&
          typeof r.responseBody === 'string' &&
          sha(r.responseBody) === r.responseSha256 &&
          r.bytes === byteLength(r.responseBody),
        'failed-response'
      );
    return {
      name,
      valueSha256: owner.sha256,
      url: HISTORY,
      body: r.requestBody,
      response: r.responseBody,
      responseSha256: r.responseSha256,
      status: r.httpStatus,
      cacheName: null,
    };
  };
  for (const [name, file] of historyFiles) {
    check(Array.isArray(file.value.rpcEvidence) && file.value.rpcEvidence.length > 0, 'history-receipts');
    file.value.rpcEvidence.forEach((r: Json, n: number) => history.push(addHistory(r, file, name, n)));
  }
  const failure = files.get('failure.json')!,
    f = failure.value;
  check(
    f.stage === 'history' &&
      f.diagnostic?.stage === 'response' &&
      f.diagnostic.reason === 'http-error' &&
      f.diagnostic.financialActions === false &&
      Array.isArray(f.diagnostic.rpcEvidence) &&
      f.diagnostic.rpcEvidence.length > 0,
    'failure-kind'
  );
  const rs = f.diagnostic.rpcEvidence as Json[];
  rs.slice(0, -1).forEach((r, n) => history.push(addHistory(r, failure, 'failure.json', n)));
  const failedCall = addHistory(rs.at(-1)!, failure, 'failure.json', rs.length - 1, true);
  check(f.requests === market.length + history.length + 1, 'request-count');
  check(
    f.responseBytes === [...market, ...history, failedCall].reduce((n, c) => n + byteLength(c.response), 0),
    'response-byte-count'
  );
  for (const [name] of files)
    check(
      /^(?:cache-\d+|market-schema-\d+\.json|market-state-\d+\.json|history-\d+\.json|history-pending-\d+\.json|valuation-\d+\.json|opening\.json|failure\.json|source\.json|metadata-cache-binding|composition-metadata)$/.test(
        name
      ),
      'unsupported-envelope'
    );
  const bindings: GoalAcquisitionReplayBindings = {
    parentPlanSha256: request.planSha256,
    parentSourceSha256: registration.sourceSha256,
    requestSha256: i.requestSha256,
    accessSha256: digest(access),
    failedRecordSha256: digest(failed),
    rawManifestSha256: i.rawManifestSha256,
    failedHttpStatus: 502,
  };
  const result = freeze({
    kind: 'goal-acquisition-replay-preparation-v1' as const,
    bindings,
    inspection: {
      rawEnvelopes: files.size,
      metadataRequests: ci,
      poolRequests: poolCount,
      historyRequests: history.length,
      successfulRequests: market.length + history.length,
      failedRequestSha256: sha(failedCall.body),
      responseBytes: f.responseBytes as number,
      failedResponseBytes: byteLength(failedCall.response),
      originalPhysicalStarts: poolCount + history.length + 1,
    },
  });
  preparations.set(result, {
    history: freeze(history),
    market: freeze(market),
    failure: freeze(failedCall),
    claimed: false,
  });
  return result;
}
/** Ownership, not a serialized digest/boolean, establishes a verified retained-prefix preparation. */
export function assertGoalAcquisitionReplayPreparation(
  value: unknown,
  expected?: GoalAcquisitionReplayBindings
): asserts value is GoalAcquisitionReplayPreparation {
  check(!!value && typeof value === 'object' && preparations.has(value), 'unowned-preparation');
  if (expected) check(same((value as GoalAcquisitionReplayPreparation).bindings, expected), 'binding-mismatch');
}
/** Successful replay completion is privately tied to both exhausted lanes and the one consumed retry response. */
export function assertGoalAcquisitionReplayCompletion(
  value: unknown,
  expected: GoalAcquisitionReplayBindings
): asserts value is GoalAcquisitionReplayCompletion {
  check(!!value && typeof value === 'object', 'unowned-completion');
  const owned = completions.get(value);
  check(owned && owned.valid() && same(owned.preparation.bindings, expected), 'unowned-completion');
}
/** Sequential strict replay. After completion, the trusted composition must explicitly choose its next transport. */
export function createGoalAcquisitionReplay(
  preparation: GoalAcquisitionReplayPreparation,
  options: {
    retainEvidence(receipt: Readonly<GoalAcquisitionReplayUse>): Promise<void>;
    acquireFailedRequest(
      url: string,
      init: RequestInit,
      preparation: GoalAcquisitionReplayPreparation
    ): Promise<Response>;
    signal?: AbortSignal;
  }
) {
  assertGoalAcquisitionReplayPreparation(preparation);
  const source = preparations.get(preparation)!;
  const opts = own(options);
  check(
    !source.claimed &&
      Object.keys(opts).every((k) => ['retainEvidence', 'acquireFailedRequest', 'signal'].includes(k)) &&
      typeof opts.retainEvidence === 'function' &&
      typeof opts.acquireFailedRequest === 'function' &&
      (opts.signal === undefined || opts.signal instanceof AbortSignal),
    'transport-options'
  );
  source.claimed = true;
  const controller = new AbortController();
  const signal = opts.signal ? AbortSignal.any([opts.signal, controller.signal]) : controller.signal;
  const retainEvidence = opts.retainEvidence as typeof options.retainEvidence;
  const acquireFailedRequest = opts.acquireFailedRequest as typeof options.acquireFailedRequest;
  let hi = 0,
    mi = 0,
    active = false,
    terminal = false,
    consumed = false,
    failed = false;
  let proof: GoalAcquisitionReplayCompletion | undefined;
  const fetchFor =
    (lane: Lane): typeof fetch =>
    async (url, init) => {
      try {
        check(!failed && !signal.aborted && !active && !terminal, 'closed-or-concurrent');
        active = true;
        check(
          typeof url === 'string' &&
            init &&
            init.method === 'POST' &&
            typeof init.body === 'string' &&
            init.credentials === 'omit' &&
            init.redirect === 'error' &&
            !init.signal?.aborted,
          'request-init'
        );
        const fields = own(init);
        check(
          Object.keys(fields).every((k) =>
            ['method', 'body', 'headers', 'redirect', 'credentials', 'signal', 'cache'].includes(k)
          ) &&
            (fields.cache === undefined || fields.cache === 'no-store'),
          'request-init'
        );
        const headers = own(fields.headers),
          names = Object.keys(headers).map((k) => k.toLowerCase());
        check(
          new Set(names).size === names.length &&
            names.includes('content-type') &&
            Object.entries(headers).every(
              ([k, v]) =>
                (k.toLowerCase() === 'content-type' && v === 'application/json') ||
                (k.toLowerCase() === 'cache-control' && (v === 'no-cache' || v === 'no-store'))
            ),
          'request-headers'
        );
        const calls = lane === 'history' ? source.history : source.market;
        const sequence = lane === 'history' ? hi : mi;
        const boundary = lane === 'history' && sequence === calls.length;
        const call = boundary ? source.failure : calls[sequence];
        check(call && url === call.url && init.body === call.body, 'request-diverged');
        check(!boundary || (hi === source.history.length && mi === source.market.length), 'prefix-not-drained');
        const operation = AbortSignal.any([signal, AbortSignal.timeout(30000), ...(init.signal ? [init.signal] : [])]);
        await bounded(
          Promise.resolve().then(() =>
            retainEvidence(
              freeze({
                kind: 'goal-acquisition-prefix-use-v1' as const,
                bindings: preparation.bindings,
                lane,
                sequence,
                originalName: call.name,
                originalValueSha256: call.valueSha256,
                requestSha256: sha(call.body),
                responseSha256: call.responseSha256,
                cacheEvidenceName: call.cacheName,
                originalHttpStatus: call.status,
                use: boundary ? 'failed-request-boundary' : 'replay',
                historicalArrivalKnown: false,
              })
            )
          ),
          operation
        );
        check(!operation.aborted && !failed, 'aborted');
        if (!boundary) {
          lane === 'history' ? hi++ : mi++;
          return new Response(call.response, { status: 200, headers: { 'content-type': 'application/json' } });
        }
        terminal = true;
        const response = await bounded(
          Promise.resolve().then(() => acquireFailedRequest(url, { ...init, signal: operation }, preparation)),
          operation
        );
        check(
          !operation.aborted &&
            !failed &&
            response.status === 200 &&
            !response.redirected &&
            (!response.url || response.url === HISTORY) &&
            response.body,
          'retry-response'
        );
        const reader = response.body.getReader();
        return new Response(
          new ReadableStream({
            async pull(stream) {
              try {
                const part = await bounded(reader.read(), operation);
                check(!operation.aborted && !failed, 'aborted');
                if (part.done) {
                  consumed = true;
                  reader.releaseLock();
                  stream.close();
                } else stream.enqueue(part.value);
              } catch (e) {
                failed = true;
                void reader.cancel().catch(() => undefined);
                stream.error(e);
              }
            },
            cancel() {
              failed = true;
              return reader.cancel();
            },
          }),
          { status: response.status, headers: response.headers }
        );
      } catch (error) {
        failed = true;
        controller.abort();
        throw error;
      } finally {
        active = false;
      }
    };
  return Object.freeze({
    fetch: fetchFor('history'),
    marketFetch: fetchFor('market'),
    completion(): GoalAcquisitionReplayCompletion {
      check(
        !failed && consumed && terminal && hi === source.history.length && mi === source.market.length,
        'incomplete'
      );
      if (!proof) {
        proof = freeze({ kind: 'goal-acquisition-replay-completion-v1' as const, bindings: preparation.bindings });
        completions.set(proof, { preparation, valid: () => !failed && consumed });
      }
      return proof;
    },
    dispose() {
      controller.abort();
    },
  });
}

/** Compact projection of an independently verified child's actual retained response. No prices are copied here. */
export interface GoalAcquisitionRetainedResponse {
  lane: Lane;
  requestBodySha256: string;
  responseSha256: string;
  httpStatus: number;
}
/**
 * Verify the saved prefix-use journal against owned parent lanes and causal child response order.
 * This issues no live replay completion, qualification, network request or retry authority.
 */
export function verifyGoalAcquisitionRetainedPrefix(
  preparation: GoalAcquisitionReplayPreparation,
  uses: readonly GoalAcquisitionReplayUse[],
  responses: readonly GoalAcquisitionRetainedResponse[],
  failedRetry: { requestBody: string; responseSha256: string }
): void {
  assertGoalAcquisitionReplayPreparation(preparation);
  const source = preparations.get(preparation)!;
  check(Array.isArray(uses) && uses.length === source.history.length + source.market.length + 1, 'retained-use-count');
  check(Array.isArray(responses) && responses.length <= 10000, 'retained-response-count');
  goalRawEvidenceDigest(uses);
  goalRawEvidenceDigest(responses);
  goalRawEvidenceDigest(failedRetry);
  const retry = own(failedRetry, ['requestBody', 'responseSha256']);
  check(retry.requestBody === source.failure.body && SHA.test(retry.responseSha256), 'retained-retry');
  const seen = new Set<string>();
  for (const raw of uses) {
    const u = own(raw, [
      'kind',
      'bindings',
      'lane',
      'sequence',
      'originalName',
      'originalValueSha256',
      'requestSha256',
      'responseSha256',
      'cacheEvidenceName',
      'originalHttpStatus',
      'use',
      'historicalArrivalKnown',
    ]);
    check(
      (u.lane === 'history' || u.lane === 'market') && Number.isSafeInteger(u.sequence) && u.sequence >= 0,
      'retained-use'
    );
    const calls = u.lane === 'history' ? source.history : source.market;
    const boundary = u.lane === 'history' && u.sequence === calls.length;
    const call = boundary ? source.failure : calls[u.sequence];
    const identity = `${u.lane}-${u.sequence}`;
    check(call && !seen.has(identity), 'retained-use-sequence');
    seen.add(identity);
    check(
      same(u, {
        kind: 'goal-acquisition-prefix-use-v1',
        bindings: preparation.bindings,
        lane: u.lane,
        sequence: u.sequence,
        originalName: call.name,
        originalValueSha256: call.valueSha256,
        requestSha256: sha(call.body),
        responseSha256: call.responseSha256,
        cacheEvidenceName: call.cacheName,
        originalHttpStatus: call.status,
        use: boundary ? 'failed-request-boundary' : 'replay',
        historicalArrivalKnown: false,
      }),
      'retained-use-binding'
    );
  }
  const lanes: Record<Lane, GoalAcquisitionRetainedResponse[]> = { history: [], market: [] };
  for (const raw of responses) {
    const r = own(raw, ['lane', 'requestBodySha256', 'responseSha256', 'httpStatus']);
    check(
      (r.lane === 'history' || r.lane === 'market') &&
        SHA.test(r.requestBodySha256) &&
        SHA.test(r.responseSha256) &&
        r.httpStatus === 200,
      'retained-response'
    );
    lanes[r.lane as Lane].push(r as unknown as GoalAcquisitionRetainedResponse);
  }
  for (const lane of ['history', 'market'] as const) {
    const expected = lane === 'history' ? source.history : source.market;
    check(lanes[lane].length >= expected.length, 'retained-response-prefix');
    expected.forEach((call, index) =>
      check(
        same(lanes[lane][index], {
          lane,
          requestBodySha256: sha(call.body),
          responseSha256: call.responseSha256,
          httpStatus: 200,
        }),
        'retained-response-prefix'
      )
    );
  }
  let priorHistory = 0,
    priorMarket = 0;
  for (const row of responses) {
    if (row.lane === 'market') priorMarket++;
    else if (priorHistory++ === source.history.length) {
      check(priorMarket >= source.market.length, 'retained-prefix-barrier');
      break;
    }
  }
  check(
    same(lanes.history[source.history.length], {
      lane: 'history',
      requestBodySha256: sha(source.failure.body),
      responseSha256: retry.responseSha256,
      httpStatus: 200,
    }),
    'retained-retry-consumption'
  );
}
