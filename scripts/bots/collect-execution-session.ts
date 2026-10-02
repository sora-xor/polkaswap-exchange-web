/** Opt-in public evidence collection with an exclusively reused transport; no wallet or broadcast API. */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { executionSourceHashes, parseExecutionArguments } from './collect-execution-quotes';
import { canonicalEvidenceJson } from './execution-evidence';
import type { ExecutionReader } from './execution-reader';
import { EXECUTION_ESTIMATION_ASSUMPTIONS, openExecutionReader } from './execution-rpc';
import { createExecutionSession, type ExecutionSessionProgress } from './execution-session';
import {
  createExecutionManifest,
  executionReverseLot,
  loadFrozenExecutionLot,
  openExecutionStore,
  validateExecutionManifest,
  type ExecutionManifest,
  type ExecutionOutcome,
  type FrozenExecutionLot,
} from './execution-store';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SESSION_SOURCES = ['scripts/bots/collect-execution-session.ts', 'scripts/bots/execution-session.ts'];
export const EXECUTION_SESSION_TRANSPORT_POLICY = 'exclusive-reuse-reconnect-after-failure-v1';
export const EXECUTION_SESSION_TIMING_POLICY = 'reader-operation-intervals-v1';

/** A distinct manifest identity prevents resuming an older per-slot-connection dataset with this collector. */
export interface ExecutionSessionManifest extends ExecutionManifest {
  transportPolicy: typeof EXECUTION_SESSION_TRANSPORT_POLICY;
  timingPolicy: typeof EXECUTION_SESSION_TIMING_POLICY;
}

/** Preserve the existing explicit schedule/lot grammar; transport and timing cannot be overridden by flags. */
export function parseExecutionSessionArguments(args: string[]): ReturnType<typeof parseExecutionArguments> {
  return parseExecutionArguments(args);
}

/** Freeze every existing collector dependency plus this opt-in CLI and its session implementation. */
export async function executionSessionSourceHashes(root = ROOT): Promise<Record<string, string>> {
  const hashes = await executionSourceHashes(root);
  for (const path of SESSION_SOURCES)
    hashes[path] = createHash('sha256')
      .update(await readFile(join(root, path)))
      .digest('hex');
  return Object.fromEntries(
    Object.keys(hashes)
      .sort()
      .map((path) => [path, hashes[path]])
  );
}

/** Validate the base evidence contract and require this exact, explicitly frozen transport/timing protocol. */
export function validateExecutionSessionManifest(value: ExecutionManifest): ExecutionSessionManifest {
  const manifest = validateExecutionManifest(value) as ExecutionSessionManifest;
  if (
    manifest.transportPolicy !== EXECUTION_SESSION_TRANSPORT_POLICY ||
    manifest.timingPolicy !== EXECUTION_SESSION_TIMING_POLICY ||
    manifest.quoteTiming !== 'request-intervals' ||
    SESSION_SOURCES.some((path) => !manifest.sourceHashes[path])
  )
    throw new Error('Invalid execution-session transport, timing or source identity');
  return manifest;
}

/** Require the timing claimed by the session protocol before appending or accepting a retained record on resume. */
export function validateExecutionSessionOutcome(outcome: ExecutionOutcome, slotAt: number, recordedAt: number): void {
  if (outcome.status === 'missed') return;
  const complete = outcome.status === 'complete';
  const snapshot = complete ? outcome.snapshot : undefined;
  const timing = (
    complete
      ? (snapshot as typeof snapshot & { readerTiming?: ExecutionSessionProgress })?.readerTiming
      : outcome.progress
  ) as Partial<ExecutionSessionProgress> | undefined;
  const fail = (): never => {
    throw new Error('Invalid execution-session reader timing');
  };
  const clock = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
  const start = snapshot?.requestStartedAt ?? slotAt;
  const finish = snapshot?.requestFinishedAt ?? recordedAt;
  const clockRegressed =
    !complete &&
    outcome.code === 'observation' &&
    outcome.message === 'Execution session clock regressed' &&
    timing?.clockRegressed === true;
  if (
    !clock(slotAt) ||
    !clock(recordedAt) ||
    !clock(start) ||
    !clock(finish) ||
    start < slotAt ||
    finish < start ||
    finish > recordedAt ||
    !timing ||
    !Number.isSafeInteger(timing.connectionId) ||
    timing.connectionId! < 1 ||
    typeof timing.reusedConnection !== 'boolean' ||
    !Array.isArray(timing.operations) ||
    timing.operations.length > 5 ||
    (complete && timing.operations.length !== 5) ||
    (timing.clockRegressed !== undefined && !clockRegressed)
  )
    fail();
  const operations = timing!.operations!;
  const expected = ['connect', 'context', 'buy', 'sell', 'continuity'];
  const blockHash = snapshot?.context.blockHash ?? (!complete ? outcome.progress.context?.blockHash : undefined);
  let previousFinish = start;
  for (let index = 0; index < operations.length; index++) {
    const operation = operations[index];
    if (
      !operation ||
      operation.operation !== expected[index] ||
      !clock(operation.startedAt) ||
      operation.startedAt < previousFinish ||
      (!clockRegressed && operation.startedAt > finish) ||
      !['pending', 'complete', 'error'].includes(operation.status) ||
      ((complete || index < operations.length - 1) && operation.status !== 'complete')
    )
      fail();
    if (
      index < 2
        ? operation.blockHash !== undefined
        : !blockHash || !/^0x[0-9a-f]{64}$/.test(blockHash) || operation.blockHash !== blockHash
    )
      fail();
    if (operation.status === 'pending') {
      if (operation.finishedAt !== undefined) fail();
      previousFinish = operation.startedAt;
    } else {
      if (
        !clock(operation.finishedAt) ||
        operation.finishedAt < operation.startedAt ||
        (!clockRegressed && operation.finishedAt > finish)
      )
        fail();
      previousFinish = operation.finishedAt!;
    }
  }
}

/** Fail a retained-lot context change inside collection so it becomes a recorded error, before any quote. */
export async function openGuardedExecutionSessionReader(
  signal: AbortSignal,
  fixedLot?: FrozenExecutionLot
): Promise<ExecutionReader> {
  const frozenLot = fixedLot ? { ...fixedLot } : undefined;
  const reader = await openExecutionReader(signal);
  if (!frozenLot) return reader;
  return {
    async context() {
      const context = await reader.context();
      if (
        context.denominator !== frozenLot.sourceDenominator ||
        context.blockNumber < frozenLot.sourceBlockNumber ||
        context.finalizedAt < frozenLot.sourceFinalizedAt ||
        (context.blockNumber === frozenLot.sourceBlockNumber && context.blockHash !== frozenLot.sourceBlockHash)
      )
        throw new Error('Retained lot source state or denomination changed');
      return context;
    },
    quote: (...args) => reader.quote(...args),
    assertUnchanged: (context) => reader.assertUnchanged(context),
    close: () => reader.close(),
  };
}

/** Retain each scheduled outcome exactly once; a healthy reader is reused without retrying failed slots. */
export async function runExecutionSessionCollector(args: string[]): Promise<void> {
  const options = parseExecutionSessionArguments(args);
  const sourceHashes = await executionSessionSourceHashes();
  let manifest: ExecutionSessionManifest;
  if (options.resume) {
    manifest = validateExecutionSessionManifest(
      JSON.parse(await readFile(join(options.directory, 'manifest.json'), 'utf8'))
    );
    if (
      canonicalEvidenceJson(manifest.sourceHashes) !== canonicalEvidenceJson(sourceHashes) ||
      canonicalEvidenceJson(manifest.feeAssumptions) !== canonicalEvidenceJson(EXECUTION_ESTIMATION_ASSUMPTIONS)
    )
      throw new Error('Source or fee assumptions changed; retain this dataset and start a new development dataset');
  } else {
    const frozenAt = Date.now();
    const fixedLot = options.lotSource
      ? await loadFrozenExecutionLot(options.lotSource.directory, options.lotSource.slot, frozenAt)
      : undefined;
    manifest = validateExecutionSessionManifest({
      ...createExecutionManifest(
        { startAt: options.startAt!, slots: options.slots!, cadenceMs: options.cadenceMs! },
        sourceHashes,
        EXECUTION_ESTIMATION_ASSUMPTIONS,
        frozenAt,
        fixedLot
      ),
      transportPolicy: EXECUTION_SESSION_TRANSPORT_POLICY,
      timingPolicy: EXECUTION_SESSION_TIMING_POLICY,
    } as ExecutionSessionManifest);
  }
  const store = await openExecutionStore(options.directory, manifest);
  let session: ReturnType<typeof createExecutionSession> | undefined;
  try {
    for (const record of store.records) validateExecutionSessionOutcome(record, record.slotAt, record.recordedAt);
    console.log(
      JSON.stringify({
        event: 'frozen',
        directory: relative(ROOT, options.directory),
        manifest,
        retainedSlots: store.records.length,
      })
    );
    if (store.records.length < manifest.slots)
      session = createExecutionSession((signal) => openGuardedExecutionSessionReader(signal, manifest.fixedReverseLot));
    for (let index = store.records.length; index < manifest.slots; index++) {
      const slotAt = manifest.startAt + index * manifest.cadenceMs;
      while (Date.now() < slotAt) await new Promise((done) => setTimeout(done, Math.min(1000, slotAt - Date.now())));
      const outcome =
        Date.now() > slotAt + manifest.maxStartDelayMs
          ? { status: 'missed' as const, reason: 'start-deadline-exceeded' as const }
          : await session!.collect(slotAt, manifest.deadlineMs, executionReverseLot(manifest));
      const recordedAt = Date.now();
      validateExecutionSessionOutcome(outcome, slotAt, recordedAt);
      const record = await store.append(slotAt, outcome, recordedAt);
      console.log(
        JSON.stringify({
          event: 'slot',
          index,
          slotAt,
          status: record.status,
          recordHash: record.recordHash,
          ...(record.status === 'error'
            ? {
                code: record.code,
                stage: record.progress.stage,
                message: record.message,
                ...((record.progress as ExecutionSessionProgress).clockRegressed
                  ? { clockRegressed: true, timingTrusted: false }
                  : {}),
              }
            : {}),
        })
      );
    }
    const records = store.records;
    console.log(
      JSON.stringify({
        event: 'finished',
        slots: records.length,
        complete: records.filter((record) => record.status === 'complete').length,
        errors: records.filter((record) => record.status === 'error').length,
        missed: records.filter((record) => record.status === 'missed').length,
        noTransactionsSubmitted: true,
      })
    );
  } finally {
    try {
      await session?.close();
    } finally {
      await store.close();
    }
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runExecutionSessionCollector(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
