/** One authorized goal's causal scheduler, indexed signals and owned finalized valuations. */
import { createGoalExecutionSession } from '@/features/agent-trading/goal-execution-session';
import { GoalTerminalError } from './goal-terminal';
import { createGoalLiveClock, type GoalLiveClockHeader, type GoalLiveClockCheck } from './goal-live-clock';
import { goalConsentIdentity, goalMarkFromExecutionContext } from './goal-policy';
import {
  assertGoalQualificationVerification,
  assertGoalQualificationRuntime,
  type GoalQualificationVerification,
} from './goal-qualification';
import { evaluateGoalCompletedSignal } from './goal-signals';
import { readGoalExecutionBot, assertGoalOrderAccounting } from './goal-storage';
import type { GoalExecutionBot, GoalExecutionOrder } from './goal-execution-types';
import type { GoalLiveExecutor } from './goal-live';
import type { GoalReceiptClient } from './goal-receipt';
import type { GoalEnabledBotStorage } from './storage';
import type { IndexedPoolHistoryWithEvidence } from './pool-history';

export interface GoalRuntimeDependencies {
  storage: GoalEnabledBotStorage;
  live: GoalLiveExecutor;
  qualification(bot: GoalExecutionBot): GoalQualificationVerification;
  client(): GoalReceiptClient;
  /** Includes the application's wallet/account/source identity, not merely network connectivity. */
  isCurrent(bot: GoalExecutionBot): boolean;
  history(bot: GoalExecutionBot, signal: AbortSignal): Promise<IndexedPoolHistoryWithEvidence>;
  subscribeFinalizedHeads(
    client: GoalReceiptClient,
    callback: (header: GoalLiveClockHeader) => void
  ): Promise<() => void>;
  now(): number;
  /** Notification only; it never grants execution authority. */
  onChange?(id: string, active: boolean, error?: unknown): void;
}
interface Run {
  id: string;
  generation: number;
  controller: AbortController;
  qualification: GoalQualificationVerification;
  identity: string;
  client: GoalReceiptClient;
  bot: GoalExecutionBot;
  clock?: ReturnType<typeof createGoalLiveClock>;
  reads?: ReturnType<typeof createGoalExecutionSession>;
  stopped?: Promise<void>;
}
const fail = (key = 'session'): never => {
  throw new Error(`bots.errors.${key}`);
};
const expected = (bot: GoalExecutionBot) => ({
  goalId: bot.goalExecution.goalId,
  revision: bot.exactGoalState.revision,
  stateSha256: bot.exactGoalState.stateSha256,
  controlRevision: bot.goalControl.revision,
});

/**
 * Start requires prior user consent and an already funded, qualified goal. There is no polling,
 * hourly-price fallback, automatic reload authorization, or strategy resizing in this corridor.
 * Deadline closure first revokes signing, then reads canonical historical terminal evidence.
 * Unresolved orders remain pending; this path never substitutes a current mark for the deadline.
 */
export function createGoalRuntime(deps: GoalRuntimeDependencies) {
  const runs = new Map<string, Run>();
  const generations = new Map<string, number>();
  const stopping = new Map<string, Promise<void>>();
  const closing = new Map<string, { controller: AbortController; promise: Promise<GoalExecutionBot> }>();
  let disposed = false;
  const notify = (id: string, active: boolean, error?: unknown) => {
    try {
      void Promise.resolve(deps.onChange?.(id, active, error)).catch(() => undefined);
    } catch {
      // UI notification cannot keep a revoked signer alive or invalidate persisted facts.
    }
  };
  const get = async (id: string) => {
    const bot = (await deps.storage.listBots()).find((candidate) => candidate.id === id);
    if (!bot) return fail('storage');
    return readGoalExecutionBot(bot);
  };
  const current = (run: Run) => {
    if (
      disposed ||
      runs.get(run.id) !== run ||
      generations.get(run.id) !== run.generation ||
      run.controller.signal.aborted ||
      deps.client() !== run.client ||
      !run.client.isConnected ||
      run.client.genesisHash.toHex() !== run.bot.network ||
      deps.isCurrent(run.bot) !== true
    )
      return false;
    assertGoalQualificationVerification(run.qualification, run.bot);
    return true;
  };
  const guard = (run: Run, bot: GoalExecutionBot, check?: GoalLiveClockCheck) => {
    if (!current(run)) return fail();
    if (
      bot.id !== run.id ||
      goalConsentIdentity(bot) !== run.identity ||
      bot.goalControl.revision !== run.bot.goalControl.revision ||
      bot.status !== 'running' ||
      bot.exactGoalState.outcome !== 'active' ||
      bot.exactGoalState.attention.length ||
      deps.now() >= Math.min(bot.sessionExpiresAt, bot.exactGoalState.episode.endedAtMs)
    )
      return fail();
    assertGoalQualificationVerification(run.qualification, bot);
    if (check) run.clock!.assertCurrent(check.id);
  };
  const stopRun = (run: Run, error?: unknown): Promise<void> => {
    if (run.stopped) return run.stopped;
    // Install the promise before cancelling the clock, whose onStop callback can run synchronously.
    let resolve!: () => void, reject!: (error: unknown) => void;
    run.stopped = new Promise<void>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    void run.stopped.catch(() => undefined);
    stopping.set(run.id, run.stopped);
    void run.stopped
      .finally(() => {
        if (stopping.get(run.id) === run.stopped) stopping.delete(run.id);
      })
      .catch(() => undefined);
    if (runs.get(run.id) === run) runs.delete(run.id);
    run.controller.abort();
    run.clock?.cancel();
    try {
      run.reads?.dispose();
    } catch {
      /* Signing must still be revoked below. */
    }
    try {
      // The executor revokes its private signer synchronously, before its persistence await.
      void Promise.resolve(deps.live.stop(run.id)).then(resolve, reject);
    } catch (failure) {
      reject(failure);
    }
    notify(run.id, false, error);
    return run.stopped;
  };
  const check = async (run: Run, tick: GoalLiveClockCheck, signal: AbortSignal) => {
    try {
      // Even a synchronously delivered first subscription callback yields before using run.clock.
      let bot = await get(run.id);
      guard(run, bot, tick);
      await deps.live.reconcile(bot);
      bot = await get(run.id);
      guard(run, bot, tick);
      const boundary = Math.floor(deps.now() / 3_600_000) * 3_600_000;
      const needed = bot.goalSignal.completedAtMs === null || boundary > bot.goalSignal.completedAtMs;
      const history = needed ? await deps.history(bot, signal) : undefined;
      const receivedAtMs = deps.now();
      guard(run, bot, tick);
      const context = await run.reads!.capture(
        {
          expectedDenominator: bot.goalExecution.execution.expectedDenominator,
        },
        signal
      );
      guard(run, bot, tick);
      if (
        context.block.height < tick.arrival.block.height ||
        (context.block.height === tick.arrival.block.height && context.block.hash !== tick.arrival.block.hash)
      )
        return fail('stale');
      const { specVersion, transactionVersion } = context.codecBinding.runtimeVersion;
      if ((specVersion !== 130 && specVersion !== 131) || (transactionVersion !== 130 && transactionVersion !== 131))
        return fail('research');
      assertGoalQualificationRuntime(run.qualification, {
        specVersion,
        transactionVersion,
        metadataSha256: context.codecBinding.metadataSha256,
        codeHash: context.codeHash,
      });
      const mark = goalMarkFromExecutionContext(context);
      const accountingAtMs = deps.now();
      const decision = history
        ? evaluateGoalCompletedSignal({
            bot,
            binding: run.qualification.binding,
            history,
            receivedAtMs,
            now: accountingAtMs,
          })
        : undefined;
      const observation = {
        botId: bot.id,
        expected: expected(bot),
        accountingAtMs,
        mark,
        assertCurrent: () => {
          guard(run, bot, tick);
          run.reads!.assertCurrent(context);
        },
      };
      // Preserve the original provider identity and timestamp, even when it is newer than the callback.
      const next =
        decision?.kind === 'decision'
          ? await deps.storage.goals.recordSignal({
              ...observation,
              expectedCompletedAtMs: bot.goalSignal.completedAtMs,
              completedAtMs: decision.completedAtMs,
              strategyState: decision.state,
            })
          : await deps.storage.goals.observe(observation);
      if (next.status !== 'running' || next.exactGoalState.outcome !== 'active') {
        await stopRun(run);
        return 'complete' as const;
      }
      bot = next;
      guard(run, bot, tick);
      if (decision?.kind === 'decision' && decision.proposal.action !== 'hold') {
        await deps.live.execute(bot, decision.proposal);
        const settled = await get(run.id);
        if (settled.status !== 'running' || settled.exactGoalState.outcome !== 'active') {
          await stopRun(run);
          return 'complete' as const;
        }
        guard(run, settled, tick);
      }
      notify(run.id, true);
      return 'complete' as const;
    } catch (error) {
      await stopRun(run, error).catch(() => undefined);
      return 'missing-rpc-evidence' as const;
    }
  };
  const close = (id: string): Promise<GoalExecutionBot> => {
    const existing = closing.get(id);
    if (existing) return existing.promise;
    const controller = new AbortController();
    const work = async () => {
      if (disposed) return fail();
      const initial = await get(id);
      if (deps.now() < initial.exactGoalState.episode.endedAtMs) return fail('goalComplete');
      if (initial.goalTerminal) {
        assertGoalOrderAccounting(initial, (await deps.storage.listOrders(id)) as GoalExecutionOrder[]);
        return initial;
      }
      const generation = (generations.get(id) ?? 0) + 1;
      generations.set(id, generation);
      const run = runs.get(id);
      if (run) await stopRun(run);
      else if (stopping.has(id)) await stopping.get(id);
      else await deps.live.stop(id);
      const bot = await get(id),
        client = deps.client(),
        identity = goalConsentIdentity(bot);
      const isCurrent = () =>
        !disposed &&
        !controller.signal.aborted &&
        generations.get(id) === generation &&
        deps.client() === client &&
        client.isConnected &&
        client.genesisHash.toHex() === bot.network &&
        deps.isCurrent(bot) === true;
      if (!isCurrent()) return fail();
      const reads = createGoalExecutionSession({ client, now: deps.now, isCurrent });
      try {
        // A deadline usually precedes finalization of its successor. Wait for actual finalized
        // notifications for at most one minute; never replace the requested deadline with now.
        const terminalAbort = new AbortController();
        let waitingFailure: 'aborted' | 'not-finalized' | 'context-changed' = 'not-finalized';
        const abort = () => {
          waitingFailure = 'aborted';
          terminalAbort.abort();
        };
        const sourceChanged = () => {
          waitingFailure = 'context-changed';
          terminalAbort.abort();
        };
        const attached = new Set<'connected' | 'disconnected'>();
        controller.signal.addEventListener('abort', abort, { once: true });
        if (controller.signal.aborted) abort();
        const timeout = setTimeout(() => {
          waitingFailure = 'not-finalized';
          terminalAbort.abort();
        }, 60000);
        let head: { height: number; hash: string; parentHash: string } | undefined;
        let headGeneration = 0;
        let wake: (() => void) | undefined;
        let unsubscribe: (() => void) | undefined;
        let subscriptionClosed = false;
        const removeSubscription = () => {
          subscriptionClosed = true;
          try {
            unsubscribe?.();
          } catch {
            /* The shared connection remains owned by the app. */
          }
        };
        const onHead = (header: GoalLiveClockHeader) => {
          if (subscriptionClosed || terminalAbort.signal.aborted) return;
          try {
            if (!isCurrent()) return sourceChanged();
            const next = {
              height: header.number.toNumber(),
              hash: header.hash.toHex(),
              parentHash: header.parentHash.toHex(),
            };
            if (
              !Number.isSafeInteger(next.height) ||
              next.height < 0 ||
              !/^0x[0-9a-f]{64}$/.test(next.hash) ||
              !/^0x[0-9a-f]{64}$/.test(next.parentHash)
            )
              return sourceChanged();
            if (!head) {
              head = next;
              return; // The SDK's initial current-head callback is only a baseline.
            }
            if (next.height < head.height) return;
            if (next.height === head.height) {
              if (next.hash !== head.hash || next.parentHash !== head.parentHash) sourceChanged();
              return;
            }
            if (next.hash === head.hash || (next.height === head.height + 1 && next.parentHash !== head.hash))
              return sourceChanged();
            head = next;
            headGeneration++;
            wake?.();
          } catch {
            sourceChanged();
          }
        };
        const waitForHead = (afterGeneration: number) =>
          new Promise<void>((resolve, reject) => {
            const stop = (error?: unknown) => {
              terminalAbort.signal.removeEventListener('abort', aborted);
              wake = undefined;
              error ? reject(error) : resolve();
            };
            const aborted = () => stop(new GoalTerminalError(waitingFailure));
            wake = () => {
              if (headGeneration > afterGeneration) stop();
            };
            terminalAbort.signal.addEventListener('abort', aborted, { once: true });
            if (terminalAbort.signal.aborted) aborted();
            else wake();
          });
        let evidence: Awaited<ReturnType<typeof reads.captureTerminal>> | undefined;
        try {
          for (const event of ['connected', 'disconnected'] as const) {
            attached.add(event);
            client.on(event, sourceChanged);
          }
          void Promise.resolve(deps.subscribeFinalizedHeads(client, onHead)).then((remove) => {
            unsubscribe = remove;
            if (subscriptionClosed) removeSubscription();
          }, sourceChanged);
          for (let attempt = 0; attempt < 8 && !terminalAbort.signal.aborted; attempt++) {
            try {
              evidence = await reads.captureTerminal(
                {
                  goalId: bot.goalExecution.goalId,
                  deadlineAtMs: bot.exactGoalState.episode.endedAtMs,
                  minimumBlockNumber: bot.exactGoalState.lastMark.blockNumber,
                  minimumBlockHash: bot.exactGoalState.lastMark.blockHash,
                  minimumTimestampMs: bot.exactGoalState.lastMark.timestampMs,
                  expectedDenominator: bot.goalExecution.execution.expectedDenominator,
                },
                terminalAbort.signal
              );
              break;
            } catch (error) {
              if (!(error instanceof GoalTerminalError) || error.reason !== 'not-finalized' || attempt === 7)
                throw error;
              await waitForHead(headGeneration);
              if (!isCurrent()) return fail();
            }
          }
          if (!evidence) throw new GoalTerminalError(waitingFailure);
        } finally {
          removeSubscription();
          clearTimeout(timeout);
          controller.signal.removeEventListener('abort', abort);
          for (const event of attached) {
            try {
              client.off(event, sourceChanged);
            } catch {
              /* Locally revoked. */
            }
          }
        }
        if (!isCurrent()) return fail();
        // Discover only after the successor is finalized, so a delayed predeadline inclusion
        // can be retained before closure. The expired executor never applies a current mark.
        await deps.live.reconcile(await get(id));
        if (!isCurrent()) return fail();
        const currentBot = await get(id);
        if (!isCurrent() || goalConsentIdentity(currentBot) !== identity) return fail();
        reads.assertTerminal(evidence);
        const completed = await deps.storage.goals.terminal({ botId: id, expected: expected(currentBot), evidence });
        notify(id, false);
        return completed;
      } finally {
        reads.dispose();
      }
    };
    const promise = work().catch((error) => {
      notify(id, false, error);
      throw error;
    });
    closing.set(id, { controller, promise });
    void promise
      .finally(() => {
        if (closing.get(id)?.promise === promise) closing.delete(id);
      })
      .catch(() => undefined);
    return promise;
  };
  return {
    /** Read-only closure/retry after the original deadline; it never authorizes a signer or resolves unknown orders. */
    close,
    /** Explicit start/resume only. The original funded deadline and consumed hour remain unchanged. */
    async start(input: GoalExecutionBot, password?: string): Promise<void> {
      if (disposed) return fail();
      const bot = readGoalExecutionBot(input);
      const generation = (generations.get(bot.id) ?? 0) + 1;
      generations.set(bot.id, generation);
      const previous = runs.get(bot.id);
      if (previous) await stopRun(previous);
      else if (stopping.has(bot.id)) await stopping.get(bot.id);
      if (disposed || generations.get(bot.id) !== generation) return fail();
      const qualification = deps.qualification(bot);
      assertGoalQualificationVerification(qualification, bot);
      const run: Run = {
        id: bot.id,
        generation,
        bot,
        qualification,
        identity: goalConsentIdentity(bot),
        client: deps.client(),
        controller: new AbortController(),
      };
      runs.set(bot.id, run);
      try {
        if (!current(run)) return fail();
        await deps.live.reconcile(bot);
        if (!current(run)) return fail();
        const reconciled = await get(bot.id);
        if (!current(run) || goalConsentIdentity(reconciled) !== run.identity) return fail();
        await deps.live.authorize(reconciled, password);
        if (!current(run)) return fail();
        run.bot = await get(bot.id);
        guard(run, run.bot);
        run.reads = createGoalExecutionSession({
          client: run.client,
          now: deps.now,
          isCurrent: () => current(run),
        });
        run.clock = createGoalLiveClock({
          startedAtMs: deps.now(),
          deadlineAtMs: run.bot.exactGoalState.episode.endedAtMs,
          now: deps.now,
          isCurrent: () => current(run),
          signal: run.controller.signal,
          subscribeFinalizedHeads: (callback) => deps.subscribeFinalizedHeads(run.client, callback),
          onCheck: (tick, signal) => check(run, tick, signal),
          onStop: (stopped) => {
            const stoppedRun = stopRun(run);
            if (stopped.kind === 'expire') void stoppedRun.then(() => close(run.id)).catch(() => undefined);
            else void stoppedRun.catch(() => undefined);
          },
        });
        await run.clock.ready;
        if (!current(run)) return fail();
        notify(run.id, true);
      } catch (error) {
        await stopRun(run, error).catch(() => undefined);
        throw error;
      }
    },
    /** Synchronously invalidate all in-flight work before awaiting durable pause. */
    stop(id: string): Promise<void> {
      generations.set(id, (generations.get(id) ?? 0) + 1);
      closing.get(id)?.controller.abort();
      const run = runs.get(id);
      if (run) return stopRun(run);
      const pending = stopping.get(id);
      if (pending) return pending;
      const pause = deps.live.stop(id);
      stopping.set(id, pause);
      void pause
        .finally(() => {
          if (stopping.get(id) === pause) stopping.delete(id);
        })
        .catch(() => undefined);
      return pause;
    },
    active(id: string): boolean {
      return runs.has(id);
    },
    dispose(): void {
      disposed = true;
      for (const close of closing.values()) close.controller.abort();
      for (const run of [...runs.values()]) void stopRun(run).catch(() => undefined);
    },
  };
}
