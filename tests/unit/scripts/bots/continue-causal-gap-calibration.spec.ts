import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  CONTINUATION_BUDGET,
  createContinuationTransport,
  createContinuationRetainer,
  writeContinuationReceipt,
  withContinuationSourceCopies,
} from '../../../../scripts/bots/continue-causal-gap-calibration';
import * as frozen from '../../../../scripts/bots/run-causal-gap-calibration';

const directories: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const path of directories.splice(0)) await rm(path, { recursive: true, force: true });
});
async function directory() {
  const p = await mkdtemp(join(tmpdir(), 'causal-continuation-'));
  directories.push(p);
  return p;
}
const rpc = (method = 'chain_getBlockHash', params: unknown[] = [100]) =>
  ({
    method: 'POST',
    redirect: 'error',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  }) as RequestInit;
const url = 'https://mof2.sora.org/';
const candidates = ['momentum-breakout', 'rebound-from-discount', 'trend-pullback-accumulation'];
const originals = () =>
  Array.from({ length: 12 }, (_, ordinal) =>
    candidates.map((candidate) => ({ ordinal, candidate, value: 'unchanged' }))
  );

describe('one-shot operational continuation', () => {
  it('rejects a corrupted source snapshot before dispatch and a changed snapshot before accepting completion', async () => {
    const live = await directory(),
      snapshot = await directory(),
      bytes = 'export const fixed = true;\n';
    const binding = {
      path: 'fixed.ts',
      bytes: Buffer.byteLength(bytes),
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
    await writeFile(join(live, 'fixed.ts'), bytes);
    await writeFile(join(snapshot, 'fixed.ts'), 'corrupted');
    const dispatch = vi.fn(async () => true);
    await expect(withContinuationSourceCopies(live, snapshot, [binding], dispatch)).rejects.toThrow('changed-source');
    expect(dispatch).not.toHaveBeenCalled();
    await writeFile(join(snapshot, 'fixed.ts'), bytes);
    await expect(
      withContinuationSourceCopies(live, snapshot, [binding], async () => {
        await writeFile(join(snapshot, 'fixed.ts'), 'changed');
        return true;
      })
    ).rejects.toThrow('changed-source');
  });
  it('publishes write-once flushed receipts and rejects traversal or overwrite', async () => {
    const p = await directory();
    await writeContinuationReceipt(p, 'nested/start.json', { b: 2, a: 1 });
    expect(await readFile(join(p, 'nested/start.json'), 'utf8')).toBe('{"a":1,"b":2}\n');
    await expect(writeContinuationReceipt(p, 'nested/start.json', {})).rejects.toThrow();
    await expect(writeContinuationReceipt(p, '../escape.json', {})).rejects.toThrow('receipt-path');
  });

  it('forbids any fresh prefix request and enables it only after all 36 exact results and the durable prefix marker', async () => {
    const p = await directory(),
      saved = originals(),
      seen: string[] = [];
    const fetcher = vi.fn<typeof fetch>(async () => {
      expect(seen.filter((x) => x.startsWith('episodes/'))).toHaveLength(36);
      expect(seen.at(-1)).toBe('prefix-reproduced.json');
      return new Response('{"jsonrpc":"2.0","id":1,"result":"ok"}');
    });
    const transport = createContinuationTransport(p, fetcher);
    const retain = createContinuationRetainer(
      saved,
      async (name, value) => {
        seen.push(name);
        await writeContinuationReceipt(p, name, value);
      },
      transport.enableFresh
    );
    await expect(transport.fetch(url, rpc())).rejects.toThrow('cache-only-prefix');
    expect(fetcher).not.toHaveBeenCalled();
    for (let ordinal = 0; ordinal < 12; ordinal++)
      for (let index = 0; index < 3; index++) {
        await retain(`episodes/${ordinal}/${candidates[index]}.json`, saved[ordinal][index]);
        if (ordinal !== 11 || index !== 2)
          await expect(transport.fetch(url, rpc())).rejects.toThrow('cache-only-prefix');
      }
    const response = await transport.fetch(url, rpc());
    await response.text();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(transport.counts().rpcRequests).toBe(1);
  });

  it('blocks suffix work when any inherited result or ordering differs, before a network dispatch', async () => {
    const p = await directory(),
      saved = originals(),
      fetcher = vi.fn<typeof fetch>();
    const transport = createContinuationTransport(p, fetcher),
      retain = createContinuationRetainer(saved, async () => undefined, transport.enableFresh);
    await expect(retain('episodes/0/momentum-breakout.json', { ...saved[0][0], value: 'changed' })).rejects.toThrow(
      'prefix-result-changed'
    );
    await expect(retain('episodes/12/momentum-breakout.json', {})).rejects.toThrow('suffix-before-prefix');
    await expect(transport.fetch(url, rpc())).rejects.toThrow('cache-only-prefix');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('durably records logical invocation and exact request intent before dispatch and raw response before delivery', async () => {
    const p = await directory(),
      bytes = Buffer.from('{"jsonrpc":"2.0","id":1,"result":"original"}');
    const fetcher = vi.fn<typeof fetch>(async () => {
      const intent = JSON.parse(await readFile(join(p, 'attempts/000001/intent.json'), 'utf8'));
      expect(intent.requestBody).toBe(rpc().body);
      expect(intent.priorReservedRpc).toBe(2482);
      const invocation = JSON.parse(await readFile(join(p, 'invocations/marketShards-1.json'), 'utf8'));
      expect(invocation.priorReserved).toBe(7);
      return new Response(bytes, { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const transport = createContinuationTransport(p, fetcher);
    transport.enableFresh();
    transport.claim('marketShards');
    const response = await transport.fetch(url, rpc());
    const receipt = JSON.parse(await readFile(join(p, 'attempts/000001/response.json'), 'utf8'));
    expect(Buffer.from(receipt.responseBodyBase64, 'base64')).toEqual(bytes);
    expect(receipt.responseSha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect(receipt.httpStatus).toBe(200);
    expect(receipt.originalNetworkResponse).toBe(true);
    expect(await response.text()).toBe(bytes.toString());
    expect(transport.journal()).toEqual({ attempts: 1, completed: 1, unresolved: 0 });
  });

  it('retains a failed attempt as charged evidence, refuses retry and cannot overwrite it in another transport instance', async () => {
    const p = await directory(),
      fetcher = vi.fn<typeof fetch>(async () => {
        throw Error('synthetic lost response');
      });
    const transport = createContinuationTransport(p, fetcher);
    transport.enableFresh();
    await expect(transport.fetch(url, rpc())).rejects.toThrow('synthetic lost response');
    expect(transport.journal()).toEqual({ attempts: 1, completed: 0, unresolved: 1 });
    expect(await readdir(join(p, 'attempts/000001'))).toEqual(['failure.json', 'intent.json']);
    await expect(transport.fetch(url, rpc())).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    const restarted = createContinuationTransport(p, fetcher);
    restarted.enableFresh();
    await expect(restarted.fetch(url, rpc())).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('enforces lower residual invocation/RPC caps and zero warmup in addition to frozen method restrictions', async () => {
    expect(CONTINUATION_BUDGET).toEqual({
      warmupRequests: 0,
      marketShards: 25,
      quotes: 1927,
      boundFees: 1927,
      rpcRequests: 57518,
      concurrentRequests: 1,
    });
    const p = await directory(),
      fetcher = vi.fn<typeof fetch>(),
      transport = createContinuationTransport(p, fetcher);
    transport.enableFresh();
    for (let i = 0; i < 25; i++) transport.claim('marketShards');
    expect(() => transport.claim('marketShards')).toThrow('remaining-marketShards');
    await expect(transport.fetch('https://pi.soramitsu.io/graphql', rpc())).rejects.toThrow('no-new-warmup');
    await expect(transport.fetch(url, rpc('author_submitExtrinsic'))).rejects.toThrow();
    const factory = frozen.createCausalAcquisitionTransport;
    vi.spyOn(frozen, 'createCausalAcquisitionTransport').mockImplementation((f) => {
      const wrapped = factory(f);
      return { ...wrapped, counts: () => ({ ...wrapped.counts(), rpcRequests: 57518 }) };
    });
    const limited = createContinuationTransport(await directory(), fetcher);
    limited.enableFresh();
    await expect(limited.fetch(url, rpc())).rejects.toThrow('remaining-rpc-or-concurrency');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('bounds original response retention and does not publish a completion for an oversized body', async () => {
    const p = await directory(),
      transport = createContinuationTransport(p, async () => new Response(new Uint8Array(65537)));
    transport.enableFresh();
    await expect(
      transport.fetch(url, rpc('state_call', ['TransactionPaymentApi_query_info', '0x00', '0x01']))
    ).rejects.toThrow('response-size');
    const failure = JSON.parse(await readFile(join(p, 'attempts/000001/failure.json'), 'utf8'));
    expect(failure.retainedBytes).toBe(65536);
    expect(failure.observedBytes).toBe(65537);
    await expect(readFile(join(p, 'attempts/000001/response.json'))).rejects.toThrow();
    await expect(transport.fetch(url, rpc())).rejects.toThrow();
  });

  it('retains an intent during an interrupted body and forbids a concurrent dispatch', async () => {
    const p = await directory();
    let readerController: ReadableStreamDefaultController<Uint8Array> | undefined;
    const transport = createContinuationTransport(
      p,
      async () =>
        new Response(
          new ReadableStream({
            start(c) {
              readerController = c;
            },
          })
        )
    );
    transport.enableFresh();
    const pending = transport.fetch(url, rpc());
    for (let i = 0; i < 50 && !readerController; i++) await new Promise((resolve) => setTimeout(resolve, 2));
    expect(readerController).toBeDefined();
    await expect(transport.fetch(url, rpc())).rejects.toThrow('remaining-rpc-or-concurrency');
    expect(JSON.parse(await readFile(join(p, 'attempts/000001/intent.json'), 'utf8')).sequence).toBe(1);
    await expect(readFile(join(p, 'attempts/000001/response.json'))).rejects.toThrow();
    readerController!.error(Error('synthetic interruption'));
    await expect(pending).rejects.toThrow('synthetic interruption');
    expect(transport.journal().unresolved).toBe(1);
  });

  it('settles an aborted stalled body, retains its intent and blocks later dispatches', async () => {
    const p = await directory(),
      signal = new AbortController();
    let reading = false;
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            pull() {
              reading = true;
            },
            cancel() {
              return new Promise<void>(() => undefined);
            },
          })
        )
    );
    const transport = createContinuationTransport(p, fetcher);
    transport.enableFresh();
    const pending = transport.fetch(url, { ...rpc(), signal: signal.signal });
    const rejected = expect(pending).rejects.toThrow('request-aborted');
    for (let i = 0; i < 50 && !reading; i++) await new Promise((resolve) => setTimeout(resolve, 2));
    expect(reading).toBe(true);
    signal.abort();
    await rejected;
    expect(await readdir(join(p, 'attempts/000001'))).toEqual(['failure.json', 'intent.json']);
    expect(transport.journal()).toEqual({ attempts: 1, completed: 0, unresolved: 1 });
    await expect(transport.fetch(url, rpc())).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
