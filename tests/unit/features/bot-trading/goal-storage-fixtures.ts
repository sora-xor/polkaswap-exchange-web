/** Invented allocation/receipt inputs shared by unit and real IndexedDB tests. */
import {
  createGoalExactLedger,
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
  GOAL_EXACT_POLICY,
  type GoalExactMark,
} from '@/features/bot-trading/goal-exact-ledger';
import type {
  GoalExecutionBot,
  GoalExecutionOrder,
  GoalExecutionExpected,
  GoalExecutionAccountingExpected,
  GoalExecutionControlExpected,
  GoalExecutionFinalReceipt,
} from '@/features/bot-trading/goal-execution-types';
export const GOAL_TEST_START = 1_000_000;
export const goalTestCodec = (n: number) => String(BigInt(n) * 10n ** 18n);
export const goalTestHash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
export const goalTestSha = (n: number) => n.toString(16).padStart(64, '0');
export const goalTestMark = (block = 100, at = GOAL_TEST_START): GoalExactMark => ({
  blockHash: goalTestHash(block),
  blockNumber: block,
  timestampMs: at,
  denominator: '1',
  kusdReserveCodec: goalTestCodec(100),
  xorReserveCodec: goalTestCodec(100),
});
export function goalStorageBot(id = 'goal-bot'): GoalExecutionBot {
  const state = createGoalExactLedger(
    {
      goalId: `${id}-epoch`,
      startedAtMs: GOAL_TEST_START,
      initialKusdCodec: goalTestCodec(10),
      maxTradeKusdCodec: goalTestCodec(3),
      maxTradeXorCodec: goalTestCodec(3),
    },
    goalTestMark()
  );
  return {
    version: 1,
    id,
    name: id,
    mode: 'live',
    status: 'running',
    account: 'synthetic-account',
    network: GOAL_EXACT_POLICY.genesisHash,
    assetIn: { address: KUSD, symbol: 'KUSD', decimals: 18 },
    assetOut: { address: XOR, symbol: 'XOR', decimals: 18 },
    strategy: {
      kind: 'dca',
      amount: '2',
      intervalMs: 60000,
      threshold: '1',
      direction: 'below',
      fastWindow: 5,
      slowWindow: 20,
      prompt: '',
    },
    policy: {
      maxTradeCodec: { [KUSD]: goalTestCodec(3), [XOR]: goalTestCodec(3) },
      slippagePercent: '0.5',
      maxPriceImpactPercent: '1',
      feeAsset: { address: XOR, symbol: 'XOR', decimals: 18 },
      feeBudgetCodec: goalTestCodec(1),
      sessionDurationMs: 86400000,
    },
    portfolio: {
      initial: { [KUSD]: goalTestCodec(10), [XOR]: goalTestCodec(1) },
      holdings: { [KUSD]: goalTestCodec(10), [XOR]: goalTestCodec(1) },
      feesPaidCodec: '0',
      trades: 0,
    },
    state: { lastEvaluatedAt: 0, lastTradeAt: 0 },
    provider: 'openai',
    model: '',
    endpoint: '',
    createdAt: GOAL_TEST_START,
    sessionExpiresAt: state.episode.endedAtMs,
    activity: [],
    equity: [],
    apiUsage: { inputTokens: 0, outputTokens: 0, requests: 0 },
    goal: {
      title: 'Synthetic',
      targetReturnPercent: '5',
      maxLossPercent: '5',
      durationMs: 86400000,
      valuationAsset: 'output',
      lossMetric: 'drawdown',
    },
    goalExecution: {
      protocol: 'finalized-xyk-goal-v1',
      execution: { protocol: 'finalized-xyk-native-fee-v1', expectedDenominator: '1' },
      goalId: state.goalId,
      consentDigest: goalTestSha(1),
      qualificationDigest: goalTestSha(2),
      policyDigest: goalTestSha(3),
    },
    goalControl: { revision: 0 },
    goalSignal: { completedAtMs: null },
    exactGoalState: state,
  };
}
export const goalExpected = (bot: GoalExecutionBot): GoalExecutionExpected => ({
  goalId: bot.exactGoalState.goalId,
  revision: bot.exactGoalState.revision,
  stateSha256: bot.exactGoalState.stateSha256,
  controlRevision: bot.goalControl.revision,
});
export const goalAccountingExpected = (bot: GoalExecutionBot): GoalExecutionAccountingExpected => ({
  goalId: bot.exactGoalState.goalId,
  revision: bot.exactGoalState.revision,
  stateSha256: bot.exactGoalState.stateSha256,
});
export const goalControlExpected = (bot: GoalExecutionBot): GoalExecutionControlExpected => ({
  goalId: bot.exactGoalState.goalId,
  controlRevision: bot.goalControl.revision,
});
export function goalInitializeInput(bot = goalStorageBot()) {
  const { exactGoalState, goalControl: _control, goalSignal: _signal, ...candidate } = bot;
  return {
    bot: candidate,
    config: {
      goalId: exactGoalState.goalId,
      initialKusdCodec: exactGoalState.initial.kusdCodec,
      maxTradeKusdCodec: exactGoalState.limits.kusdCodec,
      maxTradeXorCodec: exactGoalState.limits.xorCodec,
    },
    openingMark: exactGoalState.openingMark,
    balances: bot.portfolio.holdings,
  };
}
export function goalStorageOrder(bot = goalStorageBot(), id = 'goal-order'): GoalExecutionOrder {
  return {
    id,
    botId: bot.id,
    account: bot.account,
    network: bot.network,
    intentId: `intent-${id}`,
    status: 'reserved',
    inputAsset: KUSD,
    inputCodec: goalTestCodec(2),
    outputAsset: XOR,
    minOutputCodec: goalTestCodec(2),
    feeAsset: XOR,
    feeCodec: '10000000000000000',
    createdAt: GOAL_TEST_START,
    goalExecution: {
      ...bot.goalExecution,
      ledgerRevision: bot.exactGoalState.revision,
      controlRevision: bot.goalControl.revision,
      ledgerStateSha256: bot.exactGoalState.stateSha256,
      quoteDigest: goalTestSha(4),
      envelopeDigest: goalTestSha(5),
      feePolicyDigest: goalTestSha(6),
      orderRevision: 0,
      phase: 'reserved',
    },
  };
}
export function goalStorageReceipt(order = goalStorageOrder()): GoalExecutionFinalReceipt {
  return {
    goalId: order.goalExecution.goalId,
    orderId: order.id,
    account: order.account,
    network: order.network,
    txHash: goalTestHash(999),
    blockHash: goalTestHash(101),
    blockNumber: 101,
    extrinsicIndex: 0,
    success: true,
    outputCodec: goalTestCodec(2),
    actualFeeCodec: '10000000000000000',
    evidenceDigest: goalTestSha(7),
  };
}
