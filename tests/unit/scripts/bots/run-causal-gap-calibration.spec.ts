import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  CAUSAL_ACQUISITION_LIMITS,
  collectCausalSourceClosure,
  withVerifiedCausalSources,
  writeCausalArtifact,
  createCausalAcquisitionTransport,
  collectCausalCalibrationEpisode,
  runCausalEpisodeSequence,
  decodeCausalCalibration,
  prepareCausalGapCalibration,
  runRegisteredCausalGapCalibration,
  type CausalMarketAccess,
  type CausalRegistration,
  copyCausalGapPriorEvidence,
  createCausalGapReuseJournal,
  createCausalGapMarketAccess,
  createCausalGapQuoteProvider,
  verifyCausalGapPriorEvidence,
} from '../../../../scripts/bots/run-causal-gap-calibration';
import type { CausalGapReuseManifest } from '../../../../scripts/bots/causal-gap-reuse';
import * as goalJoin from '../../../../scripts/bots/historical-goal-quote';
import * as marketReader from '../../../../scripts/bots/historical-goal-market-reader';
import { replayCausalGapCalibration as replayCausalGoalCalibration } from '../../../../scripts/bots/causal-goal-calibration-gap-replay';
import {
  createHistoricalExecutionCodec,
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../scripts/bots/historical-execution-codec';
import { createHistoricalFeeMetadataFixture } from './fixtures/historical-goal-bound-fee-fixture';
import type { IndexedPoolHistoryWithEvidence } from '../../../../src/features/bot-trading/pool-history';

const HOUR = 3_600_000,
  START = Date.parse('2026-06-30T19:00:00.000Z');
const DENOMINATOR = '100000000000000000000000000000000000000';
const directories: string[] = [];
const manifestFor = (path: string, bytes: string): CausalGapReuseManifest => ({
  kind: 'causal-gap-reuse-manifest-v1',
  priorRegistrationSha256: '1'.repeat(64),
  sha256: '2'.repeat(64),
  files: [{ path, bytes: Buffer.byteLength(bytes), sha256: sha(bytes) }],
});
afterEach(async () => {
  vi.restoreAllMocks();
  for (const path of directories.splice(0)) await rm(path, { recursive: true, force: true });
});
async function directory() {
  const path = await mkdtemp(join(tmpdir(), 'causal-gap-runner-test-'));
  directories.push(path);
  return path;
}
const sha = (bytes: string) => createHash('sha256').update(bytes).digest('hex');
const hash = (value: number) => `0x${value.toString(16).padStart(64, '0')}`;
const metadata = createHistoricalFeeMetadataFixture();
const binding = createHistoricalExecutionCodec(metadata.identity).binding;
const block = (index: number, successor: boolean) => ({
  height: 10000 + index * 600 + Number(successor),
  hash: hash(10000 + index * 600 + Number(successor)),
  parentHash: hash(9999 + index * 600 + Number(successor)),
  timestampMs: START + index * HOUR - (successor ? 0 : 6000),
});
function pool(index: number, successor: boolean) {
  const at = block(index, successor),
    balance = '1000000000000000000000';
  return {
    binding: { ...binding, blockHash: at.hash },
    state: { timestampMs: at.timestampMs, denominator: DENOMINATOR },
    basis: 'direct-pool-reserve-ratio' as const,
    status: 'present' as const,
    accounts: { reservesAccountId: hash(900000), feesAccountId: hash(900001) },
    pair: { baseAssetId: XOR, targetAssetId: KUSD, baseDecimals: 18, targetDecimals: 18 },
    reserves: { kusdCodec: balance, xorCodec: balance },
    marks: {
      xorPerKusd: { numeratorCodec: balance, denominatorCodec: balance },
      kusdPerXor: { numeratorCodec: balance, denominatorCodec: balance },
    },
    observedFill: false as const,
    transactionSubmitted: false as const,
  };
}
function fixture() {
  const calibration: IndexedPoolHistoryWithEvidence = {
    history: {
      candles: Array.from({ length: 673 }, (_, i) => ({ timestamp: START + i * HOUR, close: '1', feeClose: '1' })),
      missing: 0,
      denominationVerified: true,
      identity: { genesisHash: GENESIS, denominator: DENOMINATOR },
    },
    boundaries: Array.from({ length: 673 }, (_, i) => ({
      kind: 'indexed-finalized-hour-boundary' as const,
      completedAtMs: START + i * HOUR,
      genesisHash: GENESIS,
      denominator: DENOMINATOR,
      closing: {
        height: block(i, false).height,
        hash: block(i, false).hash,
        timestampSeconds: block(i, false).timestampMs / 1000,
      },
      successor: {
        height: block(i, true).height,
        hash: block(i, true).hash,
        timestampSeconds: block(i, true).timestampMs / 1000,
      },
      arrivalTimeKnown: false as const,
    })),
  };
  const preceding = Array.from({ length: 12 }, (_, i) => ({ timestamp: START + (i - 12) * HOUR, close: '1' }));
  const market: CausalMarketAccess = {
    readMark: vi.fn(async (height: number) => {
      const index = Math.floor((height - 10000) / 600),
        successor = (height - 10000) % 600 === 1,
        at = block(index, successor),
        evidence = pool(index, successor);
      return {
        block: at,
        poolEvidence: evidence,
        mark: {
          timestampMs: at.timestampMs,
          blockHash: at.hash,
          kusdReserveCodec: evidence.reserves.kusdCodec,
          xorReserveCodec: evidence.reserves.xorCodec,
        },
      };
    }),
    readBlock: vi.fn(async (height: number) => block(Math.floor((height - 10000) / 600), (height - 10000) % 600 === 1)),
  };
  return { calibration, preceding, market };
}
const rpc = (method = 'chain_getFinalizedHead') =>
  ({
    method: 'POST',
    redirect: 'error',
    credentials: 'omit',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params: [] }),
  }) as RequestInit;
const warmup = () => ({
  ...rpc(),
  body: JSON.stringify({
    query: 'query{assetSnapshots}',
    variables: {
      filter: {
        assetId: { equalTo: KUSD },
        type: { equalTo: 'HOUR' },
        timestamp: { greaterThanOrEqualTo: (START - 13 * HOUR) / 1000, lessThan: (START - HOUR) / 1000 },
      },
    },
  }),
});

describe('source-bound causal acquisition', () => {
  it('rejects an operational source mirror before artifact creation or any acquisition', async () => {
    const mirror = await directory();
    await expect(prepareCausalGapCalibration(join(mirror, 'new-study'), mirror)).rejects.toThrow(
      'execution-source-root'
    );
    await expect(runRegisteredCausalGapCalibration(join(mirror, 'missing-study'), mirror)).rejects.toThrow(
      'execution-source-root'
    );
    await expect(verifyCausalGapPriorEvidence(mirror)).rejects.toThrow('execution-source-root');
    await expect(readFile(join(mirror, 'new-study', 'registration.json'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('binds transitive local imports, reexports, alias paths and cycles without executing them', async () => {
    const root = await directory();
    await mkdir(join(root, 'src'));
    await writeFile(
      join(root, 'entry.ts'),
      "import { value } from '@/helper'; export { value } from './nested'; throw new Error('do not execute');"
    );
    await writeFile(join(root, 'src/helper.ts'), "export const value = 3; import '../nested';");
    await writeFile(join(root, 'nested.ts'), "export { value } from './src/helper'; import 'node:crypto';");
    const closure = await collectCausalSourceClosure(root, ['entry.ts']);
    expect(closure.local.map((row) => row.path)).toEqual(['entry.ts', 'nested.ts', 'src/helper.ts']);
    expect(closure.builtins).toEqual(['node:crypto']);
    expect(closure.dependencies).toEqual([]);
  });
  it('rejects unresolved locals and dynamic module selection before registration', async () => {
    const root = await directory();
    await writeFile(join(root, 'entry.ts'), "import './missing';");
    await expect(collectCausalSourceClosure(root, ['entry.ts'])).rejects.toThrow('unresolved-local');
    await writeFile(join(root, 'entry.ts'), 'const name = process.argv[2]; import(name);');
    await expect(collectCausalSourceClosure(root, ['entry.ts'])).rejects.toThrow('nonliteral-module');
  });
  it('refuses a changed imported helper before acquisition and detects mutation during work', async () => {
    const root = await directory();
    await writeFile(join(root, 'entry.ts'), "export * from './helper';");
    await writeFile(join(root, 'helper.ts'), 'export const fee = 1;');
    const closure = await collectCausalSourceClosure(root, ['entry.ts']);
    const acquire = vi.fn(async () => true);
    await writeFile(join(root, 'helper.ts'), 'export const fee = 2;');
    await expect(withVerifiedCausalSources(root, closure.local, acquire)).rejects.toThrow('changed-source');
    expect(acquire).not.toHaveBeenCalled();
    await writeFile(join(root, 'helper.ts'), 'export const fee = 1;');
    await expect(
      withVerifiedCausalSources(root, closure.local, async () => {
        await writeFile(join(root, 'helper.ts'), 'export const fee = 3;');
      })
    ).rejects.toThrow('changed-source');
  });
  it('publishes an immutable artifact and rejects traversal or replacement', async () => {
    const root = await directory();
    const digest = await writeCausalArtifact(root, 'registration.json', { b: 2, a: 1 });
    expect(await readFile(join(root, 'registration.json'), 'utf8')).toBe('{"a":1,"b":2}\n');
    expect(digest).toBe(sha('{"a":1,"b":2}\n'));
    await expect(writeCausalArtifact(root, 'registration.json', { changed: true })).rejects.toMatchObject({
      code: 'EEXIST',
    });
    await expect(writeCausalArtifact(root, '../escaped.json', {})).rejects.toThrow('path-outside-root');
  });
  it('bounds the fixed warmup to two actual calls and prohibits alternate dates or endpoints', async () => {
    const fetcher = vi.fn(async () => new Response('{}'));
    const transport = createCausalAcquisitionTransport(fetcher as typeof fetch);
    for (let i = 0; i < 2; i++) await (await transport.fetch('https://pi.soramitsu.io/graphql', warmup())).text();
    await expect(transport.fetch('https://pi.soramitsu.io/graphql', warmup())).rejects.toThrow('limit-warmup');
    expect(fetcher).toHaveBeenCalledTimes(2);
    await expect(transport.fetch('https://example.org/', rpc())).rejects.toThrow('transport-authority');
    const bad = warmup();
    bad.body = String(bad.body).replace(String((START - HOUR) / 1000), String(START / 1000));
    await expect(transport.fetch('https://pi.soramitsu.io/graphql', bad)).rejects.toThrow('warmup-scope');
  });
  it('counts response body lifetime toward concurrency and makes a network failure terminal', async () => {
    const controllers: ReadableStreamDefaultController<Uint8Array>[] = [];
    const fetcher = vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controllers.push(controller);
            },
          })
        )
    );
    const transport = createCausalAcquisitionTransport(fetcher as typeof fetch);
    const a = await transport.fetch('https://mof2.sora.org/', rpc()),
      b = await transport.fetch('https://mof2.sora.org/', rpc());
    await expect(transport.fetch('https://mof2.sora.org/', rpc())).rejects.toThrow('limit-concurrency');
    expect(fetcher).toHaveBeenCalledTimes(2);
    controllers.forEach((controller) => controller.close());
    await Promise.all([a.text(), b.text()]);
    expect(transport.counts().peakConcurrentRequests).toBe(2);
    expect(transport.counts().rpcRequests).toBe(2);
    const failed = createCausalAcquisitionTransport(
      vi.fn(async () => {
        throw new Error('offline');
      }) as typeof fetch
    );
    await expect(failed.fetch('https://mof2.sora.org/', rpc())).rejects.toThrow('offline');
    await expect(failed.fetch('https://mof2.sora.org/', rpc())).rejects.toThrow('transport-stopped');
  });
  it('enforces logical acquisition budgets and rejects mutation RPCs and credential headers', async () => {
    const fetcher = vi.fn(async () => new Response('{}'));
    const transport = createCausalAcquisitionTransport(fetcher as typeof fetch);
    for (const kind of ['marketShards', 'quotes', 'boundFees'] as const) {
      for (let i = 0; i < CAUSAL_ACQUISITION_LIMITS[kind]; i++) transport.claim(kind);
      expect(() => transport.claim(kind)).toThrow(`limit-${kind}`);
    }
    await expect(transport.fetch('https://mof2.sora.org/', rpc('author_submitExtrinsic'))).rejects.toThrow(
      'rpc-method'
    );
    await expect(
      transport.fetch('https://mof2.sora.org/', { ...rpc(), headers: { authorization: 'test-only' } })
    ).rejects.toThrow('transport-headers');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects altered calibration bytes before decoding any market field', async () => {
    await expect(decodeCausalCalibration(Buffer.from('{"assets":null}'))).rejects.toThrow('calibration-hash');
  });
  it('joins 25 close states and 24 control states with exactly the twelve preceding closes', async () => {
    const f = fixture();
    const input = await collectCausalCalibrationEpisode(0, f.calibration, f.preceding, f.market);
    expect(input.hours).toHaveLength(25);
    expect(input.warmup).toEqual(f.preceding);
    expect(input.hours[24]).not.toHaveProperty('riskPoolEvidence');
    expect(input.hours.slice(0, 24).every((row) => row.riskPoolEvidence)).toBe(true);
    expect(f.market.readMark).toHaveBeenCalledTimes(49);
    expect(f.market.readBlock).toHaveBeenCalledTimes(1);
    const next = await collectCausalCalibrationEpisode(1, f.calibration, f.preceding, f.market);
    expect(next.warmup.map((row) => row.timestamp)).toEqual(
      f.calibration.history.candles.slice(12, 24).map((row) => row.timestamp)
    );
  });
  it('refuses mismatched indexer ancestry or archived prices instead of substituting another hour', async () => {
    const f = fixture();
    f.calibration.history.candles[0].close = '2';
    await expect(collectCausalCalibrationEpisode(0, f.calibration, f.preceding, f.market)).rejects.toThrow(
      'indexed-pool-price-mismatch'
    );
    const g = fixture();
    vi.mocked(g.market.readBlock).mockResolvedValueOnce({ ...block(24, true), parentHash: hash(44) });
    await expect(collectCausalCalibrationEpisode(0, g.calibration, g.preceding, g.market)).rejects.toThrow(
      'successor-index-mismatch'
    );
  });
  it('finishes all first-episode candidates before any later collection and runs all 28 unchanged', async () => {
    const f = fixture(),
      order: string[] = [],
      retained = new Map<string, unknown>();
    const quote = vi.fn(async () => {
      throw new Error('flat prices must not request quotes');
    });
    const results = await runCausalEpisodeSequence({
      collect: async (i) => {
        order.push(`collect-${i}`);
        return collectCausalCalibrationEpisode(i, f.calibration, f.preceding, f.market);
      },
      quote,
      retain: async (name, value) => {
        order.push(name);
        retained.set(name, value);
      },
    });
    expect(results).toHaveLength(28);
    expect(
      results.every(
        (row) => row.length === 3 && row.every((result) => result.status === 'complete' && result.summary?.fills === 0)
      )
    ).toBe(true);
    expect(order.indexOf('first-episode-complete.json')).toBeLessThan(order.indexOf('collect-1'));
    expect(retained.size).toBe(85);
    expect(quote).not.toHaveBeenCalled();
  });
  it('retains a first-episode failure and never collects later episodes or silently retries', async () => {
    const f = fixture(),
      collect = vi.fn(async (i) => collectCausalCalibrationEpisode(i, f.calibration, f.preceding, f.market)),
      retain = vi.fn(async () => undefined);
    const replay = vi.fn(async (input, quote) => ({
      ...(await replayCausalGoalCalibration(input, quote)),
      status: 'incomplete' as const,
      diagnostics: ['synthetic reader failure'],
    }));
    await expect(runCausalEpisodeSequence({ collect, replay, quote: vi.fn(), retain })).rejects.toThrow(
      'episode-incomplete'
    );
    expect(collect).toHaveBeenCalledTimes(1);
    expect(replay).toHaveBeenCalledTimes(1);
    expect(retain).toHaveBeenCalledTimes(1);
    expect(retain.mock.calls[0][0]).toBe('episodes/0/momentum-breakout.json');
  });

  it('copies only exact manifest-bound prior bytes without modifying original receipts or overwriting copies', async () => {
    const prior = await directory(),
      output = await directory(),
      bytes = '{"observed":"original"}\n';
    await mkdir(join(prior, 'raw'));
    await writeFile(join(prior, 'raw/receipt.json'), bytes);
    const manifest = manifestFor('raw/receipt.json', bytes);
    await copyCausalGapPriorEvidence(prior, output, manifest);
    expect(await readFile(join(output, 'raw/receipt.json'), 'utf8')).toBe(bytes);
    expect(await readFile(join(prior, 'raw/receipt.json'), 'utf8')).toBe(bytes);
    await expect(copyCausalGapPriorEvidence(prior, output, manifest)).rejects.toThrow();
    await writeFile(join(prior, 'raw/receipt.json'), 'changed');
    await expect(copyCausalGapPriorEvidence(prior, await directory(), manifest)).rejects.toThrow(
      'prior-evidence-changed'
    );
  });

  it('retains one provenance inventory per reused identity and never counts reuse as fresh network work', async () => {
    const output = await directory(),
      manifest = manifestFor('raw/warmup.json', '{}');
    const reuse = createCausalGapReuseJournal(output, manifest),
      value = { original: true };
    await expect(reuse.record('warmup', 'fixed', { value, files: ['raw/warmup.json'] })).resolves.toBe(value);
    await reuse.record('warmup', 'fixed', { value, files: ['raw/warmup.json'] });
    expect(reuse.counts()).toEqual({ warmup: 1, blocks: 0, markets: 0, quotes: 0, boundFees: 0, hits: 2 });
    const receipt = JSON.parse(await readFile(join(output, 'reuse/inventory/warmup-fixed.json'), 'utf8'));
    expect(receipt.freshNetworkRequests).toBe(0);
    expect(receipt.files).toEqual(manifest.files);
    await expect(reuse.record('blocks', '1000', { value, files: ['unbound.json'] })).rejects.toThrow(
      'unregistered-reuse-file'
    );
    await reuse.identityRecheck(1000, ['raw/warmup.json']);
    await reuse.identityRecheck(1000, ['raw/warmup.json']);
    expect(reuse.identityRechecks()).toEqual({ blockIdentities: 1, heights: [1000] });
    expect(reuse.counts().hits).toBe(2);
    const recheck = JSON.parse(await readFile(join(output, 'reuse/identity-rechecks/1000.json'), 'utf8'));
    expect(recheck.method).toBe('genuine-bounded-market-reader');
    expect(recheck.actualRequestsCountedByTransport).toBe(true);
  });

  it('serves verified block/market hits without transport, caches marks, and fails a corrupt hit before any network call', async () => {
    const output = await directory(),
      f = fixture(),
      height = block(0, false).height;
    const mark = await f.market.readMark(height),
      manifest = manifestFor('market/saved.json', '{}');
    const prior = {
      block: vi.fn(() => ({ value: mark.block, files: ['market/saved.json'] })),
      market: vi.fn(() => ({ value: mark, files: ['market/saved.json'] })),
    } as unknown as Parameters<typeof createCausalGapMarketAccess>[4];
    const fetcher = vi.fn<typeof fetch>(),
      transport = createCausalAcquisitionTransport(fetcher),
      reuse = createCausalGapReuseJournal(output, manifest);
    const access = createCausalGapMarketAccess(
      {} as CausalRegistration,
      output,
      transport,
      new AbortController().signal,
      prior,
      reuse
    );
    expect(await access.readBlock(height)).toBe(mark.block);
    expect(await access.readMark(height)).toBe(mark);
    expect(await access.readMark(height)).toBe(mark);
    expect(prior.market).toHaveBeenCalledTimes(1);
    expect(fetcher).not.toHaveBeenCalled();
    expect(transport.counts().rpcRequests).toBe(0);
    expect(transport.counts().marketShards).toBe(0);
    vi.mocked(prior.block).mockImplementation(() => {
      throw new Error('invalid-registered-key');
    });
    await expect(access.readBlock(height)).rejects.toThrow('invalid-registered-key');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('reuses an exact quote identity without fresh requests and uses the real bounded reader once for an absent amount', async () => {
    const output = await directory(),
      manifest = manifestFor('raw/quotes/saved.json', '{}');
    const quote = { kind: 'historical-quote-unavailable' };
    let savedKey: string | undefined;
    const prior = {
      quote: vi.fn((key: string) => {
        savedKey ??= key;
        return key === savedKey ? { value: quote, files: ['raw/quotes/saved.json'] } : undefined;
      }),
      boundFee: vi.fn(),
    } as unknown as Parameters<typeof createCausalGapQuoteProvider>[4];
    // Economic/provenance verification belongs to the real adapter and offline opener suites; this checks routing only.
    vi.spyOn(goalJoin, 'prepareHistoricalGoalFill').mockReturnValueOnce({ kind: 'quote-unavailable' } as ReturnType<
      typeof goalJoin.prepareHistoricalGoalFill
    >);
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw new Error('synthetic transport stop');
    });
    const transport = createCausalAcquisitionTransport(fetcher),
      reuse = createCausalGapReuseJournal(output, manifest);
    const registration = {
      body: { sourceAnchor: { finalizedSource: { hash: hash(90000), height: 90000, receiptSha256: '3'.repeat(64) } } },
    } as CausalRegistration;
    const provider = createCausalGapQuoteProvider(
      registration,
      output,
      transport,
      new AbortController().signal,
      prior,
      reuse
    );
    const pending = { assetIn: KUSD, assetOut: XOR, amountInCodec: '1', plan: {} } as Parameters<typeof provider>[0];
    const hour = { closing: block(1, false), successor: block(1, true) } as Parameters<typeof provider>[1];
    expect(await provider(pending, hour)).toEqual({ quoteEvidence: quote });
    expect(await provider(pending, hour)).toEqual({ quoteEvidence: quote });
    expect(prior.quote).toHaveBeenCalledTimes(1);
    expect(prior.boundFee).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
    expect(transport.counts().quotes).toBe(0);
    expect(reuse.counts().quotes).toBe(1);
    await expect(provider({ ...pending, amountInCodec: '2' }, hour)).rejects.toThrow();
    expect(prior.quote).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(transport.counts().quotes).toBe(1);
    expect(transport.counts().rpcRequests).toBe(1);
  });

  it('rejects a fresh mark that changes retained native milliseconds, preserving its raw evidence without publishing a mark', async () => {
    const output = await directory(),
      f = fixture(),
      height = block(1, true).height;
    const original = await f.market.readMark(height),
      manifest = manifestFor('raw/block.json', '{}');
    const changed = { ...original, block: { ...original.block, timestampMs: original.block.timestampMs + 3 } };
    const reader = {
      context: {},
      readMark: vi.fn(async () => changed),
      readBlock: vi.fn(),
      evidence: () => ({
        blockEvidence: [{ original: 'fresh-raw-receipt' }],
        storageEvidence: [],
        blockReads: 1,
        markReads: 1,
      }),
    } as unknown as Awaited<ReturnType<typeof marketReader.createHistoricalGoalMarketReader>>;
    vi.spyOn(marketReader, 'createHistoricalGoalMarketReader').mockResolvedValue(reader);
    const prior = {
      block: () => ({ value: original.block, files: ['raw/block.json'] }),
      market: () => undefined,
    } as unknown as Parameters<typeof createCausalGapMarketAccess>[4];
    const reuse = createCausalGapReuseJournal(output, manifest),
      transport = createCausalAcquisitionTransport(vi.fn());
    const registration = { body: { sourceAnchor: {} } } as CausalRegistration;
    const access = createCausalGapMarketAccess(
      registration,
      output,
      transport,
      new AbortController().signal,
      prior,
      reuse
    );
    await expect(access.readMark(height)).rejects.toThrow('prior-block-contradiction');
    expect(Math.floor(changed.block.timestampMs / 1000)).toBe(Math.floor(original.block.timestampMs / 1000));
    expect(await readFile(join(output, 'raw/market-0/block-0.json'), 'utf8')).toContain('fresh-raw-receipt');
    await expect(readFile(join(output, `market/${height}.json`))).rejects.toThrow();
    expect(reuse.identityRechecks().blockIdentities).toBe(0);
    vi.mocked(reader.readMark).mockResolvedValue(original);
    await expect(access.readMark(height)).rejects.toThrow('market-access-terminal');
    expect(reader.readMark).toHaveBeenCalledTimes(1);
  });
});
