/** Exclusive public-reader leases for a separately frozen collector; no wallet or submission capability. */
import {
  canonicalEvidenceJson,
  validateExecutionReverseLot,
  type ExecutionReverseLot,
  type ExecutionSnapshot,
} from './execution-evidence';
import { readExecutionSnapshot, type ExecutionProgress, type ExecutionReader } from './execution-reader';
import type { ExecutionOutcome } from './execution-store';

export interface ExecutionOperationInterval {
  operation: 'connect' | 'context' | 'buy' | 'sell' | 'continuity';
  startedAt: number;
  finishedAt?: number;
  status: 'pending' | 'complete' | 'error';
  blockHash?: string;
}

/** Reader-method timing, including unfinished work; these are not individual wire-RPC intervals. */
export interface ExecutionSessionProgress extends ExecutionProgress {
  connectionId: number;
  reusedConnection: boolean;
  operations: ExecutionOperationInterval[];
  /** Error diagnostics only: later wall time cannot bound earlier retained intervals after a clock correction. */
  clockRegressed?: true;
}

export type ExecutionSessionOutcome =
  | {
      status: 'complete';
      snapshot: ExecutionSnapshot & {
        readerTiming: Pick<ExecutionSessionProgress, 'connectionId' | 'reusedConnection' | 'operations'>;
      };
    }
  | (Extract<ExecutionOutcome, { status: 'error' }> & { progress: ExecutionSessionProgress });

export interface ExecutionSession {
  collect(slotAt: number, deadlineMs: number, reverseLot?: ExecutionReverseLot): Promise<ExecutionSessionOutcome>;
  /** Abort active work and initiate transport cleanup without waiting for a stuck transport promise. */
  close(): Promise<void>;
}

interface Connection {
  id: number;
  controller: AbortController;
  ready: Promise<ExecutionReader>;
  invalidated: boolean;
}

/**
 * Reuse only a fully successful reader between sequential observations. Every
 * observation still obtains fresh finalized context and all existing runtime,
 * metadata, quote and fee checks. A timeout/error permanently discards its
 * connection; late callbacks cannot write into the next observation.
 */
export function createExecutionSession(
  factory: (signal: AbortSignal) => Promise<ExecutionReader>,
  now: () => number = Date.now
): ExecutionSession {
  let connection: Connection | undefined;
  let nextId = 0;
  let closed = false;
  let active: { cancel: () => void } | undefined;

  /** Invalidate synchronously; consume late connection or disconnect failures. */
  const discard = (target: Connection): void => {
    if (target.invalidated) return;
    target.invalidated = true;
    if (connection === target) connection = undefined;
    target.controller.abort();
    void target.ready.then((reader) => reader.close()).catch(() => undefined);
  };

  return {
    async collect(slotAt, deadlineMs, reverseLot = { kind: 'same-block-buy-minimum' }) {
      if (closed) throw new Error('Execution session is closed');
      if (active) throw new Error('Execution session already has an active observation');
      if (
        !Number.isSafeInteger(slotAt) ||
        slotAt <= 0 ||
        !Number.isSafeInteger(deadlineMs) ||
        deadlineMs <= 0 ||
        deadlineMs > 25000
      )
        throw new Error('Invalid execution session schedule');
      const frozenLot = validateExecutionReverseLot(reverseLot, slotAt);

      const startedAt = now();
      if (!Number.isSafeInteger(startedAt) || startedAt < slotAt) throw new Error('Invalid execution session clock');
      let previousTime = startedAt;
      let clockRegressed = false;
      const readClock = (): number => {
        const value = now();
        if (!Number.isSafeInteger(value) || value < previousTime) {
          clockRegressed = true;
          throw new Error('Execution session clock regressed');
        }
        previousTime = value;
        return value;
      };
      const reusedConnection = Boolean(connection);
      if (!connection) {
        const controller = new AbortController();
        connection = {
          id: ++nextId,
          controller,
          invalidated: false,
          ready: Promise.resolve().then(() => factory(controller.signal)),
        };
      }
      const target = connection;
      const progress: ExecutionSessionProgress = {
        stage: 'connect',
        connectionId: target.id,
        reusedConnection,
        operations: [],
      };
      let valid = true;
      let timedOut = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let rejectCancelled: (error: Error) => void = () => undefined;
      const cancelled = new Promise<never>((_resolve, reject) => {
        rejectCancelled = reject;
      });
      const lease = {
        cancel: () => {
          valid = false;
          discard(target);
          rejectCancelled(new Error('Execution session closed during observation'));
        },
      };
      active = lease;
      const check = (): void => {
        if (!valid || closed || target.invalidated || active !== lease)
          throw new Error('Execution reader lease is no longer active');
      };

      /** Record method boundaries before awaiting, so timeouts retain unfinished intervals. */
      const measure = async <T>(
        operation: ExecutionOperationInterval['operation'],
        work: () => Promise<T>,
        blockHash?: string
      ): Promise<T> => {
        check();
        const interval: ExecutionOperationInterval = {
          operation,
          startedAt: readClock(),
          status: 'pending',
          ...(blockHash ? { blockHash } : {}),
        };
        progress.operations.push(interval);
        try {
          const result = await work();
          check();
          interval.finishedAt = readClock();
          interval.status = 'complete';
          return result;
        } catch (error) {
          if (valid && active === lease) {
            interval.finishedAt = readClock();
            interval.status = 'error';
          }
          throw error;
        }
      };

      const attempt = (async () => {
        const reader = await measure('connect', () => target.ready);
        const scoped: ExecutionReader = {
          context: () => measure('context', () => reader.context()),
          quote: (context, assetIn, assetOut, amount, onPartial) =>
            measure(
              progress.stage === 'buy' ? 'buy' : 'sell',
              () =>
                reader.quote(context, assetIn, assetOut, amount, (partial) => {
                  if (valid && !closed && !target.invalidated && active === lease) onPartial?.(partial);
                }),
              context.blockHash
            ),
          assertUnchanged: (context) => measure('continuity', () => reader.assertUnchanged(context), context.blockHash),
          close: async () => undefined,
        };
        return readExecutionSnapshot(scoped, slotAt, startedAt, progress, readClock, frozenLot);
      })();
      try {
        timer = setTimeout(() => {
          timedOut = true;
          valid = false;
          discard(target);
          rejectCancelled(new Error('Observation deadline exceeded'));
        }, deadlineMs);
        const snapshot = await Promise.race([attempt, cancelled]);
        if (readClock() - startedAt > deadlineMs) {
          timedOut = true;
          throw new Error('Observation deadline exceeded');
        }
        return {
          status: 'complete',
          snapshot: {
            ...snapshot,
            readerTiming: JSON.parse(
              canonicalEvidenceJson({
                connectionId: progress.connectionId,
                reusedConnection: progress.reusedConnection,
                operations: progress.operations,
              })
            ) as Pick<ExecutionSessionProgress, 'connectionId' | 'reusedConnection' | 'operations'>,
          },
        };
      } catch (error) {
        valid = false;
        discard(target);
        return {
          status: 'error',
          code: timedOut ? 'timeout' : 'observation',
          message: String(error instanceof Error ? error.message : String(error)).slice(0, 1024),
          progress: JSON.parse(
            canonicalEvidenceJson({ ...progress, ...(clockRegressed ? { clockRegressed: true } : {}) })
          ) as ExecutionSessionProgress,
        };
      } finally {
        if (timer !== undefined) clearTimeout(timer);
        valid = false;
        if (active === lease) active = undefined;
      }
    },
    async close() {
      if (closed) return;
      closed = true;
      active?.cancel();
      if (connection) discard(connection);
    },
  };
}
