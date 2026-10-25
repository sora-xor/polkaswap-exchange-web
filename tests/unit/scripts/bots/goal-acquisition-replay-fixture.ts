/** Invented raw training acquisition, including original cache receipts. No external market observations. */
import { createHash } from 'node:crypto';
import { buildGoalAcquisitionReplayManifest } from '../../../../scripts/bots/goal-acquisition-replay';
import { syntheticQualificationPlan } from '../../features/bot-trading/goal-qualification-fixtures';
import {
  GOAL_QUALIFICATION_POLICY_V2,
  GOAL_QUALIFICATION_PROTOCOL_V2,
} from '@/features/bot-trading/goal-qualification';
type Json = Record<string, any>;
export const acquisitionCanonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(acquisitionCanonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${acquisitionCanonical((v as Json)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
export const acquisitionSha = (v: string) => createHash('sha256').update(v).digest('hex');
export const acquisitionDigest = (v: unknown) => acquisitionSha(acquisitionCanonical(v));
const H = (n: number) => n.toString(16).padStart(64, '0');
/** Optional real store records align this synthetic raw prefix with an integration test's failed parent. */
export function goalAcquisitionReplayFixture(records?: { registration: Json; access: Json; failed: Json }) {
  const plan = {
    ...syntheticQualificationPlan(),
    protocol: GOAL_QUALIFICATION_PROTOCOL_V2,
    policy: GOAL_QUALIFICATION_POLICY_V2,
  };
  const registration: Json = records?.registration ?? {
    kind: 'goal-study-registration-v1',
    plan,
    sourceSha256: plan.source.evaluatorSha256,
    registeredAt: '2026-01-01T00:00:00.000Z',
  };
  registration.registration ??= {
    kind: 'preregistered-unopened-validation',
    planSha256: acquisitionDigest(plan),
    trainingIdentitySha256: plan.training.identitySha256,
    validationIdentitySha256: plan.validation.identitySha256,
    registrationSha256: acquisitionDigest({
      kind: registration.kind,
      sourceSha256: registration.sourceSha256,
      registeredAt: registration.registeredAt,
      planSha256: acquisitionDigest(plan),
      trainingIdentitySha256: plan.training.identitySha256,
      validationIdentitySha256: plan.validation.identitySha256,
    }),
  };
  const request = records?.access.request ?? {
    candidate: plan.candidates[0],
    candidateSha256: acquisitionDigest(plan.candidates[0]),
    endAtMs: plan.training.startAtMs + 86400000,
    episodeIndex: 0,
    partitionIdentitySha256: plan.training.identitySha256,
    phase: 'training',
    planSha256: acquisitionDigest(plan),
    startAtMs: plan.training.startAtMs,
  };
  const requestSha256 = acquisitionDigest(request);
  const access = records?.access ?? {
    kind: 'goal-study-evaluation-access-v1',
    recordedAt: '2026-01-01T00:00:01.000Z',
    registrationSha256: registration.registration.registrationSha256,
    request,
    selectionSha256: null,
  };
  const failed = records?.failed ?? {
    kind: 'goal-study-evaluation-failed-v1',
    requestSha256,
    accessSha256: acquisitionDigest(access),
  };
  const raw = new Map<string, Json>();
  const binding = { partition: 'training', manifestSha256: H(11) };
  const bindingSha256 = acquisitionDigest(binding);
  raw.set('metadata-cache-binding', { binding, bindingSha256 });
  raw.set('source.json', {
    request,
    registration: registration.registration,
    selection: null,
    transactionSubmitted: false,
  });
  const marketCalls: Array<{ url: string; body: string; response: string }> = [];
  let cacheId = 0;
  const metadata = (id: number, method: string, params: unknown[]) => {
    const responseBody = JSON.stringify({
      jsonrpc: '2.0',
      id,
      result: method === 'state_getMetadata' ? '0x0000' : null,
    });
    const responseSha256 = acquisitionSha(responseBody);
    const record = {
      id,
      method,
      params,
      requestedAt: '2026-01-01T00:00:02.000Z',
      completedAt: '2026-01-01T00:00:02.001Z',
      httpStatus: 200,
      responseBody,
      responseSha256,
    };
    raw.set(`cache-${++cacheId}`, {
      kind: 'verified-metadata-cache-hit',
      bindingSha256,
      callerId: id,
      method,
      params,
      returnedProjectionSha256: responseSha256,
      arrivalTimeKnown: false,
      wireMatches: [{ groupSha256: H(1) }],
    });
    marketCalls.push({
      url: 'https://mof2.sora.org/',
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      response: responseBody,
    });
    return record;
  };
  const methods = [
    'chain_getBlockHash',
    'chain_getFinalizedHead',
    'chain_getHeader',
    'chain_getBlockHash',
    'chain_getHeader',
    'chain_getBlockHash',
    'chain_getHeader',
    'state_getRuntimeVersion',
    'state_getStorageHash',
    'state_getMetadata',
  ];
  const schema = {
    context: {},
    evidence: {
      blockEvidence: methods.map((m, n) => metadata(n + 1, m, [])),
      storageEvidence: [],
      blockReads: 0,
      markReads: 0,
    },
  };
  raw.set('market-schema-1.json', schema);
  const blockEvidence = ['chain_getBlockHash', 'chain_getHeader', 'state_getStorageHash', 'state_getStorage'].map(
    (m, n) => metadata(n + 11, m, [])
  );
  const storage = {
    id: 1,
    method: 'state_queryStorageAt',
    blockHash: '0x' + H(20),
    keys: Array.from({ length: 7 }, (_, n) => '0x' + H(n + 30)),
    requestedAt: '2026-01-01T00:00:02.002Z',
    completedAt: '2026-01-01T00:00:02.003Z',
    httpStatus: 200,
    responseBody: JSON.stringify({ jsonrpc: '2.0', id: 1, result: [] }),
    responseSha256: '',
  };
  storage.responseSha256 = acquisitionSha(storage.responseBody);
  raw.set('market-state-20.json', {
    schemaSha256: acquisitionDigest(schema),
    blockEvidence,
    storageEvidence: [storage],
    value: {},
  });
  marketCalls.push({
    url: 'https://mof2.sora.org/',
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: storage.method, params: [storage.keys, storage.blockHash] }),
    response: storage.responseBody,
  });
  const query =
    'query GoalQualificationPoolHistory($filter:AssetSnapshotFilter!,$after:Cursor){assetSnapshots(first:100,after:$after,orderBy:[TIMESTAMP_ASC],filter:$filter){pageInfo{hasNextPage endCursor}edges{node{id assetId type timestamp denominator closeEvidence}}}}';
  const historyReceipt = (index: number, status = 200) => {
    const requestBody = JSON.stringify({
      query,
      variables: {
        filter: {
          assetId: {
            equalTo:
              index === 0
                ? '0x02000c0000000000000000000000000000000000000000000000000000000000'
                : '0x0200000000000000000000000000000000000000000000000000000000000000',
          },
          type: { equalTo: 'HOUR' },
          timestamp: { greaterThanOrEqualTo: 0, lessThan: 3600 },
        },
        after: null,
      },
    });
    const responseBody =
      status === 200
        ? JSON.stringify({ data: { assetSnapshots: { pageInfo: { hasNextPage: false, endCursor: null }, edges: [] } } })
        : 'upstream unavailable';
    return {
      index,
      assetId:
        index === 0
          ? '0x02000c0000000000000000000000000000000000000000000000000000000000'
          : '0x0200000000000000000000000000000000000000000000000000000000000000',
      page: 0,
      requestBody,
      requestedAtMs: 1000 + index,
      completedAtMs: 1001 + index,
      httpStatus: status,
      responseBody,
      responseSha256: acquisitionSha(responseBody),
      bytes: Buffer.byteLength(responseBody),
      complete: true,
    };
  };
  const success = historyReceipt(0),
    failure = historyReceipt(1, 502);
  const failureValue = {
    stage: 'history',
    reason: 'missing-or-inconsistent-evidence',
    requests: 17,
    responseBytes: marketCalls.reduce((n, c) => n + Buffer.byteLength(c.response), 0) + success.bytes + failure.bytes,
    diagnostic: { stage: 'response', reason: 'http-error', financialActions: false, rpcEvidence: [success, failure] },
  };
  raw.set('failure.json', failureValue);
  const artifacts = new Map<string, string>();
  artifacts.set('registration', acquisitionCanonical(registration) + '\n');
  artifacts.set('access', acquisitionCanonical(access) + '\n');
  artifacts.set('failed', acquisitionCanonical(failed) + '\n');
  for (const [name, value] of raw)
    artifacts.set(
      `raw/${name}`,
      acquisitionCanonical({
        kind: 'goal-study-raw-evidence-v1',
        requestSha256,
        name,
        sha256: acquisitionDigest(value),
        value,
      }) + '\n'
    );
  const refreshManifest = () => {
    const manifest = buildGoalAcquisitionReplayManifest(
      requestSha256,
      [...artifacts]
        .filter(([name]) => name !== 'manifest')
        .map(([name, text]) => ({ name, sha256: acquisitionSha(text), bytes: Buffer.byteLength(text) }))
    );
    const text = acquisitionCanonical(manifest) + '\n';
    artifacts.set('manifest', text);
    return { requestSha256, rawManifestSha256: acquisitionSha(text) };
  };
  return {
    registration,
    access,
    failed,
    raw,
    artifacts,
    marketCalls,
    historyCalls: [
      { url: 'https://pi.soramitsu.io/graphql', body: success.requestBody, response: success.responseBody },
    ],
    failedCall: { url: 'https://pi.soramitsu.io/graphql', body: failure.requestBody, response: failure.responseBody },
    refreshManifest,
    input: refreshManifest(),
    readArtifact: async (name: string) => {
      const text = artifacts.get(name);
      if (text === undefined) throw Error('Missing fixture artifact');
      return text;
    },
  };
}
