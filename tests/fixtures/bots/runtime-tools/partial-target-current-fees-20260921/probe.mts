/** Read-only MOF fee-method conformance; synthetic signature and minimum, no quote or execution authority. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { expandMetadata } from '@polkadot/types/metadata';
import { compactStripLength, hexToU8a, u8aToHex } from '@polkadot/util';
import { xxhashAsHex } from '@polkadot/util-crypto';
import * as executionNamespace from '../../../../../scripts/bots/historical-execution-codec';
import * as feeNamespace from '../../../../../scripts/bots/historical-goal-fee-codec';
import * as definitionNamespace from '../../../../../src/lib/substrate/type-definitions';

const {
  createHistoricalExecutionCodec,
  assertHistoricalFeeDetailsMatchesQueryInfo,
  HISTORICAL_EXECUTION_GENESIS,
  HISTORICAL_EXECUTION_KUSD,
  HISTORICAL_EXECUTION_XOR,
} = (Reflect.get(executionNamespace, 'default') ?? executionNamespace) as typeof executionNamespace;
const { createHistoricalGoalFeeCodec } = (Reflect.get(feeNamespace, 'default') ?? feeNamespace) as typeof feeNamespace;
const { types } = (Reflect.get(definitionNamespace, 'default') ?? definitionNamespace) as typeof definitionNamespace;

export const ENDPOINT = 'https://ws.mof.sora.org/';
export const EXPECTED = Object.freeze({
  codeHash: '0xf062ed07861255f5ec443930de9c5066d1e4133036126d48462c8e233a75f27e',
  metadataSha256: '18aedaf96860e55c96ac6ad1d26f77cb2dc877ea822edf3242fdbe4f58bdd824',
  denominator: '100000000000000000000000000000000000000',
  genesisHash: HISTORICAL_EXECUTION_GENESIS,
});
const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const hash = (value: unknown): string => {
  assert.equal(typeof value, 'string');
  assert.match(value as string, /^0x[0-9a-f]{64}$/);
  return value as string;
};
export const LIMITS = Object.freeze({
  requests: 17,
  responseBytes: 65536,
  metadataBytes: 4194304,
  totalBytes: 6291456,
  requestMs: 20000,
  operationMs: 120000,
});
export const LOTS = Object.freeze([
  Object.freeze({ direction: 'kusd-xor', amountInCodec: '5000000000000000000' }),
  Object.freeze({ direction: 'kusd-xor', amountInCodec: '2500000000000000000' }),
  Object.freeze({ direction: 'xor-kusd', amountInCodec: '1000000000000000000' }),
  Object.freeze({ direction: 'xor-kusd', amountInCodec: '250000000000000000' }),
]);
const storageKey = (pallet: string, item: string) => xxhashAsHex(pallet, 128) + xxhashAsHex(item, 128).slice(2);
const ALLOWED_KEYS = [storageKey('Denomination', 'Denominator'), storageKey('XorFee', 'Multiplier')];
export interface Receipt {
  endpoint: string;
  requestBody: string;
  requestedAt: string;
  completedAt?: string;
  status?: number;
  complete: boolean;
  observedBytes: number;
  retainedBytes: number;
  responseBase64: string;
  responseSha256: string;
  error?: string;
}
/** Reject every RPC outside this fixed identity/configuration/native-fee-only scope. */
function assertRequest(method: string, params: unknown[]): void {
  const block = (value: unknown) => typeof value === 'string' && /^0x[0-9a-f]{64}$/.test(value);
  const allowed =
    method === 'chain_getBlockHash'
      ? params.length === 1 &&
        Number.isSafeInteger(params[0]) &&
        Number(params[0]) >= 0 &&
        Number(params[0]) <= 0xffffffff
      : method === 'chain_getFinalizedHead'
        ? params.length === 0
        : ['chain_getHeader', 'state_getRuntimeVersion', 'state_getMetadata'].includes(method)
          ? params.length === 1 && block(params[0])
          : method === 'state_getStorageHash'
            ? params.length === 2 && params[0] === '0x3a636f6465' && block(params[1])
            : method === 'state_getStorage'
              ? params.length === 2 && ALLOWED_KEYS.includes(String(params[0])) && block(params[1])
              : method === 'state_call'
                ? params.length === 3 &&
                  ['TransactionPaymentApi_query_info', 'TransactionPaymentApi_query_fee_details'].includes(
                    String(params[0])
                  ) &&
                  typeof params[1] === 'string' &&
                  /^0x[0-9a-f]{438}$/.test(params[1]) &&
                  block(params[2])
                : false;
  assert(allowed, 'unapproved-request');
}
/** No retry/fallback; all observed response chunks count, and raw evidence is retained before decoding or another call. */
export function createProbeRpc(fetcher: typeof fetch, retain: (receipt: Receipt) => Promise<void>) {
  let id = 0,
    totalBytes = 0,
    stopped = false,
    busy = false;
  const deadline = performance.now() + LIMITS.operationMs;
  return async (method: string, params: unknown[], maximumBytes: number = LIMITS.responseBytes): Promise<unknown> => {
    assert(!stopped && !busy, 'probe-stopped-or-busy');
    assertRequest(method, params);
    assert(
      maximumBytes === LIMITS.responseBytes || (method === 'state_getMetadata' && maximumBytes === LIMITS.metadataBytes)
    );
    if (id >= LIMITS.requests || performance.now() >= deadline) {
      stopped = true;
      throw Error('probe-budget');
    }
    const requestBody = JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params });
    const receipt: Receipt = {
      endpoint: ENDPOINT,
      requestBody,
      requestedAt: new Date().toISOString(),
      complete: false,
      observedBytes: 0,
      retainedBytes: 0,
      responseBase64: '',
      responseSha256: sha(''),
    };
    busy = true;
    const chunks: Uint8Array[] = [],
      controller = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const expiresAt = Math.min(deadline, performance.now() + LIMITS.requestMs);
    const timer = setTimeout(() => controller.abort(), Math.max(1, expiresAt - performance.now()));
    const checkTime = () => assert(!controller.signal.aborted && performance.now() < expiresAt, 'probe-timeout');
    let failure: unknown, retentionFailure: unknown;
    try {
      const response = await fetcher(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
        redirect: 'error',
        credentials: 'omit',
        signal: controller.signal,
      });
      receipt.status = response.status;
      checkTime();
      assert(!response.redirected && (!response.url || response.url === ENDPOINT), 'unexpected-endpoint');
      assert(response.body, 'missing-body');
      reader = response.body.getReader();
      for (let reads = 0; ; reads++) {
        assert(reads <= maximumBytes, 'chunk-budget');
        checkTime();
        const chunk = await reader.read();
        if (chunk.done) {
          receipt.complete = true;
          break;
        }
        receipt.observedBytes += chunk.value.byteLength;
        totalBytes += chunk.value.byteLength;
        const prefix = chunk.value.subarray(0, Math.max(0, maximumBytes - receipt.retainedBytes));
        if (prefix.byteLength) chunks.push(prefix.slice());
        receipt.retainedBytes += prefix.byteLength;
        assert(receipt.observedBytes <= maximumBytes && totalBytes <= LIMITS.totalBytes, 'response-byte-budget');
      }
      checkTime();
      assert.equal(response.status, 200, 'http-failed');
    } catch (error) {
      failure = error;
      stopped = true;
      receipt.error = error instanceof Error ? error.message : 'transport-failed';
    } finally {
      clearTimeout(timer);
      controller.abort();
      await reader?.cancel().catch(() => undefined);
      const raw = Buffer.concat(chunks);
      receipt.responseBase64 = raw.toString('base64');
      receipt.responseSha256 = sha(raw);
      receipt.completedAt = new Date().toISOString();
      try {
        await retain(receipt);
      } catch (error) {
        stopped = true;
        retentionFailure = error;
      }
      busy = false;
    }
    if (retentionFailure) throw retentionFailure;
    if (failure) throw failure;
    try {
      assert(performance.now() < deadline, 'probe-budget');
      const value = JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(receipt.responseBase64, 'base64'))
      );
      assert.deepEqual(Object.keys(value).sort(), ['id', 'jsonrpc', 'result']);
      assert.equal(value.id, id);
      assert.equal(value.jsonrpc, '2.0');
      return value.result;
    } catch (error) {
      stopped = true;
      throw error;
    }
  };
}
type Rpc = ReturnType<typeof createProbeRpc>;
/** Decode exactly this predetermined current-block probe; also used for offline raw-response verification. */
export async function collectCurrentFees(rpc: Rpc) {
  const genesisHash = hash(await rpc('chain_getBlockHash', [0]));
  assert.equal(genesisHash, EXPECTED.genesisHash);
  const blockHash = hash(await rpc('chain_getFinalizedHead', []));
  const header = (await rpc('chain_getHeader', [blockHash])) as { number: string; parentHash: string };
  assert.match(header.number, /^0x[0-9a-f]+$/);
  const blockNumber = Number(BigInt(header.number));
  assert(Number.isSafeInteger(blockNumber) && blockNumber > 0 && blockNumber <= 0xffffffff);
  hash(header.parentHash);
  assert.equal(await rpc('chain_getBlockHash', [blockNumber]), blockHash);
  const version = (await rpc('state_getRuntimeVersion', [blockHash])) as {
    specName: string;
    specVersion: number;
    transactionVersion: number;
  };
  assert.equal(version.specName, 'sora-substrate');
  assert.equal(version.specVersion, 131);
  assert.equal(version.transactionVersion, 131);
  const codeHash = hash(await rpc('state_getStorageHash', ['0x3a636f6465', blockHash]));
  assert.equal(codeHash, EXPECTED.codeHash);
  const metadataHex = (await rpc('state_getMetadata', [blockHash], 4194304)) as string;
  assert.match(metadataHex, /^0x(?:[0-9a-f]{2})+$/);
  assert.equal(sha(Buffer.from(metadataHex.slice(2), 'hex')), EXPECTED.metadataSha256);
  const identity = {
    genesisHash,
    blockHash,
    metadataHex,
    runtimeVersion: { specVersion: 131, transactionVersion: 131 },
  };
  const execution = createHistoricalExecutionCodec(identity),
    fee = createHistoricalGoalFeeCodec(identity);
  const registry = new TypeRegistry(blockHash);
  registry.register(types);
  const metadata = new Metadata(registry, hexToU8a(metadataHex));
  registry.setMetadata(metadata, undefined, undefined, true);
  const denominatorEntry = expandMetadata(registry, metadata).query.denomination.denominator;
  assert(denominatorEntry.meta.type.isPlain);
  const denominatorKey = u8aToHex(compactStripLength(denominatorEntry())[1]);
  assert.equal(denominatorKey, execution.storageKeys().denominator);
  const denominatorHex = (await rpc('state_getStorage', [denominatorKey, blockHash])) as string;
  assert.match(denominatorHex, /^0x(?:[0-9a-f]{2})+$/);
  const denominatorValue = registry.createType(
    registry.createLookupType(denominatorEntry.meta.type.asPlain),
    hexToU8a(denominatorHex)
  );
  assert.equal(u8aToHex(denominatorValue.toU8a()), denominatorHex);
  assert.equal(denominatorValue.toString(), EXPECTED.denominator);
  const multiplierEntry = expandMetadata(registry, metadata).query.xorFee.multiplier;
  assert(multiplierEntry.meta.type.isPlain);
  const multiplierKey = u8aToHex(compactStripLength(multiplierEntry())[1]);
  assert.equal(multiplierKey, ALLOWED_KEYS[1]);
  const multiplierHex = (await rpc('state_getStorage', [multiplierKey, blockHash])) as string;
  assert.match(multiplierHex, /^0x(?:[0-9a-f]{2})+$/);
  const multiplier = registry.createType(
    registry.createLookupType(multiplierEntry.meta.type.asPlain),
    hexToU8a(multiplierHex)
  );
  assert.equal(u8aToHex(multiplier.toU8a()), multiplierHex);
  const feeMetadataConstants = metadata.asV14.pallets
    .filter((pallet) => ['TransactionPayment', 'XorFee'].includes(pallet.name.toString()))
    .flatMap((pallet) =>
      pallet.constants.map((item) => {
        const decoded = registry.createType(registry.createLookupType(item.type), item.value);
        assert.equal(u8aToHex(decoded.toU8a()), item.value.toHex());
        return {
          pallet: pallet.name.toString(),
          name: item.name.toString(),
          hex: item.value.toHex(),
          value: decoded.toJSON(),
        };
      })
    );
  const results: Array<{
    direction: string;
    request: { assetIn: string; assetOut: string; amountInCodec: string; quotedAmountOutCodec: string };
    bound: ReturnType<typeof fee.buildBoundSwapEnvelope>;
    info: ReturnType<typeof execution.decodeQueryInfo>;
    details: ReturnType<typeof assertHistoricalFeeDetailsMatchesQueryInfo>;
    minimumOutputIsDummy: true;
    quoteObserved: false;
  }> = [];
  for (const { direction, amountInCodec } of LOTS) {
    const request = {
      assetIn: direction === 'kusd-xor' ? HISTORICAL_EXECUTION_KUSD : HISTORICAL_EXECUTION_XOR,
      assetOut: direction === 'kusd-xor' ? HISTORICAL_EXECUTION_XOR : HISTORICAL_EXECUTION_KUSD,
      amountInCodec,
      quotedAmountOutCodec: '2',
    };
    const bound = fee.buildBoundSwapEnvelope(request, { blockNumber });
    assert.equal(bound.encodedLength, 215);
    assert.equal(bound.minimumCodec, '1');
    assert.equal(fee.inspectSwapEnvelope(request, { blockNumber }, bound.envelopeHex).encodedLength, 215);
    const infoHex = await rpc('state_call', ['TransactionPaymentApi_query_info', bound.feeQueryDataHex, blockHash]);
    const detailsHex = await rpc('state_call', [
      'TransactionPaymentApi_query_fee_details',
      bound.feeQueryDataHex,
      blockHash,
    ]);
    const info = execution.decodeQueryInfo(infoHex);
    const details = assertHistoricalFeeDetailsMatchesQueryInfo(detailsHex, info.partialFeeCodec, '0');
    assert.equal(details.finalFee, info.partialFeeCodec);
    assert.equal(bound.feeAssetAddress, HISTORICAL_EXECUTION_XOR);
    results.push({ direction, request, bound, info, details, minimumOutputIsDummy: true, quoteObserved: false });
  }
  return {
    kind: 'partial-target-current-fees-result-v1',
    complete: true,
    endpoint: ENDPOINT,
    blockHash,
    blockNumber,
    profile: { ...execution.binding, codeHash },
    denominator: denominatorValue.toString(),
    results,
    multiplier: { key: multiplierKey, rawHex: multiplierHex, value: multiplier.toJSON() },
    feeMetadataConstants,
    canonicalFinality: 'single-production-RPC-finalized-head-and-height-check',
    signatureVerified: false,
    feeAdequacyVerified: false,
    economicEligibility: false,
    transactionSubmitted: false,
    limitations: [
      'Dummy minimum and signature; fee-query conformance only.',
      'Maximum supported encoding length is not a future fee ceiling.',
      'No actual signed-envelope or execution checks, no admission capability, no pool/quote/history values.',
    ],
  };
}

const SOURCE_PATHS = [
  './probe.mts',
  '../../../../../scripts/bots/historical-execution-codec.ts',
  '../../../../../scripts/bots/historical-goal-fee-codec.ts',
  '../../../../../src/lib/substrate/type-definitions/index.ts',
] as const;
const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
/** Transparent policy proposal, not an estimate of future fee probabilities or a research-policy mutation. */
export function suggestCap(measuredFees: readonly string[]) {
  assert(measuredFees.length > 0 && measuredFees.every((value) => /^[1-9][0-9]*$/.test(value)), 'invalid-fees');
  const maximum = measuredFees.reduce((largest, value) => (BigInt(value) > largest ? BigInt(value) : largest), 0n);
  const quantum = 10000000000000000n,
    reserve = 1000000000000000000n;
  const cap = ((2n * maximum + quantum - 1n) / quantum) * quantum;
  return {
    measuredMaximumCodec: maximum.toString(),
    stressMultiple: '2',
    roundingQuantumCodec: quantum.toString(),
    proposedPerTransactionCapCodec: cap.toString(),
    separateReserveCodec: reserve.toString(),
    maximumChargesAtCapFromReserve: (reserve / cap).toString(),
    remainderAfterThoseChargesCodec: (reserve % cap).toString(),
    rule: 'ceil(2 * maximum agreed current query fee / 0.01 XOR) * 0.01 XOR',
    status: 'proposal-only-no-policy-change',
  };
}
/** Seal the query scope before the first RPC; this cannot overwrite a previous run. */
export async function runProbe(directory: string, fetcher = globalThis.fetch) {
  await mkdir(directory, { recursive: true });
  const sources: Record<string, { sha256: string; bytes: number }> = {};
  for (const path of SOURCE_PATHS) {
    const bytes = await readFile(new URL(path, import.meta.url));
    sources[path] = { sha256: sha(bytes), bytes: bytes.length };
  }
  const protocol = {
    kind: 'partial-target-current-fees-protocol-v1',
    endpoint: ENDPOINT,
    expected: EXPECTED,
    limits: LIMITS,
    lots: LOTS,
    storageKeys: ALLOWED_KEYS,
    createdAt: new Date().toISOString(),
    sources,
    sequence: [
      'genesis',
      'finalized-head',
      'header',
      'canonical-height',
      'runtime-version',
      ':code-hash',
      'metadata',
      'denomination',
      'XorFee.Multiplier',
      'query_info/query_fee_details for each fixed lot',
    ],
    dummyQuotedOutputCodec: '2',
    dummyMinimumOutputCodec: '1',
    expectedEnvelopeBytes: 215,
    envelope: {
      version: 4,
      address: 'AccountId32',
      signaturesBound: ['Ed25519', 'Sr25519', 'Ecdsa'],
      maximumSignature: 'Ecdsa',
      nonceMaximum: '4294967295',
      eraPeriod: 64,
      tipCodec: '0',
      feeAsset: 'XOR',
      source: 'XYKPool',
      dexId: 0,
    },
    readsAccountNonce: false,
    observesQuote: false,
    retries: 0,
    fallback: false,
    walletCalls: 0,
    signingCalls: 0,
    submitted: false,
    stressProposal:
      'Twice maximum agreed current query fee, rounded upward to 0.01 XOR; compare with separate 1 XOR reserve. Research owner decides cap.',
    economicEligibility: false,
  };
  const protocolBytes = json(protocol);
  await writeFile(join(directory, 'protocol.json'), protocolBytes, { flag: 'wx' });
  const receipts: { path: string; sha256: string; bytes: number }[] = [];
  const rpc = createProbeRpc(fetcher, async (receipt) => {
    const bytes = json(receipt),
      path = `rpc-${String(receipts.length + 1).padStart(2, '0')}.json`;
    await writeFile(join(directory, path), bytes, { flag: 'wx' });
    receipts.push({ path, sha256: sha(bytes), bytes: Buffer.byteLength(bytes) });
  });
  try {
    const evidence = await collectCurrentFees(rpc);
    assert.equal(receipts.length, LIMITS.requests);
    const result = { ...evidence, protocolSha256: sha(protocolBytes), physicalRequests: receipts.length, receipts };
    await writeFile(join(directory, 'result.json'), json(result), { flag: 'wx' });
    return result;
  } catch (error) {
    await writeFile(
      join(directory, 'failed.json'),
      json({
        complete: false,
        protocolSha256: sha(protocolBytes),
        receipts,
        error: error instanceof Error ? error.message : 'unknown',
        noRetry: true,
        submitted: false,
      }),
      { flag: 'wx' }
    );
    throw error;
  }
}
/** Reconstruct exact identity, envelopes and agreed fees entirely from retained raw bytes; no fetch dependency. */
export async function verifyProbe(directory: string) {
  const protocolBytes = await readFile(join(directory, 'protocol.json'));
  const protocol = JSON.parse(protocolBytes.toString('utf8'));
  assert.equal(protocol.kind, 'partial-target-current-fees-protocol-v1');
  assert.equal(protocol.endpoint, ENDPOINT);
  assert.deepEqual(protocol.expected, EXPECTED);
  assert.deepEqual(protocol.limits, LIMITS);
  assert.deepEqual(protocol.lots, LOTS);
  assert.deepEqual(protocol.storageKeys, ALLOWED_KEYS);
  assert.deepEqual(Object.keys(protocol.sources), [...SOURCE_PATHS]);
  for (const path of SOURCE_PATHS) {
    const bytes = await readFile(new URL(path, import.meta.url));
    assert.deepEqual(protocol.sources[path], { sha256: sha(bytes), bytes: bytes.length });
  }
  const resultBytes = await readFile(join(directory, 'result.json'));
  const result = JSON.parse(resultBytes.toString('utf8'));
  assert.equal(result.protocolSha256, sha(protocolBytes));
  assert.equal(result.physicalRequests, LIMITS.requests);
  assert.equal(result.receipts.length, LIMITS.requests);
  let cursor = 0,
    totalBytes = 0,
    firstAt = 0,
    lastAt = 0;
  const replay: Rpc = async (method, params, maximumBytes = LIMITS.responseBytes) => {
    assertRequest(method, params);
    const index = cursor++,
      entry = result.receipts[index];
    assert.equal(entry.path, `rpc-${String(index + 1).padStart(2, '0')}.json`);
    const bytes = await readFile(join(directory, entry.path));
    assert.equal(entry.bytes, bytes.length);
    assert.equal(entry.sha256, sha(bytes));
    const receipt: Receipt = JSON.parse(bytes.toString('utf8'));
    assert.equal(receipt.endpoint, ENDPOINT);
    assert.equal(receipt.requestBody, JSON.stringify({ jsonrpc: '2.0', id: index + 1, method, params }));
    assert.equal(receipt.status, 200);
    assert.equal(receipt.complete, true);
    assert.equal(receipt.error, undefined);
    const raw = Buffer.from(receipt.responseBase64, 'base64');
    assert.equal(raw.toString('base64'), receipt.responseBase64);
    assert.equal(receipt.responseSha256, sha(raw));
    assert.equal(receipt.retainedBytes, raw.length);
    assert.equal(receipt.observedBytes, raw.length);
    assert(raw.length <= maximumBytes);
    totalBytes += raw.length;
    assert(totalBytes <= LIMITS.totalBytes);
    const start = Date.parse(receipt.requestedAt),
      end = Date.parse(receipt.completedAt!);
    assert(Number.isSafeInteger(start) && Number.isSafeInteger(end) && end >= start && end - start <= LIMITS.requestMs);
    assert(start >= lastAt);
    if (!index) firstAt = start;
    lastAt = end;
    assert(end - firstAt <= LIMITS.operationMs);
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
    assert.deepEqual(Object.keys(value).sort(), ['id', 'jsonrpc', 'result']);
    assert.equal(value.id, index + 1);
    assert.equal(value.jsonrpc, '2.0');
    return value.result;
  };
  const reconstructed = await collectCurrentFees(replay);
  const { receipts, physicalRequests, protocolSha256, ...recordedEvidence } = result;
  assert.deepEqual(reconstructed, recordedEvidence);
  assert.equal(cursor, LIMITS.requests);
  const verification = {
    kind: 'partial-target-current-fees-verification-v1',
    verified: true,
    verifiedAt: new Date().toISOString(),
    protocolSha256,
    resultSha256: sha(resultBytes),
    sources: protocol.sources,
    receipts,
    physicalRequests,
    observedResponseBytes: totalBytes,
    observedWallMs: lastAt - firstAt,
    blockHash: reconstructed.blockHash,
    blockNumber: reconstructed.blockNumber,
    profile: reconstructed.profile,
    denominator: reconstructed.denominator,
    multiplier: reconstructed.multiplier,
    feeMetadataConstants: reconstructed.feeMetadataConstants,
    fees: reconstructed.results.map((row) => ({
      direction: row.direction,
      amountInCodec: row.request.amountInCodec,
      envelopeBytes: row.bound.encodedLength,
      partialFeeCodec: row.info.partialFeeCodec,
      details: row.details,
      queryApisAgree: true,
    })),
    proposal: suggestCap(reconstructed.results.map((row) => row.info.partialFeeCodec)),
    noNetworkDuringVerification: true,
    quoteObserved: false,
    actualExecutionVerified: false,
    economicEligibility: false,
    walletUsed: false,
    signed: false,
    submitted: false,
    limitations: [
      'Single finalized production RPC attestation, not a trie proof.',
      'Dummy minimum and signature estimate fees only; no trade quote, account nonce, balance, or dispatch.',
      'A fixed-width u128 minimum does not change envelope length. The encoding bound covers supported AccountId32, Ed25519/Sr25519/Ecdsa and u32 nonce, not future fee ceilings.',
      'Stress margin is explicit policy judgment; later actual fee estimates above the chosen cap must be rejected. The separate 1 XOR reserve is finite, including fees of failed included transactions.',
    ],
  };
  await writeFile(join(directory, 'verification.json'), json(verification), { flag: 'wx' });
  return verification;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const directory = dirname(fileURLToPath(import.meta.url));
  assert(['--run', '--verify'].includes(process.argv[2]), 'expected --run or --verify');
  if (process.argv[2] === '--run') {
    const result = await runProbe(directory);
    console.log(
      json({
        complete: true,
        blockNumber: result.blockNumber,
        blockHash: result.blockHash,
        requests: result.physicalRequests,
        fees: result.results.map((row) => ({
          direction: row.direction,
          input: row.request.amountInCodec,
          fee: row.info.partialFeeCodec,
        })),
      })
    );
  } else {
    const result = await verifyProbe(directory);
    console.log(json({ verified: result.verified, requests: result.physicalRequests, proposal: result.proposal }));
  }
}
