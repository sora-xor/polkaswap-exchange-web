// @vitest-environment node
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAccumulationQuoteRequests } from '../../../../scripts/bots/accumulation-quote-requests';
import {
  createAccumulationQuoteTransport,
  AccumulationQuoteRetentionError,
} from '../../../../scripts/bots/accumulation-quote-transport';
import { createAccumulationEvidenceFixture } from './fixtures/accumulation-evidence-fixture';
import {
  createAccumulationBootstrapRequests,
  createAccumulationBootstrapDiscoveryRequest,
} from '../../../../scripts/bots/accumulation-bootstrap-requests';
import { createAccumulationJournalBridgeFixture } from './fixtures/accumulation-journal-bridge-fixture';

const producer = createAccumulationQuoteRequests({
  identity: createAccumulationEvidenceFixture().identity,
  blockNumber: 100,
  denominator: '1',
  rpcIdStart: 50,
});
const descriptors = producer.candidates.map((c) => c.quoteRequest);
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const ack = (s: string) => ({ sha256: sha(s), bytes: Buffer.byteLength(s) });
const reply = (id: number, value: unknown = null) => JSON.stringify({ jsonrpc: '2.0', id, result: value });
const deferred = <T>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
const tick = () => new Promise<void>((r) => setTimeout(r, 0));
function setup(fetcher: typeof fetch, extra: Record<string, unknown> = {}) {
  const records: { name: string; bytes: string }[] = [];
  const retain = vi.fn(async (name: string, bytes: string) => {
    records.push({ name, bytes });
    return ack(bytes);
  });
  const transport = createAccumulationQuoteTransport({
    fetch: fetcher,
    retain,
    maximumRequests: 28,
    maximumTotalResponseBytes: 28 * 65536,
    timeoutMs: 1000,
    ...extra,
  });
  return { transport, records, retain };
}
afterEach(() => vi.restoreAllMocks());

describe('prospective accumulation quote raw recorder', () => {
  it('requires explicit bootstrap profile and keeps each descriptor family separate', async () => {
    const d = createAccumulationBootstrapDiscoveryRequest({ rpcIdStart: 1 }).next([]).nextRequest!;
    const fetcher = vi.fn(async () => new Response(reply(d.id, null)));
    const regular = setup(fetcher),
      bootstrap = setup(fetcher, {
        profile: 'bootstrap',
        maximumRequests: 16,
        maximumTotalResponseBytes: 6 * 1024 * 1024,
      });
    await expect(regular.transport.request(d)).rejects.toThrow('unowned-request');
    await expect(bootstrap.transport.request(descriptors[0])).rejects.toThrow('unowned-request');
    await expect(bootstrap.transport.request({ ...d })).rejects.toThrow('unowned-request');
    expect(fetcher).not.toHaveBeenCalled();
    expect(() => setup(fetcher, { profile: 'bootstrap', maximumRequests: 17 })).toThrow('invalid-transport-options');
    expect(() =>
      setup(fetcher, { profile: 'bootstrap', maximumRequests: 16, maximumTotalResponseBytes: 6 * 1024 * 1024 + 1 })
    ).toThrow('invalid-transport-options');
    expect(() => setup(fetcher, { maximumTotalResponseBytes: 6 * 1024 * 1024 })).toThrow('invalid-transport-options');
  });
  it('allows up to2MiB only for original metadata bootstrap requests and preserves the regular64KiB cap', async () => {
    const f = createAccumulationJournalBridgeFixture(1_800_000_000_000);
    const p = createAccumulationBootstrapRequests({
      target: f.packet.block,
      finalizedSource: f.trusted.finalizedSource,
      rpcIdStart: 1,
    });
    const d = p.next(f.packet.contextRpc.slice(0, 11)).nextRequest!;
    const body = reply(d.id, '0x' + 'ab'.repeat(40_000));
    const opts = { profile: 'bootstrap', maximumRequests: 16, maximumTotalResponseBytes: 6 * 1024 * 1024 };
    const s = setup(
      vi.fn(async () => new Response(body)),
      opts
    );
    const result = await s.transport.request(d);
    expect(result.receipt.failure).toBeNull();
    expect(result.receipt.responseBody).toBe(body);
    const oversized = setup(
      vi.fn(async () => new Response(' '.repeat(2 * 1024 * 1024 + 1))),
      opts
    );
    const tooBig = await oversized.transport.request(d);
    expect(tooBig.receipt.failure).toBe('response-too-large');
    expect(tooBig.raw.retainedBytes).toBe(2 * 1024 * 1024);
    const ordinary = createAccumulationBootstrapDiscoveryRequest({ rpcIdStart: 20 }).next([]).nextRequest!;
    const small = setup(
      vi.fn(async () => new Response(' '.repeat(65537))),
      opts
    );
    expect((await small.transport.request(ordinary)).receipt.failure).toBe('response-too-large');
  });
  it('requires explicit dependencies and original owned descriptors before retaining or fetching', async () => {
    const fetcher = vi.fn();
    const s = setup(fetcher);
    await expect(s.transport.request({ ...descriptors[0] })).rejects.toThrow('unowned-request');
    expect(s.retain).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
    expect(() => createAccumulationQuoteTransport({ fetch: undefined } as never)).toThrow();
    expect(() => setup(fetcher, { maximumInFlight: 10 })).toThrow();
    expect(() => setup(fetcher, { profile: 'bootstrap', maximumRequests: 16, maximumInFlight: 4 })).toThrow();
    expect(() => setup(fetcher, { timeoutMs: 15001 })).toThrow();
  });
  it('gates physical fetch and caller completion on both durable acknowledgments, preserving exact bytes', async () => {
    const intent = deferred<void>(),
      outcome = deferred<void>();
    let resultWritten = false;
    const raw = ` { "jsonrpc": "2.0", "id": ${descriptors[0].id}, "result": null }\n`;
    const fetcher = vi.fn<typeof fetch>(async () => new Response(raw));
    const s = setup(fetcher, {
      retain: async (name: string, bytes: string) => {
        if (name.endsWith('start.json')) await intent.promise;
        else {
          resultWritten = true;
          await outcome.promise;
        }
        return ack(bytes);
      },
    });
    let finished = false;
    const pending = s.transport.request(descriptors[0]).then((v) => {
      finished = true;
      return v;
    });
    await tick();
    expect(fetcher).not.toHaveBeenCalled();
    intent.resolve();
    await tick();
    expect(resultWritten).toBe(true);
    expect(finished).toBe(false);
    outcome.resolve();
    const actual = await pending;
    expect(fetcher.mock.calls[0][0]).toBe('https://ws.mof.sora.org/');
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      body: descriptors[0].requestBody,
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
    });
    expect(actual.receipt.responseBody).toBe(raw);
    expect(actual.receipt.responseSha256).toBe(sha(raw));
    expect(Buffer.from(actual.raw.responseBodyBase64, 'base64').toString()).toBe(raw);
    expect(actual.raw).toMatchObject({
      fetchStarted: true,
      responseComplete: true,
      receivedBytes: Buffer.byteLength(raw),
    });
    expect(actual.result).toBe(null);
    expect(actual.receipt.failure).toBe(null);
    expect(Object.isFrozen(actual.raw)).toBe(true);
  });
  it.each([
    ['http-status', () => new Response('private arbitrary error', { status: 500 })],
    ['redirect-disallowed', () => new Response('', { status: 302 })],
    ['rpc-error', () => new Response(JSON.stringify({ jsonrpc: '2.0', id: descriptors[0].id, error: { code: -1 } }))],
    ['rpc-envelope', () => new Response(reply(999))],
    ['malformed-json', () => new Response('{')],
    [
      'malformed-json',
      () => new Response(`{"jsonrpc":"2.0","id":${descriptors[0].id},"result":null,"resul\\u0074":null}`),
    ],
    ['malformed-json', () => new Response(`{"jsonrpc":"2.0","id":${descriptors[0].id}.0,"result":null}`)],
    ['invalid-utf8', () => new Response(new Uint8Array([0xff, 0xfe]))],
  ] as const)('retains %s without a successful result', async (code, response) => {
    const s = setup(vi.fn(async () => response()));
    const actual = await s.transport.request(descriptors[0]);
    expect(actual.receipt.failure).toBe(code);
    expect(actual.result).toBe(null);
    expect(actual.raw.responseComplete).toBe(true);
    expect(s.records).toHaveLength(2);
    expect(JSON.parse(s.records[1].bytes).receipt).toEqual(actual.receipt);
    if (code === 'invalid-utf8') {
      expect(actual.receipt.responseBody).toBe(null);
      expect(actual.raw.responseBodyBase64).toBe('//4=');
    }
  });
  it('retains the bounded prefix and charges the entire observed oversized chunk', async () => {
    const s = setup(vi.fn(async () => new Response(new Uint8Array(65543))));
    const actual = await s.transport.request(descriptors[0]);
    expect(actual.receipt.failure).toBe('response-too-large');
    expect(actual.raw).toMatchObject({ receivedBytes: 65543, retainedBytes: 65536, responseComplete: false });
    expect(s.transport.statistics().observedResponseBytes).toBe(65543);
  });
  it('bounds a body that never completes and retains its already observed prefix', async () => {
    const s = setup(
      vi.fn(
        async () =>
          new Response(
            new ReadableStream({
              start(c) {
                c.enqueue(new TextEncoder().encode('{'));
              },
            })
          )
      ),
      { timeoutMs: 20 }
    );
    const actual = await s.transport.request(descriptors[0]);
    expect(actual.receipt.failure).toBe('timeout');
    expect(actual.raw.receivedBytes).toBe(1);
    expect(actual.raw.responseComplete).toBe(false);
  });
  it('settles an uncooperative fetch timeout and ignores its late response', async () => {
    const late = deferred<Response>();
    const s = setup(
      vi.fn(() => late.promise),
      { timeoutMs: 20 }
    );
    const actual = await s.transport.request(descriptors[0]),
      bytes = JSON.stringify(actual);
    late.resolve(new Response(reply(descriptors[0].id)));
    await tick();
    expect(actual.receipt.failure).toBe('timeout');
    expect(JSON.stringify(actual)).toBe(bytes);
    expect(s.transport.statistics().observedResponseBytes).toBe(0);
  });
  it('enforces shared concurrent capacity and total byte budget, aborting peers without late mutation', async () => {
    const replies = [deferred<Response>(), deferred<Response>()];
    let n = 0;
    const s = setup(
      vi.fn(() => replies[n++].promise),
      { maximumInFlight: 2, maximumTotalResponseBytes: 10 }
    );
    const first = s.transport.request(descriptors[0]),
      second = s.transport.request(descriptors[1]);
    await expect(s.transport.request(descriptors[2])).rejects.toThrow('transport-capacity');
    await tick();
    replies[0].resolve(new Response('12345678901'));
    const [a, b] = await Promise.all([first, second]);
    expect(a.raw.receivedBytes).toBe(11);
    expect(a.receipt.failure).toBe('total-response-limit');
    expect(a.raw.retainedBytes).toBe(10);
    expect(b.receipt.failure).toBe('total-response-limit');
    expect(s.transport.statistics().closed).toBe(true);
    replies[1].resolve(new Response(reply(descriptors[1].id)));
    await tick();
    expect(s.transport.statistics().observedResponseBytes).toBe(11);
    expect(s.records).toHaveLength(4);
    expect(s.transport.statistics().retainedResponseBytes).toBe(10);
  });
  it('closes two uncooperative active requests and retains both failures', async () => {
    const s = setup(
      vi.fn(() => new Promise<Response>(() => {})),
      { maximumInFlight: 2 }
    );
    const a = s.transport.request(descriptors[0]),
      b = s.transport.request(descriptors[1]);
    await tick();
    s.transport.close();
    expect((await a).receipt.failure).toBe('closed');
    expect((await b).receipt.failure).toBe('closed');
    expect(s.records).toHaveLength(4);
    expect(s.transport.statistics().inFlight).toBe(0);
  });
  it('bounds all nine quote lanes with one shared byte budget and cancels peers on overflow', async () => {
    const replies = Array.from({ length: 9 }, () => deferred<Response>());
    let n = 0;
    const s = setup(
      vi.fn(() => replies[n++].promise),
      { maximumInFlight: 9, maximumTotalResponseBytes: 10 }
    );
    const pending = descriptors.map((d) => s.transport.request(d));
    await expect(s.transport.request(producer.contextRequest)).rejects.toThrow('transport-capacity');
    await tick();
    expect(n).toBe(9);
    replies[0].resolve(new Response('12345678901'));
    const outcomes = await Promise.all(pending);
    expect(outcomes.map((o) => o.receipt.failure)).toEqual(Array(9).fill('total-response-limit'));
    expect(outcomes.reduce((sum, o) => sum + o.raw.retainedBytes, 0)).toBe(10);
    expect(s.transport.statistics()).toMatchObject({
      startedRequests: 9,
      observedResponseBytes: 11,
      retainedResponseBytes: 10,
      closed: true,
      inFlight: 0,
    });
    expect(s.records).toHaveLength(18);
    for (let i = 1; i < 9; i++) replies[i].resolve(new Response(reply(descriptors[i].id)));
    await tick();
    expect(s.transport.statistics().observedResponseBytes).toBe(11);
  });
  it('does not dispatch after close during intent retention', async () => {
    const gate = deferred<void>();
    const fetcher = vi.fn(async () => new Response(''));
    const s = setup(fetcher, {
      retain: async (name: string, bytes: string) => {
        if (name.endsWith('start.json')) await gate.promise;
        return ack(bytes);
      },
    });
    const p = s.transport.request(descriptors[0]);
    s.transport.close();
    gate.resolve();
    const actual = await p;
    expect(actual.receipt.failure).toBe('closed');
    expect(actual.raw.fetchStarted).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('honors explicit cancellation after a partial body', async () => {
    const abort = new AbortController();
    let supplied!: ReadableStreamDefaultController<Uint8Array>;
    const s = setup(
      vi.fn(
        async () =>
          new Response(
            new ReadableStream({
              start(c) {
                supplied = c;
                c.enqueue(new TextEncoder().encode('{'));
              },
            })
          )
      ),
      { signal: abort.signal }
    );
    const p = s.transport.request(descriptors[0]);
    await tick();
    abort.abort();
    const actual = await p;
    expect(actual.receipt.failure).toBe('aborted');
    expect(actual.raw.receivedBytes).toBe(1);
    expect(() => supplied.enqueue(new Uint8Array([1]))).toThrow();
  });
  it('poisons uncertain intent retention before dispatch and exposes uncertain outcome bytes', async () => {
    const fetcher = vi.fn(async () => new Response(reply(descriptors[0].id)));
    const failed = setup(fetcher, { retain: async () => ({ sha256: '0'.repeat(64), bytes: 0 }) });
    await expect(failed.transport.request(descriptors[0])).rejects.toBeInstanceOf(AccumulationQuoteRetentionError);
    expect(fetcher).not.toHaveBeenCalled();
    expect(failed.transport.statistics().closed).toBe(true);
    const result = setup(fetcher, {
      retain: async (name: string, bytes: string) => {
        if (name.endsWith('outcome.json')) throw Error('disk');
        return ack(bytes);
      },
    });
    const error = await result.transport.request(descriptors[0]).catch((e) => e);
    expect(error).toBeInstanceOf(AccumulationQuoteRetentionError);
    expect(error.retainedOutcome.receipt.responseBody).toBe(reply(descriptors[0].id));
    expect(result.transport.statistics().closed).toBe(true);
  });
  it('bounds an uncooperative retainer and cannot reuse a failed request', async () => {
    const fetcher = vi.fn();
    const s = setup(fetcher, { retentionTimeoutMs: 20, retain: () => new Promise(() => {}) });
    await expect(s.transport.request(descriptors[0])).rejects.toBeInstanceOf(AccumulationQuoteRetentionError);
    expect(fetcher).not.toHaveBeenCalled();
    const other = setup(
      vi.fn(async () => {
        throw Error('sensitive failure');
      })
    );
    expect((await other.transport.request(descriptors[0])).receipt.failure).toBe('transport-failed');
    await expect(other.transport.request(descriptors[0])).rejects.toThrow('request-already-attempted');
  });
  it('retains clock regression and refuses exhausted request budgets', async () => {
    const s = setup(
      vi.fn(async () => new Response(reply(descriptors[0].id))),
      { maximumRequests: 1 }
    );
    let n = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => (++n === 1 ? 2000 : 1999));
    const actual = await s.transport.request(descriptors[0]);
    expect(actual.receipt).toMatchObject({ requestedAtMs: 2000, completedAtMs: 1999, failure: 'clock-regression' });
    await expect(s.transport.request(descriptors[1])).rejects.toThrow('transport-budget');
  });
  it('rejects a reused ID even when another owned descriptor has different exact bytes', async () => {
    const other = createAccumulationQuoteRequests({
      identity: createAccumulationEvidenceFixture().identity,
      blockNumber: 100,
      denominator: '1',
      rpcIdStart: 47,
    }).candidates[1].quoteRequest;
    expect(other.id).toBe(descriptors[0].id);
    expect(other.requestBody).not.toBe(descriptors[0].requestBody);
    const s = setup(vi.fn(async () => new Response(reply(descriptors[0].id))));
    await s.transport.request(descriptors[0]);
    await expect(s.transport.request(other)).rejects.toThrow('request-id-already-attempted');
    expect(s.records).toHaveLength(2);
  });
});
