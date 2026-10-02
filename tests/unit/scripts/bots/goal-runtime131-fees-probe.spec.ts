import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { createHash } from 'node:crypto';
import {
  createProbeRpc,
  runProbe,
  ENDPOINT,
  EXPECTED,
  type Receipt,
} from '../../../../output/go-history/goal-runtime131-fees-20260921/probe.mts';
import { types } from '@/lib/substrate/type-definitions';
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});
const answer = (id: number, result: unknown) => new Response(JSON.stringify({ jsonrpc: '2.0', id, result }));

describe('runtime131 conformance-only probe', () => {
  it('retains raw bytes before returning and never sends to another endpoint', async () => {
    const receipts: Receipt[] = [];
    const fetcher = vi.fn<typeof fetch>(async () => answer(1, EXPECTED.genesisHash));
    const rpc = createProbeRpc(fetcher, async (receipt) => {
      receipts.push(receipt);
    });
    expect(await rpc('chain_getBlockHash', [0])).toBe(EXPECTED.genesisHash);
    expect(fetcher.mock.calls[0]).toMatchObject([ENDPOINT, { method: 'POST', redirect: 'error', credentials: 'omit' }]);
    expect(receipts).toHaveLength(1);
    const raw = Buffer.from(receipts[0].responseBase64, 'base64');
    expect(receipts[0]).toMatchObject({
      complete: true,
      status: 200,
      observedBytes: raw.length,
      retainedBytes: raw.length,
      responseSha256: createHash('sha256').update(raw).digest('hex'),
    });
  });
  it.each(['HTTP', 'malformed', 'RPC', 'oversized', 'retention'] as const)(
    'retains or rejects %s failure and latches without retry',
    async (kind) => {
      const receipts: Receipt[] = [];
      const fetcher = vi.fn<typeof fetch>(async () =>
        kind === 'HTTP'
          ? new Response('unavailable', { status: 502 })
          : kind === 'malformed'
            ? new Response('{')
            : kind === 'RPC'
              ? new Response('{"jsonrpc":"2.0","id":1,"error":{"code":-1}}')
              : kind === 'oversized'
                ? new Response('x'.repeat(70000))
                : answer(1, 'ok')
      );
      const rpc = createProbeRpc(fetcher, async (receipt) => {
        receipts.push(receipt);
        if (kind === 'retention') throw Error('sink failed');
      });
      await expect(rpc('chain_getFinalizedHead', [])).rejects.toThrow();
      await expect(rpc('chain_getFinalizedHead', [])).rejects.toThrow('probe-stopped');
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(receipts).toHaveLength(1);
      if (kind === 'oversized')
        expect(receipts[0]).toMatchObject({ complete: false, retainedBytes: 65536, observedBytes: 70000 });
    }
  );
  it('rejects submission methods before making a request', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const rpc = createProbeRpc(fetcher, async () => undefined);
    await expect(rpc('author_submitExtrinsic', ['0x00'])).rejects.toThrow('unapproved-method');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('runs both fixed input envelopes with invented fees and retained131 metadata, never asking for market state', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'runtime131-fees-'));
    directories.push(directory);
    const metadataHex = JSON.parse(
      await readFile('output/go-history/earlier-goal-study-20260921/current-runtime-metadata-response.json', 'utf8')
    ).result;
    const registry = new TypeRegistry();
    registry.register(types);
    registry.setMetadata(new Metadata(registry, metadataHex), undefined, undefined, true);
    const info = registry
      .createType('RuntimeDispatchInfo', { weight: { refTime: 3, proofSize: 1 }, class: 'Normal', partialFee: '11' })
      .toHex();
    const u128 = (n: number) => Buffer.from(registry.createType('u128', n).toU8a());
    const details = `0x${Buffer.concat([Buffer.from([1]), u128(1), u128(2), u128(8), u128(0)]).toString('hex')}`;
    const blockHash = `0x${'33'.repeat(32)}`;
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      const request = JSON.parse(init!.body as string);
      const result =
        request.method === 'chain_getBlockHash'
          ? request.params[0] === 0
            ? EXPECTED.genesisHash
            : blockHash
          : request.method === 'chain_getFinalizedHead'
            ? blockHash
            : request.method === 'chain_getHeader'
              ? { number: '0x14d', parentHash: `0x${'22'.repeat(32)}` }
              : request.method === 'state_getRuntimeVersion'
                ? { specName: 'sora-substrate', specVersion: 131, transactionVersion: 131 }
                : request.method === 'state_getStorageHash'
                  ? EXPECTED.codeHash
                  : request.method === 'state_getMetadata'
                    ? metadataHex
                    : request.method === 'state_getStorage'
                      ? `0x${Buffer.from(registry.createType('u128', EXPECTED.denominator).toU8a()).toString('hex')}`
                      : request.method === 'state_call'
                        ? request.params[0] === 'TransactionPaymentApi_query_info'
                          ? info
                          : details
                        : undefined;
      expect(result).toBeDefined();
      return answer(request.id, result);
    });
    const result = await runProbe(directory, fetcher);
    expect(result).toMatchObject({
      complete: true,
      physicalRequests: 12,
      economicEligibility: false,
      transactionSubmitted: false,
    });
    expect(
      result.results.map((row) => [
        row.request.amountInCodec,
        row.bound.encodedLength,
        row.bound.minimumCodec,
        row.info.partialFeeCodec,
      ])
    ).toEqual([
      ['5000000000000000000', 215, '1', '11'],
      ['1000000000000000000', 215, '1', '11'],
    ]);
    expect(
      fetcher.mock.calls.filter(([, init]) => JSON.parse(init!.body as string).method === 'state_getStorage')
    ).toHaveLength(1);
    expect((await readdir(directory)).filter((path) => path.startsWith('rpc-'))).toHaveLength(12);
    await expect(runProbe(directory, fetcher)).rejects.toThrow('EEXIST');
    expect(fetcher).toHaveBeenCalledTimes(12);
  });
});
