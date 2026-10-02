// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createGoalTerminalProvider,
  assertGoalTerminalEvidence,
  GoalTerminalError,
} from '@/features/bot-trading/goal-terminal';
import { createHistoricalPoolFixture } from '../../../fixtures/bots/historical-pool';
import { createHistoricalExecutionPoolCodec } from '@/features/bot-trading/execution-codecs/pool';
import { createGoalRuntime, type GoalRuntimeDependencies } from '@/features/bot-trading/goal-runtime';
import { createGoalStorage, type GoalStorageLedger } from '@/features/bot-trading/goal-storage';
import { createGoalExecutionSession } from '@/features/agent-trading/goal-execution-session';
import type { GoalEnabledBotStorage } from '@/features/bot-trading/storage';
import type { GoalExecutionBot, GoalExecutionOrder } from '@/features/bot-trading/goal-execution-types';
import type { TradeProposal } from '@/features/bot-trading/types';
import type { GoalLiveClockHeader } from '@/features/bot-trading/goal-live-clock';
import type { GoalQualificationVerification } from '@/features/bot-trading/goal-qualification';
import type { ExecutionStateContext } from '@/features/bot-trading/execution-state';
import type { IndexedPoolHistoryWithEvidence } from '@/features/bot-trading/pool-history';
import {
  goalStorageBot,
  goalStorageOrder,
  goalStorageReceipt,
  goalInitializeInput,
  goalExpected,
  goalTestHash,
  goalTestMark,
} from './goal-storage-fixtures';

vi.unmock('@polkadot/util-crypto');
vi.mock('@/features/agent-trading/goal-execution-session', () => ({ createGoalExecutionSession: vi.fn() }));
vi.mock('@/features/bot-trading/goal-qualification', async (original) => ({
  ...(await original<object>()),
  assertGoalQualificationVerification: vi.fn(),
  assertGoalQualificationRuntime: vi.fn(),
}));
vi.mock('@/features/bot-trading/goal-policy', async (original) => ({
  ...(await original<object>()),
  goalMarkFromExecutionContext: (context: ExecutionStateContext & { testMark: unknown }) => context.testMark,
}));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
};
const flush = async () => {
  for (let i = 0; i < 50; i++) await Promise.resolve();
};
const active: Array<ReturnType<typeof createGoalRuntime>> = [];
afterEach(async () => {
  active.splice(0).forEach((runtime) => runtime.dispose());
  await flush();
  vi.useRealTimers();
  vi.clearAllMocks();
});

/** Real exact storage, ledger, strategy evaluation and callback clock; only external authority/I/O is mocked. */
async function setup(immediateHead = false) {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  let ledger: GoalStorageLedger = { bots: [], orders: [] };
  const goals = createGoalStorage(async (write, action) => {
    const next = clone(ledger);
    const result = action(next);
    if (write) ledger = next;
    return result;
  }, Date.now);
  const seed = goalStorageBot();
  seed.strategy.intervalMs = 3_600_000;
  seed.strategy.amount = '3';
  await goals.initialize({ ...goalInitializeInput(seed), assertCurrent: () => undefined });
  vi.setSystemTime(3_601_000);
  const get = () => clone(ledger.bots[0]) as GoalExecutionBot;
  const storage = {
    goals,
    listBots: async () => clone(ledger.bots),
    listOrders: async () => clone(ledger.orders),
  } as unknown as GoalEnabledBotStorage;
  let callback: ((header: GoalLiveClockHeader) => void) | undefined;
  let height = 200;
  let appCurrent = true;
  const history: IndexedPoolHistoryWithEvidence = {
    history: {
      candles: [{ timestamp: 3_600_000, close: '1', feeClose: '1' }],
      missing: 0,
      identity: { genesisHash: seed.network, denominator: '1' },
      denominationVerified: true,
    },
    boundaries: [
      {
        kind: 'indexed-finalized-hour-boundary',
        completedAtMs: 3_600_000,
        genesisHash: seed.network,
        denominator: '1',
        arrivalTimeKnown: false,
        closing: { height: 180, hash: goalTestHash(180), timestampSeconds: 3594 },
        successor: { height: 181, hash: goalTestHash(181), timestampSeconds: 3600 },
      },
    ],
  };
  const qualification = {
    binding: {
      genesisHash: seed.network,
      denominator: '1',
      initialKusdCodec: seed.exactGoalState.initial.kusdCodec,
      maxTradeKusdCodec: seed.exactGoalState.limits.kusdCodec,
      maxTradeXorCodec: seed.exactGoalState.limits.xorCodec,
      strategy: seed.strategy,
    },
  } as GoalQualificationVerification;
  const client = {
    isConnected: true,
    genesisHash: { toHex: () => seed.network },
    on: vi.fn(),
    off: vi.fn(),
  } as unknown as ReturnType<GoalRuntimeDependencies['client']>;
  const capture = vi.fn(
    async () =>
      ({
        testMark: goalTestMark(height, Date.now()),
        block: { height, hash: goalTestHash(height) },
        codecBinding: { runtimeVersion: { specVersion: 130, transactionVersion: 130 }, metadataSha256: '1'.repeat(64) },
        codeHash: goalTestHash(99),
      }) as unknown as ExecutionStateContext
  );
  const readsDispose = vi.fn();
  const terminalFixture = createHistoricalPoolFixture();
  const terminalKeys = createHistoricalExecutionPoolCodec(terminalFixture.identity).storageKeys();
  const terminalEpoch = {};
  const terminalProvider = createGoalTerminalProvider({
    now: Date.now,
    connection: () => ({ identity: terminalEpoch, connected: appCurrent }),
    request: async (method, params) => {
      const h = method === 'chain_getBlockHash' ? Number(params[0]) : Number(BigInt(String(params.at(-1) ?? 0)));
      switch (method) {
        case 'chain_getBlockHash':
          return h === 0 ? seed.network : goalTestHash(h);
        case 'chain_getFinalizedHead':
          return goalTestHash(14503);
        case 'chain_getHeader':
          return {
            number: `0x${h.toString(16)}`,
            parentHash: goalTestHash(h - 1),
            stateRoot: goalTestHash(9),
            extrinsicsRoot: goalTestHash(8),
            digest: { logs: [] },
          };
        case 'state_getRuntimeVersion':
          return { specName: 'sora-substrate', specVersion: 130, transactionVersion: 130 };
        case 'state_getMetadata':
          return terminalFixture.identity.metadataHex;
        case 'state_getStorageHash':
          return goalTestHash(900);
        case 'state_queryStorageAt': {
          const timestamp = Buffer.alloc(8);
          timestamp.writeBigUInt64LE(BigInt(1000000 + (h - 100) * 6000));
          const proof = { ...terminalFixture.proof, timestamp: `0x${timestamp.toString('hex')}` };
          return [
            {
              block: params[1],
              changes: Object.entries(terminalKeys).map(([label, key]) => [key, proof[label as keyof typeof proof]]),
            },
          ];
        }
        default:
          throw Error('unexpected terminal fixture method');
      }
    },
  });
  const captureTerminal = vi.fn(terminalProvider.capture);
  vi.mocked(createGoalExecutionSession).mockImplementation((options) => {
    let disposed = false;
    const owned = new WeakSet<object>();
    const assertCurrent = (context: object) => {
      if (disposed || !options.isCurrent() || !owned.has(context)) throw Error('stale owned context');
    };
    return {
      captureTerminal: async (input: Parameters<typeof terminalProvider.capture>[0], signal?: AbortSignal) => {
        if (disposed || !options.isCurrent()) throw Error('stale terminal reader');
        return captureTerminal(input, signal);
      },
      assertTerminal: assertGoalTerminalEvidence,
      capture: async () => {
        const context = await capture();
        owned.add(context);
        return context;
      },
      assertCurrent,
      dispose: () => {
        disposed = true;
        readsDispose();
      },
    } as unknown as ReturnType<typeof createGoalExecutionSession>;
  });
  const live = {
    previewAllocation: vi.fn(),
    authorize: vi.fn(async () => {
      const bot = get();
      await goals.resume({
        botId: bot.id,
        expected: goalExpected(bot),
        balances: bot.portfolio.holdings,
        sessionExpiresAt: bot.exactGoalState.episode.endedAtMs,
        assertCurrent: () => undefined,
      });
    }),
    execute: vi.fn(async (_bot: GoalExecutionBot, _proposal: TradeProposal): Promise<void> => undefined),
    reconcile: vi.fn(async () => undefined),
    stop: vi.fn(async () => {
      const bot = get();
      await goals.pause({
        botId: bot.id,
        expected: { goalId: bot.goalExecution.goalId, controlRevision: bot.goalControl.revision },
      });
    }),
    dispose: vi.fn(),
  };
  const unsubscribe = vi.fn();
  const deps: GoalRuntimeDependencies = {
    storage,
    live,
    qualification: () => qualification,
    client: () => client,
    isCurrent: () => appCurrent,
    history: vi.fn(async () => clone(history)),
    now: Date.now,
    subscribeFinalizedHeads: vi.fn(async (_client, onHead) => {
      callback = onHead;
      if (immediateHead)
        onHead({
          number: { toNumber: () => height },
          hash: { toHex: () => goalTestHash(height) },
          parentHash: { toHex: () => goalTestHash(height - 1) },
        });
      return unsubscribe;
    }),
    onChange: vi.fn(),
  };
  const make = () => {
    const runtime = createGoalRuntime(deps);
    active.push(runtime);
    return runtime;
  };
  const runtime = make();
  return {
    deps,
    goals,
    orders: () => clone(ledger.orders),
    seedOrder: (order: ReturnType<typeof goalStorageOrder>) => ledger.orders.push(clone(order)),
    runtime,
    make,
    get,
    live,
    history,
    capture,
    captureTerminal,
    readsDispose,
    unsubscribe,
    context: (value: boolean) => {
      appCurrent = value;
    },
    emit: (block = ++height) => {
      height = block;
      callback?.({
        number: { toNumber: () => block },
        hash: { toHex: () => goalTestHash(block) },
        parentHash: { toHex: () => goalTestHash(block - 1) },
      });
    },
  };
}

describe('authorized goal runtime integration', () => {
  it('revokes signing at expiry before canonical original-deadline accounting, without reauthorizing or trading', async () => {
    const h = await setup();
    await h.runtime.start(h.get());
    const calls: string[] = [];
    const originalStop = h.live.stop.getMockImplementation()!;
    h.live.stop.mockImplementation(async () => {
      calls.push('stop');
      await originalStop();
    });
    const capture = h.captureTerminal.getMockImplementation()!;
    h.captureTerminal.mockImplementation(async (...args) => {
      calls.push('terminal');
      return capture(...args);
    });
    vi.setSystemTime(h.get().exactGoalState.episode.endedAtMs + 18000);
    h.emit();
    // Await the same in-flight closure initiated by the expiry notification.
    await flush();
    const completed = await h.runtime.close(h.get().id);
    expect(calls[0]).toBe('stop');
    expect(calls).toContain('terminal');
    expect(completed.exactGoalState.accountingAtMs).toBe(completed.exactGoalState.episode.endedAtMs);
    expect(completed.goalTerminal).toBeDefined();
    expect(h.runtime.active(completed.id)).toBe(false);
    expect(h.live.authorize).toHaveBeenCalledTimes(1);
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.live.reconcile).toHaveBeenCalledTimes(2);
  });
  it('ignores immediate and repeated current heads until a genuinely newer finalized head arrives', async () => {
    const h = await setup(true);
    const capture = h.captureTerminal.getMockImplementation()!;
    h.captureTerminal.mockRejectedValueOnce(new GoalTerminalError('not-finalized'));
    h.captureTerminal.mockImplementation(capture);
    vi.setSystemTime(h.get().exactGoalState.episode.endedAtMs + 18000);
    const closing = h.runtime.close(h.get().id);
    await flush();
    expect(h.captureTerminal).toHaveBeenCalledTimes(1);
    for (let repeat = 0; repeat < 20; repeat++) h.emit(200);
    await flush();
    expect(h.captureTerminal).toHaveBeenCalledTimes(1);
    expect(h.deps.subscribeFinalizedHeads).toHaveBeenCalledTimes(1);
    h.emit(14503);
    const closed = await closing;
    expect(h.captureTerminal).toHaveBeenCalledTimes(2);
    expect(closed.exactGoalState.accountingAtMs).toBe(closed.exactGoalState.episode.endedAtMs);
    expect(h.live.authorize).not.toHaveBeenCalled();
    expect(h.unsubscribe).toHaveBeenCalled();
  });
  it('reconciles a delayed predeadline receipt after finality and accounts its real effects once', async () => {
    const h = await setup(true),
      order = goalStorageOrder(h.get());
    h.seedOrder(order);
    await h.goals.sign({
      orderId: order.id,
      expectedOrderRevision: 0,
      txHash: goalTestHash(500),
      signedAtBlock: 100,
      envelopeDigest: order.goalExecution.envelopeDigest,
      signedEnvelopeDigest: 'a'.repeat(64),
    });
    h.live.reconcile.mockImplementation(async () => {
      expect(h.captureTerminal).toHaveBeenCalledTimes(2);
      await h.goals.persistFinalReceipt({
        orderId: order.id,
        receipt: {
          ...goalStorageReceipt(order),
          txHash: goalTestHash(500),
          actualFeeCodec: '20000000000000000',
        },
      });
    });
    h.captureTerminal.mockRejectedValueOnce(new GoalTerminalError('not-finalized'));
    vi.setSystemTime(h.get().exactGoalState.episode.endedAtMs + 18000);
    const closing = h.runtime.close(h.get().id);
    await flush();
    expect(h.live.reconcile).not.toHaveBeenCalled();
    h.emit(14503);
    const out = await closing;
    expect(out.exactGoalState.accountingAtMs).toBe(out.exactGoalState.episode.endedAtMs);
    expect(out.exactGoalState.trades).toBe(1);
    expect(out.exactGoalState.feesPaidCodec).toBe('20000000000000000');
    expect(out.exactGoalState.holdings).toEqual({ kusdCodec: '8000000000000000000', xorCodec: '2980000000000000000' });
    expect(h.orders()[0].status).toBe('confirmed');
    expect(h.live.authorize).not.toHaveBeenCalled();
    expect(h.live.execute).not.toHaveBeenCalled();
  });
  it('settles actual postdeadline inclusion and verifies complete orders on a closed-goal retry', async () => {
    const h = await setup(),
      order = goalStorageOrder(h.get());
    h.seedOrder(order);
    await h.goals.sign({
      orderId: order.id,
      expectedOrderRevision: 0,
      txHash: goalTestHash(500),
      signedAtBlock: 100,
      envelopeDigest: order.goalExecution.envelopeDigest,
      signedEnvelopeDigest: 'a'.repeat(64),
    });
    h.live.reconcile.mockImplementation(async () => {
      await h.goals.persistFinalReceipt({
        orderId: order.id,
        receipt: {
          ...goalStorageReceipt(order),
          txHash: goalTestHash(500),
          blockNumber: 14501,
          blockHash: goalTestHash(14501),
          actualFeeCodec: '20000000000000000',
        },
      });
    });
    vi.setSystemTime(h.get().exactGoalState.episode.endedAtMs + 18000);
    const out = await h.runtime.close(h.get().id);
    expect(out.exactGoalState.trades).toBe(0);
    expect(out.exactGoalState.feesPaidCodec).toBe('0');
    expect(out.goalPostDeadline?.tradesAfterDeadline).toBe(1);
    expect(out.goalPostDeadline?.feesPaidAfterDeadlineCodec).toBe('20000000000000000');
    expect(out.goalPostDeadline?.holdings).toEqual({
      kusdCodec: '8000000000000000000',
      xorCodec: '2980000000000000000',
    });
    expect((h.orders()[0] as GoalExecutionOrder).goalExecution.phase).toBe('accounted-after-deadline');
    expect(await h.runtime.close(out.id)).toEqual(out);
    expect(h.captureTerminal).toHaveBeenCalledTimes(1);
    expect(h.live.reconcile).toHaveBeenCalledTimes(1);
    h.deps.storage.listOrders = async () => [];
    await expect(h.runtime.close(out.id)).rejects.toThrow('bots.errors.receipt');
    expect(h.get()).toEqual(out);
    expect(h.live.authorize).not.toHaveBeenCalled();
    expect(h.live.execute).not.toHaveBeenCalled();
  });
  it('bounds missing finality without closing or restarting the signer', async () => {
    const h = await setup();
    h.captureTerminal.mockRejectedValue(new GoalTerminalError('not-finalized'));
    vi.setSystemTime(h.get().exactGoalState.episode.endedAtMs + 18000);
    const closing = h.runtime.close(h.get().id);
    const rejected = expect(closing).rejects.toThrow('not-finalized');
    await flush();
    await vi.advanceTimersByTimeAsync(60000);
    await rejected;
    expect(h.get().goalTerminal).toBeUndefined();
    expect(h.live.authorize).not.toHaveBeenCalled();
    expect(h.unsubscribe).toHaveBeenCalled();
  });
  it('aborts terminal finality waiting on a connection event and removes its listeners', async () => {
    const h = await setup();
    h.captureTerminal.mockRejectedValue(new GoalTerminalError('not-finalized'));
    vi.setSystemTime(h.get().exactGoalState.episode.endedAtMs + 18000);
    const closing = h.runtime.close(h.get().id);
    const rejected = expect(closing).rejects.toThrow('context-changed');
    await flush();
    const client = h.deps.client();
    const entry = vi.mocked(client.on).mock.calls.find(([event]) => event === 'disconnected');
    expect(entry).toBeDefined();
    entry![1]();
    await rejected;
    expect(h.get().goalTerminal).toBeUndefined();
    expect(client.off).toHaveBeenCalledWith('disconnected', entry![1]);
    expect(h.unsubscribe).toHaveBeenCalled();
  });
  it('aborts terminal finality waiting when the runtime is disposed', async () => {
    const h = await setup();
    h.captureTerminal.mockRejectedValue(new GoalTerminalError('not-finalized'));
    vi.setSystemTime(h.get().exactGoalState.episode.endedAtMs + 18000);
    const closing = h.runtime.close(h.get().id);
    const rejected = expect(closing).rejects.toThrow('aborted');
    await flush();
    h.runtime.dispose();
    await rejected;
    expect(h.get().goalTerminal).toBeUndefined();
    expect(h.unsubscribe).toHaveBeenCalled();
    expect(h.live.authorize).not.toHaveBeenCalled();
  });
  it('refuses premature closure without creating a terminal reader', async () => {
    const h = await setup();
    await expect(h.runtime.close(h.get().id)).rejects.toThrow('bots.errors.goalComplete');
    expect(h.captureTerminal).not.toHaveBeenCalled();
    expect(h.live.authorize).not.toHaveBeenCalled();
  });

  it('keeps valuing while the current hourly close is being published, then consumes it once', async () => {
    const h = await setup();
    vi.setSystemTime(7_201_000);
    await h.runtime.start(h.get());
    h.emit(201);
    await flush();
    expect(h.runtime.active(h.get().id)).toBe(true);
    expect(h.get().exactGoalState.lastMark.blockNumber).toBe(201);
    expect(h.get().goalSignal.completedAtMs).toBeNull();
    expect(h.get().state.lastEvaluatedAt).toBe(0);
    expect(h.live.execute).not.toHaveBeenCalled();
    const priorRevision = h.get().exactGoalState.revision;
    h.history.history.candles.push({ timestamp: 7_200_000, close: '1', feeClose: '1' });
    (h.history.boundaries as Array<(typeof h.history.boundaries)[number]>).push({
      ...h.history.boundaries[0],
      completedAtMs: 7_200_000,
      closing: { height: 190, hash: goalTestHash(190), timestampSeconds: 7194 },
      successor: { height: 191, hash: goalTestHash(191), timestampSeconds: 7200 },
    });
    await vi.advanceTimersByTimeAsync(60_000);
    h.emit(202);
    await flush();
    expect(h.deps.history).toHaveBeenCalledTimes(2);
    expect(h.get().exactGoalState.revision).toBeGreaterThan(priorRevision);
    expect(h.get().goalSignal.completedAtMs).toBe(7_200_000);
    expect(h.live.execute).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    h.emit(203);
    await flush();
    expect(h.deps.history).toHaveBeenCalledTimes(2);
    expect(h.live.execute).toHaveBeenCalledTimes(1);
  });

  it('commits a completed-hour signal and exact provider mark before executing its fixed lot', async () => {
    const h = await setup();
    await h.runtime.start(h.get());
    h.live.execute.mockImplementationOnce(async (bot) => {
      expect(h.get().goalSignal.completedAtMs).toBe(3_600_000);
      expect(bot).toEqual(h.get());
      expect(h.get().exactGoalState.lastMark.blockNumber).toBe(201);
    });
    h.emit(201);
    await flush();
    expect(vi.mocked(h.deps.onChange!).mock.calls.flatMap((call) => (call[2] ? [call[2]] : []))).toEqual([]);
    expect(h.live.execute).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: 'buy', amount: '3' })
    );
    expect(h.get().state.lastEvaluatedAt).toBe(3_601_000);
    expect(h.runtime.active(h.get().id)).toBe(true);
  });

  it('values the next minute without querying or consuming the completed hour twice', async () => {
    const h = await setup();
    await h.runtime.start(h.get());
    h.emit(201);
    await flush();
    const previous = h.get().exactGoalState.revision;
    await vi.advanceTimersByTimeAsync(60_000);
    h.emit(202);
    await flush();
    expect(h.deps.history).toHaveBeenCalledTimes(1);
    expect(h.live.execute).toHaveBeenCalledTimes(1);
    expect(h.get().exactGoalState.revision).toBeGreaterThan(previous);
    expect(h.get().goalSignal.completedAtMs).toBe(3_600_000);
  });

  it('retains a newer provider block instead of labeling it with the scheduling callback', async () => {
    const h = await setup();
    const context = await h.capture();
    h.capture.mockResolvedValueOnce({
      ...context,
      block: { ...context.block, height: 999, hash: goalTestHash(999) },
      testMark: goalTestMark(999, Date.now()),
    } as ExecutionStateContext);
    await h.runtime.start(h.get());
    h.emit(201);
    await flush();
    expect(h.get().exactGoalState.lastMark.blockNumber).toBe(999);
    expect(h.get().exactGoalState.lastMark.blockHash).toBe(goalTestHash(999));
    expect(h.live.execute).toHaveBeenCalledTimes(1);
  });

  it('rejects a provider state older than the finalized scheduling callback', async () => {
    const h = await setup();
    const context = await h.capture();
    h.capture.mockResolvedValueOnce(context);
    await h.runtime.start(h.get());
    h.emit(201);
    await flush();
    expect(h.get().goalSignal.completedAtMs).toBeNull();
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.get().status).toBe('paused');
  });

  it('persists a target observation before revoking and does not execute its new signal', async () => {
    const h = await setup();
    const context = await h.capture();
    const mark = { ...goalTestMark(201, Date.now()), xorReserveCodec: '120000000000000000000' };
    h.capture.mockResolvedValueOnce({
      ...context,
      block: { ...context.block, height: 201, hash: goalTestHash(201) },
      testMark: mark,
    } as ExecutionStateContext);
    await h.runtime.start(h.get());
    h.emit(201);
    await flush();
    expect(h.get().exactGoalState.outcome).toBe('target');
    expect(h.get().goalSignal.completedAtMs).toBe(3_600_000);
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.runtime.active(h.get().id)).toBe(false);
  });

  it('retains the consumed hour across an explicitly authorized new runtime', async () => {
    const h = await setup();
    await h.runtime.start(h.get());
    h.emit(201);
    await flush();
    await h.runtime.stop(h.get().id);
    const next = h.make();
    expect(h.live.authorize).toHaveBeenCalledTimes(1);
    await next.start(h.get());
    h.emit(202);
    await flush();
    expect(h.live.execute).toHaveBeenCalledTimes(1);
    expect(h.deps.history).toHaveBeenCalledTimes(1);
    expect(h.get().exactGoalState.episode.startedAtMs).toBe(1_000_000);
  });

  it('does not consume stale indexed history or execute a fallback', async () => {
    const h = await setup();
    vi.mocked(h.deps.history).mockResolvedValueOnce({ ...h.history, history: { ...h.history.history, candles: [] } });
    await h.runtime.start(h.get());
    h.emit(201);
    await flush();
    expect(h.get().goalSignal.completedAtMs).toBeNull();
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.runtime.active(h.get().id)).toBe(false);
    expect(h.get().status).toBe('paused');
  });

  it('keeps a rejected trade hour consumed and revokes signing', async () => {
    const h = await setup();
    h.live.execute.mockRejectedValueOnce(Error('bots.errors.policy'));
    await h.runtime.start(h.get());
    h.emit(201);
    await flush();
    expect(h.get().goalSignal.completedAtMs).toBe(3_600_000);
    expect(h.get().status).toBe('paused');
    await h.runtime.start(h.get());
    h.emit(202);
    await flush();
    expect(h.live.execute).toHaveBeenCalledTimes(1);
  });

  it('aborts pending history on Stop and rejects its late response before capture or consumption', async () => {
    const h = await setup();
    const pending = deferred<IndexedPoolHistoryWithEvidence>();
    vi.mocked(h.deps.history).mockReturnValueOnce(pending.promise);
    await h.runtime.start(h.get());
    h.emit(201);
    await flush();
    const signal = vi.mocked(h.deps.history).mock.calls[0][1];
    await h.runtime.stop(h.get().id);
    expect(signal.aborted).toBe(true);
    pending.resolve(h.history);
    await flush();
    expect(h.capture).not.toHaveBeenCalled();
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.get().goalSignal.completedAtMs).toBeNull();
  });

  it('fences replacement Start during an unfinished durable Stop', async () => {
    const h = await setup();
    await h.runtime.start(h.get());
    const paused = deferred<void>();
    h.live.stop.mockImplementationOnce(() => paused.promise);
    const restart = h.runtime.start(h.get());
    const rejected = expect(restart).rejects.toThrow('bots.errors.session');
    await flush();
    const stop = h.runtime.stop(h.get().id);
    paused.resolve();
    await stop;
    await rejected;
    expect(h.live.authorize).toHaveBeenCalledTimes(1);
    expect(h.runtime.active(h.get().id)).toBe(false);
  });

  it('waits for an earlier pause before a new Start can authorize', async () => {
    const h = await setup();
    await h.runtime.start(h.get());
    const paused = deferred<void>();
    h.live.stop.mockImplementationOnce(() => paused.promise);
    const stop = h.runtime.stop(h.get().id);
    const restart = h.runtime.start(h.get());
    await flush();
    expect(h.live.authorize).toHaveBeenCalledTimes(1);
    paused.resolve();
    await stop;
    await restart;
    expect(h.live.authorize).toHaveBeenCalledTimes(2);
  });

  it('allows only the latest concurrent replacement to authorize', async () => {
    const h = await setup();
    await h.runtime.start(h.get());
    const paused = deferred<void>();
    h.live.stop.mockImplementationOnce(() => paused.promise);
    const first = h.runtime.start(h.get());
    const rejected = expect(first).rejects.toThrow('bots.errors.session');
    const second = h.runtime.start(h.get());
    paused.resolve();
    await rejected;
    await second;
    expect(h.live.authorize).toHaveBeenCalledTimes(2);
    expect(h.runtime.active(h.get().id)).toBe(true);
  });

  it('revokes on a scheduler gap without fabricating observations', async () => {
    const h = await setup();
    await h.runtime.start(h.get());
    await vi.advanceTimersByTimeAsync(61_000);
    await flush();
    expect(h.get().status).toBe('paused');
    expect(h.capture).not.toHaveBeenCalled();
    expect(h.live.execute).not.toHaveBeenCalled();
  });

  it('does not turn a changed application context back into a live session', async () => {
    const h = await setup();
    await h.runtime.start(h.get());
    h.context(false);
    h.emit(201);
    await flush();
    h.context(true);
    h.emit(202);
    await flush();
    expect(h.live.execute).not.toHaveBeenCalled();
    expect(h.runtime.active(h.get().id)).toBe(false);
  });
});
