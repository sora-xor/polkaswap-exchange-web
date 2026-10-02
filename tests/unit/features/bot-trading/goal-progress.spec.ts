// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { projectExactGoalProgress } from '@/features/bot-trading/goal-progress';
import {
  markGoalExactLedger,
  settleGoalExactLedger,
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
} from '@/features/bot-trading/goal-exact-ledger';
import { goalQualificationDigest } from '@/features/bot-trading/goal-qualification';
import {
  goalStorageBot,
  goalStorageOrder,
  goalStorageReceipt,
  goalTestMark,
  goalTestCodec,
  GOAL_TEST_START,
} from './goal-storage-fixtures';
import { expiredGoalOrderFixture } from './goal-expiry-fixture';
import type { GoalExecutionBot, GoalExecutionOrder } from '@/features/bot-trading/goal-execution-types';
vi.unmock('@polkadot/util-crypto');
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
/** Invented actual settlement and its matching persisted receipt; no performance summary substitution. */
function filled(fee = '10000000000000000', success = true) {
  const bot = goalStorageBot(),
    order = goalStorageOrder(bot),
    receipt = {
      ...goalStorageReceipt(order),
      actualFeeCodec: fee,
      success,
      outputCodec: success ? goalTestCodec(2) : '0',
    };
  const state = settleGoalExactLedger(bot.exactGoalState, {
    orderId: order.id,
    expectedRevision: 0,
    accountingAtMs: GOAL_TEST_START + 6000,
    mark: goalTestMark(101, GOAL_TEST_START + 6000),
    receipt: {
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      extrinsicHash: receipt.txHash,
      extrinsicIndex: 0,
    },
    fill: {
      inputAsset: KUSD,
      outputAsset: XOR,
      inputCodec: order.inputCodec,
      minimumOutputCodec: order.minOutputCodec,
      feeCeilingCodec: order.feeCodec,
    },
    success,
    actualOutputCodec: receipt.outputCodec,
    actualFeeCodec: fee,
  }).state;
  bot.exactGoalState = state;
  bot.portfolio = {
    ...bot.portfolio,
    holdings: { [KUSD]: state.holdings.kusdCodec, [XOR]: state.holdings.xorCodec },
    feesPaidCodec: fee,
    trades: state.trades,
  };
  const settled: GoalExecutionOrder = {
    ...order,
    status: success ? 'confirmed' : 'failed',
    txHash: receipt.txHash,
    signedAtBlock: 100,
    outputCodec: receipt.outputCodec,
    actualFeeCodec: fee,
    goalExecution: {
      ...order.goalExecution,
      phase: 'accounted',
      signedEnvelopeDigest: 'a'.repeat(64),
      orderRevision: 3,
    },
    finalReceipt: {
      receipt,
      receiptDigest: goalQualificationDigest(receipt),
      accounting: 'applied',
      appliedStateSha256: state.stateSha256,
    },
  };
  return { bot, orders: [settled], now: GOAL_TEST_START + 6000 };
}
describe('exact goal display projection', () => {
  it('shows the immutable budget, spent input, retained reserve and fee-paid return without legacy state', () => {
    const f = filled(),
      before = clone(f.bot),
      out = projectExactGoalProgress(f.bot, f);
    expect(out).toMatchObject({
      kind: 'exact',
      status: 'paused',
      accountingComplete: true,
      canResume: true,
      budgetCodec: goalTestCodec(10),
      spentKusdCodec: goalTestCodec(2),
      retainedReserveCodec: '990000000000000000',
      labels: {
        value: '10.99',
        netReturn: '−0.09',
        budget: '10',
        spent: '2',
        reserve: '0.99',
        fees: '0.01',
        kusd: '8',
        xor: '2.99',
      },
    });
    expect(f.bot).toEqual(before);
    expect(f.bot).not.toHaveProperty('goalState');
  });
  it('counts a failed transaction fee without fabricating spent principal or a trade', () => {
    const f = filled('10000000000000000', false);
    expect(projectExactGoalProgress(f.bot, f)).toMatchObject({
      spentKusdCodec: '0',
      trades: 0,
      labels: { reserve: '0.99', value: '10.99', netReturn: '−0.09' },
    });
  });
  it('keeps one-atom losses visible and never rounds a tiny nonzero fee to zero', () => {
    const f = filled('1');
    expect(projectExactGoalProgress(f.bot, f)).toMatchObject({
      labels: { netReturn: '−<0.01', fees: '<0.000001' },
      tone: 'negative',
    });
  });
  it('shows actual negative net value after an excess fee instead of concealing an allocation deficit', () => {
    const f = filled(goalTestCodec(12), false);
    expect(projectExactGoalProgress(f.bot, f)).toMatchObject({
      status: 'attention',
      accountingComplete: true,
      canResume: false,
      tone: 'negative',
      labels: { value: '−1', netReturn: '−109.09', reserve: '0', fees: '12' },
    });
  });
  it('requires runtime authority rather than a saved running flag', () => {
    const bot = goalStorageBot(),
      options = { now: GOAL_TEST_START, orders: [] };
    expect(projectExactGoalProgress(bot, options)).toMatchObject({ status: 'paused' });
    expect(projectExactGoalProgress(bot, { ...options, runtimeStatus: 'running' })).toMatchObject({
      status: 'active',
      canResume: false,
    });
    expect(projectExactGoalProgress(bot, { ...options, runtimeStatus: 'attention' })).toMatchObject({
      status: 'attention',
      canResume: false,
      tone: '',
    });
  });
  it('marks unknown, failed, pending and inconsistent order reads without claiming complete accounting', () => {
    const bot = goalStorageBot(),
      now = GOAL_TEST_START;
    expect(projectExactGoalProgress(bot, { now })).toMatchObject({
      status: 'checking',
      accountingComplete: false,
      canResume: false,
    });
    expect(projectExactGoalProgress(bot, { now, orders: null })).toMatchObject({
      status: 'attention',
      accountingComplete: false,
    });
    expect(projectExactGoalProgress(bot, { now, orders: [goalStorageOrder(bot)] })).toMatchObject({
      status: 'pending',
      pendingCount: 1,
      accountingComplete: false,
    });
    const f = filled();
    expect(projectExactGoalProgress(f.bot, { now: f.now, orders: [] })).toMatchObject({
      status: 'attention',
      accountingComplete: false,
    });
    expect(projectExactGoalProgress(f.bot, { now: f.now, orders: [...f.orders, ...f.orders] })).toMatchObject({
      status: 'attention',
    });
  });
  it('shows deadline accounting as unfinished until terminal evidence exists, without resetting time', () => {
    const bot = goalStorageBot();
    expect(projectExactGoalProgress(bot, { now: bot.exactGoalState.episode.endedAtMs, orders: [] })).toMatchObject({
      status: 'finalizing',
      terminal: false,
      canResume: false,
      deadlineAtMs: GOAL_TEST_START + 86400000,
      valuedAtMs: GOAL_TEST_START,
    });
  });
  it('uses exact recorded pool ratios rather than charts or research gains', () => {
    const bot = goalStorageBot();
    bot.exactGoalState = markGoalExactLedger(bot.exactGoalState, {
      expectedRevision: 0,
      accountingAtMs: GOAL_TEST_START + 6000,
      mark: { ...goalTestMark(101, GOAL_TEST_START + 6000), xorReserveCodec: goalTestCodec(200) },
    });
    bot.equity = [{ timestamp: GOAL_TEST_START, value: '99999999', benchmark: '1' }];
    expect(projectExactGoalProgress(bot, { now: GOAL_TEST_START + 6000, orders: [] })).toMatchObject({
      status: 'target',
      outcome: 'target',
      trades: 0,
      beatsIdleAfterFees: false,
      canResume: false,
      labels: { value: '21', netReturn: '+90.91' },
    });
  });
  it('does not mistake a filled but fee-depleted target for outperformance of idle funds', () => {
    const f = filled();
    f.bot.exactGoalState = markGoalExactLedger(f.bot.exactGoalState, {
      expectedRevision: f.bot.exactGoalState.revision,
      accountingAtMs: GOAL_TEST_START + 12000,
      mark: { ...goalTestMark(102, GOAL_TEST_START + 12000), xorReserveCodec: goalTestCodec(200) },
    });
    expect(projectExactGoalProgress(f.bot, { now: GOAL_TEST_START + 12000, orders: f.orders })).toMatchObject({
      status: 'target',
      trades: 1,
      beatsIdleAfterFees: false,
      labels: { value: '18.99', netReturn: '+72.64' },
    });
  });
  it('treats an actual proven expired signed order as resolved without a fill or fee', async () => {
    const order = await expiredGoalOrderFixture();
    const bot = goalStorageBot();
    bot.account = order.account;
    expect(projectExactGoalProgress(bot, { now: bot.exactGoalState.accountingAtMs, orders: [order] })).toMatchObject({
      kind: 'exact',
      pendingCount: 0,
      expiredOrders: 1,
      trades: 0,
      feesPaidCodec: '0',
      spentKusdCodec: '0',
    });
  });
  it('never uses a forged legacy goalState when an exact marker is invalid', () => {
    const bot = { ...goalStorageBot(), exactGoalState: { broken: true }, goalState: { returnPercent: '1000' } };
    expect(projectExactGoalProgress(bot as unknown as GoalExecutionBot, { now: GOAL_TEST_START, orders: [] })).toEqual({
      kind: 'invalid',
    });
    expect(projectExactGoalProgress({} as GoalExecutionBot, { now: GOAL_TEST_START })).toEqual({ kind: 'legacy' });
  });
});
