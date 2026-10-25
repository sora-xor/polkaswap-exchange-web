/** A single already-exposed opening-state probe, separate from the failed clock preparation. */
import { createHash, randomUUID } from 'node:crypto';
import { readFile, mkdir, open, link, unlink } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import * as marketNS from '../../../../../scripts/bots/historical-goal-market-reader';
import * as quoteNS from '../../../../../scripts/bots/historical-execution-reader';
import * as feeNS from '../../../../../scripts/bots/historical-goal-bound-fee-reader';
import * as boundNS from '../../../../../scripts/bots/historical-goal-bound-fee';
import * as cacheNS from '../../../../../scripts/bots/goal-qualification-metadata-replay';
import type { HistoricalClockBlock } from '../../../../../scripts/bots/historical-execution-clock';
const marketModule = (Reflect.get(marketNS, 'default') ?? marketNS) as typeof marketNS;
const quoteModule = (Reflect.get(quoteNS, 'default') ?? quoteNS) as typeof quoteNS;
const feeModule = (Reflect.get(feeNS, 'default') ?? feeNS) as typeof feeNS;
const boundModule = (Reflect.get(boundNS, 'default') ?? boundNS) as typeof boundNS;
const cacheModule = (Reflect.get(cacheNS, 'default') ?? cacheNS) as typeof cacheNS;
const BASE = dirname(fileURLToPath(import.meta.url)),
  ROOT = resolve(BASE, '../../../../..'),
  OUT = resolve(BASE, 'opening-preflight-v1');
const canonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
          .join(',')}}`
      : JSON.stringify(v);
const sha = (v: string | Uint8Array) => createHash('sha256').update(v).digest('hex');
function check(v: unknown, reason: string): asserts v {
  if (!v) throw Error(reason);
}
/** Select from canonical metadata only; no market price or candidate result participates. */
export function openingState(blocks: readonly HistoricalClockBlock[]): HistoricalClockBlock {
  const target = Date.parse('2026-06-29T13:00:00Z') - 13000;
  const index = blocks.findIndex((b) => b.timestampMs > target) - 1;
  check(index >= 0 && index + 1 < blocks.length, 'opening-coverage');
  const block = blocks[index],
    successor = blocks[index + 1];
  check(
    block.timestampMs <= target &&
      successor.timestampMs > target &&
      successor.height === block.height + 1 &&
      successor.parentHash === block.hash,
    'opening-adjacency'
  );
  return Object.freeze({ ...block });
}
/** Durable immutable raw artifacts. */
export async function retain(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  const body = Buffer.from(canonical(value)),
    temp = resolve(dirname(path), '.writing-' + randomUUID());
  const f = await open(temp, 'wx', 0o600);
  try {
    await f.writeFile(body);
    await f.sync();
  } finally {
    await f.close();
  }
  try {
    await link(temp, path);
  } finally {
    await unlink(temp);
  }
  const d = await open(dirname(path), 'r');
  try {
    await d.sync();
  } finally {
    await d.close();
  }
  return { sha256: sha(body), bytes: body.length };
}
async function main() {
  const previousBytes = await readFile(resolve(BASE, 'episode-v1/protocol.json')),
    previous = JSON.parse(previousBytes.toString());
  const blockBytes = await readFile(previous.files['blocks-development'].path);
  check(sha(blockBytes) === previous.cache.blocksSha256, 'block-export-changed');
  const selected = openingState(JSON.parse(blockBytes.toString()));
  const configPath = resolve(BASE, 'runtime-tsconfig.json'),
    config = ts.readConfigFile(configPath, ts.sys.readFile);
  check(!config.error, 'tsconfig');
  const options = ts.parseJsonConfigFileContent(config.config, ts.sys, BASE).options;
  const program = ts.createProgram([fileURLToPath(import.meta.url)], { ...options, noEmit: true });
  const paths = new Set([
    fileURLToPath(import.meta.url),
    configPath,
    resolve(ROOT, 'package.json'),
    resolve(ROOT, 'yarn.lock'),
    ...program
      .getSourceFiles()
      .filter(
        (f) => !f.isDeclarationFile && f.fileName.startsWith(ROOT + '/') && !f.fileName.includes('/node_modules/')
      )
      .map((f) => f.fileName),
  ]);
  const sources: Record<string, string> = {};
  for (const path of [...paths].sort()) sources[relative(ROOT, path)] = sha(await readFile(path));
  const request = {
    block: { height: selected.height, hash: selected.hash },
    finalizedSource: previous.input.manifest.partitions.training.source.finalizedSource,
    expectedDenominator: previous.input.manifest.denominator,
    assetIn: '0x02000c0000000000000000000000000000000000000000000000000000000000',
    assetOut: '0x0200000000000000000000000000000000000000000000000000000000000000',
    amountInCodec: '2500000000000000000',
  };
  const protocol = {
    kind: 'already-exposed-opening-market-preflight-v1',
    recordedAt: new Date().toISOString(),
    previousClockPreparationSha256: sha(previousBytes),
    purpose:
      'Same predetermined opening state, fixed2.5KUSD input, actual archived pool/quote/bounded-fee joins. No strategy return or qualification.',
    selected,
    request,
    cache: previous.cache,
    files: previous.files,
    sources,
    maximumPhysicalHttpStarts: 27,
    minimumHttpIntervalMs: 125,
    observedFill: false,
    transactionSubmitted: false,
    qualificationEligible: false,
  };
  await retain(resolve(OUT, 'protocol.json'), protocol);
  await retain(resolve(OUT, 'access.json'), {
    startedAt: new Date().toISOString(),
    pid: process.pid,
    protocolSha256: sha(canonical(protocol)),
    marketDataRead: true,
    qualificationEligible: false,
  });
  let starts = 0,
    last = 0,
    cacheHits = 0;
  const raw = globalThis.fetch;
  const paced: typeof fetch = async (url, init) => {
    check(String(url) === 'https://mof2.sora.org/' && ++starts <= 27, 'http-budget');
    const wait = 125 - (Date.now() - last);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    return raw(url, init);
  };
  let reader: Awaited<ReturnType<typeof marketModule.createHistoricalGoalMarketReader>> | undefined;
  try {
    const cache = await cacheModule.createGoalMetadataReplayTransport(previous.cache, {
      readArtifact: async (name, signal) => {
        check(!signal.aborted, 'aborted');
        const fixed = previous.files[name];
        if (fixed) {
          const body = await readFile(fixed.path);
          check(sha(body) === fixed.sha256, 'cache-file-changed');
          return body.toString('utf8');
        }
        check(/^(?:shard-\d{5}\.complete|group-\d{5}\.(?:complete|batch-\d{5}))$/.test(name), 'cache-name');
        return readFile(resolve(BASE, 'callback-collection', name + '.json'), 'utf8');
      },
      liveFetch: paced,
      retainEvidence: async (value) => {
        await retain(resolve(OUT, `cache-${++cacheHits}.json`), value);
      },
    });
    await retain(resolve(OUT, 'cache-binding.json'), { binding: cache.binding, bindingSha256: cache.bindingSha256 });
    reader = await marketModule.createHistoricalGoalMarketReader(
      { source: previous.input.manifest.partitions.training.source, expectedDenominator: request.expectedDenominator },
      { fetch: cache.fetch, timeoutMs: 20000 }
    );
    const state = await reader.readMark(selected.height);
    await retain(resolve(OUT, 'market.json'), { state, evidence: reader.evidence() });
    check(
      canonical(state.block) === canonical(selected) && state.poolEvidence.status === 'present' && state.mark,
      'market-state'
    );
    const quoted = await quoteModule.readHistoricalExecutionQuote(request, { fetch: paced, timeoutMs: 20000 });
    await retain(resolve(OUT, 'quote.json'), quoted);
    check(quoted.kind === 'hypothetical-historical-execution-estimate', 'quote-unavailable');
    check(
      quoted.context.parentHash === selected.parentHash && quoted.context.state.timestampMs === selected.timestampMs,
      'quote-state'
    );
    const metadata = quoted.rpcEvidence.filter(
      (r) => r.method === 'state_getMetadata' && canonical(r.params) === canonical([selected.hash])
    );
    check(metadata.length === 1 && metadata[0].responseBody, 'quote-metadata');
    const source = {
      identity: {
        genesisHash: reader.context.genesisHash,
        blockHash: selected.hash,
        metadataHex: JSON.parse(metadata[0].responseBody).result as string,
        runtimeVersion: {
          specVersion: quoted.context.codecBinding.runtimeVersion.specVersion,
          transactionVersion: quoted.context.codecBinding.runtimeVersion.transactionVersion,
        },
      },
      blockNumber: selected.height,
      request: {
        assetIn: request.assetIn,
        assetOut: request.assetOut,
        amountInCodec: request.amountInCodec,
        quotedAmountOutCodec: quoted.quote.amountOutCodec,
      },
      quoteEvidence: quoted,
    };
    const bound = boundModule.prepareHistoricalGoalBoundFeeSource(source),
      fee = await feeModule.readHistoricalGoalBoundFee(source, { fetch: paced, timeoutMs: 20000 });
    await retain(resolve(OUT, 'bound-fee.json'), { bound, fee });
    check(fee.info.partialFeeCodec === fee.details.finalFee, 'fee-disagreement');
    for (const [path, hash] of Object.entries(sources))
      check(sha(await readFile(resolve(ROOT, path))) === hash, 'source-changed');
    const result = {
      complete: true,
      block: selected.height,
      inputCodec: request.amountInCodec,
      expectedDenominator: request.expectedDenominator,
      poolPresent: true,
      quoteAvailable: true,
      boundedFeeAgrees: true,
      quoteOutputCodec: bound.quote.amountOutCodec,
      minimumOutputCodec: bound.bound.minimumCodec,
      feeCodec: fee.info.partialFeeCodec,
      httpStarts: starts,
      cacheHits,
      sourceFiles: paths.size,
      observedFill: false,
      transactionSubmitted: false,
      qualificationEligible: false,
    };
    await retain(resolve(OUT, 'complete.json'), result);
    console.log(
      JSON.stringify({ ...result, quoteOutputCodec: undefined, minimumOutputCodec: undefined, feeCodec: undefined })
    );
  } catch (e) {
    await retain(resolve(OUT, 'failure.json'), {
      complete: false,
      message: e instanceof Error ? e.message : 'preflight-failed',
      diagnostic: e && typeof e === 'object' && 'diagnostic' in e ? e.diagnostic : null,
      marketEvidence: reader?.evidence() ?? null,
      httpStarts: starts,
      cacheHits,
      transactionSubmitted: false,
      qualificationEligible: false,
    });
    console.log(
      JSON.stringify({
        complete: false,
        message: e instanceof Error ? e.message : 'preflight-failed',
        httpStarts: starts,
        cacheHits,
      })
    );
    process.exitCode = 1;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  check(process.argv[2] === '--run', 'Use --run');
  await main();
}
