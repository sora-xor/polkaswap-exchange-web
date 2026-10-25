/** Fixed-day archive collection only: no strategy, quote, outcome, signer or transaction API. */
import { createHash } from 'node:crypto';
import {
  createHistoricalGoalMarketReader,
  HistoricalGoalMarketReadError,
  type HistoricalGoalMarketSource,
} from './historical-goal-market-reader';
import { locateHistoricalValuationBlock, HistoricalValuationLocateError } from './historical-valuation-locator';
import { planHistoricalGoalSchedule } from './historical-goal-schedule';
import { planHistoricalGoalTerminal, verifyHistoricalGoalTerminalClock } from './historical-goal-terminal';
import { verifyHistoricalExecutionClock, type HistoricalClockBlock } from './historical-execution-clock';
import type {
  HistoricalGoalValuationEvidence,
  HistoricalGoalExecutionEvidence,
  HistoricalGoalTerminalEvidence,
} from './historical-goal-replay';

const HOUR = 3_600_000;
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const HASH = /^0x[0-9a-f]{64}$/;
const SHA = /^[0-9a-f]{64}$/;
type Reader = Awaited<ReturnType<typeof createHistoricalGoalMarketReader>>;
type Schedule = ReturnType<typeof planHistoricalGoalSchedule>;
type TerminalPolicy = ReturnType<typeof planHistoricalGoalTerminal>;

/** Global ceilings include duplicate metadata attestations when a mark crosses a shard boundary. */
export const HISTORICAL_GOAL_DAY_LIMITS = Object.freeze({
  hourLanes: 4,
  httpStartsPerSecond: 8,
  blockReads: 8192,
  shards: 160,
  marks: 1441,
  blocksPerShard: 64,
});

export interface HistoricalGoalDayInput {
  source: HistoricalGoalMarketSource;
  schedule: Schedule;
  terminalPolicy: TerminalPolicy;
  terminal: { observed: HistoricalClockBlock; successor: HistoricalClockBlock };
  schemaFingerprint: {
    metadataSha256: string;
    codeHash: string;
    runtimeVersion: { specName: string; specVersion: number; transactionVersion: number };
  };
}

export interface HistoricalGoalDayCounts {
  shards: number;
  blockReads: number;
  marks: number;
  httpStarts: number;
  valuationsCompleted: number;
  executionClocksCompleted: number;
}

export type HistoricalGoalDayArtifact =
  | { kind: 'shard'; index: number; context?: Reader['context']; evidence: unknown; failed: boolean }
  | {
      kind: 'valuation';
      targetAtMs: number;
      terminal: boolean;
      row: HistoricalGoalValuationEvidence | HistoricalGoalTerminalEvidence;
      evidence: unknown;
    }
  | { kind: 'execution'; signalIndex: number; row: HistoricalGoalExecutionEvidence; evidence: unknown }
  | { kind: 'failure'; reason: string; counts: Readonly<HistoricalGoalDayCounts> };

/** The factory is an offline-test seam; production uses the fixed approved market reader. */
export interface HistoricalGoalDayOptions {
  fetch?: typeof fetch;
  signal?: AbortSignal;
  sink: (artifact: HistoricalGoalDayArtifact) => Promise<void>;
  progress?: (counts: Readonly<HistoricalGoalDayCounts>) => void;
  readerFactory?: typeof createHistoricalGoalMarketReader;
}

/** A fatal run preserves completed artifacts and never retries another block, shard or date. */
export class HistoricalGoalDayCollectionError extends Error {
  constructor(readonly diagnostic: Readonly<{ reason: string; counts: Readonly<HistoricalGoalDayCounts> }>) {
    super(`Historical day collection failed: ${diagnostic.reason}`);
    this.name = 'HistoricalGoalDayCollectionError';
  }
}

function requireValue(condition: unknown, reason = 'invalid-evidence'): asserts condition {
  if (!condition) throw new Error(reason);
}

/** Copy only bounded, dense, plain data before awaiting any callback; never invoke data accessors. */
function snapshot<T>(input: T): T {
  let nodes = 0;
  const copy = (value: unknown, depth: number): unknown => {
    requireValue(++nodes <= 2_000_000 && depth <= 24);
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      requireValue(Number.isFinite(value));
      return value;
    }
    if (typeof value === 'string') {
      requireValue(value.length <= 8_388_608);
      return value;
    }
    requireValue(value && typeof value === 'object');
    const fields = Object.getOwnPropertyDescriptors(value);
    if (Array.isArray(value)) {
      requireValue(value.length <= 8192 && Reflect.ownKeys(fields).length === value.length + 1);
      return Object.freeze(
        Array.from({ length: value.length }, (_, index) => {
          const field = fields[String(index)];
          requireValue(field?.enumerable && 'value' in field);
          return copy(field.value, depth + 1);
        })
      );
    }
    requireValue(Object.getPrototypeOf(value) === Object.prototype);
    requireValue(Reflect.ownKeys(fields).every((key) => typeof key === 'string'));
    return Object.freeze(
      Object.fromEntries(
        Object.entries(fields).map(([key, field]) => {
          requireValue(field.enumerable && 'value' in field);
          return [key, copy(field.value, depth + 1)];
        })
      )
    );
  };
  return copy(input, 0) as T;
}

function equivalent(left: unknown, right: unknown): boolean {
  const canonical = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value && typeof value === 'object')
      return `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
        .join(',')}}`;
    return JSON.stringify(value);
  };
  return canonical(left) === canonical(right);
}

function validBlock(block: HistoricalClockBlock): void {
  requireValue(
    Object.keys(block).sort().join(',') === 'hash,height,parentHash,timestampMs' &&
      HASH.test(block.hash) &&
      HASH.test(block.parentHash) &&
      block.hash !== block.parentHash &&
      Number.isSafeInteger(block.height) &&
      block.height > 0 &&
      Number.isSafeInteger(block.timestampMs) &&
      block.timestampMs > 0
  );
}

/**
 * Collect every predetermined minute and all 24 execution clocks. Four independent serial lanes
 * share a canonical metadata cache and one global 125ms HTTP-start gate. A fresh shard is opened
 * only when its 64-block budget is exhausted; a failed shard is never replaced. Missing/zero pools
 * and lag violations remain unavailable targets. Other failures abort and retain partial artifacts.
 * The terminal row uses its separately declared as-of proof; its real timestamp is never relabelled.
 */
export async function collectHistoricalGoalDay(input: HistoricalGoalDayInput, options: HistoricalGoalDayOptions) {
  const bound = snapshot(input);
  const { source, schedule, terminalPolicy, terminal, schemaFingerprint } = bound;
  requireValue(Object.keys(bound).sort().join(',') === 'schedule,schemaFingerprint,source,terminal,terminalPolicy');
  requireValue(schedule.valuationPolicy.cadenceMs === 60_000 && schedule.valuations.length === 1441);
  const rebuilt = planHistoricalGoalSchedule(
    schedule.executions.map((plan) => plan.signal),
    schedule.executions[0].policy,
    schedule.episode,
    schedule.valuationPolicy
  );
  requireValue(equivalent(schedule, rebuilt));
  requireValue(
    schedule.executions.every(
      (plan, index) => plan.targetExecutionAtMs < schedule.episode.startedAtMs + (index + 1) * HOUR
    ),
    'execution-outside-hour-lane'
  );
  requireValue(equivalent(terminalPolicy, planHistoricalGoalTerminal(schedule.episode, 12_000)));
  verifyHistoricalGoalTerminalClock(terminalPolicy, terminal.observed, terminal.successor);
  requireValue(SHA.test(schemaFingerprint.metadataSha256) && HASH.test(schemaFingerprint.codeHash));
  requireValue(
    schemaFingerprint.runtimeVersion.specName === 'sora-substrate' &&
      [130, 131].includes(schemaFingerprint.runtimeVersion.specVersion) &&
      schemaFingerprint.runtimeVersion.transactionVersion === schemaFingerprint.runtimeVersion.specVersion
  );
  requireValue(
    /^[1-9]\d{0,38}$/.test(source.expectedDenominator) &&
      BigInt(source.expectedDenominator) < 1n << 128n &&
      HASH.test(source.source.finalizedSource.hash) &&
      SHA.test(source.source.finalizedSource.receiptSha256) &&
      HASH.test(source.source.schemaAnchor.hash) &&
      Number.isSafeInteger(source.source.finalizedSource.height) &&
      source.source.finalizedSource.height >= terminal.successor.height &&
      Number.isSafeInteger(source.source.schemaAnchor.height) &&
      source.source.schemaAnchor.height > 0 &&
      source.source.schemaAnchor.height <= source.source.finalizedSource.height
  );
  const settings = Object.getOwnPropertyDescriptors(options);
  requireValue(
    Object.getPrototypeOf(options) === Object.prototype &&
      Reflect.ownKeys(settings).every(
        (key) => typeof key === 'string' && ['fetch', 'signal', 'sink', 'progress', 'readerFactory'].includes(key)
      ) &&
      Object.values(settings).every((field) => field.enumerable && 'value' in field)
  );
  const sink = settings.sink?.value as HistoricalGoalDayOptions['sink'];
  const progress = settings.progress?.value as HistoricalGoalDayOptions['progress'];
  const factory = (settings.readerFactory?.value ??
    createHistoricalGoalMarketReader) as typeof createHistoricalGoalMarketReader;
  const transport = (settings.fetch?.value ?? globalThis.fetch) as typeof fetch;
  const externalSignal = settings.signal?.value as AbortSignal | undefined;
  requireValue(typeof sink === 'function' && typeof factory === 'function' && typeof transport === 'function');
  requireValue(progress === undefined || typeof progress === 'function');
  const controller = new AbortController();
  const abort = () => controller.abort();
  externalSignal?.addEventListener('abort', abort, { once: true });
  if (externalSignal?.aborted) abort();
  const counts: HistoricalGoalDayCounts = {
    shards: 0,
    blockReads: 0,
    marks: 0,
    httpStarts: 0,
    valuationsCompleted: 0,
    executionClocksCompleted: 0,
  };
  const tally = () => Object.freeze({ ...counts });
  const diagnostics: { targetAtMs: number; reason: string }[] = [];
  const closers: ((failed?: boolean) => Promise<void>)[] = [];
  const valuations: HistoricalGoalValuationEvidence[] = new Array(1440);
  const executions: HistoricalGoalExecutionEvidence[] = new Array(24);
  let terminalRow: HistoricalGoalTerminalEvidence | undefined;
  let failureReason: string | undefined;
  let nextHttpAt = 0;
  let gate = Promise.resolve();
  const check = () => requireValue(!controller.signal.aborted, 'aborted');
  const gatedFetch: typeof fetch = async (url, init) => {
    const turn = gate.then(async () => {
      check();
      const wait = nextHttpAt - Date.now();
      if (wait > 0) await new Promise<void>((resolve) => setTimeout(resolve, wait));
      check();
      requireValue(!init?.signal?.aborted, 'aborted');
      nextHttpAt = Date.now() + 125;
      counts.httpStarts++;
    });
    gate = turn.catch(() => undefined);
    await turn;
    return transport(url, init);
  };
  const metadata = new Map<number, HistoricalClockBlock>();
  const seeded = new Map<number, HistoricalClockBlock>();
  const pendingMetadata = new Map<number, Promise<HistoricalClockBlock>>();
  const observe = (block: HistoricalClockBlock) => {
    validBlock(block);
    requireValue(block.height <= source.source.finalizedSource.height);
    const expected = seeded.get(block.height) ?? metadata.get(block.height);
    if (expected) requireValue(equivalent(block, expected));
    for (const other of metadata.values()) {
      if (block.height === other.height) continue;
      requireValue(block.hash !== other.hash);
      if (block.parentHash === other.hash) requireValue(block.height === other.height + 1);
      if (other.parentHash === block.hash) requireValue(other.height === block.height + 1);
      requireValue(
        block.height < other.height ? block.timestampMs < other.timestampMs : block.timestampMs > other.timestampMs
      );
      if (block.height === other.height + 1) requireValue(block.parentHash === other.hash);
      if (other.height === block.height + 1) requireValue(other.parentHash === block.hash);
    }
    metadata.set(block.height, block);
    return block;
  };
  for (const block of [
    ...schedule.executions.flatMap((plan) => [plan.signal.closing, plan.signal.successor]),
    terminal.observed,
    terminal.successor,
  ]) {
    validBlock(block);
    const known = seeded.get(block.height);
    if (known) requireValue(equivalent(known, block));
    seeded.set(block.height, block);
  }
  // Seed identities constrain observations but are not silently treated as fresh provider reads.
  let nextHour = 0;
  const lane = async () => {
    let current: { index: number; reader: Reader; heights: Set<number>; closed: boolean } | undefined;
    const close = async (failed = false, diagnostic?: unknown) => {
      if (!current || current.closed) return;
      current.closed = true;
      await sink({
        kind: 'shard',
        index: current.index,
        context: current.reader.context,
        evidence: diagnostic ?? current.reader.evidence(),
        failed,
      });
    };
    const ensure = async (height: number) => {
      check();
      if (current?.closed) current = undefined;
      if (!current?.heights.has(height))
        requireValue(counts.blockReads < HISTORICAL_GOAL_DAY_LIMITS.blockReads, 'block-limit');
      if (current && !current.heights.has(height) && current.heights.size === 64) {
        await close();
        current = undefined;
      }
      if (!current) {
        requireValue(counts.shards < HISTORICAL_GOAL_DAY_LIMITS.shards, 'shard-limit');
        const index = ++counts.shards;
        let reader: Reader;
        try {
          reader = await factory(source, { fetch: gatedFetch, signal: controller.signal });
        } catch (error) {
          await sink({
            kind: 'shard',
            index,
            evidence:
              error instanceof HistoricalGoalMarketReadError
                ? error.diagnostic
                : { reason: 'reader-initialization-failed' },
            failed: true,
          });
          throw error;
        }
        current = { index, reader, heights: new Set(), closed: false };
        const context = snapshot(reader.context);
        requireValue(
          context.endpoint === 'https://mof2.sora.org/' &&
            context.genesisHash === GENESIS &&
            equivalent(context.finalizedSource, source.source.finalizedSource) &&
            equivalent(context.schemaAnchor, source.source.schemaAnchor) &&
            context.expectedDenominator === source.expectedDenominator &&
            context.schema.metadataSha256 === schemaFingerprint.metadataSha256 &&
            context.schema.codeHash === schemaFingerprint.codeHash &&
            equivalent(context.schema.runtimeVersion, schemaFingerprint.runtimeVersion) &&
            context.maximumBlockReads === 64 &&
            context.maximumMarkReads === 64
        );
      }
      if (!current.heights.has(height)) {
        requireValue(counts.blockReads < HISTORICAL_GOAL_DAY_LIMITS.blockReads, 'block-limit');
        counts.blockReads++;
        current.heights.add(height);
      }
      return current.reader;
    };
    const read = async (height: number) => {
      check();
      const known = metadata.get(height);
      if (known) return known;
      const waiting = pendingMetadata.get(height);
      if (waiting) return waiting;
      const promise = (async () => {
        const reader = await ensure(height);
        const found = snapshot(await reader.readBlock(height));
        requireValue(found.height === height);
        return observe(found);
      })();
      pendingMetadata.set(height, promise);
      return promise;
    };
    const readMark = async (block: HistoricalClockBlock) => {
      const reader = await ensure(block.height);
      requireValue(counts.marks < HISTORICAL_GOAL_DAY_LIMITS.marks, 'mark-limit');
      counts.marks++;
      const result = snapshot(await reader.readMark(block.height));
      requireValue(equivalent(block, result.block));
      observe(result.block);
      const pool = result.poolEvidence;
      requireValue(
        pool.binding.blockHash === block.hash &&
          pool.binding.genesisHash === GENESIS &&
          pool.binding.metadataSha256 === schemaFingerprint.metadataSha256 &&
          pool.binding.metadataVersion === 14 &&
          pool.binding.runtimeVersion.specVersion === schemaFingerprint.runtimeVersion.specVersion &&
          pool.binding.runtimeVersion.transactionVersion === schemaFingerprint.runtimeVersion.transactionVersion &&
          pool.state.timestampMs === block.timestampMs &&
          pool.state.denominator === source.expectedDenominator
      );
      if (pool.status === 'present') {
        requireValue(
          result.mark &&
            result.mark.blockHash === block.hash &&
            result.mark.timestampMs === block.timestampMs &&
            result.mark.kusdReserveCodec === pool.reserves.kusdCodec &&
            result.mark.xorReserveCodec === pool.reserves.xorCodec
        );
      } else requireValue(!result.mark && ['absent', 'zero-reserves', 'missing-reserves'].includes(pool.status));
      return result;
    };
    const locate = async (targetAtMs: number, maximumLagMs: number, hour: number) => {
      const lower = schedule.executions[hour].signal.closing;
      const upper =
        targetAtMs === schedule.executions[hour].signal.completedAtMs
          ? schedule.executions[hour].signal.successor
          : hour === 23
            ? terminal.successor
            : schedule.executions[hour + 1].signal.successor;
      try {
        return await locateHistoricalValuationBlock({ targetAtMs, maximumLagMs, lower, upper }, read);
      } catch (error) {
        if (error instanceof HistoricalValuationLocateError && error.diagnostic.reason === 'lag-exceeded') {
          return { unavailable: true as const, diagnostic: error.diagnostic };
        }
        throw error;
      }
    };
    closers.push(close);
    try {
      while (nextHour < 24) {
        check();
        const hour = nextHour++;
        const tasks = [
          ...schedule.valuations.slice(hour * 60, (hour + 1) * 60).map((request, offset) => ({
            type: 'valuation' as const,
            targetAtMs: request.targetAtMs,
            maximumLagMs: request.maximumLagMs,
            index: hour * 60 + offset,
          })),
          {
            type: 'execution' as const,
            targetAtMs: schedule.executions[hour].targetExecutionAtMs,
            maximumLagMs: schedule.executions[hour].policy.maximumExecutionLagMs,
            index: hour,
          },
        ].sort((a, b) => a.targetAtMs - b.targetAtMs || (a.type === 'valuation' ? -1 : 1));
        requireValue(
          tasks.every((task) => task.targetAtMs < schedule.episode.startedAtMs + (hour + 1) * HOUR),
          'execution-outside-hour-lane'
        );
        for (const task of tasks) {
          check();
          const location = await locate(task.targetAtMs, task.maximumLagMs, hour);
          if (task.type === 'execution') {
            const row: HistoricalGoalExecutionEvidence =
              'unavailable' in location
                ? { status: 'unavailable', signalIndex: hour, reason: 'unavailable' }
                : { status: 'available', signalIndex: hour, previous: location.previous, execution: location.block };
            if (row.status === 'available')
              verifyHistoricalExecutionClock(schedule.executions[hour], row.previous, row.execution);
            else diagnostics.push({ targetAtMs: task.targetAtMs, reason: 'execution-lag-exceeded' });
            executions[hour] = snapshot(row);
            await sink({ kind: 'execution', signalIndex: hour, row: executions[hour], evidence: location });
            counts.executionClocksCompleted++;
          } else {
            let row: HistoricalGoalValuationEvidence;
            let evidence: unknown = location;
            if ('unavailable' in location) {
              row = { status: 'unavailable', targetAtMs: task.targetAtMs, reason: 'unavailable' };
              diagnostics.push({ targetAtMs: task.targetAtMs, reason: 'valuation-lag-exceeded' });
            } else {
              const observed = await readMark(location.block);
              evidence = { location, observed };
              row = observed.mark
                ? {
                    status: 'available',
                    targetAtMs: task.targetAtMs,
                    previous: location.previous,
                    block: observed.block,
                    mark: observed.mark,
                    poolEvidence: observed.poolEvidence,
                  }
                : { status: 'unavailable', targetAtMs: task.targetAtMs, reason: 'unavailable' };
              if (!observed.mark)
                diagnostics.push({ targetAtMs: task.targetAtMs, reason: `pool-${observed.poolEvidence.status}` });
            }
            valuations[task.index] = snapshot(row);
            await sink({
              kind: 'valuation',
              targetAtMs: task.targetAtMs,
              terminal: false,
              row: valuations[task.index],
              evidence,
            });
            counts.valuationsCompleted++;
          }
          progress?.(tally());
        }
        if (hour === 23) {
          const observed = await read(terminal.observed.height);
          const successor = await read(terminal.successor.height);
          requireValue(equivalent(observed, terminal.observed) && equivalent(successor, terminal.successor));
          verifyHistoricalGoalTerminalClock(terminalPolicy, observed, successor);
          const result = await readMark(observed);
          terminalRow = snapshot(
            result.mark
              ? {
                  status: 'available' as const,
                  observed,
                  successor,
                  mark: result.mark,
                  poolEvidence: result.poolEvidence,
                }
              : { status: 'unavailable' as const, reason: 'unavailable' as const }
          );
          if (!result.mark)
            diagnostics.push({ targetAtMs: schedule.episode.endedAtMs, reason: `pool-${result.poolEvidence.status}` });
          await sink({
            kind: 'valuation',
            targetAtMs: schedule.episode.endedAtMs,
            terminal: true,
            row: terminalRow,
            evidence: result,
          });
          counts.valuationsCompleted++;
          progress?.(tally());
        }
      }
      await close();
    } catch (error) {
      failureReason ??=
        error instanceof Error &&
        ['block-limit', 'shard-limit', 'mark-limit', 'aborted', 'execution-outside-hour-lane'].includes(error.message)
          ? error.message
          : 'collection-failed';
      controller.abort();
      await close(true, error instanceof HistoricalGoalMarketReadError ? error.diagnostic : undefined);
      throw error;
    }
  };
  try {
    const lanes = await Promise.allSettled(Array.from({ length: 4 }, () => lane()));
    if (lanes.some((lane) => lane.status === 'rejected')) throw new Error(failureReason ?? 'collection-failed');
    requireValue(terminalRow && counts.valuationsCompleted === 1441 && counts.executionClocksCompleted === 24);
    return snapshot({
      protocol: 'goal-day-collection-v1-development' as const,
      status: diagnostics.length ? ('incomplete' as const) : ('complete' as const),
      inputSha256: createHash('sha256').update(JSON.stringify(bound)).digest('hex'),
      valuations,
      executions,
      terminal: terminalRow,
      diagnostics,
      counts: tally(),
      observedFill: false as const,
      transactionSubmitted: false as const,
    });
  } catch (error) {
    controller.abort();
    const reason =
      failureReason ??
      (error instanceof Error && ['block-limit', 'shard-limit', 'mark-limit', 'aborted'].includes(error.message)
        ? error.message
        : 'collection-failed');
    const diagnostic = Object.freeze({ reason, counts: tally() });
    await sink({ kind: 'failure', ...diagnostic });
    throw new HistoricalGoalDayCollectionError(diagnostic);
  } finally {
    await Promise.all(closers.map((close) => close(controller.signal.aborted)));
    externalSignal?.removeEventListener('abort', abort);
  }
}
