import { describe, expect, it, vi } from 'vitest';
import { XOR, VAL, PSWAP } from '@/lib/substrate/sdk/assets/consts';
import { toCodec } from '@/features/bot-trading/amounts';
import {
  createResearchBot,
  createResearchProgressEmitter,
  RESEARCH_DEFAULT_SETTINGS,
  runResearch,
  runResearchAsync,
  type ResearchProgress,
  type ResearchSettings,
} from '@/features/bot-trading/research';
import {
  createExperimentRunner,
  type ResearchWorkerMessage,
  type ResearchWorkerResponse,
} from '@/features/bot-trading/research-runner';
import {
  copyExperimentDefinition,
  makeExperimentSnapshot,
  type ExperimentDefinition,
  type ExperimentRun,
} from '@/features/bot-trading/experiments';
import {
  copyStoredExperiment,
  createExperimentStorage,
  retainExperiments,
} from '@/features/bot-trading/experiment-storage';
import type { ResearchFeeSnapshot } from '@/features/bot-trading/research-fees';
import type { BotDefinition, BotHistory, StrategyConfig } from '@/features/bot-trading/types';

const NOW = Date.UTC(2026, 8, 14, 12);
const HOUR = 3_600_000;
const assets = [XOR, VAL, PSWAP].map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));
const settings = (patch: Partial<ResearchSettings> = {}): ResearchSettings => ({
  ...RESEARCH_DEFAULT_SETTINGS,
  historyStartAt: undefined,
  historyEndAt: NOW,
  networkFeeXor: '0.1',
  swapFeePercent: '0.6',
  sellNetworkFeeXor: '0.2',
  sellSwapFeePercent: '0.8',
  priceImpactPercent: '0',
  sellPriceImpactPercent: '0',
  validation: 'holdout',
  ...patch,
});
/** Fabricated public observations strictly exercise the provider boundary; production imports no test prices. */
const history = (): BotHistory => ({
  candles: Array.from({ length: 70 }, (_, index) => ({
    timestamp: NOW - (69 - index) * HOUR,
    close: index % 4 < 2 ? '2' : '3',
    feeClose: '1',
  })),
  missing: 0,
  denominationVerified: true,
  identity: { genesisHash: `0x${'b'.repeat(64)}`, denominator: '1' },
});
const fees = (bot: BotDefinition): ResearchFeeSnapshot => ({
  networkFeeXor: '0.1',
  priceImpactPercent: '0',
  sellPriceImpactPercent: '0',
  networkFeeCodec: toCodec('0.1', 18),
  swapFeePercent: '0.6',
  sellNetworkFeeXor: '0.2',
  sellNetworkFeeCodec: toCodec('0.2', 18),
  sellSwapFeePercent: '0.8',
  queriedAt: NOW,
  expiresAt: NOW + 60_000,
  blockNumber: 10,
  blockHash: `0x${'a'.repeat(64)}`,
  genesisHash: `0x${'b'.repeat(64)}`,
  endpoint: 'wss://research-test.invalid',
  denominator: '1',
  amountIn: bot.strategy.amount,
  amountOut: '5',
  sellAmountIn: '5',
  sellAmountOut: '9',
  assetInAddress: bot.assetIn.address,
  assetOutAddress: bot.assetOut.address,
  dexId: 0,
  route: [bot.assetIn.address, bot.assetOut.address],
  routeFees: [],
  sellDexId: 0,
  sellRoute: [bot.assetOut.address, bot.assetIn.address],
  sellRouteFees: [],
});
const definition = (id = 'one', patch: Partial<ResearchSettings> = {}): ExperimentDefinition => ({
  id,
  name: `Study ${id}`,
  settings: settings(patch),
});
/** Short funded episodes remain separate from signal-only observations before funding. */
const goalDefinition = (): ExperimentDefinition => ({
  ...definition('goal', { validation: 'none', optimize: false, historyStartAt: NOW - 24 * HOUR }),
  goal: {
    title: 'Grow output',
    targetReturnPercent: '5',
    maxLossPercent: '5',
    durationMs: 24 * HOUR,
    valuationAsset: 'output',
    lossMetric: 'drawdown',
  },
  warmupCandles: history().candles.slice(-28, -25),
  outputTradeLimitCodec: toCodec('7', 18),
});
const goalHistory = (): BotHistory => ({ ...history(), candles: history().candles.slice(-25) });
function complete(id = 'one', createdAt = NOW): ExperimentRun {
  const def = definition(id);
  const result = runResearch(def.settings, assets, { kind: 'historical', history: history() }, NOW);
  return { ...def, createdAt, status: 'complete', progress: 1, result, fees: fees(result.bot) };
}
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

/** All external providers are injected; runner tests never contact a node or wallet. */
function harness(overrides: Partial<Parameters<typeof createExperimentRunner>[0]> = {}) {
  const updates: ExperimentRun[] = [];
  const loadHistory = vi.fn(async () => history());
  const loadFees = vi.fn(async (bot: BotDefinition) => fees(bot));
  const runner = createExperimentRunner({
    assets,
    loadHistory,
    loadFees,
    now: () => NOW,
    workerFactory: null,
    awaitProgress: async () => {},
    onUpdate: (run) => updates.push(run),
    ...overrides,
  });
  return { runner, updates, loadHistory, loadFees };
}

describe('parallel research computation', () => {
  it('validates and detaches only supported goal and pre-funding fields without changing legacy definitions', () => {
    const def = goalDefinition();
    Object.assign(def.goal!, { providerKey: 'excluded' });
    Object.assign(def.warmupCandles![0], { account: 'excluded' });
    const copied = copyExperimentDefinition(def);
    expect(copied.goal).toEqual(goalDefinition().goal);
    expect(copied.goal).not.toBe(def.goal);
    expect(copied.warmupCandles).toEqual(goalDefinition().warmupCandles);
    expect(copied.warmupCandles![0]).not.toBe(def.warmupCandles![0]);
    expect(copied.outputTradeLimitCodec).toBe(toCodec('7', 18));
    def.goal!.maxLossPercent = '99';
    def.warmupCandles![0].close = '999';
    expect(copied.goal!.maxLossPercent).toBe('5');
    expect(copied.warmupCandles![0].close).not.toBe('999');
    expect(copyExperimentDefinition(definition())).not.toHaveProperty('goal');
    expect(copyExperimentDefinition(definition())).not.toHaveProperty('warmupCandles');
    expect(copyExperimentDefinition(definition())).not.toHaveProperty('outputTradeLimitCodec');
  });

  it.each([
    ['null goal', { goal: null }],
    ['invalid duration', { goal: { ...goalDefinition().goal, durationMs: 1 } }],
    ['invalid valuation', { goal: { ...goalDefinition().goal, valuationAsset: 'usd' } }],
    ['context without goal', { goal: undefined }],
    ['noncanonical output cap', { outputTradeLimitCodec: '01' }],
    ['zero output cap', { outputTradeLimitCodec: '0' }],
    ['future warmup', { warmupCandles: [{ timestamp: NOW, close: '1' }] }],
    ['misaligned warmup', { warmupCandles: [{ timestamp: NOW - 25 * HOUR + 1, close: '1' }] }],
    ['negative warmup', { warmupCandles: [{ timestamp: -HOUR, close: '1' }] }],
    ['invalid price', { warmupCandles: [{ timestamp: NOW - 25 * HOUR, close: '1e3' }] }],
    ['invalid fee price', { warmupCandles: [{ timestamp: NOW - 25 * HOUR, close: '1', feeClose: '0' }] }],
    ['sparse warmup', { warmupCandles: new Array(2) }],
    [
      'warmup gap',
      {
        warmupCandles: [
          { timestamp: NOW - 27 * HOUR, close: '1' },
          { timestamp: NOW - 25 * HOUR, close: '1' },
        ],
      },
    ],
    [
      'oversized contiguous warmup',
      {
        warmupCandles: Array.from({ length: 202 }, (_, index) => ({
          timestamp: NOW - (226 - index) * HOUR,
          close: '1',
        })),
      },
    ],
  ])('rejects %s before loading evidence or starting workers', async (_label, patch) => {
    const workerFactory = vi.fn();
    const h = harness({ workerFactory });
    await expect(h.runner.run([{ ...goalDefinition(), ...patch } as ExperimentDefinition])).rejects.toThrow();
    expect(h.loadHistory).not.toHaveBeenCalled();
    expect(h.loadFees).not.toHaveBeenCalled();
    expect(workerFactory).not.toHaveBeenCalled();
  });

  it.each(['worker', 'fallback', 'startup-error', 'worker-error'] as const)(
    'preserves the immutable goal, warmup and fixed output cap through %s evaluation',
    async (mode) => {
      const def = goalDefinition();
      def.warmupCandles = Array.from({ length: 201 }, (_, index) => ({
        timestamp: def.settings.historyStartAt! - (201 - index) * HOUR,
        close: '2',
      }));
      const expectedDefinition = copyExperimentDefinition(def);
      expect(expectedDefinition.warmupCandles).toHaveLength(201);
      const sent: ResearchWorkerMessage[] = [];
      const worker = {
        onmessage: null as ((event: MessageEvent<ResearchWorkerResponse>) => void) | null,
        onerror: null as (() => void) | null,
        terminate: vi.fn(),
        postMessage(message: ResearchWorkerMessage) {
          if ('type' in message) return;
          sent.push(message);
          if (mode === 'worker-error') {
            queueMicrotask(() => this.onerror?.());
            return;
          }
          const result = runResearch(
            message.settings,
            message.assets,
            { kind: 'historical', history: message.history },
            message.now,
            {
              goal: message.goal,
              warmupCandles: message.warmupCandles,
              outputTradeLimitCodec: message.outputTradeLimitCodec,
            }
          );
          queueMicrotask(() =>
            this.onmessage?.({
              data: { id: message.id, type: 'complete', result },
            } as MessageEvent<ResearchWorkerResponse>)
          );
        },
      };
      const workerFactory =
        mode === 'fallback'
          ? null
          : () => {
              if (mode === 'startup-error') throw new Error('unavailable');
              return worker as unknown as Worker;
            };
      const h = harness({ workerFactory, loadHistory: async () => goalHistory() });
      const pending = h.runner.run([def]);
      def.goal!.maxLossPercent = '99';
      def.warmupCandles![0].close = '999';
      def.outputTradeLimitCodec = '1';
      const [run] = await pending;
      expect(run.status).toBe('complete');
      expect(run.goal).toEqual(expectedDefinition.goal);
      expect(run.warmupCandles).toEqual(expectedDefinition.warmupCandles);
      expect(run.result!.bot.goal).toEqual(expectedDefinition.goal);
      expect(run.result!.bot).not.toHaveProperty('goalState');
      expect(run.result!.bot.policy.maxTradeCodec[VAL.address]).toBe(toCodec('7', 18));
      const expected = runResearch(run.settings, assets, { kind: 'historical', history: goalHistory() }, NOW, {
        goal: expectedDefinition.goal,
        warmupCandles: expectedDefinition.warmupCandles,
        outputTradeLimitCodec: expectedDefinition.outputTradeLimitCodec,
      });
      expect(run.result).toEqual(expected);
      const stored = copyStoredExperiment(run);
      expect(stored.warmupCandles).toHaveLength(201);
      expect(stored.result!.goalEvaluation!.warmupCandles).toEqual(expectedDefinition.warmupCandles);
      expect(sent).toHaveLength(mode === 'worker' || mode === 'worker-error' ? 1 : 0);
      if (sent.length)
        expect(sent[0]).toMatchObject({
          goal: expectedDefinition.goal,
          warmupCandles: expectedDefinition.warmupCandles,
          outputTradeLimitCodec: toCodec('7', 18),
        });
      h.runner.dispose();
    }
  );

  it.each(['live-price', 'closed-hour'] as const)(
    'preserves explicit %s timing through worker transport, fallback and stored research',
    async (signalTiming) => {
      const def = definition('timing', { preset: 'sma', signalTiming });
      expect(copyExperimentDefinition(def).settings.signalTiming).toBe(signalTiming);
      const sent: ResearchWorkerMessage[] = [];
      const worker = {
        onmessage: null as ((event: MessageEvent<ResearchWorkerResponse>) => void) | null,
        onerror: null,
        terminate: vi.fn(),
        postMessage(message: ResearchWorkerMessage) {
          if ('type' in message) return;
          sent.push(message);
          const result = runResearch(
            message.settings,
            message.assets,
            { kind: 'historical', history: message.history },
            message.now,
            { strategy: message.strategy }
          );
          queueMicrotask(() =>
            this.onmessage?.({
              data: { id: message.id, type: 'complete', result },
            } as MessageEvent<ResearchWorkerResponse>)
          );
        },
      };
      for (const workerFactory of [null, () => worker as unknown as Worker]) {
        const h = harness({ workerFactory });
        const [run] = await h.runner.run([def]);
        expect(run.status).toBe('complete');
        const stored = copyStoredExperiment(run);
        expect(stored.settings.signalTiming).toBe(signalTiming);
        expect(stored.result!.settings.signalTiming).toBe(signalTiming);
        expect(stored.result!.bot.strategy.signalTiming).toBe(signalTiming);
        expect(stored.result!.recommendedSettings.signalTiming).toBe(signalTiming);
        expect(stored.result!.source.history.candles).toEqual(history().candles);
      }
      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({ settings: { signalTiming } });
      expect(sent[0]).not.toHaveProperty('goal');
      expect(sent[0]).not.toHaveProperty('warmupCandles');
      expect(sent[0]).not.toHaveProperty('outputTradeLimitCodec');
      expect(copyExperimentDefinition(definition()).settings).not.toHaveProperty('signalTiming');
    }
  );

  it('detaches exact rule conditions across definitions, worker fallback and completed storage', async () => {
    const def = definition('rules');
    def.strategy = createResearchBot(def.settings, assets, NOW).strategy;
    def.strategy.kind = 'rules';
    def.strategy.rules = {
      version: 1,
      entry: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'above' }] },
      exit: { operator: 'any', conditions: [{ kind: 'trend', window: 2, direction: 'below' }] },
    };
    const detached = copyExperimentDefinition(def);
    expect(detached.strategy!.rules).toEqual(def.strategy.rules);
    expect(detached.strategy!.rules!.entry.conditions[0]).not.toBe(def.strategy.rules.entry.conditions[0]);
    const h = harness();
    const [run] = await h.runner.run([def]);
    expect(run.status).toBe('complete');
    expect(run.result!.bot.strategy.rules).toEqual(def.strategy.rules);
    const stored = copyStoredExperiment(run);
    expect(stored.strategy!.rules).toEqual(def.strategy.rules);
    expect(stored.result!.bot.strategy.rules).toEqual(def.strategy.rules);
    def.strategy.rules.entry.conditions[0].window = 7;
    expect(stored.result!.bot.strategy.rules!.entry.conditions[0].window).toBe(2);
    expect(stored.strategy!.rules!.entry.conditions[0].window).toBe(2);
    expect(run.result!.bot.strategy.rules!.entry.conditions[0].window).toBe(2);
    const invalid = structuredClone(stored);
    Object.assign(invalid.result!.bot.strategy.rules!.entry.conditions[0], { prompt: '' });
    expect(() => copyStoredExperiment(invalid)).toThrow();
  });

  it('freezes nested rules before asynchronous study checkpoints and validation folds', async () => {
    const input = settings();
    const strategy = createResearchBot(input, assets, NOW).strategy;
    strategy.kind = 'rules';
    strategy.rules = {
      version: 1,
      entry: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'above' }] },
      exit: null,
    };
    const source = { kind: 'historical' as const, history: history() };
    const expected = runResearch(input, assets, source, NOW, { strategy });
    const actual = await runResearchAsync(input, assets, source, NOW, {
      strategy,
      awaitProgress: async () => {
        strategy.rules!.entry.conditions[0].window = 200;
      },
    });
    expect(actual).toEqual(expected);
  });

  it('bounds progress delivery without delaying phase transitions or final computation evidence', () => {
    let time = 0;
    const emit = vi.fn();
    const report = createResearchProgressEmitter(emit, () => time);
    let sample!: ResearchProgress;
    runResearch(settings(), assets, { kind: 'historical', history: history() }, NOW, {
      onProgress: (value) => {
        sample ??= value;
      },
    });
    const progress: ResearchProgress = {
      ...sample,
      phase: 'replay',
      completed: 32,
      total: 1000,
      equity: [],
      trades: 1,
      timestamp: NOW,
    };
    report(progress);
    for (let index = 1; index < 10; index++) {
      time = index * 5;
      report({ ...progress, completed: 32 + index });
    }
    expect(emit).toHaveBeenCalledTimes(1);
    time = 50;
    report({ ...progress, completed: 50 });
    report({ ...progress, phase: 'validation', completed: 70 });
    report({ ...progress, phase: 'validation', completed: 1000 });
    expect(emit.mock.calls.map(([value]) => value.completed)).toEqual([32, 50, 70, 1000]);
  });

  it('preserves synchronous exact accounting in its asynchronous slices and reports only processed bars', async () => {
    const input = settings({ validation: 'walk-forward', optimize: true });
    const source = { kind: 'historical' as const, history: history() };
    const progress: ResearchProgress[] = [];
    const expected = runResearch(input, assets, source, NOW);
    const result = await runResearchAsync(input, assets, source, NOW, {
      onProgress: (value) => progress.push(value),
      awaitProgress: async () => {},
    });
    expect(result).toEqual(expected);
    expect(progress[0].completed).toBe(32);
    expect(progress[0].timestamp).toBe(source.history.candles[32].timestamp);
    expect(progress.at(-1)!.completed).toBe(progress.at(-1)!.total);
    expect(progress.map((item) => item.completed)).toEqual(
      [...progress.map((item) => item.completed)].sort((a, b) => a - b)
    );
    expect(progress.map((item) => item.checkpoint)).toEqual(progress.map((_item, index) => index + 1));
    expect(progress.every((item) => item.timestamp === item.decisions.at(-1)!.timestamp)).toBe(true);
    expect(progress.every((item) => item.decisions.length > 0 && item.decisions.length <= 32)).toBe(true);
    expect(progress.flatMap((item) => item.candidates)).toEqual(result.candidates);
    expect(progress.flatMap((item) => item.tradeMarkers)).toEqual(result.tradeMarkers);
    const study = progress.filter((item) => item.scope === 'study');
    expect(study.at(-1)!.summary).toEqual(result.summary);
    expect(study.at(-1)!.costs).toEqual(result.costs);
    expect(study.at(-1)!.result).toEqual(result.result);
    for (const item of progress) {
      for (const totals of Object.values(item.gateTotals))
        expect(totals.passed + totals.rejected).toBe(item.scopeCompleted);
    }
    const validation = progress.filter((item) => item.phase === 'validation');
    expect(validation.every((item) => item.candidates.length === 0 && item.tradeMarkers.length === 0)).toBe(true);
    expect(validation.every((item) => item.decisions.every((decision) => decision.pnl === undefined))).toBe(true);
    expect(validation.every((item) => item.result.equity.at(-1)!.timestamp === NOW)).toBe(true);
    expect(new Set(validation.map((item) => `${item.scope}:${item.fold}:${item.variant}`))).toContain(
      'test:3:undefined'
    );
  });

  it('does not calculate the next slice or finish until its actual checkpoint is acknowledged', async () => {
    const gates: Array<ReturnType<typeof deferred<void>>> = [];
    const progress: ResearchProgress[] = [];
    let finished = false;
    const computation = runResearchAsync(
      settings({ validation: 'none' }),
      assets,
      {
        kind: 'historical',
        history: history(),
      },
      NOW,
      {
        onProgress: (value) => progress.push(value),
        awaitProgress: () => {
          const gate = deferred<void>();
          gates.push(gate);
          return gate.promise;
        },
      }
    ).then((result) => {
      finished = true;
      return result;
    });
    expect(progress.map((item) => item.completed)).toEqual([32]);
    await Promise.resolve();
    expect(progress).toHaveLength(1);
    gates[0].resolve();
    await Promise.resolve();
    expect(progress.map((item) => item.completed)).toEqual([32, 64]);
    gates[1].resolve();
    await Promise.resolve();
    expect(progress.map((item) => item.completed)).toEqual([32, 64, 69]);
    expect(finished).toBe(false);
    gates[2].resolve();
    const result = await computation;
    expect(finished).toBe(true);
    expect(progress.flatMap((item) => item.candidates)).toEqual(result.candidates);
  });

  it('keeps streamed evidence detached from the final exact result', () => {
    const expected = runResearch(settings(), assets, { kind: 'historical', history: history() }, NOW);
    const result = runResearch(settings(), assets, { kind: 'historical', history: history() }, NOW, {
      onProgress: (progress) => {
        progress.bot.strategy.amount = '999';
        progress.result.portfolio.holdings[XOR.address] = '0';
        if (progress.candidates[0]) progress.candidates[0].checks[0].passed = false;
        progress.gateTotals.signal.passed = -1;
      },
    });
    expect(result).toEqual(expected);
  });

  it('yields to cancellation before further price processing', async () => {
    const controller = new AbortController();
    const progress = vi.fn(() => controller.abort());
    await expect(
      runResearchAsync(settings(), assets, { kind: 'historical', history: history() }, NOW, {
        signal: controller.signal,
        onProgress: progress,
      })
    ).rejects.toThrow('bots.errors.stale');
    expect(progress).toHaveBeenCalledTimes(1);
  });

  it('retains a reviewed absolute threshold, direction, exact amount and subhour cadence in held-out evaluation', () => {
    const config = settings({ preset: 'threshold', validation: 'holdout' });
    const strategy: StrategyConfig = {
      kind: 'threshold',
      amount: '7.000000000000000001',
      intervalMs: 120_000,
      threshold: '2.5',
      direction: 'above',
      fastWindow: 3,
      slowWindow: 8,
      prompt: '',
    };
    const source = { kind: 'historical' as const, history: history() };
    const output = runResearch(config, assets, source, NOW, { strategy });
    expect(output.bot.strategy).toEqual(strategy);
    expect(output.bot.policy.maxTradeCodec[XOR.address]).toBe('7000000000000000001');
    expect(
      output.candidates
        .filter((candidate) => candidate.selected)
        .every((candidate) => candidate.amount === strategy.amount)
    ).toBe(true);
    const fold = output.validation.folds[0];
    const testHistory = {
      ...source.history,
      candles: source.history.candles.filter((candle) => candle.timestamp >= fold.testStart),
    };
    const independent = runResearch(
      { ...config, validation: 'none' },
      assets,
      { kind: 'historical', history: testHistory },
      NOW,
      { strategy }
    );
    expect(fold.test).toEqual(independent.result);
    expect(() => runResearch({ ...config, optimize: true }, assets, source, NOW, { strategy })).toThrow(
      'bots.errors.config'
    );
    expect(() => createResearchBot(config, assets, NOW, { ...strategy, amount: '100.000000000000000001' })).toThrow(
      'bots.errors.amount'
    );
  });

  it('runs independent selected pairs with exact directional fee observations and detached updates', async () => {
    const h = harness();
    const input = [
      definition('xor-val'),
      definition('val-xor', { assetInAddress: VAL.address, assetOutAddress: XOR.address }),
    ];
    const result = await h.runner.run(input);
    expect(result.map((item) => item.status)).toEqual(['complete', 'complete']);
    expect(h.loadFees.mock.calls.map(([bot]) => bot.assetIn.address)).toEqual([XOR.address, VAL.address]);
    expect(result[0].result!.assumptions.sellNetworkFeeXor).toBe('0.2');
    expect(input[0].settings.sellNetworkFeeXor).toBe('0.2');
    const prior = h.updates.find((item) => item.status === 'queued')!;
    expect(prior.result).toBeUndefined();
    prior.settings.capital = '999';
    expect(result[0].settings.capital).toBe('100');
    const checkpoints = h.updates.filter((item) => item.id === 'xor-val' && item.partial);
    expect(checkpoints.every((item) => item.partial!.scopeDecisions!.length === item.partial!.scopeCompleted)).toBe(
      true
    );
    expect(checkpoints.some((item) => item.partial!.scopeDecisions!.length > 32)).toBe(true);
    expect(result[0].partial).toBeUndefined();
  });

  it('retains immutable cumulative study outcomes across study batches and validation scopes', async () => {
    const h = harness();
    const [result] = await h.runner.run([definition()]);
    const partials = h.updates.flatMap((update) => (update.partial ? [update.partial] : []));
    const study = partials.filter((partial) => partial.scope === 'study');
    expect(study.length).toBeGreaterThan(1);
    let accumulated = 0;
    for (const partial of study) {
      accumulated += partial.candidates.length;
      expect(partial.studyCandidates).toHaveLength(accumulated);
      expect(new Set(partial.studyCandidates!.map((candidate) => candidate.id)).size).toBe(accumulated);
    }
    expect(study[0].studyCandidates).toHaveLength(study[0].candidates.length);
    const validation = partials.filter((partial) => partial.scope !== 'study');
    expect(validation.length).toBeGreaterThan(0);
    for (const partial of validation) {
      expect(partial.candidates).toEqual([]);
      expect(partial.studyCandidates).toEqual(result.result!.candidates);
    }
    expect(result.partial).toBeUndefined();
  });

  it('acknowledges worker checkpoints only after presentation and cancels a waiting worker promptly', async () => {
    const sample: ResearchProgress[] = [];
    runResearch(settings(), assets, { kind: 'historical', history: history() }, NOW, {
      onProgress: (progress) => sample.push(progress),
    });
    const rendered = deferred<void>();
    const messages: ResearchWorkerMessage[] = [];
    const worker = {
      onmessage: null as ((event: MessageEvent<ResearchWorkerResponse>) => void) | null,
      onerror: null,
      terminate: vi.fn(),
      postMessage(message: ResearchWorkerMessage) {
        messages.push(message);
        if (!('type' in message))
          queueMicrotask(() =>
            this.onmessage?.({
              data: {
                id: message.id,
                type: 'progress',
                partial: sample[0],
              },
            } as MessageEvent<ResearchWorkerResponse>)
          );
      },
    };
    const h = harness({ workerFactory: () => worker as unknown as Worker, awaitProgress: () => rendered.promise });
    const running = h.runner.run([definition()]);
    await vi.waitFor(() => expect(h.updates.some((item) => item.partial?.checkpoint === 1)).toBe(true));
    expect(messages).toHaveLength(1);
    rendered.resolve();
    await Promise.resolve();
    expect(messages[1]).toEqual({ id: 'one', type: 'acknowledge', checkpoint: 1 });
    h.runner.cancel();
    expect((await running)[0].status).toBe('cancelled');
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('preserves exact one-block cadence and optimizes block counts without inventing higher-resolution history', () => {
    const config = settings({ intervalBlocks: 1, intervalHours: 12, optimize: true });
    const result = runResearch(config, assets, { kind: 'historical', history: history() }, NOW);
    expect(result.bot.strategy.intervalMs).toBe(6_000);
    expect(result.source.history.candles).toHaveLength(70);
    expect(result.source.history.candles[1].timestamp - result.source.history.candles[0].timestamp).toBe(HOUR);
    expect(result.validation.folds[0].searchCount).toBe(2);
    expect([1, 2]).toContain(result.recommendedSettings.intervalBlocks);
    expect(copyExperimentDefinition({ ...definition(), settings: config }).settings.intervalBlocks).toBe(1);
    expect(copyStoredExperiment({ ...complete(), settings: config, result }).settings.intervalBlocks).toBe(1);
  });

  it('opts only historical experiments into dated finalized fees and preserves their timestamp through saving', async () => {
    const finalizedAt = NOW - 80 * 60_000;
    const loadFees = vi.fn(async (bot: BotDefinition) => ({ ...fees(bot), finalizedAt }));
    const h = harness({ loadFees });
    const [run] = await h.runner.run([definition()]);
    expect(loadFees).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), {
      allowHistoricalFinalizedState: true,
    });
    expect(run.status).toBe('complete');
    expect(run.fees?.finalizedAt).toBe(finalizedAt);
    expect(copyStoredExperiment(run).fees?.finalizedAt).toBe(finalizedAt);
    expect(makeExperimentSnapshot(run.result!, run.fees!).feeObservation?.finalizedAt).toBe(finalizedAt);
  });

  it.each(['priceImpactPercent', 'sellPriceImpactPercent'] as const)(
    'rejects fresh fee evidence missing %s before starting any computation',
    async (field) => {
      const workerFactory = vi.fn();
      const h = harness({
        workerFactory,
        loadFees: async (bot) => {
          const snapshot: Partial<ResearchFeeSnapshot> = fees(bot);
          delete snapshot[field];
          return snapshot as ResearchFeeSnapshot;
        },
      });
      const [run] = await h.runner.run([definition()]);
      expect(run).toMatchObject({ status: 'error', progress: 0, error: 'bots.errors.stale' });
      expect(run.result).toBeUndefined();
      expect(run.fees).toBeUndefined();
      expect(h.updates.some((value) => value.status === 'running')).toBe(false);
      expect(workerFactory).not.toHaveBeenCalled();
    }
  );

  it.each(['worker', 'fallback'] as const)(
    'replaces saved assumptions with observed directional impact through %s replay and persisted evidence',
    async (execution) => {
      const observedImpact = { priceImpactPercent: '20', sellPriceImpactPercent: '30' };
      const def = definition('impact', {
        validation: 'none',
        intervalHours: 1,
        intervalBlocks: undefined,
        slippagePercent: '1',
        priceImpactPercent: '0.01',
        sellPriceImpactPercent: '0.02',
      });
      def.strategy = {
        ...createResearchBot(def.settings, assets, NOW).strategy,
        kind: 'rules',
        rules: {
          version: 1,
          entry: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'above' }] },
          exit: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'below' }] },
        },
      };
      const market = history();
      market.candles = ['1', '2', '2', '1', '1'].map((close, index) => ({
        timestamp: NOW - (4 - index) * HOUR,
        close,
        feeClose: '1',
      }));
      const sent: ResearchWorkerMessage[] = [];
      const worker = {
        onmessage: null as ((event: MessageEvent<ResearchWorkerResponse>) => void) | null,
        onerror: null,
        terminate: vi.fn(),
        postMessage(message: ResearchWorkerMessage) {
          if ('type' in message) return;
          sent.push(message);
          const result = runResearch(
            message.settings,
            message.assets,
            { kind: 'historical', history: message.history },
            message.now,
            { strategy: message.strategy }
          );
          queueMicrotask(() =>
            this.onmessage?.({
              data: { id: message.id, type: 'complete', result },
            } as MessageEvent<ResearchWorkerResponse>)
          );
        },
      };
      const h = harness({
        workerFactory: execution === 'worker' ? () => worker as unknown as Worker : null,
        loadHistory: async () => market,
        loadFees: async (bot) => ({ ...fees(bot), swapFeePercent: '2', sellSwapFeePercent: '3', ...observedImpact }),
      });
      const [run] = await h.runner.run([def]);
      expect(run.status).toBe('complete');
      expect(run.result!.tradeMarkers.map((trade) => [trade.action, trade.outputCodec])).toEqual([
        ['buy', toCodec('3.8808', 18)],
        ['sell', toCodec('2.608712568', 18)],
      ]);
      expect(sent).toHaveLength(execution === 'worker' ? 1 : 0);
      if (execution === 'worker') expect(sent[0]).toMatchObject({ settings: observedImpact });
      expect(def.settings).toMatchObject({ priceImpactPercent: '0.01', sellPriceImpactPercent: '0.02' });
      const stored = copyStoredExperiment(JSON.parse(JSON.stringify(run)) as ExperimentRun);
      for (const value of [
        stored.settings,
        stored.fees,
        stored.result!.settings,
        stored.result!.assumptions,
        stored.result!.recommendedSettings,
        makeExperimentSnapshot(stored.result!, stored.fees!),
      ])
        expect(value).toMatchObject(observedImpact);
      stored.settings.priceImpactPercent = '99';
      stored.result!.assumptions.sellPriceImpactPercent = '99';
      expect(run.settings.priceImpactPercent).toBe('20');
      expect(run.result!.assumptions.sellPriceImpactPercent).toBe('30');
    }
  );

  it.each([0, -1, 0.5, Number.NaN, NOW + 30_001])(
    'rejects invalid finalized fee provenance %s before computation',
    async (finalizedAt) => {
      const h = harness({ loadFees: async (bot) => ({ ...fees(bot), finalizedAt }) });
      const [run] = await h.runner.run([definition()]);
      expect(run).toMatchObject({ status: 'error', progress: 0, error: 'bots.errors.stale' });
      expect(h.updates.some((value) => value.status === 'running')).toBe(false);
      const stored = complete();
      stored.fees!.finalizedAt = finalizedAt;
      expect(() => copyStoredExperiment(stored)).toThrow('bots.errors.storage');
    }
  );

  it.each(['expired', 'chain', 'denominator', 'pair', 'notional'] as const)(
    'rejects %s fee/history mismatch before processing',
    async (failure) => {
      const h = harness({
        loadFees: async (bot) => {
          const snapshot = fees(bot);
          if (failure === 'expired') snapshot.expiresAt = NOW;
          if (failure === 'chain') snapshot.genesisHash = 'different';
          if (failure === 'denominator') snapshot.denominator = '10';
          if (failure === 'pair') snapshot.assetOutAddress = XOR.address;
          if (failure === 'notional') snapshot.amountIn = '11';
          return snapshot;
        },
      });
      const [run] = await h.runner.run([definition()]);
      expect(run).toMatchObject({ status: 'error', progress: 0, error: 'bots.errors.stale' });
      expect(h.updates.some((value) => value.status === 'running')).toBe(false);
    }
  );

  it('bounds concurrent loading, cancels promptly, and ignores late results from a replaced batch', async () => {
    const pending: Array<ReturnType<typeof deferred<BotHistory>>> = [];
    let firstBatch = true;
    const h = harness({
      loadHistory: () => {
        if (!firstBatch) return Promise.resolve(history());
        const next = deferred<BotHistory>();
        pending.push(next);
        return next.promise;
      },
    });
    const running = h.runner.run([definition('old-a'), definition('old-b'), definition('old-c')]);
    await vi.waitFor(() => expect(pending).toHaveLength(2));
    firstBatch = false;
    const replaced = h.runner.run([definition('current')]);
    expect((await running).every((item) => item.status === 'cancelled')).toBe(true);
    const current = await replaced;
    pending.forEach((promise) => promise.resolve(history()));
    await Promise.resolve();
    expect(current[0].status).toBe('complete');
    expect(h.updates.filter((item) => item.id.startsWith('old') && item.status === 'complete')).toHaveLength(0);
  });

  it('requires distinct selected tokens and unique bounded batch ids before querying providers', async () => {
    const h = harness();
    await expect(
      h.runner.run([definition('same', { assetInAddress: VAL.address, assetOutAddress: VAL.address })])
    ).rejects.toThrow('bots.errors.config');
    await expect(h.runner.run([definition('same'), definition('same')])).rejects.toThrow('bots.errors.config');
    await expect(h.runner.run(Array.from({ length: 37 }, (_, index) => definition(`n${index}`)))).rejects.toThrow(
      'bots.errors.config'
    );
    expect(h.loadFees).not.toHaveBeenCalled();
  });

  it('turns worker startup failures into exact yielding fallback and keeps completed funds unallocated', async () => {
    const h = harness({
      workerFactory: () => {
        throw new Error('unsupported');
      },
    });
    const [run] = await h.runner.run([definition()]);
    expect(run.status).toBe('complete');
    expect(run.result!.result.trades).toBeGreaterThan(0);
    expect(run.result!.bot.portfolio.trades).toBe(0);
    expect(run.result!.bot.portfolio.holdings).toEqual(run.result!.bot.portfolio.initial);
    expect(makeExperimentSnapshot(run.result!, run.fees!)).toMatchObject({
      source: 'historical',
      feeObservation: { amountIn: '10' },
    });
  });

  it('restarts scope evidence cleanly if a worker fails after its first checkpoint', async () => {
    let first!: ResearchProgress;
    runResearch(settings(), assets, { kind: 'historical', history: history() }, NOW, {
      onProgress: (progress) => {
        first ??= progress;
      },
    });
    const worker = {
      onmessage: null as ((event: MessageEvent<ResearchWorkerResponse>) => void) | null,
      onerror: null as (() => void) | null,
      terminate: vi.fn(),
      postMessage(message: ResearchWorkerMessage) {
        if ('type' in message) return;
        queueMicrotask(() => {
          this.onmessage?.({
            data: { id: message.id, type: 'progress', partial: first },
          } as MessageEvent<ResearchWorkerResponse>);
          this.onerror?.();
        });
      },
    };
    const h = harness({ workerFactory: () => worker as unknown as Worker });
    const [result] = await h.runner.run([definition()]);
    expect(result.status).toBe('complete');
    const partials = h.updates.flatMap((update) => (update.partial ? [update.partial] : []));
    expect(partials.filter((partial) => partial.checkpoint === 1)).toHaveLength(2);
    expect(partials.every((partial) => partial.scopeDecisions!.length === partial.scopeCompleted)).toBe(true);
    for (const partial of partials.filter((partial) => partial.scope === 'study')) {
      expect(partial.studyCandidates).toHaveLength(partial.scopeCompleted);
      expect(new Set(partial.studyCandidates!.map((candidate) => candidate.id)).size).toBe(partial.scopeCompleted);
    }
    expect(partials.at(-1)!.studyCandidates).toEqual(result.result!.candidates);
    expect(result.result).toEqual(complete().result);
  });
});

describe('separate public research library', () => {
  it('round-trips comparable validation evidence and still accepts older completed studies', () => {
    const run = complete();
    const stored = copyStoredExperiment(run);
    expect(stored.result!.validation.folds).toEqual(run.result!.validation.folds);
    const evidence = stored.result!.validation.folds[0].testEvidence!;
    expect(evidence.benchmark!.trades).toBe(1);
    expect(evidence.candidateCount).toBe(evidence.candleCount - 1);
    evidence.benchmark!.finalValue = '999';
    expect(run.result!.validation.folds[0].testEvidence!.benchmark!.finalValue).not.toBe('999');
    const old = structuredClone(run);
    for (const fold of old.result!.validation.folds) {
      delete fold.trainEvidence;
      delete fold.testEvidence;
      delete fold.selectionObjective;
      delete fold.purge;
    }
    expect(copyStoredExperiment(old).result!.validation.folds).toEqual(old.result!.validation.folds);
    const unavailable = structuredClone(run);
    unavailable.result!.validation.folds[0].testEvidence!.benchmark = null;
    unavailable.result!.validation.folds[0].testEvidence!.excessReturnPercent = null;
    expect(copyStoredExperiment(unavailable).result!.validation.folds[0].testEvidence!.benchmark).toBeNull();
  });

  it('rejects malformed or secret-bearing validation metadata at the persistence boundary', () => {
    const run = complete();
    for (const mutate of [
      (value: ExperimentRun) => {
        value.result!.validation.folds[0].testEvidence!.returnPerDayPercent = '<script>';
      },
      (value: ExperimentRun) => {
        value.result!.validation.folds[0].testEvidence!.excessReturnPercent = 'NaN';
      },
      (value: ExperimentRun) => {
        value.result!.validation.folds[0].testEvidence!.benchmark!.finalValue = 'Infinity';
      },
      (value: ExperimentRun) => {
        value.result!.validation.folds[0].testEvidence!.durationMs = Infinity;
      },
      (value: ExperimentRun) => {
        Object.assign(value.result!.validation.folds[0].testEvidence!, { apiKey: 'secret' });
      },
    ]) {
      const invalid = structuredClone(run);
      mutate(invalid);
      expect(() => copyStoredExperiment(invalid)).toThrow('bots.errors.storage');
    }
  });

  it('saves reproducible completed evidence and omits caller credentials outside the definition contract', () => {
    const run = complete();
    const unsafe = { ...run, apiKey: 'never-store', settings: { ...run.settings, apiKey: 'never-store' } };
    const copy = copyStoredExperiment(unsafe);
    expect(JSON.stringify(copy)).not.toContain('never-store');
    copy.result!.candidates[0].amount = '999';
    expect(run.result!.candidates[0].amount).not.toBe('999');
    expect(copyExperimentDefinition({ ...definition(), name: '  A study  ' }).name).toBe('A study');
  });

  it('rejects injected wallet identity, provider secrets and malformed nested cached data', () => {
    const run = complete();
    for (const mutate of [
      (value: ExperimentRun) => {
        value.result!.bot.account = 'wallet-account';
      },
      (value: ExperimentRun) => {
        Object.assign(value.result!, { apiKey: 'secret' });
      },
      (value: ExperimentRun) => {
        value.fees!.endpoint = 'wss://user:secret@example.test';
      },
      (value: ExperimentRun) => {
        value.result!.result.returnPercent = '<script>';
      },
      (value: ExperimentRun) => {
        value.status = 'running';
      },
    ]) {
      const invalid = structuredClone(run);
      mutate(invalid);
      expect(() => copyStoredExperiment(invalid)).toThrow();
    }
  });

  it('retains at most 36 recent studies, replaces ids and discards corrupt entries without touching the input', () => {
    const baseline = complete();
    const records = Array.from({ length: 39 }, (_, index) => ({
      ...baseline,
      id: `study-${index}`,
      createdAt: NOW + index,
    }));
    const output = retainExperiments(records);
    expect(output).toHaveLength(36);
    expect(output[0].id).toBe('study-38');
    expect(records).toHaveLength(39);
    expect(retainExperiments([baseline], { ...baseline, name: 'Replaced' })).toHaveLength(1);
    expect(retainExperiments([{ ...baseline, status: 'error' }])).toEqual([]);
  });

  it('uses an isolated database and store for save/list/delete transactions, never the execution ledger', async () => {
    const values = new Map<string, unknown>();
    const writes: string[] = [];
    const stores: string[] = [];
    const db = {
      createObjectStore: vi.fn(),
      close: vi.fn(),
      onversionchange: null,
      transaction: (name: string) => {
        stores.push(name);
        const tx = {
          oncomplete: null as (() => void) | null,
          onabort: null as (() => void) | null,
          onerror: null as (() => void) | null,
          abort: () => queueMicrotask(() => tx.onabort?.()),
          objectStore: () => ({
            get: (key: string) => {
              const request = { result: structuredClone(values.get(key)), onsuccess: null as (() => void) | null };
              queueMicrotask(() => {
                request.onsuccess?.();
                queueMicrotask(() => tx.oncomplete?.());
              });
              return request;
            },
            put: (value: unknown, key: string) => {
              writes.push(key);
              return values.set(key, structuredClone(value));
            },
            delete: (key: string) => values.delete(key),
          }),
        };
        return tx;
      },
    };
    const open = vi.fn(() => {
      const request = {
        result: db,
        onupgradeneeded: null as (() => void) | null,
        onsuccess: null as (() => void) | null,
        onerror: null,
        onblocked: null,
      };
      queueMicrotask(() => {
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    });
    const storage = createExperimentStorage({ open } as unknown as IDBFactory);
    const observedImpact = { priceImpactPercent: '1.380000000000000001', sellPriceImpactPercent: '1.34' };
    const h = harness({ loadFees: async (bot) => ({ ...fees(bot), ...observedImpact }) });
    const [run] = await h.runner.run([definition()]);
    expect(run.status).toBe('complete');
    await storage.save(run);
    const [saved] = await storage.list();
    expect(saved.id).toBe('one');
    expect(saved.settings).toMatchObject(observedImpact);
    expect(saved.fees).toMatchObject(observedImpact);
    expect(saved.result!.assumptions).toMatchObject(observedImpact);
    saved.name = 'Mutated copy';
    saved.fees!.priceImpactPercent = '99';
    const [reloaded] = await storage.list();
    expect(reloaded.name).toBe('Study one');
    expect(reloaded.fees).toMatchObject(observedImpact);
    await storage.save(complete('two'));
    expect(writes.slice(-2)).toEqual(['run:two', 'manifest']);
    await storage.delete('two');
    await storage.delete('one');
    expect(await storage.list()).toEqual([]);
    expect(open).toHaveBeenCalledWith('polkaswap-research-v1', 1);
    expect(db.createObjectStore).toHaveBeenCalledWith('experiments');
    expect(new Set(stores)).toEqual(new Set(['experiments']));
    storage.close();
    await Promise.resolve();
    expect(db.close).toHaveBeenCalled();
  });

  it('retains verified forward and reverse intermediate XOR fee evidence', () => {
    const def = definition('cross-pair', { assetInAddress: VAL.address, assetOutAddress: PSWAP.address });
    const result = runResearch(def.settings, assets, { kind: 'historical', history: history() }, NOW);
    const observed = fees(result.bot);
    observed.route = [VAL.address, XOR.address, PSWAP.address];
    observed.sellRoute = [...observed.route].reverse();
    observed.routeFees = [
      {
        assetAddress: XOR.address,
        amountCodec: '200',
        amount: '0.0000000000000002',
        decimals: 18,
        conversion: {
          method: 'route-intermediate-ratio',
          capitalAssetAddress: VAL.address,
          convertedAmount: '0.001',
          blockNumber: observed.blockNumber,
          blockHash: observed.blockHash,
          grossIntermediateXorCodec: '1000',
          netIntermediateAfterFeesXorCodec: '800',
          firstLegFeeCodec: '100',
          secondLegFeeCodec: '100',
        },
      },
    ];
    observed.sellRouteFees = structuredClone(observed.routeFees);
    observed.sellRouteFees[0].conversion!.capitalAssetAddress = PSWAP.address;
    const saved = copyStoredExperiment({
      ...def,
      result,
      fees: observed,
      status: 'complete',
      progress: 1,
      createdAt: NOW,
    });
    expect(saved.fees).toEqual(observed);
    expect(saved.result!.bot.assetIn.address).toBe(VAL.address);
  });

  it('fails closed when IndexedDB is unavailable', async () => {
    await expect(createExperimentStorage(undefined).list()).rejects.toThrow('bots.errors.storage');
  });
});
