/** A presentation barrier follows actual visual completion; it never calculates progress or schedules a replay. */
export interface CheckpointPresentation {
  /** Start presenting this exact engine checkpoint, releasing any superseded presentation. */
  begin(checkpoint: number): void;
  /** Release calculation only when this checkpoint's actual transition has settled. */
  settle(checkpoint: number): void;
  /** Wait safely whether the renderer begins before or after the parent requests acknowledgement. */
  waitForCheckpoint(checkpoint: number, signal?: AbortSignal): Promise<void>;
  /** Hidden, unavailable, or reduced-motion renderers release presentation without inventing a duration. */
  release(): void;
  /** Unmount releases every waiter and makes later requests immediate. */
  dispose(): void;
}

interface Waiter {
  finish(error?: Error): void;
}

/**
 * Coordinate bounded live transitions with worker acknowledgements. The timeout is only a fail-open
 * guard for a lost renderer/frame, never the normal animation duration or a substitute for settle().
 */
export function createCheckpointPresentation(
  options: { timeoutMs?: number; onTimeout?: (checkpoint: number) => void } = {}
): CheckpointPresentation {
  const requested = options.timeoutMs ?? 1000;
  const timeoutMs = Number.isFinite(requested) ? Math.max(50, Math.min(5000, requested)) : 1000;
  const waiters = new Map<number, Set<Waiter>>();
  let current: number | undefined;
  let settled = false;
  let released = false;
  let disposed = false;
  const valid = (checkpoint: number) => Number.isSafeInteger(checkpoint) && checkpoint > 0;

  /** Resolve an exact checkpoint without allowing a late transition to acknowledge a newer one. */
  const finish = (checkpoint: number) => {
    for (const waiter of [...(waiters.get(checkpoint) ?? [])]) waiter.finish();
  };

  const release = () => {
    released = true;
    settled = true;
    for (const checkpoint of [...waiters.keys()]) finish(checkpoint);
  };

  return {
    begin(checkpoint) {
      if (disposed || !valid(checkpoint)) return;
      if (current === checkpoint) return;
      current = checkpoint;
      released = false;
      settled = false;
      // A view may replace an animation after a scope change or worker restart.
      for (const other of [...waiters.keys()]) if (other !== checkpoint) finish(other);
    },
    settle(checkpoint) {
      if (disposed || !valid(checkpoint) || current !== checkpoint) return;
      settled = true;
      finish(checkpoint);
    },
    waitForCheckpoint(checkpoint, signal) {
      if (signal?.aborted) return Promise.reject(new Error('bots.errors.stale'));
      if (disposed || released || !valid(checkpoint) || (current === checkpoint && settled)) return Promise.resolve();
      // Old observers must never delay the currently visible engine checkpoint.
      if (current !== undefined && checkpoint < current) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        let done = false;
        const abort = () => waiter.finish(new Error('bots.errors.stale'));
        const waiter: Waiter = {
          finish(error) {
            if (done) return;
            done = true;
            if (timer !== undefined) clearTimeout(timer);
            signal?.removeEventListener('abort', abort);
            const pending = waiters.get(checkpoint);
            pending?.delete(waiter);
            if (pending?.size === 0) waiters.delete(checkpoint);
            if (error) reject(error);
            else resolve();
          },
        };
        const pending = waiters.get(checkpoint) ?? new Set<Waiter>();
        pending.add(waiter);
        waiters.set(checkpoint, pending);
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) abort();
        else
          timer = setTimeout(() => {
            try {
              // A renderer can snap/cancel this lost transition before calculation is released.
              options.onTimeout?.(checkpoint);
            } catch {
              // A failed canvas must not strand research or leak an uncaught timer exception.
            } finally {
              waiter.finish();
            }
          }, timeoutMs);
      });
    },
    release,
    dispose() {
      disposed = true;
      release();
    },
  };
}
