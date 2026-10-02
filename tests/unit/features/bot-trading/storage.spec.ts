import { describe, it, expect, vi } from 'vitest';
vi.unmock('@polkadot/util-crypto');
import { encodeAddress } from '@polkadot/util-crypto';
import {
  createBotStorage,
  recordGoalProgress,
  reserveOrder,
  saveBotRecord,
  settleOrder,
} from '@/features/bot-trading/storage';
import { evaluateBotGoal } from '@/features/bot-trading/goals';
import { valuePortfolio } from '@/features/bot-trading/engine';
import {
  assertAllocations,
  consentIdentity,
  pendingOrder,
  proposalInput,
  validatePolicy,
  assertSession,
} from '@/features/bot-trading/policy';
import { executionBot, executionOrder, executionStatus } from './execution-fixtures';
import { botFixture } from './fixtures';

describe('bot durable allocation policy', () => {
  it('cannot latch a GO target from a UI trade count when settled holdings have no fill', () => {
    const bot = botFixture();
    bot.mode = 'live';
    bot.status = 'running';
    bot.goal = {
      title: 'Maximize OUT',
      targetReturnPercent: '5',
      maxLossPercent: '10',
      durationMs: 3_600_000,
      lossMetric: 'drawdown',
      targetRequiresIdleOutperformance: true,
    };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    const ledger = { bots: [bot], orders: [] };
    const forged = structuredClone(bot);
    forged.portfolio.trades = 1;
    forged.state.lastTradeAt = 1500;
    forged.goalState = {
      ...bot.goalState!,
      lastValue: '110',
      idleLastValue: '105',
      peakValue: '110',
      returnPercent: '10',
      outcome: 'target',
      completedAt: 2000,
    };
    expect(() => saveBotRecord(ledger, forged)).toThrow('bots.errors.goal');
    expect(ledger.bots[0]).toEqual(bot);

    // A prior trade count alone is still not proof that this goal had a post-start finalized fill.
    bot.portfolio.trades = 1;
    bot.state.lastTradeAt = 1500;
    expect(() => saveBotRecord(ledger, forged)).toThrow('bots.errors.goal');
    expect(() => recordGoalProgress(ledger, bot.id, bot.goal!, forged.goalState!)).toThrow('bots.errors.goal');
    expect(bot.goalState?.outcome).toBe('active');
  });

  it('accepts a GO target only with a matching post-start finalized order in the durable ledger', () => {
    const bot = botFixture();
    bot.mode = 'live';
    bot.status = 'running';
    bot.goal = {
      title: 'Maximize OUT',
      targetReturnPercent: '5',
      maxLossPercent: '10',
      durationMs: 3_600_000,
      lossMetric: 'drawdown',
      targetRequiresIdleOutperformance: true,
    };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    bot.portfolio.trades = 1;
    bot.state.lastTradeAt = 1500;
    const target = {
      ...bot.goalState!,
      lastValue: '110',
      idleLastValue: '105',
      peakValue: '110',
      returnPercent: '10',
      outcome: 'target' as const,
      completedAt: 2000,
    };
    const order = {
      ...executionOrder(),
      botId: bot.id,
      account: bot.account,
      network: bot.network,
      inputAsset: bot.assetIn.address,
      outputAsset: bot.assetOut.address,
      feeAsset: bot.policy.feeAsset.address,
      status: 'confirmed' as const,
      createdAt: 1400,
      outputCodec: '100',
      txHash: `0x${'c'.repeat(64)}`,
      signedEnvelopeDigest: 'a'.repeat(64),
      finalized: { blockHash: `0x${'b'.repeat(64)}`, blockNumber: 10, extrinsicIndex: 0 },
    };
    const activeBot = structuredClone(bot);
    const ledger = { bots: [bot], orders: [order] };
    const beforeStart = { bots: [structuredClone(bot)], orders: [{ ...order, createdAt: 999 }] };
    expect(() => recordGoalProgress(beforeStart, bot.id, bot.goal!, target)).toThrow('bots.errors.goal');
    const unproven = { bots: [structuredClone(bot)], orders: [{ ...order, finalized: undefined }] };
    expect(() => recordGoalProgress(unproven, bot.id, bot.goal!, target)).toThrow('bots.errors.goal');
    expect(recordGoalProgress(ledger, bot.id, bot.goal!, target)).toBe(true);
    expect(bot.goalState?.outcome).toBe('target');

    const resumed = { bots: [activeBot], orders: [order] };
    const incoming = structuredClone(resumed.bots[0]);
    incoming.state.lastTradeAt = 1900;
    incoming.goalState = target;
    saveBotRecord(resumed, incoming);
    expect(resumed.bots[0].state.lastTradeAt).toBe(1500);
    expect(resumed.bots[0].goalState?.outcome).toBe('target');
  });

  it('rejects a changed idle opening allocation while preserving the same GO goal epoch', () => {
    const bot = botFixture();
    bot.goal = {
      title: 'Maximize OUT',
      targetReturnPercent: '5',
      maxLossPercent: '10',
      durationMs: 3_600_000,
      valuationAsset: 'output',
      lossMetric: 'drawdown',
      targetRequiresIdleOutperformance: true,
    };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2' });
    const identity = consentIdentity(bot);
    const ledger = { bots: [bot], orders: [] };
    const fabricatedTarget = {
      ...bot.goalState!,
      lastValue: '55',
      idleLastValue: '54',
      peakValue: '55',
      returnPercent: '10',
      outcome: 'target' as const,
      completedAt: 1500,
    };
    expect(() => recordGoalProgress(ledger, bot.id, bot.goal!, fabricatedTarget)).toThrow('bots.errors.goal');
    const tampered = {
      ...bot.goalState!,
      idleHoldings: { ...bot.goalState!.idleHoldings, in: '9999' },
    };
    expect(recordGoalProgress(ledger, bot.id, bot.goal, tampered)).toBe(false);
    expect(bot.goalState!.idleHoldings!.in).toBe('10000');
    expect(consentIdentity({ ...bot, goalState: tampered })).not.toBe(identity);
    const observed = evaluateBotGoal(bot, 2000, { timestamp: 2000, close: '1.8' })!;
    expect(recordGoalProgress(ledger, bot.id, bot.goal, observed)).toBe(true);
    expect(bot.goalState).toEqual(observed);
  });
  it('saves goal progress atomically without undoing concurrent stops, resets or latched outcomes', () => {
    const bot = executionBot();
    bot.goal = { title: 'Goal', targetReturnPercent: '5', maxLossPercent: '3', durationMs: 3_600_000 };
    bot.goalState = evaluateBotGoal(bot, 1000, { timestamp: 1000, close: '2', feeClose: '1' });
    const ledger = { bots: [bot], orders: [] };
    const active = { ...bot.goalState! };
    const expired = evaluateBotGoal(bot, 3_601_000)!;
    bot.status = 'stopped';
    expect(recordGoalProgress(ledger, bot.id, bot.goal, expired)).toBe(true);
    expect(bot.status).toBe('stopped');
    expect(recordGoalProgress(ledger, bot.id, bot.goal, active)).toBe(false);
    expect(bot.goalState?.outcome).toBe('expired');
    expect(bot.activity).toHaveLength(1);
    expect(recordGoalProgress(ledger, bot.id, bot.goal, expired)).toBe(true);
    expect(bot.activity).toHaveLength(1);
    delete bot.goalState;
    expect(recordGoalProgress(ledger, bot.id, bot.goal, expired)).toBe(false);
    expect(bot.goalState).toBeUndefined();
  });
  it('rejects stale same-epoch progress that would lower an observed drawdown peak', () => {
    const bot = executionBot();
    bot.goal = {
      title: 'Drawdown goal',
      targetReturnPercent: '20',
      maxLossPercent: '5',
      durationMs: 3_600_000,
      lossMetric: 'drawdown',
    };
    bot.goalState = {
      startedAt: 1000,
      baselineValue: '100',
      peakValue: '100',
      lastValue: '100',
      returnPercent: '0',
      outcome: 'active',
    };
    const stale = { ...bot.goalState };
    const ledger = { bots: [bot], orders: [] };
    const higher = { ...stale, peakValue: '110', lastValue: '110', returnPercent: '10' };
    expect(recordGoalProgress(ledger, bot.id, bot.goal, higher)).toBe(true);
    expect(recordGoalProgress(ledger, bot.id, bot.goal, stale)).toBe(false);
    expect(bot.goalState).toEqual(higher);
    const loss = { ...higher, lastValue: '103.4', returnPercent: '3.4', outcome: 'loss' as const, completedAt: 3000 };
    expect(recordGoalProgress(ledger, bot.id, bot.goal, loss)).toBe(true);
    expect(bot.status).toBe('paused');
    expect(recordGoalProgress(ledger, bot.id, bot.goal, higher)).toBe(false);
    expect(recordGoalProgress(ledger, bot.id, bot.goal, loss)).toBe(true);
    expect(bot.goalState).toEqual(loss);
    expect(bot.activity).toHaveLength(1);
    const staleBot = structuredClone(bot);
    staleBot.goalState = higher;
    expect(() => saveBotRecord(ledger, staleBot)).toThrow('bots.errors.goal');
    expect(bot.goalState).toEqual(loss);
    bot.status = 'stopped';
    expect(() => saveBotRecord(ledger, { ...staleBot, status: 'stopped' })).toThrow('bots.errors.goal');
    expect(bot.goalState).toEqual(loss);
    const explicitReset = structuredClone(bot);
    explicitReset.status = 'idle';
    delete explicitReset.goalState;
    expect(() => saveBotRecord(ledger, explicitReset)).toThrow('bots.errors.goal');
    saveBotRecord(ledger, explicitReset, { resetGoal: true });
    expect(ledger.bots[0].goalState).toBeUndefined();
  });
  it('protects a drawdown peak down to fractional units and refuses missing peaks before mutation', () => {
    const bot = executionBot();
    bot.goal = {
      title: 'Drawdown goal',
      targetReturnPercent: '20',
      maxLossPercent: '5',
      durationMs: 3_600_000,
      lossMetric: 'drawdown',
    };
    bot.goalState = {
      startedAt: 1000,
      baselineValue: '100',
      peakValue: '100.000000000000000001',
      lastValue: '100',
      returnPercent: '0',
      outcome: 'active',
    };
    const ledger = { bots: [bot], orders: [] };
    const previous = { ...bot.goalState };
    expect(recordGoalProgress(ledger, bot.id, bot.goal!, { ...previous, peakValue: '100' })).toBe(false);
    expect(() => recordGoalProgress(ledger, bot.id, bot.goal!, { ...previous, peakValue: undefined })).toThrow(
      'bots.errors.goal'
    );
    expect(bot.goalState).toEqual(previous);
    expect(bot.activity).toHaveLength(0);
  });
  it('retains allocation across buy, sell, and repeated reinvestment with exact amounts', () => {
    const bot = executionBot();
    const ledger = { bots: [bot], orders: [] as ReturnType<typeof executionOrder>[] };
    const order = executionOrder();
    reserveOrder(ledger, order, bot.portfolio.holdings);
    settleOrder(ledger, order.id, {
      success: true,
      outputCodec: '2000000000000000001',
      actualFeeCodec: '100000000000000000',
    });
    expect(bot.portfolio.holdings['0xout']).toBe('2000000000000000001');
    const sell = {
      ...executionOrder(),
      id: 'sell',
      intentId: 'sell',
      inputAsset: '0xout',
      outputAsset: '0xin',
      inputCodec: '2000000000000000001',
      minOutputCodec: '1000000000000000000',
    };
    reserveOrder(ledger, sell, bot.portfolio.holdings);
    settleOrder(ledger, sell.id, {
      success: true,
      outputCodec: '1100000000000000001',
      actualFeeCodec: '100000000000000000',
    });
    expect(bot.portfolio.holdings['0xin']).toBe('10100000000000000001');
    expect(bot.portfolio.holdings['0xout']).toBe('0');
    expect(bot.portfolio.trades).toBe(2);
    settleOrder(ledger, sell.id, {
      success: true,
      outputCodec: '1100000000000000001',
      actualFeeCodec: '100000000000000000',
    });
    expect(bot.portfolio.trades).toBe(2);
  });
  it('rejects concurrent or duplicated orders even when a transaction has an uncertain signature', () => {
    const bot = executionBot();
    const order = executionOrder();
    const ledger = { bots: [bot], orders: [order] };
    for (const status of ['reserved', 'signed', 'submitted'] as const) {
      order.status = status;
      expect(pendingOrder(order)).toBe(true);
      expect(() =>
        reserveOrder(ledger, { ...order, id: 'another', intentId: 'another' }, bot.portfolio.holdings)
      ).toThrow('bots.errors.pending');
    }
  });
  it('blocks an uncertain order and counts allocations across alternate SS58 encodings', () => {
    const key = new Uint8Array(32).fill(17);
    const account69 = encodeAddress(key, 69);
    const account42 = encodeAddress(key, 42);
    const bot = executionBot();
    bot.account = account69;
    const incoming = { ...executionOrder(), account: account69, id: 'incoming', intentId: 'incoming' };
    const pending = {
      ...executionOrder(),
      account: account42,
      id: 'uncertain',
      intentId: 'uncertain',
      status: 'submitted' as const,
    };
    expect(() => reserveOrder({ bots: [bot], orders: [pending] }, incoming, bot.portfolio.holdings)).toThrow(
      'bots.errors.pending'
    );

    const other = { ...executionBot(), id: 'other', account: account42, status: 'paused' as const };
    expect(() => reserveOrder({ bots: [bot, other], orders: [] }, incoming, bot.portfolio.holdings)).toThrow(
      'bots.errors.balance'
    );
  });
  it('prevents overlapping bots and detects manual wallet spending without allocating new deposits', () => {
    const bot = executionBot();
    const other = { ...executionBot(), id: 'other', status: 'paused' as const };
    expect(() => assertAllocations([bot, other], bot.portfolio.holdings)).toThrow('bots.errors.balance');
    expect(() => assertAllocations([bot], { ...bot.portfolio.holdings, '0xin': '999' })).toThrow('bots.errors.balance');
    const initial = { ...bot.portfolio.holdings };
    assertAllocations([bot], { ...initial, '0xin': '999000000000000000000' });
    expect(bot.portfolio.holdings).toEqual(initial);
    other.status = 'stopped' as never;
    expect(() => assertAllocations([bot, other], initial)).not.toThrow();
  });
  it('reserves fees plus input atomically for an XOR-input swap', () => {
    const bot = executionBot();
    bot.assetIn = bot.policy.feeAsset;
    const xor = bot.assetIn.address;
    bot.policy.maxTradeCodec[xor] = bot.portfolio.holdings[xor];
    const order = { ...executionOrder(), inputAsset: xor, inputCodec: bot.portfolio.holdings[xor] };
    const ledger = { bots: [bot], orders: [] as ReturnType<typeof executionOrder>[] };
    expect(() => reserveOrder(ledger, order, bot.portfolio.holdings)).toThrow('bots.errors.balance');
    expect(ledger.orders).toEqual([]);
  });
  it('keeps XOR output reserved through proposals, order reservation, and actual fee settlement', () => {
    const bot = executionBot();
    bot.assetOut = bot.policy.feeAsset;
    const xor = bot.assetOut.address;
    bot.policy.maxTradeCodec[xor] = '10000000000000000000';
    const ledger = { bots: [bot], orders: [] as ReturnType<typeof executionOrder>[] };
    const sell = {
      ...executionOrder(),
      inputAsset: xor,
      inputCodec: '100000000000000000',
      outputAsset: bot.assetIn.address,
      minOutputCodec: '1',
    };
    expect(() => proposalInput(bot, { action: 'sell', amount: '0.1', reason: '' })).toThrow('bots.errors.balance');
    expect(() => reserveOrder(ledger, sell, bot.portfolio.holdings)).toThrow('bots.errors.balance');
    expect(ledger.orders).toEqual([]);
    bot.portfolio.holdings[xor] = '1100000000000000001';
    const earned = { ...sell, inputCodec: '100000000000000001' };
    reserveOrder(ledger, earned, bot.portfolio.holdings);
    settleOrder(ledger, earned.id, { success: true, outputCodec: '1', actualFeeCodec: '90000000000000000' });
    expect(bot.portfolio.holdings[xor]).toBe('910000000000000000');
    expect(bot.portfolio.feesPaidCodec).toBe('90000000000000000');
    expect(() => proposalInput(bot, { action: 'sell', amount: '0.000000000000000001', reason: '' })).toThrow(
      'bots.errors.balance'
    );
    // A fee estimate larger than the actual finalized fee must not make reserve capital tradable.
    expect(ledger.orders[0].feeCodec).toBe('100000000000000000');
  });
  it('rejects fee budget exhaustion, wrong pair and fractional base-unit proposals', () => {
    const bot = executionBot();
    bot.portfolio.feesPaidCodec = bot.policy.feeBudgetCodec;
    expect(() => reserveOrder({ bots: [bot], orders: [] }, executionOrder(), bot.portfolio.holdings)).toThrow(
      'bots.errors.feeBudget'
    );
    expect(() =>
      reserveOrder(
        { bots: [bot], orders: [] },
        { ...executionOrder(), outputAsset: 'arbitrary' },
        bot.portfolio.holdings
      )
    ).toThrow('bots.errors.policy');
    expect(() => proposalInput(bot, { action: 'buy', amount: '0.0000000000000000001', reason: '' })).toThrow(
      'bots.errors.amount'
    );
    expect(() => proposalInput(bot, { action: 'hold', amount: '0', reason: '' })).toThrow('bots.errors.proposal');
  });
  it('settles failed extrinsics with only their actual fee and refuses inconsistent successful output', () => {
    const bot = executionBot();
    const order = executionOrder();
    const ledger = { bots: [bot], orders: [order] };
    expect(() => settleOrder(ledger, order.id, { success: true, outputCodec: '1', actualFeeCodec: '1' })).toThrow(
      'bots.errors.receipt'
    );
    expect(order.status).toBe('reserved');
    settleOrder(ledger, order.id, { success: false, outputCodec: '0', actualFeeCodec: '100000000000000000' });
    expect(bot.portfolio.holdings['0xin']).toBe('10000000000000000000');
    expect(bot.portfolio.trades).toBe(0);
  });
  it.each([
    { success: true, outputCodec: '2000000000000000000', status: 'confirmed', trades: 1, input: '9000000000000000000', value: '12.4' },
    { success: false, outputCodec: '0', status: 'failed', trades: 0, input: '10000000000000000000', value: '9.4' },
  ] as const)('durably accounts a finalized $status fee overrun and a retry after reload only once', (caseName) => {
    const bot = executionBot();
    const order = { ...executionOrder(), status: 'submitted' as const };
    const ledger = { bots: [bot], orders: [order] };
    const settlement = {
      success: caseName.success,
      outputCodec: caseName.outputCodec,
      actualFeeCodec: '1200000000000000000',
    };
    settleOrder(ledger, order.id, settlement);
    expect(order.status).toBe(caseName.status);
    expect(order.actualFeeCodec).toBe(settlement.actualFeeCodec);
    expect(bot.portfolio.feesPaidCodec).toBe(settlement.actualFeeCodec);
    expect(bot.portfolio.xorDeficitCodec).toBe('200000000000000000');
    expect(bot.portfolio.holdings[bot.policy.feeAsset.address]).toBe('0');
    expect(bot.portfolio.holdings[bot.assetIn.address]).toBe(caseName.input);
    expect(bot.portfolio.trades).toBe(caseName.trades);
    expect(bot.status).toBe('attention');
    expect(valuePortfolio(bot, { timestamp: 1, close: '2', feeClose: '3' })).toBe(caseName.value);
    expect(() => proposalInput(bot, { action: 'buy', amount: '1', reason: '' })).toThrow('bots.errors.balance');
    expect(() => validatePolicy(bot)).toThrow('bots.errors.balance');
    expect(() => assertAllocations([bot], bot.portfolio.initial)).toThrow('bots.errors.balance');
    const reopened = structuredClone(ledger);
    settleOrder(reopened, order.id, settlement);
    expect(reopened).toEqual(ledger);
    reopened.bots[0].status = 'stopped';
    const stale = structuredClone(reopened.bots[0]);
    stale.portfolio = structuredClone(executionBot().portfolio);
    saveBotRecord(reopened, stale);
    expect(reopened.bots[0].portfolio.xorDeficitCodec).toBe('200000000000000000');
    expect(reopened.bots[0].portfolio.feesPaidCodec).toBe(settlement.actualFeeCodec);
  });
  it('preserves a normal finalized fill and paid fee across a stopped bot stale save', () => {
    const bot = executionBot();
    const order = executionOrder();
    const ledger = { bots: [bot], orders: [order] };
    settleOrder(ledger, order.id, {
      success: true,
      outputCodec: '2000000000000000000',
      actualFeeCodec: '100000000000000000',
    });
    const settledPortfolio = structuredClone(bot.portfolio);
    const settledTradeAt = bot.state.lastTradeAt;
    const staleActive = structuredClone(bot);
    staleActive.activity = [];
    saveBotRecord(ledger, staleActive);
    expect(ledger.bots[0].activity.some((event) => event.id === order.id && event.kind === 'trade')).toBe(true);
    ledger.bots[0].status = 'stopped';
    const stale = structuredClone(ledger.bots[0]);
    stale.portfolio = structuredClone(executionBot().portfolio);
    stale.state.lastTradeAt = 0;
    stale.status = 'running';
    stale.activity = [];
    saveBotRecord(ledger, stale);
    expect(ledger.bots[0].portfolio).toEqual(settledPortfolio);
    expect(ledger.bots[0].state.lastTradeAt).toBe(settledTradeAt);
    expect(ledger.bots[0].status).toBe('stopped');
    expect(ledger.bots[0].activity.some((event) => event.id === order.id && event.kind === 'trade')).toBe(true);
    expect(ledger.orders[0].status).toBe('confirmed');
    expect(() => saveBotRecord(ledger, { ...stale, mode: 'paper' })).toThrow('bots.errors.policy');
  });
  it('does not restart a stopped live bot from an old UI snapshot before any fill', () => {
    const bot = executionBot();
    bot.status = 'stopped';
    const ledger = { bots: [bot], orders: [] };
    saveBotRecord(ledger, { ...structuredClone(bot), status: 'running' });
    expect(ledger.bots[0].status).toBe('stopped');
  });
  it('fails closed when IndexedDB is unavailable', async () => {
    await expect(createBotStorage(undefined).listBots()).rejects.toThrow('bots.errors.storage');
  });
  it('binds consent to every authority setting, network, and expiry', () => {
    const bot = executionBot();
    validatePolicy(bot);
    const original = consentIdentity(bot);
    bot.activity.push({ id: '1', kind: 'status', timestamp: 1, message: '' });
    expect(consentIdentity(bot)).toBe(original);
    bot.policy.slippagePercent = '6';
    expect(consentIdentity(bot)).not.toBe(original);
    const session = { botId: bot.id, account: bot.account, network: bot.network, expiresAt: bot.sessionExpiresAt };
    expect(() => assertSession(bot, session, executionStatus(), session.expiresAt)).toThrow('bots.errors.session');
    expect(() => assertSession({ ...bot, mode: 'paper' }, session, executionStatus())).toThrow('bots.errors.session');
    expect(() =>
      assertSession(bot, session, { ...executionStatus(), node: { ...executionStatus().node, genesisHash: 'changed' } })
    ).toThrow('bots.errors.session');
    bot.policy.sessionDurationMs = 1;
    expect(() => validatePolicy(bot)).toThrow('bots.errors.policy');
  });
});
