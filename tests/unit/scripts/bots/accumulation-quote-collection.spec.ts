// @vitest-environment node
/** Synthetic collection joins only: bootstrap/close receipts are independent fixtures, never acquired here. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { createAccumulationEvidenceFixture } from './fixtures/accumulation-evidence-fixture';
import { feeBytes, hex } from './fixtures/historical-goal-bound-fee-fixture';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../scripts/bots/historical-execution-codec';
import {
  accumulationEvidenceDigest,
  verifyAccumulationDecisionPacket,
  isVerifiedAccumulationDecisionPacket,
  AccumulationEvidenceError,
  type AccumulationRpcReceipt,
  type AccumulationTrustedSource,
} from '../../../../scripts/bots/accumulation-evidence-bridge';
import {
  createAccumulationQuoteRequests,
  type AccumulationQuoteRequestDescriptor,
} from '../../../../scripts/bots/accumulation-quote-requests';

import {
  createAccumulationQuoteTransport,
  AccumulationQuoteRetentionError,
  type AccumulationQuoteTransportOutcome,
} from '../../../../scripts/bots/accumulation-quote-transport';

const H = 3_600_000_000;
const UNIT = 10n ** 18n;
const endpoint = 'https://ws.mof.sora.org/' as const;
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Reuse sealed invented metadata, while supplying separately trusted bootstrap/close fixture evidence. */
function bootstrap(wrongPrecision?: 'kusd' | 'xor') {
  const synthetic = createAccumulationEvidenceFixture(H + 1000);
  if (wrongPrecision) {
    synthetic.proof[wrongPrecision] = hex(
      synthetic.registry
        .createType('Lookup18', {
          symbol: wrongPrecision.toUpperCase(),
          precision: 6,
        })
        .toU8a()
    );
  }
  const identity = { ...synthetic.identity, blockHash: hash(100) };
  const producer = createAccumulationQuoteRequests({ identity, blockNumber: 100, denominator: '1', rpcIdStart: 1000 });
  let id = 0;
  const rpc = (method: string, params: unknown[], result: unknown): AccumulationRpcReceipt => {
    const n = ++id;
    const responseBody = JSON.stringify({ jsonrpc: '2.0', id: n, result });
    return {
      endpoint,
      requestBody: JSON.stringify({ jsonrpc: '2.0', id: n, method, params }),
      responseBody,
      responseSha256: sha(responseBody),
      requestedAtMs: H + 1100 + n * 2,
      completedAtMs: H + 1101 + n * 2,
      httpStatus: 200,
      failure: null,
    };
  };
  const header = (n: number) => ({
    number: `0x${n.toString(16)}`,
    parentHash: hash(n - 1),
    stateRoot: hash(900),
    extrinsicsRoot: hash(901),
    digest: { logs: [] },
  });
  const version = { specName: 'sora-substrate', ...identity.runtimeVersion };
  const bootstrapRpc = [
    rpc('chain_getBlockHash', [0], GENESIS),
    rpc('chain_getBlockHash', [110], hash(110)),
    rpc('chain_getFinalizedHead', [], hash(120)),
    rpc('chain_getHeader', [hash(120)], header(120)),
    rpc('chain_getHeader', [hash(110)], header(110)),
    rpc('chain_getBlockHash', [100], hash(100)),
    rpc('chain_getHeader', [hash(100)], header(100)),
    rpc('chain_getBlockHash', [99], hash(99)),
    rpc('chain_getHeader', [hash(99)], header(99)),
    rpc('state_getRuntimeVersion', [hash(100)], version),
    rpc('state_getRuntimeVersion', [hash(99)], version),
    rpc('state_getMetadata', [hash(100)], identity.metadataHex),
    rpc('state_getMetadata', [hash(99)], identity.metadataHex),
    rpc('state_getStorageHash', ['0x3a636f6465', hash(100)], hash(902)),
  ];
  const row = (symbol: string) => ({
    timestamp: H / 1000 - 1,
    denominator: '1',
    closeEvidence: {
      kind: 'finalized-hour-close',
      genesisHash: GENESIS,
      completedAt: H / 1000,
      timestamp: H / 1000 - 1,
      symbol,
      requestedSymbol: symbol,
      decimals: 18,
      blockHeight: 99,
      blockHash: hash(99),
      nextBlockHeight: 100,
      nextBlockHash: hash(100),
      nextTimestamp: H / 1000 + 1,
      xorPool:
        symbol === 'XOR'
          ? null
          : {
              baseAssetId: XOR,
              targetAssetId: KUSD,
              baseDecimals: 18,
              targetDecimals: 18,
              baseAssetReserves: String(1000n * UNIT),
              targetAssetReserves: String(2000n * UNIT),
            },
    },
  });
  const closeRowsJson = JSON.stringify({ [KUSD]: [row('KUSD')], [XOR]: [row('XOR')] });
  const trustedBase: Omit<AccumulationTrustedSource, 'packetSha256'> = {
    sourceRegistrationSha256: 'a'.repeat(64),
    endpoint,
    finalizedSource: { hash: hash(110), height: 110 },
    metadataSha256: sha(Buffer.from(identity.metadataHex.slice(2), 'hex')),
    codeHash: hash(902),
    runtimeVersion: identity.runtimeVersion,
    denominator: '1',
    completedClose: {
      timestampMs: H,
      availableAtMs: H + 2000,
      rawRowsSha256: sha(closeRowsJson),
      sourceReceiptSha256: 'b'.repeat(64),
    },
  };
  const info = hex(
    synthetic.registry.createType('RuntimeDispatchInfo', { weight: 3, class: 'Normal', partialFee: '6' }).toU8a()
  );
  const storageResult = [
    {
      block: hash(100),
      changes: Object.entries(producer.storageKeys).map(([name, key]) => [
        key,
        synthetic.proof[name as keyof typeof synthetic.proof],
      ]),
    },
  ];
  return { synthetic, producer, bootstrapRpc, closeRowsJson, trustedBase, info, storageResult };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
type Mode = 'normal' | 'null-quote' | 'partial-quote' | 'rpc-error' | 'partial-context';

/** Test-only injected recorder acknowledges bytes after its in-memory durable-boundary stand-in. */
function collection(
  mode: Mode = 'normal',
  retainGate?: (name: string) => Promise<void>,
  wrongPrecision?: 'kusd' | 'xor'
) {
  const f = bootstrap(wrongPrecision);
  let wall = H + 2100;
  vi.spyOn(Date, 'now').mockImplementation(() => wall++);
  const forbidden = vi.fn(() => {
    throw Error('external network forbidden');
  });
  vi.stubGlobal('fetch', forbidden);
  const retained = new Map<string, string>();
  const wire = new Map<string, { request: string; response: string }>();
  const events: string[] = [];
  let fetches = 0;
  const injectedFetch: typeof globalThis.fetch = vi.fn(async (url, init) => {
    expect(url).toBe(endpoint);
    expect(init).toMatchObject({ method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store' });
    const attempt = ++fetches;
    const requestBody = String(init?.body);
    const started = JSON.parse(retained.get(`rpc-${attempt}-start.json`)!);
    expect(Buffer.from(started.requestBodyBase64, 'base64').toString()).toBe(requestBody);
    expect(started.requestSha256).toBe(sha(requestBody));
    events.push(`fetch:${attempt}`);
    const call = JSON.parse(requestBody);
    let result: unknown;
    if (call.method === 'state_queryStorageAt') result = f.storageResult;
    else if (call.method === 'liquidityProxy_quote') {
      const amount = call.params[3];
      result =
        mode === 'null-quote' && amount === String(5n * UNIT)
          ? null
          : {
              amount,
              amount_without_impact: amount,
              fee: { [XOR]: '10' },
              route: [KUSD, XOR],
              rewards: [],
            };
    } else if (call.method === 'state_call') {
      result = call.params[0] === 'TransactionPaymentApi_query_info' ? f.info : feeBytes(1, 2, 3);
    } else throw Error('unexpected synthetic method');
    const errorQuote = call.method === 'liquidityProxy_quote' && call.params[3] === String(5n * UNIT);
    const partial =
      (mode === 'partial-quote' && errorQuote) ||
      (mode === 'partial-context' && call.method === 'state_queryStorageAt');
    const body =
      mode === 'rpc-error' && errorQuote
        ? JSON.stringify({ jsonrpc: '2.0', id: call.id, error: { code: -32000, message: 'invented failure' } })
        : ` \n${JSON.stringify({ jsonrpc: '2.0', id: call.id, result }, null, 2)}\n `;
    const responseBody = partial ? body.slice(0, 31) : body;
    wire.set(requestBody, { request: requestBody, response: responseBody });
    if (partial) {
      let part = 0;
      return new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            if (part++ === 0) controller.enqueue(Buffer.from(responseBody));
            else controller.error(Error('invented interrupted response'));
          },
        }),
        { status: 200 }
      );
    }
    return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
  });
  const transport = createAccumulationQuoteTransport({
    fetch: injectedFetch,
    retain: async (name, bytes) => {
      events.push(`retain-enter:${name}`);
      await retainGate?.(name);
      expect(retained.has(name)).toBe(false);
      expect(bytes.endsWith('\n')).toBe(true);
      retained.set(name, bytes);
      events.push(`retained:${name}`);
      return { sha256: sha(bytes), bytes: Buffer.byteLength(bytes) };
    },
    maximumRequests: 28,
    maximumTotalResponseBytes: 28 * 65536,
    timeoutMs: 1000,
  });
  const outcomes: AccumulationQuoteTransportOutcome[] = [];
  const read = async (descriptor: AccumulationQuoteRequestDescriptor) => {
    const outcome = await transport.request(descriptor);
    expect(retained.has(`rpc-${outcome.raw.attempt}-outcome.json`)).toBe(true);
    outcomes.push(outcome);
    return outcome;
  };
  const run = async () => {
    const context = await read(f.producer.contextRequest);
    const candidates = [];
    for (const candidate of f.producer.candidates) {
      const quoted = await read(candidate.quoteRequest);
      const fees = f.producer.feeRequestsForQuote(candidate.inputKusd, quoted.receipt);
      const feeOutcomes = [];
      for (const descriptor of fees.feeRequests) feeOutcomes.push(await read(descriptor));
      candidates.push({
        inputKusd: candidate.inputKusd,
        quoteReceivedAtMs: quoted.receipt.completedAtMs,
        feeReceivedAtMs: feeOutcomes.at(-1)?.receipt.completedAtMs ?? quoted.receipt.completedAtMs,
        expiresAtMs: context.receipt.completedAtMs + 5000,
        rpc: [quoted.receipt, ...feeOutcomes.map((v) => v.receipt)],
      });
    }
    const packet = {
      block: { hash: hash(100), height: 100 },
      contextReceivedAtMs: context.receipt.completedAtMs,
      decisionAtMs: Date.now(),
      contextRpc: [...f.bootstrapRpc, context.receipt],
      closeRowsJson: f.closeRowsJson,
      candidates,
    };
    const trusted = { ...f.trustedBase, packetSha256: accumulationEvidenceDigest(packet) };
    return { packet, trusted, context };
  };
  return { f, transport, retained, wire, events, outcomes, forbidden, injectedFetch, read, run };
}

describe('synthetic accumulation request collection into the sealed bridge', () => {
  it('records all28 produced requests and their original bytes/clocks, then authenticates nine bounded-fee candidates', async () => {
    const c = collection();
    try {
      const { packet, trusted } = await c.run();
      const verified = verifyAccumulationDecisionPacket(packet, trusted);
      expect(isVerifiedAccumulationDecisionPacket(verified)).toBe(true);
      expect(verified.packet.candidates.map((row) => row.inputKusd)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(verified.packet.candidates.every((row) => row.status === 'ready')).toBe(true);
      expect(verified.packet.currentPrice).toEqual({ numerator: '1', denominator: '1' });
      expect(verified.packet.latestCompletedClose?.price).toEqual({ numerator: '2', denominator: '1' });
      expect(verified.packet.candidates[8].quote).toMatchObject({
        quotedOutputXorCodec: String(9n * UNIT),
        minimumOutputXorCodec: '8955000000000000000',
        networkFeeXorCodec: '6',
      });
      expect(verified.actualPaidFeeVerified).toBe(false);
      expect(c.transport.statistics().startedRequests).toBe(28);
      expect(c.retained.size).toBe(56);
      expect(c.f.producer.contextRequest.params[0]).toHaveLength(7);
      expect(packet.contextRpc.slice(0, -1)).toEqual(c.f.bootstrapRpc);
      expect(c.forbidden).not.toHaveBeenCalled();
      for (const outcome of c.outcomes) {
        const n = outcome.raw.attempt;
        const durable = JSON.parse(c.retained.get(`rpc-${n}-outcome.json`)!);
        expect(durable.receipt).toEqual(outcome.receipt);
        expect(durable.raw).toEqual(outcome.raw);
        const original = c.wire.get(outcome.receipt.requestBody)!;
        expect(Buffer.from(outcome.raw.requestBodyBase64, 'base64').toString()).toBe(original.request);
        expect(Buffer.from(outcome.raw.responseBodyBase64, 'base64').toString()).toBe(original.response);
        expect(outcome.receipt.responseBody).toBe(original.response);
        expect(outcome.receipt.responseSha256).toBe(sha(original.response));
        expect(outcome.raw.requestedAtMs).toBe(outcome.receipt.requestedAtMs);
        expect(outcome.raw.completedAtMs).toBe(outcome.receipt.completedAtMs);
        expect(BigInt(outcome.raw.elapsedNs)).toBeGreaterThanOrEqual(0n);
        expect(outcome.raw.responseComplete).toBe(true);
        expect(c.events.indexOf(`retained:rpc-${n}-start.json`)).toBeLessThan(c.events.indexOf(`fetch:${n}`));
      }
    } finally {
      c.transport.close();
    }
  });

  it('preserves one native null quote as unavailable without issuing its two fee requests', async () => {
    const c = collection('null-quote');
    try {
      const { packet, trusted } = await c.run();
      const verified = verifyAccumulationDecisionPacket(packet, trusted);
      expect(isVerifiedAccumulationDecisionPacket(verified)).toBe(true);
      expect(verified.packet.candidates).toHaveLength(9);
      expect(verified.packet.candidates[4]).toMatchObject({
        status: 'unavailable',
        reason: 'native-null-route',
        quote: null,
      });
      expect(packet.candidates[4].rpc).toHaveLength(1);
      expect(c.transport.statistics().startedRequests).toBe(26);
      expect(c.retained.size).toBe(52);
    } finally {
      c.transport.close();
    }
  });

  it.each(['partial-quote', 'rpc-error'] as const)(
    'retains %s and all nine outcomes but refuses runnable bridge ownership',
    async (mode) => {
      const c = collection(mode);
      try {
        const { packet, trusted } = await c.run();
        const verified = verifyAccumulationDecisionPacket(packet, trusted);
        expect(verified.packet.status).toBe('incomplete');
        expect(isVerifiedAccumulationDecisionPacket(verified)).toBe(false);
        expect(verified.packet.candidates).toHaveLength(9);
        expect(verified.packet.candidates[4]).toMatchObject({ status: 'failed', quote: null });
        const failed = c.outcomes.find((outcome) => outcome.receipt.failure !== null)!;
        expect(failed.receipt.failure).toBe(mode === 'partial-quote' ? 'response-read-failed' : 'rpc-error');
        expect(failed.raw.responseComplete).toBe(mode !== 'partial-quote');
        expect(failed.raw.retainedBytes).toBeGreaterThan(0);
        expect(JSON.parse(c.retained.get(`rpc-${failed.raw.attempt}-outcome.json`)!).raw).toEqual(failed.raw);
        expect(packet.candidates[4].rpc).toHaveLength(1);
        expect(c.transport.statistics().startedRequests).toBe(26);
      } finally {
        c.transport.close();
      }
    }
  );

  it('retains an interrupted context body and refuses to authenticate a decision from its partial storage', async () => {
    const c = collection('partial-context');
    try {
      const { packet, trusted, context } = await c.run();
      expect(context.receipt.failure).toBe('response-read-failed');
      expect(context.raw.responseComplete).toBe(false);
      expect(context.raw.retainedBytes).toBe(31);
      const error = (() => {
        try {
          verifyAccumulationDecisionPacket(packet, trusted);
        } catch (value) {
          return value;
        }
        return null;
      })();
      expect(error).toBeInstanceOf(AccumulationEvidenceError);
      expect((error as AccumulationEvidenceError).retainedEvidence).toEqual(packet);
      expect(c.retained.size).toBe(56);
    } finally {
      c.transport.close();
    }
  });

  it.each(['kusd', 'xor'] as const)(
    'refuses %s precision mismatch in actual recorded storage despite the producer expected profile',
    async (asset) => {
      const c = collection('normal', undefined, asset);
      try {
        const { packet, trusted } = await c.run();
        expect(c.f.producer.binding.expectedTokenDecimals).toBe(18);
        const error = (() => {
          try {
            verifyAccumulationDecisionPacket(packet, trusted);
          } catch (value) {
            return value;
          }
          return null;
        })();
        expect(error).toBeInstanceOf(AccumulationEvidenceError);
        expect((error as AccumulationEvidenceError).retainedEvidence).toEqual(packet);
        expect(c.retained.size).toBe(56);
      } finally {
        c.transport.close();
      }
    }
  );

  it('rejects intact but wrong-size fee envelopes even when their raw recorded responses are authentic fixtures', async () => {
    const c = collection();
    try {
      const { packet, trusted } = await c.run();
      const wrong = { ...packet, candidates: packet.candidates.map((row) => ({ ...row, rpc: [...row.rpc] })) };
      wrong.candidates[1].rpc.splice(1, 2, ...packet.candidates[0].rpc.slice(1));
      const verified = verifyAccumulationDecisionPacket(wrong, {
        ...trusted,
        packetSha256: accumulationEvidenceDigest(wrong),
      });
      expect(verified.packet.status).toBe('incomplete');
      expect(verified.packet.candidates[1].status).toBe('failed');
      expect(isVerifiedAccumulationDecisionPacket(verified)).toBe(false);
    } finally {
      c.transport.close();
    }
  });

  it('awaits the injected durable intent before dispatch and the exact outcome acknowledgement before return', async () => {
    const start = deferred(),
      outcome = deferred(),
      startEntered = deferred(),
      outcomeEntered = deferred();
    const c = collection('normal', async (name) => {
      if (name.endsWith('-start.json')) {
        startEntered.resolve();
        await start.promise;
      } else {
        outcomeEntered.resolve();
        await outcome.promise;
      }
    });
    try {
      let returned = false;
      const reading = c.read(c.f.producer.contextRequest).then((value) => {
        returned = true;
        return value;
      });
      await startEntered.promise;
      expect(c.injectedFetch).not.toHaveBeenCalled();
      expect(c.retained.size).toBe(0);
      start.resolve();
      await outcomeEntered.promise;
      expect(c.injectedFetch).toHaveBeenCalledTimes(1);
      expect(c.retained.size).toBe(1);
      expect(returned).toBe(false);
      outcome.resolve();
      await reading;
      expect(returned).toBe(true);
      expect(c.retained.size).toBe(2);
    } finally {
      start.resolve();
      outcome.resolve();
      c.transport.close();
    }
  });

  it('retains the captured result in the explicit error when durability acknowledgement fails and disallows another request', async () => {
    const c = collection('normal', async (name) => {
      if (name.endsWith('-outcome.json')) throw Error('invented recorder failure');
    });
    try {
      const error = await c.read(c.f.producer.contextRequest).then(
        () => null,
        (value) => value
      );
      expect(error).toBeInstanceOf(AccumulationQuoteRetentionError);
      expect(error.retainedOutcome.raw.responseComplete).toBe(true);
      expect(error.retainedOutcome.receipt.failure).toBeNull();
      expect(c.retained.size).toBe(1);
      expect(c.outcomes).toHaveLength(0);
      expect(c.transport.statistics().closed).toBe(true);
      await expect(c.read(c.f.producer.candidates[0].quoteRequest)).rejects.toThrow('transport-closed');
      expect(c.injectedFetch).toHaveBeenCalledTimes(1);
    } finally {
      c.transport.close();
    }
  });
});
