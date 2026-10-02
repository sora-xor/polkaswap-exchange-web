/** One-shot operational continuation of an unchanged sealed evaluation; no strategy/clock changes. */
import { createHash } from 'node:crypto';
import { mkdir, open, readFile, realpath } from 'node:fs/promises';
import { mkdirSync, openSync, writeFileSync, fsyncSync, closeSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  collectCausalSourceClosure,
  withVerifiedCausalSources,
  copyCausalGapPriorEvidence,
  createCausalAcquisitionTransport,
  createCausalGapReuseJournal,
  decodeCausalCalibration,
  collectCausalCalibrationEpisode,
  createCausalGapMarketAccess,
  createCausalGapQuoteProvider,
  runCausalEpisodeSequence,
  type CausalRegistration,
  type CausalSourceBinding,
} from './run-causal-gap-calibration';
import type { CausalGapContinuationManifest, CausalGapContinuationReuse } from './causal-gap-continuation-reuse';
import type { CausalGapReuseManifest } from './causal-gap-reuse';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PARENT = 'output/go-history/tc1-causal-gap-calibration-run-20260926';
const PARENT_SHA = 'bcee33b9ae9eee6bc470e4bda4b6704992f82fcdf40627226ab95d7b00dbb0df';
const ENTRY = 'scripts/bots/continue-causal-gap-calibration.ts';
const ENTRIES = [
  ENTRY,
  'tests/unit/scripts/bots/continue-causal-gap-calibration.spec.ts',
  'scripts/bots/causal-gap-continuation-reuse.ts',
  'tests/unit/scripts/bots/causal-gap-continuation-reuse.spec.ts',
];
const DOC = 'docs/causal-gap-continuation.md';
const ARCHIVE = 'https://mof2.sora.org/';
export const CONTINUATION_BUDGET = Object.freeze({
  warmupRequests: 0,
  marketShards: 25,
  quotes: 1927,
  boundFees: 1927,
  rpcRequests: 57518,
  concurrentRequests: 1,
});
const DEBIT = Object.freeze({ warmupRequests: 0, marketShards: 7, quotes: 5, boundFees: 5, rpcRequests: 2482 });
const canonical = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
          .join(',')}}`
      : JSON.stringify(value);
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const digest = (value: unknown) => sha(canonical(value));
function check(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(`causal-continuation:${reason}`);
}

let reuseModule: Promise<typeof import('./causal-gap-continuation-reuse')> | undefined;
/** Apply existing repository aliases only while loading the frozen pure dependency graph. */
function loadReuse() {
  return (reuseModule ??= (async () => {
    const hook = registerHooks({
      resolve(specifier, context, next) {
        const match =
          /^@sora-substrate\/(math|sdk|liquidity-proxy|api|connection|types|type-definitions)(?:\/(.*))?$/.exec(
            specifier
          );
        const mapped = specifier.startsWith('@/')
          ? join(ROOT, 'src', specifier.slice(2))
          : match
            ? join(
                ROOT,
                'src/lib/substrate',
                match[1],
                !match[2] || match[2] === 'build' ? 'index.ts' : match[2].replace(/^build\//, '')
              )
            : undefined;
        return next(mapped ? pathToFileURL(mapped).href : specifier, context);
      },
    });
    try {
      return await import('./causal-gap-continuation-reuse');
    } finally {
      hook.deregister();
    }
  })());
}

/** Exclusive, flushed receipt; a partial file on interruption is retained and never overwritten. */
export async function writeContinuationReceipt(directory: string, name: string, value: unknown): Promise<void> {
  check(/^[a-zA-Z0-9_./-]+$/.test(name) && !name.startsWith('/') && !name.split('/').includes('..'), 'receipt-path');
  const path = join(directory, name),
    bytes = `${canonical(value)}\n`;
  check(Buffer.byteLength(bytes) <= 32 * 1024 * 1024, 'receipt-size');
  await mkdir(dirname(path), { recursive: true });
  const file = await open(path, 'wx', 0o600);
  try {
    await file.writeFile(bytes);
    await file.sync();
  } finally {
    await file.close();
  }
  const parent = await open(dirname(path), 'r');
  try {
    await parent.sync();
  } finally {
    await parent.close();
  }
}

/** Real transport only. Intents are durable before dispatch; raw response bytes are durable before delivery. */
export function createContinuationTransport(directory: string, fetcher: typeof fetch = globalThis.fetch) {
  let enabled = false,
    busy = false,
    stopped = false,
    attempts = 0,
    completed = 0;
  const dispatch: typeof fetch = async (input, init) => {
    check(!busy && !stopped, 'dispatch-terminal-or-concurrent');
    busy = true;
    const sequence = ++attempts,
      name = String(sequence).padStart(6, '0');
    let intent = false;
    const parts: Uint8Array[] = [];
    let bytes = 0;
    let responseFacts:
      | { httpStatus: number; url: string; redirected: boolean; headers: [string, string][] }
      | undefined;
    try {
      await writeContinuationReceipt(directory, `attempts/${name}/intent.json`, {
        sequence,
        requestedAt: new Date().toISOString(),
        endpoint: ARCHIVE,
        requestBody: init!.body,
        requestSha256: sha(init!.body as string),
        priorReservedRpc: DEBIT.rpcRequests,
        remainingRpcLimit: CONTINUATION_BUDGET.rpcRequests,
        logicalClaims: base.counts(),
      });
      intent = true;
      const response = await fetcher(input, init);
      responseFacts = {
        httpStatus: response.status,
        url: response.url,
        redirected: response.redirected,
        headers: [...response.headers.entries()],
      };
      check(!response.redirected && (!response.url || response.url === ARCHIVE), 'response-redirect');
      const method = JSON.parse(init!.body as string).method;
      const limit = method === 'state_queryStorageAt' ? 128 * 1024 : method === 'state_call' ? 65536 : 2 * 1024 * 1024;
      const length = response.headers.get('content-length');
      check(length === null || (/^\d+$/.test(length) && Number(length) <= limit), 'response-size');
      const reader = response.body?.getReader();
      if (reader) {
        const signal = init?.signal;
        let abortRead: (() => void) | undefined;
        const aborted = signal
          ? new Promise<never>((_resolve, reject) => {
              abortRead = () => reject(new Error('causal-continuation:request-aborted'));
              signal.addEventListener('abort', abortRead, { once: true });
            })
          : undefined;
        try {
          while (true) {
            check(!signal?.aborted, 'request-aborted');
            const result = await (aborted ? Promise.race([reader.read(), aborted]) : reader.read());
            check(!signal?.aborted, 'request-aborted');
            if (result.done) break;
            bytes += result.value.length;
            const priorBytes = bytes - result.value.length;
            if (priorBytes < limit) parts.push(result.value.subarray(0, limit - priorBytes));
            check(bytes <= limit, 'response-size');
          }
        } catch (error) {
          // Cancellation itself must not extend the original request deadline.
          void reader.cancel().catch(() => undefined);
          throw error;
        } finally {
          if (signal && abortRead) signal.removeEventListener('abort', abortRead);
          reader.releaseLock();
        }
      }
      check(!init?.signal?.aborted, 'request-aborted');
      const body = Buffer.concat(parts);
      await writeContinuationReceipt(directory, `attempts/${name}/response.json`, {
        sequence,
        completedAt: new Date().toISOString(),
        ...responseFacts,
        bytes: body.length,
        responseSha256: sha(body),
        responseBodyBase64: body.toString('base64'),
        originalNetworkResponse: true,
      });
      completed++;
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      stopped = true;
      if (intent)
        await writeContinuationReceipt(directory, `attempts/${name}/failure.json`, {
          sequence,
          failedAt: new Date().toISOString(),
          reason: 'request-or-retention-failed',
          restartAllowed: false,
          ...(responseFacts ?? {}),
          observedBytes: bytes,
          retainedBytes: Buffer.concat(parts).length,
          responsePrefixBase64: Buffer.concat(parts).toString('base64'),
          responsePrefixSha256: sha(Buffer.concat(parts)),
        });
      throw error;
    } finally {
      busy = false;
    }
  };
  const base = createCausalAcquisitionTransport(dispatch);
  return {
    enableFresh: () => {
      check(!stopped, 'transport-terminal');
      enabled = true;
    },
    journal: () => ({ attempts, completed, unresolved: attempts - completed }),
    fetch: (async (input, init) => {
      check(enabled && !stopped, 'cache-only-prefix');
      check(
        (typeof input === 'string' ? input : input instanceof URL ? input.href : input.url) === ARCHIVE,
        'no-new-warmup'
      );
      check(!busy && base.counts().rpcRequests < CONTINUATION_BUDGET.rpcRequests, 'remaining-rpc-or-concurrency');
      return base.fetch(input, init);
    }) as typeof fetch,
    claim(kind: 'marketShards' | 'quotes' | 'boundFees') {
      check(enabled && !stopped, 'cache-only-prefix');
      check(base.counts()[kind] < CONTINUATION_BUDGET[kind], `remaining-${kind}`);
      const path = join(directory, `invocations/${kind}-${base.counts()[kind] + 1}.json`);
      try {
        mkdirSync(dirname(path), { recursive: true });
        const fd = openSync(path, 'wx', 0o600);
        try {
          writeFileSync(
            fd,
            `${canonical({ kind, ordinal: base.counts()[kind] + 1, claimedAt: new Date().toISOString(), priorReserved: DEBIT[kind], remainingLimit: CONTINUATION_BUDGET[kind] })}\n`
          );
          fsyncSync(fd);
        } finally {
          closeSync(fd);
        }
        const folder = openSync(dirname(path), 'r');
        try {
          fsyncSync(folder);
        } finally {
          closeSync(folder);
        }
        base.claim(kind);
      } catch (error) {
        stopped = true;
        base.stop();
        throw error;
      }
    },
    counts: base.counts,
    stop: () => {
      stopped = true;
      base.stop();
    },
  };
}

/** Gate every inherited result against its retained original before enabling any missing suffix read. */
export function createContinuationRetainer(
  originals: readonly (readonly unknown[])[],
  retain: (name: string, value: unknown) => Promise<unknown>,
  enableFresh: () => void
) {
  const candidates = ['momentum-breakout', 'rebound-from-discount', 'trend-pullback-accumulation'];
  check(originals.length === 12 && originals.every((row) => row.length === 3), 'prefix-coverage');
  let next = 0;
  return async (name: string, value: unknown) => {
    const match = /^episodes\/(\d+)\/([a-z-]+)\.json$/.exec(name);
    if (match && Number(match[1]) < 12) {
      const ordinal = Number(match[1]),
        index = candidates.indexOf(match[2]);
      check(index >= 0 && ordinal * 3 + index === next, 'prefix-order');
      check(canonical(value) === canonical(originals[ordinal][index]), 'prefix-result-changed');
      await retain(name, value);
      next++;
      if (next === 36) {
        await retain('prefix-reproduced.json', {
          parentRegistrationSha256: PARENT_SHA,
          results: 36,
          resultsSha256: digest(originals),
          networkRequests: 0,
        });
        enableFresh();
      }
      return;
    }
    check(!match || next === 36, 'suffix-before-prefix');
    await retain(name, value);
  };
}

interface ContinuationBody {
  kind: 'causal-gap-operational-continuation-v1';
  registeredAt: string;
  parentRegistrationSha256: string;
  source: Awaited<ReturnType<typeof collectCausalSourceClosure>>;
  extra: CausalSourceBinding[];
  node: CausalRegistration['body']['node'];
  parentSnapshot: CausalGapContinuationManifest;
  conservativeDebit: typeof DEBIT;
  remaining: typeof CONTINUATION_BUDGET;
  scope: CausalRegistration['body']['scope'];
  candidates: CausalRegistration['body']['candidates'];
  fixedProtocolSha256: string;
  financialActions: false;
  retries: 0;
  limitation: string;
}
interface ContinuationRegistration {
  body: ContinuationBody;
  sha256: string;
}
/** Both the executing sources and retained continuation snapshots must match before and after use. */
export function withContinuationSourceCopies<T>(
  liveRoot: string,
  snapshotRoot: string,
  bindings: readonly CausalSourceBinding[],
  operation: () => Promise<T>
): Promise<T> {
  return withVerifiedCausalSources(liveRoot, bindings, () =>
    withVerifiedCausalSources(snapshotRoot, bindings, operation)
  );
}
async function body(registeredAt: string): Promise<ContinuationBody> {
  const parent = JSON.parse(await readFile(join(ROOT, PARENT, 'registration.json'), 'utf8')) as CausalRegistration;
  check(parent.sha256 === PARENT_SHA && digest(parent.body) === PARENT_SHA, 'parent-registration');
  const original = [...parent.body.source.local, ...parent.body.extra];
  await withVerifiedCausalSources(ROOT, original, async () => undefined);
  await withVerifiedCausalSources(join(ROOT, PARENT, 'source'), original, async () => undefined);
  check(
    parent.body.node.version === process.version &&
      parent.body.node.execPath === process.execPath &&
      parent.body.node.binarySha256 === sha(await readFile(process.execPath)),
    'parent-node'
  );
  const { registerCausalGapContinuationReuse } = await loadReuse();
  const doc = await readFile(join(ROOT, DOC));
  return {
    kind: 'causal-gap-operational-continuation-v1',
    registeredAt,
    parentRegistrationSha256: PARENT_SHA,
    source: await collectCausalSourceClosure(ROOT, ENTRIES),
    extra: [...parent.body.extra, { path: DOC, bytes: doc.length, sha256: sha(doc) }],
    node: parent.body.node,
    parentSnapshot: await registerCausalGapContinuationReuse(join(ROOT, PARENT)),
    conservativeDebit: DEBIT,
    remaining: CONTINUATION_BUDGET,
    scope: parent.body.scope,
    candidates: parent.body.candidates,
    fixedProtocolSha256: parent.body.extra.find((item) => item.path === parent.body.protocolPath)!.sha256,
    financialActions: false,
    retries: 0,
    limitation:
      'Operational continuation preserves an interrupted attempt and its unknown trailing dispatch. Original unkeyed receipts prove internal consistency, not independent chain authenticity. No economic rule, timing rule, scope or qualification authority changes.',
  };
}
function asOriginalManifest(manifest: CausalGapContinuationManifest): CausalGapReuseManifest {
  return {
    kind: 'causal-gap-reuse-manifest-v1',
    priorRegistrationSha256: manifest.parentRegistrationSha256,
    files: manifest.files,
    sha256: manifest.sha256,
  };
}

/** Prepare only an operational wrapper and immutable snapshot; no market request or original-run mutation. */
export async function prepareCausalContinuation(directory: string): Promise<ContinuationRegistration> {
  const plan = await body(new Date().toISOString()),
    registration = { body: plan, sha256: digest(plan) };
  await mkdir(directory, { recursive: false, mode: 0o700 });
  await copyCausalGapPriorEvidence(
    join(ROOT, PARENT),
    join(directory, 'parent'),
    asOriginalManifest(plan.parentSnapshot)
  );
  const { openCausalGapContinuationReuse } = await loadReuse();
  await openCausalGapContinuationReuse(join(directory, 'parent'), plan.parentSnapshot);
  await copyCausalGapPriorEvidence(ROOT, join(directory, 'source'), {
    ...asOriginalManifest(plan.parentSnapshot),
    files: [...plan.source.local, ...plan.extra].filter(
      (value, index, array) => array.findIndex((item) => item.path === value.path) === index
    ),
  });
  await copyCausalGapPriorEvidence(join(directory, 'parent'), directory, {
    ...asOriginalManifest(plan.parentSnapshot),
    files: plan.parentSnapshot.files.filter((item) => item.path === 'registration.json'),
  });
  await writeContinuationReceipt(directory, 'continuation-registration.json', registration);
  return registration;
}

/** Run the new operational attempt once; every failure and inherited result remains explicit. */
export async function runCausalContinuation(directory: string): Promise<void> {
  const registration = JSON.parse(
    await readFile(join(directory, 'continuation-registration.json'), 'utf8')
  ) as ContinuationRegistration;
  check(
    digest(registration.body) === registration.sha256 &&
      canonical(await body(registration.body.registeredAt)) === canonical(registration.body),
    'continuation-registration-changed'
  );
  const { openCausalGapContinuationReuse } = await loadReuse();
  const cache: CausalGapContinuationReuse = await openCausalGapContinuationReuse(
    join(directory, 'parent'),
    registration.body.parentSnapshot
  );
  check(canonical(cache.conservativeDebit) === canonical(DEBIT), 'reserved-debit');
  const parent = JSON.parse(await readFile(join(directory, 'registration.json'), 'utf8')) as CausalRegistration;
  check(parent.sha256 === PARENT_SHA && digest(parent.body) === PARENT_SHA, 'evaluation-registration');
  const bindings = [...registration.body.source.local, ...registration.body.extra];
  await withContinuationSourceCopies(ROOT, join(directory, 'source'), bindings, async () => undefined);
  await writeContinuationReceipt(directory, 'acquisition-started.json', {
    registrationSha256: PARENT_SHA,
    continuationRegistrationSha256: registration.sha256,
    startedAt: new Date().toISOString(),
    pid: process.pid,
    restartAllowed: false,
    inheritedResults: 36,
    newResultsRequired: 48,
  });
  const transport = createContinuationTransport(directory),
    controller = new AbortController();
  const reuse = createCausalGapReuseJournal(directory, asOriginalManifest(registration.body.parentSnapshot));
  const retain = (name: string, value: unknown) => writeContinuationReceipt(directory, name, value);
  try {
    const results = await withContinuationSourceCopies(ROOT, join(directory, 'source'), bindings, async () => {
      const calibration = await decodeCausalCalibration(await readFile(join(ROOT, parent.body.calibration.path)));
      const warmup = await reuse.record('warmup', 'fixed', cache.warmup());
      const market = createCausalGapMarketAccess(parent, directory, transport, controller.signal, cache, reuse);
      const quote = createCausalGapQuoteProvider(parent, directory, transport, controller.signal, cache, reuse);
      await retain('quarantined-parent-evidence.json', {
        quarantined: cache.quarantined(),
        usedAsMarketEvidence: false,
      });
      return runCausalEpisodeSequence({
        collect: (ordinal) =>
          collectCausalCalibrationEpisode(ordinal, calibration, warmup.history.history.candles, market),
        quote,
        retain: createContinuationRetainer(cache.prefixResults(), retain, transport.enableFresh),
      });
    });
    check(
      canonical(await body(registration.body.registeredAt)) === canonical(registration.body),
      'source-changed-after-continuation'
    );
    await openCausalGapContinuationReuse(join(directory, 'parent'), registration.body.parentSnapshot);
    await retain('complete.json', {
      registrationSha256: PARENT_SHA,
      continuationRegistrationSha256: registration.sha256,
      completedAt: new Date().toISOString(),
      episodes: 28,
      candidates: Object.keys(parent.body.candidates),
      resultsSha256: digest(results),
      inheritedResults: 36,
      newResults: 48,
      counts: transport.counts(),
      priorReserved: DEBIT,
      journal: transport.journal(),
      reuseCounts: reuse.counts(),
      identityRechecks: reuse.identityRechecks(),
      observedFill: false,
      transactionSubmitted: false,
      qualificationAuthority: false,
    });
  } catch (error) {
    controller.abort();
    transport.stop();
    await retain('failed.json', {
      registrationSha256: PARENT_SHA,
      continuationRegistrationSha256: registration.sha256,
      failedAt: new Date().toISOString(),
      reason: error instanceof Error ? error.message : 'failed',
      counts: transport.counts(),
      journal: transport.journal(),
      priorReserved: DEBIT,
      inheritedResultsRequired: 36,
      newResultsRequired: 48,
      observedFill: false,
      transactionSubmitted: false,
      qualificationAuthority: false,
    });
    throw error;
  }
}

async function main() {
  check(
    process.argv.length === 4 && ['prepare', 'run'].includes(process.argv[2]),
    'Usage: tsx scripts/bots/continue-causal-gap-calibration.ts prepare|run NEW_DIRECTORY'
  );
  const directory = resolve(process.argv[3]);
  if (process.argv[2] === 'prepare') {
    const r = await prepareCausalContinuation(directory);
    process.stdout.write(
      JSON.stringify({ mode: 'prepare', continuationRegistrationSha256: r.sha256, networkRequests: 0 }) + '\n'
    );
  } else {
    await runCausalContinuation(directory);
    process.stdout.write(JSON.stringify({ mode: 'run', status: 'complete', qualificationAuthority: false }) + '\n');
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  void main().catch((error) => {
    process.stderr.write((error instanceof Error ? error.message : 'continuation-failed') + '\n');
    process.exitCode = 1;
  });
