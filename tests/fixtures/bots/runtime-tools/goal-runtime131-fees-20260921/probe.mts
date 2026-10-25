/** Read-only MOF fee-method conformance; synthetic signature and minimum, no quote or execution authority. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { expandMetadata } from '@polkadot/types/metadata';
import { compactStripLength, hexToU8a, u8aToHex } from '@polkadot/util';
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
/** Exactly approved RPC methods and per-call byte bounds; durable receipt precedes decoding or further calls. */
export function createProbeRpc(fetcher: typeof fetch, retain: (receipt: Receipt) => Promise<void>) {
  let id = 0;
  let stopped = false;
  return async (method: string, params: unknown[], maximumBytes = 65536): Promise<unknown> => {
    assert(!stopped, 'probe-stopped');
    assert(
      [
        'chain_getBlockHash',
        'chain_getFinalizedHead',
        'chain_getHeader',
        'state_getRuntimeVersion',
        'state_getStorageHash',
        'state_getMetadata',
        'state_getStorage',
        'state_call',
      ].includes(method),
      'unapproved-method'
    );
    assert(++id <= 14, 'request-budget');
    assert(maximumBytes === 65536 || (method === 'state_getMetadata' && maximumBytes === 4194304));
    const requestBody = JSON.stringify({ jsonrpc: '2.0', id, method, params });
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
    const chunks: Uint8Array[] = [];
    const controller = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    const timer = setTimeout(() => controller.abort(), 20000);
    let failure: unknown;
    let retentionFailure: unknown;
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
      assert(!response.redirected && (!response.url || response.url === ENDPOINT), 'unexpected-endpoint');
      assert(response.body, 'missing-body');
      reader = response.body.getReader();
      for (let reads = 0; ; reads++) {
        assert(reads <= maximumBytes, 'chunk-budget');
        const chunk = await reader.read();
        if (chunk.done) {
          receipt.complete = true;
          break;
        }
        receipt.observedBytes += chunk.value.byteLength;
        const prefix = chunk.value.subarray(0, maximumBytes - receipt.retainedBytes);
        if (prefix.byteLength) chunks.push(prefix.slice());
        receipt.retainedBytes += prefix.byteLength;
        assert(receipt.observedBytes <= maximumBytes, 'response-byte-budget');
      }
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
    }
    if (retentionFailure) throw retentionFailure;
    if (failure) throw failure;
    try {
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

/** Only fee/runtime metadata is acquired. No pair reserves, quote, history, balance or wallet API exists here. */
export async function runProbe(directory: string, fetcher = globalThis.fetch) {
  await mkdir(directory, { recursive: true });
  const sources: Record<string, { sha256: string; bytes: number }> = {};
  for (const relative of [
    './probe.mts',
    '../../../../../scripts/bots/historical-execution-codec.ts',
    '../../../../../scripts/bots/historical-goal-fee-codec.ts',
    '../../../../../src/lib/substrate/type-definitions/index.ts',
  ]) {
    const raw = await readFile(new URL(relative, import.meta.url));
    sources[relative] = { sha256: sha(raw), bytes: raw.length };
  }
  await writeFile(
    join(directory, 'protocol.json'),
    JSON.stringify(
      {
        kind: 'runtime131-fee-method-conformance-v1',
        endpoint: ENDPOINT,
        expected: EXPECTED,
        lots: [
          { input: 'KUSD', codec: '5000000000000000000' },
          { input: 'XOR', codec: '1000000000000000000' },
        ],
        dummyQuotedOutputCodec: '2',
        dummyMinimumOutputCodec: '1',
        quoteObserved: false,
        expectedEnvelopeBytes: 215,
        maximumRequests: 14,
        perRequestTimeoutMs: 20000,
        retries: 0,
        fallback: false,
        sources,
        walletCalls: 0,
        signingCalls: 0,
        submitted: false,
        economicEligibility: false,
      },
      null,
      2
    ) + '\n',
    { flag: 'wx' }
  );
  const receipts: { path: string; sha256: string; bytes: number }[] = [];
  const rpc = createProbeRpc(fetcher, async (receipt) => {
    const raw = JSON.stringify(receipt, null, 2) + '\n',
      path = `rpc-${String(receipts.length + 1).padStart(2, '0')}.json`;
    await writeFile(join(directory, path), raw, { flag: 'wx' });
    receipts.push({ path, sha256: sha(raw), bytes: Buffer.byteLength(raw) });
  });
  try {
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
    const results: Array<{
      direction: string;
      request: { assetIn: string; assetOut: string; amountInCodec: string; quotedAmountOutCodec: string };
      bound: ReturnType<typeof fee.buildBoundSwapEnvelope>;
      info: ReturnType<typeof execution.decodeQueryInfo>;
      details: ReturnType<typeof assertHistoricalFeeDetailsMatchesQueryInfo>;
      minimumOutputIsDummy: true;
      quoteObserved: false;
    }> = [];
    for (const direction of ['kusd-xor', 'xor-kusd']) {
      const request = {
        assetIn: direction === 'kusd-xor' ? HISTORICAL_EXECUTION_KUSD : HISTORICAL_EXECUTION_XOR,
        assetOut: direction === 'kusd-xor' ? HISTORICAL_EXECUTION_XOR : HISTORICAL_EXECUTION_KUSD,
        amountInCodec: direction === 'kusd-xor' ? '5000000000000000000' : '1000000000000000000',
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
    const result = {
      kind: 'runtime131-fee-method-conformance-result-v1',
      complete: true,
      endpoint: ENDPOINT,
      blockHash,
      blockNumber,
      profile: { ...execution.binding, codeHash },
      denominator: denominatorValue.toString(),
      results,
      physicalRequests: receipts.length,
      receipts,
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
    await writeFile(join(directory, 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    return result;
  } catch (error) {
    await writeFile(
      join(directory, 'failed.json'),
      JSON.stringify(
        {
          complete: false,
          error: error instanceof Error ? error.message : 'unknown',
          receipts,
          noRetry: true,
          transactionSubmitted: false,
          economicEligibility: false,
        },
        null,
        2
      ) + '\n',
      { flag: 'wx' }
    );
    throw error;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runProbe(join(dirname(fileURLToPath(import.meta.url)), 'episode'));
  console.log(
    JSON.stringify({
      complete: true,
      blockNumber: result.blockNumber,
      blockHash: result.blockHash,
      physicalRequests: result.physicalRequests,
      fees: result.results.map((row) => ({ direction: row.direction, codec: row.info.partialFeeCodec })),
      economicEligibility: false,
      transactionSubmitted: false,
    })
  );
}
