import { describe, expect, it, vi } from 'vitest';
import {
  createGoalStorage,
  readGoalExecutionBot,
  readGoalExecutionBinding,
  assertLegacyGoalRecords,
  assertGoalAccountClear,
  type GoalStorageLedger,
} from '@/features/bot-trading/goal-storage';
import { reserveOrder, settleOrder, recordGoalProgress } from '@/features/bot-trading/storage';
import type { GoalExecutionBot, GoalExecutionOrder } from '@/features/bot-trading/goal-execution-types';
import { GOAL_EXACT_XOR as XOR } from '@/features/bot-trading/goal-exact-ledger';
import {
  goalStorageBot,
  goalStorageOrder,
  goalStorageReceipt,
  goalExpected,
  goalAccountingExpected,
  goalControlExpected,
  goalInitializeInput,
  goalTestMark,
  goalTestHash,
  goalTestSha,
  goalTestCodec,
  GOAL_TEST_START,
} from './goal-storage-fixtures';
vi.unmock('@polkadot/util-crypto');
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const guard = () => undefined;

/** One current completed-hour observation, without an inferred order or trade. */
function signalInput(bot: GoalExecutionBot, at = GOAL_TEST_START, block = 100) {
  return {
    botId: bot.id,
    expected: goalExpected(bot),
    expectedCompletedAtMs: bot.goalSignal.completedAtMs,
    accountingAtMs: at,
    mark: goalTestMark(block, at),
    completedAtMs: Math.floor(at / 3_600_000) * 3_600_000,
    strategyState: { ...bot.state, lastEvaluatedAt: at },
    assertCurrent: guard,
  };
}
function setup() {
  let ledger: GoalStorageLedger = { bots: [], orders: [] };
  let now = GOAL_TEST_START;
  const api = createGoalStorage(
    async (write, action) => {
      const next = clone(ledger);
      const result = action(next);
      if (write) ledger = next;
      return result;
    },
    () => now
  );
  return {
    api,
    read: () => clone(ledger),
    seed: (v: GoalStorageLedger) => {
      ledger = clone(v);
    },
    time: (n: number) => {
      now = n;
    },
  };
}
async function initialized(s = setup()) {
  const bot = await s.api.initialize({ ...goalInitializeInput(), assertCurrent: guard });
  return { s, bot };
}
async function running() {
  const { s, bot } = await initialized();
  const active = await s.api.resume({
    botId: bot.id,
    expected: goalExpected(bot),
    sessionExpiresAt: bot.exactGoalState.episode.endedAtMs,
    balances: bot.portfolio.holdings,
    assertCurrent: guard,
  });
  return { s, bot: active };
}
async function signed() {
  const { s, bot } = await running();
  const order = goalStorageOrder(bot);
  await s.api.reserve({
    botId: bot.id,
    expected: goalExpected(bot),
    accountingAtMs: GOAL_TEST_START,
    mark: goalTestMark(),
    order,
    balances: bot.portfolio.holdings,
    assertCurrent: guard,
  });
  const recorded = await s.api.sign({
    orderId: order.id,
    expectedOrderRevision: 0,
    txHash: goalTestHash(999),
    signedAtBlock: 100,
    envelopeDigest: order.goalExecution.envelopeDigest,
    signedEnvelopeDigest: goalTestSha(8),
  });
  return { s, bot, order: recorded };
}
describe('exact goal storage reducers', () => {
  it('creates the funding baseline inside the transaction, starts paused and never accepts an old supplied state', async () => {
    const { s, bot } = await initialized();
    expect(bot.status).toBe('paused');
    expect(bot.exactGoalState.episode.startedAtMs).toBe(GOAL_TEST_START);
    expect(s.read().bots).toEqual([bot]);
    expect(() => readGoalExecutionBot(bot)).not.toThrow();
    await expect(s.api.initialize({ ...goalInitializeInput(), assertCurrent: guard })).rejects.toThrow();
    const other = goalInitializeInput(goalStorageBot('new-id'));
    other.bot.goalExecution.goalId = bot.goalExecution.goalId;
    other.config.goalId = bot.goalExecution.goalId;
    await expect(s.api.initialize({ ...other, assertCurrent: guard })).rejects.toThrow();
    const fresh = setup();
    await expect(
      fresh.api.initialize({ ...goalInitializeInput(), bot: goalStorageBot(), assertCurrent: guard })
    ).rejects.toThrow();
    expect(fresh.read().bots).toEqual([]);
  });
  it('rejects async and thenable ownership hooks without committing or leaking rejected promises', async () => {
    const s = setup();
    const hooks = [
      async () => {
        throw Error('late failure');
      },
      () => ({ then: (_resolve: unknown, reject: (error: Error) => void) => reject(Error('thenable failure')) }),
      () =>
        Object.defineProperty({}, 'then', {
          get: () => {
            throw Error('hostile then');
          },
        }),
    ];
    for (const hook of hooks) {
      await expect(s.api.initialize({ ...goalInitializeInput(), assertCurrent: hook })).rejects.toThrow(
        'bots.errors.stale'
      );
      expect(s.read().bots).toEqual([]);
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  it('requires bounded fixed policy and exact portfolio mirrors without authenticating binding digests', () => {
    const bot = goalStorageBot();
    expect(readGoalExecutionBinding(bot.goalExecution)).toEqual(bot.goalExecution);
    expect(() => readGoalExecutionBot({ ...bot, goalState: undefined })).toThrow();
    expect(() => readGoalExecutionBot({ ...bot, policy: { ...bot.policy, maxPriceImpactPercent: '2' } })).toThrow();
    expect(() => readGoalExecutionBot({ ...bot, portfolio: { ...bot.portfolio, feesPaidCodec: '1' } })).toThrow();
    expect(() => readGoalExecutionBot({ ...bot, status: 'stopped' })).toThrow();
    expect(() => readGoalExecutionBot({ ...bot, status: 'idle' })).toThrow();
    expect(() => readGoalExecutionBinding({ ...bot.goalExecution, qualified: true })).toThrow();
  });
  it.each([undefined, null, {}, { protocol: 'unknown' }])('rejects every present marker including %j', (marker) => {
    expect(() => assertLegacyGoalRecords({ goalExecution: marker })).toThrow('bots.errors.policy');
    expect(() => assertLegacyGoalRecords({ exactGoalState: marker })).toThrow();
    expect(() => assertLegacyGoalRecords({ goalControl: marker })).toThrow();
    expect(() => assertLegacyGoalRecords({ goalSignal: marker })).toThrow();
  });
  it('protects legacy pure reserve/settle/progress from a stripped incoming marker', () => {
    const bot = goalStorageBot();
    const order = goalStorageOrder(bot);
    const { goalExecution: _, ...stripped } = order;
    const ledger = { bots: [bot], orders: [order] };
    expect(() => reserveOrder(ledger, stripped, bot.portfolio.holdings)).toThrow('bots.errors.policy');
    expect(() =>
      settleOrder(ledger, order.id, { success: true, outputCodec: goalTestCodec(2), actualFeeCodec: '1' })
    ).toThrow('bots.errors.policy');
    expect(() =>
      recordGoalProgress(ledger, bot.id, bot.goal!, {
        startedAt: 0,
        baselineValue: '1',
        lastValue: '1',
        returnPercent: '0',
        outcome: 'active',
      })
    ).toThrow('bots.errors.policy');
  });
  it('checks synchronous ownership before and after work, rolling the transaction back on the second failure', async () => {
    const s = setup();
    let checks = 0;
    await expect(
      s.api.initialize({
        ...goalInitializeInput(),
        assertCurrent: () => {
          if (++checks === 2) throw Error('stale');
        },
      })
    ).rejects.toThrow('stale');
    expect(s.read().bots).toEqual([]);
    await expect(
      s.api.initialize({ ...goalInitializeInput(), assertCurrent: async () => undefined })
    ).rejects.toThrow();
    expect(s.read().bots).toEqual([]);
  });
  it('resumes without reinitializing the epoch or performance, and rejects stale CAS', async () => {
    const { s, bot } = await initialized();
    s.time(GOAL_TEST_START + 6000);
    const observed = await s.api.observe({
      botId: bot.id,
      expected: goalExpected(bot),
      accountingAtMs: GOAL_TEST_START + 6000,
      mark: goalTestMark(101, GOAL_TEST_START + 6000),
      assertCurrent: guard,
    });
    await expect(
      s.api.resume({
        botId: bot.id,
        expected: goalExpected(bot),
        sessionExpiresAt: bot.exactGoalState.episode.endedAtMs,
        balances: bot.portfolio.holdings,
        assertCurrent: guard,
      })
    ).rejects.toThrow();
    const result = await s.api.resume({
      botId: bot.id,
      expected: goalExpected(observed),
      sessionExpiresAt: bot.exactGoalState.episode.endedAtMs,
      balances: bot.portfolio.holdings,
      assertCurrent: guard,
    });
    expect(result.exactGoalState).toEqual(observed.exactGoalState);
    expect(result.status).toBe('running');
  });
  it('fences stale resume while allowing pause after accounting advanced independently', async () => {
    const { s, bot } = await running();
    s.time(GOAL_TEST_START + 6000);
    const observed = await s.api.observe({
      botId: bot.id,
      expected: goalExpected(bot),
      accountingAtMs: GOAL_TEST_START + 6000,
      mark: goalTestMark(101, GOAL_TEST_START + 6000),
      assertCurrent: guard,
    });
    const paused = await s.api.pause({ botId: bot.id, expected: goalControlExpected(bot) });
    expect(paused.exactGoalState).toEqual(observed.exactGoalState);
    expect(paused.goalControl.revision).toBe(bot.goalControl.revision + 1);
    await expect(
      s.api.resume({
        botId: bot.id,
        expected: goalExpected(observed),
        sessionExpiresAt: bot.sessionExpiresAt,
        balances: bot.portfolio.holdings,
        assertCurrent: guard,
      })
    ).rejects.toThrow('bots.errors.stale');
    const resumed = await s.api.resume({
      botId: bot.id,
      expected: goalExpected(paused),
      sessionExpiresAt: bot.sessionExpiresAt,
      balances: bot.portfolio.holdings,
      assertCurrent: guard,
    });
    expect(resumed.goalControl.revision).toBe(bot.goalControl.revision + 2);
    await expect(s.api.pause({ botId: bot.id, expected: goalControlExpected(bot) })).rejects.toThrow(
      'bots.errors.stale'
    );
  });
  it('makes signed-to-submitted an atomic revocation gate but retains signed facts after pause', async () => {
    const { s, bot, order } = await signed();
    const paused = await s.api.pause({ botId: bot.id, expected: goalControlExpected(bot) });
    await expect(
      s.api.submit({
        orderId: order.id,
        expected: goalExpected(paused),
        expectedOrderRevision: 1,
        txHash: order.txHash!,
        assertCurrent: guard,
      })
    ).rejects.toThrow();
    expect((s.read().orders[0] as GoalExecutionOrder).goalExecution.phase).toBe('signed');
    await s.api.persistFinalReceipt({ orderId: order.id, receipt: goalStorageReceipt(order) });
    s.time(GOAL_TEST_START + 6000);
    const applied = await s.api.applyReceipt({
      botId: bot.id,
      orderId: order.id,
      expected: goalAccountingExpected(bot),
      accountingAtMs: GOAL_TEST_START + 6000,
      mark: goalTestMark(101, GOAL_TEST_START + 6000),
      assertCurrent: guard,
    });
    expect(applied.bot.status).toBe('paused');
    expect(applied.bot.goalControl).toEqual(paused.goalControl);
  });
  it.each([-1, 1.5, NaN, Infinity, GOAL_TEST_START - 1])(
    'rejects invalid or regressed control clock %s',
    async (clock) => {
      const pending = await signed();
      pending.s.time(clock);
      await expect(
        pending.s.api.submit({
          orderId: pending.order.id,
          expected: goalExpected(pending.bot),
          expectedOrderRevision: 1,
          txHash: pending.order.txHash!,
          assertCurrent: guard,
        })
      ).rejects.toThrow();
      expect((pending.s.read().orders[0] as GoalExecutionOrder).goalExecution.phase).toBe('signed');
      const stopped = await initialized();
      stopped.s.time(clock);
      await expect(
        stopped.s.api.resume({
          botId: stopped.bot.id,
          expected: goalExpected(stopped.bot),
          sessionExpiresAt: stopped.bot.exactGoalState.episode.endedAtMs,
          balances: stopped.bot.portfolio.holdings,
          assertCurrent: guard,
        })
      ).rejects.toThrow();
    }
  );
  it('rolls back submit when the final synchronous guard fails', async () => {
    const { s, bot, order } = await signed();
    let checks = 0;
    await expect(
      s.api.submit({
        orderId: order.id,
        expected: goalExpected(bot),
        expectedOrderRevision: 1,
        txHash: order.txHash!,
        assertCurrent: () => {
          if (++checks === 2) throw Error('revoked');
        },
      })
    ).rejects.toThrow('revoked');
    expect((s.read().orders[0] as GoalExecutionOrder).goalExecution.phase).toBe('signed');
  });
  it('commits a valid observed loss even when rejecting the requested reservation', async () => {
    const { s, bot } = await running();
    s.time(GOAL_TEST_START + 6000);
    const mark = { ...goalTestMark(101, GOAL_TEST_START + 6000), xorReserveCodec: goalTestCodec(90) };
    const result = await s.api.reserve({
      botId: bot.id,
      expected: goalExpected(bot),
      accountingAtMs: GOAL_TEST_START + 6000,
      mark,
      order: goalStorageOrder(bot),
      balances: bot.portfolio.holdings,
      assertCurrent: guard,
    });
    expect(result.rejection).toBe('goal-complete');
    expect(result.bot.exactGoalState.outcome).toBe('loss');
    expect(s.read().orders).toEqual([]);
    expect(s.read().bots[0].status).toBe('paused');
  });
  it('rejects duplicate and simultaneous account reservations without debiting holdings', async () => {
    const { s, bot } = await running();
    const request = {
      botId: bot.id,
      expected: goalExpected(bot),
      accountingAtMs: GOAL_TEST_START,
      mark: goalTestMark(),
      order: goalStorageOrder(bot),
      balances: bot.portfolio.holdings,
      assertCurrent: guard,
    };
    await s.api.reserve(request);
    await expect(s.api.reserve({ ...request, order: goalStorageOrder(bot, 'other') })).rejects.toThrow(
      'bots.errors.pending'
    );
    expect(s.read().bots[0].portfolio).toEqual(bot.portfolio);
  });
  it('cancels only an unsigned reservation, retains identity, and charges no fictional failure', async () => {
    const { s, bot } = await running();
    const order = goalStorageOrder(bot);
    await s.api.reserve({
      botId: bot.id,
      expected: goalExpected(bot),
      accountingAtMs: GOAL_TEST_START,
      mark: goalTestMark(),
      order,
      balances: bot.portfolio.holdings,
      assertCurrent: guard,
    });
    const cancelled = await s.api.cancel({ orderId: order.id, expectedOrderRevision: 0 });
    expect(cancelled.goalExecution.phase).toBe('cancelled');
    expect(s.read().bots[0].portfolio.feesPaidCodec).toBe('0');
    await expect(
      s.api.sign({
        orderId: order.id,
        expectedOrderRevision: 1,
        txHash: goalTestHash(999),
        signedAtBlock: 100,
        envelopeDigest: order.goalExecution.envelopeDigest,
        signedEnvelopeDigest: goalTestSha(8),
      })
    ).rejects.toThrow();
  });
  it('binds sign/submit to the original envelope, transaction and transition revision', async () => {
    const { s, bot, order } = await signed();
    await expect(s.api.cancel({ orderId: order.id, expectedOrderRevision: 1 })).rejects.toThrow();
    await expect(
      s.api.submit({
        expected: goalExpected(bot),
        assertCurrent: guard,
        orderId: order.id,
        expectedOrderRevision: 0,
        txHash: order.txHash!,
      })
    ).rejects.toThrow();
    await expect(
      s.api.submit({
        expected: goalExpected(bot),
        assertCurrent: guard,
        orderId: order.id,
        expectedOrderRevision: 1,
        txHash: goalTestHash(888),
      })
    ).rejects.toThrow();
    expect(
      (
        await s.api.submit({
          expected: goalExpected(bot),
          assertCurrent: guard,
          orderId: order.id,
          expectedOrderRevision: 1,
          txHash: order.txHash!,
        })
      ).goalExecution.phase
    ).toBe('submitted');
  });
  it('retains finalized evidence without a fresh mark, blocking admission without revoking the session', async () => {
    const { s, bot, order } = await signed();
    s.time(GOAL_TEST_START + 86400000);
    const r = goalStorageReceipt(order);
    const pending = await s.api.persistFinalReceipt({ orderId: order.id, receipt: r });
    expect(pending.goalExecution.phase).toBe('finalized-pending');
    expect(pending.finalReceipt?.accounting).toBe('pending');
    expect(s.read().bots[0].portfolio).toEqual(bot.portfolio);
    expect(s.read().bots[0].status).toBe('running');
    expect(s.read().bots[0].sessionExpiresAt).toBe(bot.sessionExpiresAt);
    expect(() => assertGoalAccountClear(s.read(), bot.account, bot.network)).toThrow('bots.errors.pending');
    expect(await s.api.persistFinalReceipt({ orderId: order.id, receipt: r })).toEqual(pending);
    await expect(
      s.api.persistFinalReceipt({ orderId: order.id, receipt: { ...r, actualFeeCodec: '1' } })
    ).rejects.toThrow('bots.errors.receipt');
  });
  it('persists a real receipt even when the exact state is corrupt, and does not pretend it is accounted', async () => {
    const { s, order } = await signed();
    const corrupted = s.read();
    (corrupted.bots[0] as GoalExecutionBot).exactGoalState = {
      ...(corrupted.bots[0] as GoalExecutionBot).exactGoalState,
      stateSha256: '0'.repeat(64),
    };
    s.seed(corrupted);
    const pending = await s.api.persistFinalReceipt({ orderId: order.id, receipt: goalStorageReceipt(order) });
    expect(pending.finalReceipt?.accounting).toBe('pending');
    await expect(
      s.api.applyReceipt({
        orderId: order.id,
        botId: order.botId,
        expected: goalAccountingExpected(goalStorageBot()),
        accountingAtMs: GOAL_TEST_START,
        mark: goalTestMark(),
        assertCurrent: guard,
      })
    ).rejects.toThrow();
    expect((s.read().orders[0] as GoalExecutionOrder).finalReceipt?.accounting).toBe('pending');
  });
  it.each(['account', 'network', 'txHash', 'goalId', 'orderId'] as const)(
    'rejects mismatched receipt %s before retaining it',
    async (field) => {
      const { s, order } = await signed();
      const receipt = {
        ...goalStorageReceipt(order),
        [field]: field === 'network' || field === 'txHash' ? goalTestHash(88) : 'other',
      };
      await expect(s.api.persistFinalReceipt({ orderId: order.id, receipt })).rejects.toThrow();
      expect((s.read().orders[0] as GoalExecutionOrder).finalReceipt).toBeUndefined();
    }
  );
  it('atomically applies the real debit/order receipt once after reload and accepts old duplicates', async () => {
    const { s, bot, order } = await signed();
    const receipt = goalStorageReceipt(order);
    await s.api.persistFinalReceipt({ orderId: order.id, receipt });
    s.time(GOAL_TEST_START + 6000);
    const request = {
      orderId: order.id,
      botId: bot.id,
      expected: goalAccountingExpected(bot),
      accountingAtMs: GOAL_TEST_START + 6000,
      mark: goalTestMark(101, GOAL_TEST_START + 6000),
      assertCurrent: guard,
    };
    const result = await s.api.applyReceipt(request);
    expect(result.bot.portfolio.holdings[XOR]).toBe('2990000000000000000');
    expect(result.order.status).toBe('confirmed');
    expect(result.order.finalReceipt?.accounting).toBe('applied');
    expect(result.bot.portfolio.trades).toBe(1);
    expect(result.bot.status).toBe('running');
    expect(result.bot.sessionExpiresAt).toBe(bot.sessionExpiresAt);
    expect((await s.api.applyReceipt(request)).duplicate).toBe(true);
    expect(s.read().bots[0].portfolio.trades).toBe(1);
    expect((await s.api.persistFinalReceipt({ orderId: order.id, receipt })).finalReceipt?.accounting).toBe('applied');
  });
  it('preserves a user pause during pending accounting and leaves unrelated sessions unchanged', async () => {
    const { s, bot, order } = await signed();
    const seeded = s.read();
    const unrelated = goalStorageBot('unrelated');
    seeded.bots.push(unrelated);
    s.seed(seeded);
    await s.api.persistFinalReceipt({ orderId: order.id, receipt: goalStorageReceipt(order) });
    expect(s.read().bots[1]).toEqual(unrelated);
    const paused = await s.api.pause({ botId: bot.id, expected: goalControlExpected(bot) });
    s.time(GOAL_TEST_START + 6000);
    const result = await s.api.applyReceipt({
      orderId: order.id,
      botId: bot.id,
      expected: goalAccountingExpected(paused),
      accountingAtMs: GOAL_TEST_START + 6000,
      mark: goalTestMark(101, GOAL_TEST_START + 6000),
      assertCurrent: guard,
    });
    expect(result.bot.status).toBe('paused');
    expect(result.bot.sessionExpiresAt).toBe(0);
    expect(s.read().bots[1]).toEqual(unrelated);
  });
  it('retains real fee-only overruns after expiry and blocks allocations until terminal accounting', async () => {
    const { s, bot, order } = await signed();
    const end = bot.exactGoalState.episode.endedAtMs;
    s.time(end);
    const expired = await s.api.observe({
      botId: bot.id,
      expected: goalExpected(bot),
      accountingAtMs: end,
      mark: goalTestMark(200, end),
      assertCurrent: guard,
    });
    await s.api.persistFinalReceipt({
      orderId: order.id,
      receipt: { ...goalStorageReceipt(order), success: false, outputCodec: '0', actualFeeCodec: goalTestCodec(12) },
    });
    const before = s.read();
    await expect(
      s.api.applyReceipt({
        orderId: order.id,
        botId: bot.id,
        expected: goalAccountingExpected(expired),
        accountingAtMs: end,
        mark: goalTestMark(200, end),
        assertCurrent: guard,
      })
    ).rejects.toThrow('bots.errors.goalComplete');
    expect(s.read()).toEqual(before);
    expect((s.read().orders[0] as GoalExecutionOrder).finalReceipt?.receipt.actualFeeCodec).toBe(goalTestCodec(12));
    await expect(
      s.api.initialize({ ...goalInitializeInput(goalStorageBot('new')), assertCurrent: guard })
    ).rejects.toThrow('bots.errors.pending');
  });
  it('rejects accessor payloads without executing them and detaches before awaiting a transaction', async () => {
    const getter = vi.fn();
    const r = goalInitializeInput();
    Object.defineProperty(r.bot.goalExecution, 'consentDigest', { get: getter, enumerable: true });
    const s = setup();
    await expect(s.api.initialize({ ...r, assertCurrent: guard })).rejects.toThrow();
    expect(getter).not.toHaveBeenCalled();
    let run!: () => void;
    let ledger: GoalStorageLedger = { bots: [], orders: [] };
    const api = createGoalStorage(
      (write, action) =>
        new Promise((resolve) => {
          run = () => {
            const next = clone(ledger);
            const value = action(next);
            if (write) ledger = next;
            resolve(value);
          };
        }),
      () => GOAL_TEST_START
    );
    const input = goalInitializeInput();
    const pending = api.initialize({ ...input, assertCurrent: guard });
    input.bot.account = 'changed';
    run();
    expect((await pending).account).toBe('synthetic-account');
  });
});

describe('durable completed-hour decisions', () => {
  it('consumes a completed hour once without inventing a fill or resetting its funded baseline', async () => {
    const { s, bot } = await running();
    expect(bot.goalSignal.completedAtMs).toBeNull();
    const recorded = await s.api.recordSignal(signalInput(bot));
    expect(recorded.goalSignal.completedAtMs).toBe(0);
    expect(recorded.state).toEqual({ lastEvaluatedAt: GOAL_TEST_START, lastTradeAt: 0 });
    expect(recorded.portfolio).toEqual(bot.portfolio);
    expect(recorded.exactGoalState).toEqual(bot.exactGoalState);
    expect(recorded.goalControl).toEqual(bot.goalControl);
    await expect(s.api.recordSignal(signalInput(recorded))).rejects.toThrow('bots.errors.stale');
    expect(s.read().bots).toEqual([recorded]);
  });

  it('checks the previous consumed hour independently even when the exact mark was a no-op', async () => {
    const { s, bot } = await running();
    const recorded = await s.api.recordSignal(signalInput(bot));
    expect(recorded.exactGoalState.stateSha256).toBe(bot.exactGoalState.stateSha256);
    const at = 3_600_000;
    s.time(at);
    await expect(s.api.recordSignal(signalInput(bot, at, 101))).rejects.toThrow('bots.errors.stale');
    const next = await s.api.recordSignal(signalInput(recorded, at, 101));
    expect(next.goalSignal.completedAtMs).toBe(at);
    expect(next.exactGoalState.episode).toEqual(bot.exactGoalState.episode);
  });

  it.each([-3_600_000, 1, 3_600_000])('rejects a noncurrent completed boundary %s', async (completedAtMs) => {
    const { s, bot } = await running();
    await expect(s.api.recordSignal({ ...signalInput(bot), completedAtMs })).rejects.toThrow();
    expect(s.read().bots).toEqual([bot]);
  });

  it('cannot undo a concurrent user pause', async () => {
    const { s, bot } = await running();
    const paused = await s.api.pause({ botId: bot.id, expected: goalControlExpected(bot) });
    await expect(s.api.recordSignal(signalInput(bot))).rejects.toThrow('bots.errors.stale');
    expect(s.read().bots).toEqual([paused]);
  });

  it('does not consume another signal while an account order is pending', async () => {
    const { s, bot } = await signed();
    const before = s.read();
    await expect(s.api.recordSignal(signalInput(bot))).rejects.toThrow('bots.errors.pending');
    expect(s.read()).toEqual(before);
  });

  it('rolls back the mark and signal together when the final context check fails', async () => {
    const { s, bot } = await running();
    const at = GOAL_TEST_START + 1000;
    s.time(at);
    let checks = 0;
    await expect(
      s.api.recordSignal({
        ...signalInput(bot, at, 101),
        assertCurrent: () => {
          if (++checks === 2) throw Error('changed-context');
        },
      })
    ).rejects.toThrow('changed-context');
    expect(s.read().bots).toEqual([bot]);
  });

  it('keeps lastTradeAt receipt-owned and rejects unsupported live-price state', async () => {
    const { s, bot } = await running();
    const request = signalInput(bot);
    await expect(
      s.api.recordSignal({ ...request, strategyState: { ...request.strategyState, lastTradeAt: GOAL_TEST_START } })
    ).rejects.toThrow();
    await expect(
      s.api.recordSignal({ ...request, strategyState: { ...request.strategyState, lastLiveObservationAt: 0 } })
    ).rejects.toThrow();
    expect(s.read().bots).toEqual([bot]);
  });

  it('persists an observed goal stop while recording the completed hour', async () => {
    const { s, bot } = await running();
    const at = GOAL_TEST_START + 1000;
    s.time(at);
    const result = await s.api.recordSignal({
      ...signalInput(bot, at, 101),
      mark: { ...goalTestMark(101, at), xorReserveCodec: goalTestCodec(200) },
    });
    expect(result.exactGoalState.outcome).toBe('target');
    expect(result.status).toBe('paused');
    expect(result.goalControl.revision).toBe(bot.goalControl.revision + 1);
    expect(result.goalSignal.completedAtMs).toBe(0);
    expect(result.portfolio).toEqual(bot.portfolio);
  });

  it('cannot seed a prefunding crossover or consumed signal at initialization', async () => {
    const s = setup();
    const request = goalInitializeInput();
    await expect(
      s.api.initialize({
        ...request,
        bot: { ...request.bot, state: { ...request.bot.state, previousSignal: 1 } },
        assertCurrent: guard,
      })
    ).rejects.toThrow();
    await expect(
      s.api.initialize({
        ...request,
        bot: { ...request.bot, goalSignal: { completedAtMs: 0 } },
        assertCurrent: guard,
      } as Parameters<typeof s.api.initialize>[0])
    ).rejects.toThrow();
    expect(s.read().bots).toEqual([]);
  });
});
