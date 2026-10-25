import { beforeEach, describe, expect, it, vi } from 'vitest';
import { XOR, VAL } from '@/lib/substrate/sdk/assets/consts';
import { codec, fromCodec, toCodec } from '@/features/bot-trading/amounts';
import {
  createAutopilotResearch,
  optimisticOneBuyTrainingScreen,
  qualificationReasons,
  type AutopilotInput,
  type AutopilotProgress,
  type AutopilotResearchOptions,
} from '@/features/bot-trading/autopilot';
import {
  readAutopilotImpactPreflightDiagnostics,
  readAutopilotQualificationDiagnostics,
} from '@/features/bot-trading/autopilot-diagnostics';
import { createDesktopAiClient } from '@/features/bot-trading/desktop-ai';
import type { BotAiClient } from '@/features/bot-trading/ai';
import type { ExperimentDefinition, ExperimentRun } from '@/features/bot-trading/experiments';
import type { ResearchFeeSnapshot } from '@/features/bot-trading/research-fees';
import { createLabDefaultSettings } from '@/features/bot-trading/lab-config';
import { createResearchBot } from '@/features/bot-trading/research';
import { spendableHoldingCodec } from '@/features/bot-trading/allocation';
import { createGoalHistoryEvidence, type AutopilotHistory } from '@/features/bot-trading/goal-history';
import {
  assertGoalResearchBinding,
  validateGoalResearchSnapshot,
  summarizeGoalEpisodes,
} from '@/features/bot-trading/goal-research';
import { FPNumber } from '@/lib/substrate/math';
import type { BotDefinition, BotHistory, StrategyConfig } from '@/features/bot-trading/types';

vi.unmock('@polkadot/util-crypto');

// Persisted goal evidence uses real asset-ID syntax; provider observations remain synthetic.
vi.mock('@/lib/substrate/sdk/assets/consts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/substrate/sdk/assets/consts')>();
  return {
    ...actual,
    XOR: { ...actual.XOR, address: `0x0200${'0'.repeat(60)}` },
    VAL: { ...actual.VAL, address: `0x020004${'0'.repeat(58)}` },
  };
});

const observed = vi.hoisted(() => ({
  batches: [] as ExperimentDefinition[][],
  runs: [] as ExperimentRun[][],
  tamper: undefined as ((runs: ExperimentRun[], batch: number) => void) | undefined,
}));
// Run the real engine and evidence checks; skip browser paint scheduling in these deterministic unit tests.
vi.mock('@/features/bot-trading/research-runner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/bot-trading/research-runner')>();
  return {
    ...actual,
    createExperimentRunner(options: Parameters<typeof actual.createExperimentRunner>[0]) {
      const runner = actual.createExperimentRunner({ ...options, workerFactory: null, awaitProgress: async () => {} });
      return {
        ...runner,
        async run(definitions: ExperimentDefinition[]) {
          observed.batches.push(structuredClone(definitions));
          const runs = await runner.run(definitions);
          observed.tamper?.(runs, observed.batches.length);
          observed.runs.push(structuredClone(runs));
          return runs;
        },
      };
    },
  };
});

const HOUR = 3_600_000;
// A current date, far beyond the archive's start, catches accidental inheritance of the lab's 90-day window.
const NOW = Date.UTC(2026, 8, 19);
const defaultCostSampleAmounts = ['10.000000000000000001', '24.750000000000000004', '49.500000000000000009'];
const input: AutopilotInput = {
  assets: [XOR, VAL].map(({ address, symbol, decimals }) => ({ address, symbol, decimals })),
  assetInAddress: XOR.address,
  assetOutAddress: VAL.address,
  capital: '100.000000000000000019',
  feeBudgetXor: '1.000000000000000001',
  maxLossPercent: '5',
  targetReturnPercent: '10',
  title: 'Grow my capital',
};

/** Synthetic indexed receipts are unit-test inputs, never evidence for a real trading decision. */
function indexedHistory(bot: BotDefinition, history: BotHistory): AutopilotHistory {
  const startAt = history.candles[0].timestamp - HOUR;
  const warmup = Array.from({ length: 201 }, (_, index) => ({
    timestamp: startAt - (200 - index) * HOUR,
    close: history.candles[0].close,
    feeClose: history.candles[0].feeClose,
  }));
  const candles = [...warmup, ...history.candles];
  const goalHistory = createGoalHistoryEvidence(
    bot,
    {
      history: { ...history, candles },
      boundaries: candles.map((candle, index) => ({
        kind: 'indexed-finalized-hour-boundary' as const,
        completedAtMs: candle.timestamp,
        ...history.identity!,
        closing: {
          height: index * 600 + 1,
          hash: `0x${(index * 2 + 1).toString(16).padStart(64, '0')}`,
          timestampSeconds: candle.timestamp / 1000 - 6,
        },
        successor: {
          height: index * 600 + 2,
          hash: `0x${(index * 2 + 2).toString(16).padStart(64, '0')}`,
          timestampSeconds: candle.timestamp / 1000,
        },
        arrivalTimeKnown: false as const,
      })),
    },
    startAt,
    history.candles.at(-1)!.timestamp
  );
  return { ...history, goalHistory };
}

/** This synthetic assistant chooses a tenth of its allocation independently of the maximum the app allows. */
function suggestion(bot: BotDefinition, patch: Partial<StrategyConfig> = {}): StrategyConfig {
  const amount = fromCodec((codec(bot.portfolio.initial[bot.assetIn.address]) / 10n).toString(), bot.assetIn.decimals);
  const strategy: StrategyConfig = { ...bot.strategy, kind: 'dca', amount, intervalMs: 6 * HOUR, prompt: '', ...patch };
  if (strategy.kind !== 'sma') delete strategy.signalTiming;
  return strategy;
}

/** Genuine provider boundaries are replaced by explicitly synthetic unit-test observations only. */
function harness(
  now: () => number = () => NOW,
  callbacks: Pick<AutopilotResearchOptions, 'onHistoryPrepared' | 'onValidationStarted'> = {}
) {
  const history: BotHistory = {
    denominationVerified: true,
    missing: 0,
    identity: { genesisHash: `0x${'1'.repeat(64)}`, denominator: '1000' },
    candles: Array.from({ length: 168 }, (_, index) => ({
      timestamp: NOW - (167 - index) * HOUR,
      close: String(100 + index),
      feeClose: '1',
    })),
  };
  const loadHistory = vi.fn(async (bot: BotDefinition) => indexedHistory(bot, history));
  const loadFees = vi.fn(
    async (bot: BotDefinition): Promise<ResearchFeeSnapshot> => ({
      networkFeeXor: '0.0001',
      priceImpactPercent: '0',
      sellPriceImpactPercent: '0',
      networkFeeCodec: toCodec('0.0001', XOR.decimals),
      swapFeePercent: '0.1',
      sellNetworkFeeXor: '0.0001',
      sellNetworkFeeCodec: toCodec('0.0001', XOR.decimals),
      sellSwapFeePercent: '0.1',
      queriedAt: NOW,
      finalizedAt: NOW,
      expiresAt: NOW + 300_000,
      blockNumber: 123,
      blockHash: `0x${'2'.repeat(64)}`,
      genesisHash: `0x${'1'.repeat(64)}`,
      endpoint: 'wss://test.example',
      denominator: '1000',
      amountIn: bot.strategy.amount,
      amountOut: '1',
      sellAmountIn: '1',
      sellAmountOut: bot.strategy.amount,
      assetInAddress: bot.assetIn.address,
      assetOutAddress: bot.assetOut.address,
      dexId: 0,
      route: [],
      routeFees: [],
      sellDexId: 0,
      sellRoute: [],
      sellRouteFees: [],
    })
  );
  const client: BotAiClient = {
    listModels: vi.fn(),
    selectModel: vi.fn(),
    propose: vi.fn(),
    suggest: vi.fn(async (bot) => ({
      strategy: suggestion(bot),
      usage: { inputTokens: 1, outputTokens: 1, requests: 1 },
    })),
    disconnect: vi.fn(),
  };
  const progress: AutopilotProgress[] = [];
  const research = createAutopilotResearch({
    loadHistory,
    loadFees,
    now,
    onProgress: (update) => progress.push(update),
    ...callbacks,
  });
  return { research, history, loadHistory, loadFees, client, progress };
}

beforeEach(() => {
  observed.batches = [];
  observed.runs = [];
  observed.tamper = undefined;
});

describe('training-only economic preflight', () => {
  const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
  const request: AutopilotInput = {
    ...input,
    assets: [kusd, input.assets[0]],
    assetInAddress: kusd.address,
    assetOutAddress: XOR.address,
    capital: '10',
    feeBudgetXor: '1',
    valuationAsset: 'output',
  };

  it('uses exact fractions at the fee boundary, excludes the opening close, and rejects a held-out tail', () => {
    const bot = createResearchBot(
      {
        ...createLabDefaultSettings(NOW),
        capital: '10',
        feeBudgetXor: '1',
        assetInAddress: kusd.address,
        assetOutAddress: XOR.address,
      },
      request.assets,
      NOW
    );
    bot.goal = {
      title: 'Maximize XOR',
      targetReturnPercent: '5',
      maxLossPercent: '5',
      durationMs: 24 * HOUR,
      valuationAsset: 'output',
      lossMetric: 'drawdown',
    };
    const training = Array.from({ length: 117 }, (_, index) => ({
      timestamp: NOW - (116 - index) * HOUR,
      close: index === 0 ? '8' : index === 1 ? '9' : '10',
      feeClose: '10',
    }));
    const samples = ['9', '9.000000000000000001'].map((amount) => ({
      amountInCodec: toCodec(amount, 18),
      networkFeeCodec: toCodec('0.1', 18),
    }));
    expect(optimisticOneBuyTrainingScreen(bot, training, samples)).toEqual([
      { amountInCodec: samples[0].amountInCodec, positiveEpisodes: 0, totalEpisodes: 4 },
      { amountInCodec: samples[1].amountInCodec, positiveEpisodes: 1, totalEpisodes: 4 },
    ]);
    expect(
      optimisticOneBuyTrainingScreen(bot, [...training, { ...training[116], timestamp: NOW + HOUR }], samples)
    ).toEqual([]);
    const fiveSamples = ['9', '9.01', '9.02', '9.03', '9.04'].map((amount) => ({
      amountInCodec: toCodec(amount, 18),
      networkFeeCodec: toCodec('0.1', 18),
    }));
    expect(optimisticOneBuyTrainingScreen(bot, training, fiveSamples).map((point) => point.amountInCodec)).toEqual(
      fiveSamples.map((sample) => sample.amountInCodec)
    );
    expect(optimisticOneBuyTrainingScreen(bot, training, [...fiveSamples, fiveSamples[0]])).toEqual([]);
  });

  it('shows only passing exact-size fee scenarios to the drafter before any validation work', async () => {
    const test = harness();
    test.history.candles.forEach((candle, index) => {
      candle.close = index === 1 ? '9' : index < 117 ? '10' : '987654321';
      candle.feeClose = candle.close;
    });
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => ({
      ...(await original(bot)),
      networkFeeXor: '0.02',
      networkFeeCodec: toCodec('0.02', 18),
      priceImpactPercent: bot.strategy.amount === '5' ? '2' : '0',
    }));
    vi.mocked(test.client.suggest).mockRejectedValueOnce(new Error('draft-reached'));
    await expect(test.research.run({ ...request, title: 'x'.repeat(160) }, test.client)).rejects.toThrow(
      'draft-reached'
    );
    const [draft, training] = vi.mocked(test.client.suggest).mock.calls[0];
    expect(training).toEqual(test.history.candles.slice(0, 117));
    expect(draft.strategy.prompt).toContain('costSamples #1 0/4, #2 1/4, #4 1/4');
    expect(draft.strategy.prompt).not.toContain('#3 1/4');
    expect(draft.strategy.prompt).not.toContain('987654321');
    expect(draft.strategy.prompt).toContain('Multi-fill and unquoted sizes are not assessed');
    expect(draft.strategy.prompt.length).toBeLessThanOrEqual(2000);
    expect(observed.batches).toHaveLength(0);
  });

  it('keeps an exact fractional KUSD budget and maximum title inside the desktop prompt limit', async () => {
    const test = harness();
    vi.mocked(test.client.suggest).mockRejectedValueOnce(new Error('draft-reached'));
    await expect(
      test.research.run({ ...request, capital: '10.000000000000000019', title: 'x'.repeat(160) }, test.client)
    ).rejects.toThrow('draft-reached');
    const [draft, , , constraints] = vi.mocked(test.client.suggest).mock.calls[0];
    expect(draft.portfolio.initial[kusd.address]).toBe(toCodec('10.000000000000000019', 18));
    expect(constraints?.costSamples?.map((point) => point.amountInCodec)).toEqual([
      toCodec('1.000000000000000001', 18),
      toCodec('2.500000000000000004', 18),
      toCodec('5.000000000000000009', 18),
    ]);
    expect(draft.strategy.prompt.length).toBeLessThanOrEqual(2000);
  });

  it('keeps all one-buy counts with a maximum title and input token symbol', async () => {
    const test = harness();
    const inputSymbol = 'K'.repeat(20);
    const title = 'x'.repeat(160);
    vi.mocked(test.client.suggest).mockRejectedValueOnce(new Error('draft-reached'));
    await expect(
      test.research.run(
        {
          ...request,
          title,
          capital: '10.000000000000000019',
          assets: [{ ...kusd, symbol: inputSymbol }, request.assets[1]],
        },
        test.client
      )
    ).rejects.toThrow('draft-reached');
    const prompt = vi.mocked(test.client.suggest).mock.calls[0][0].strategy.prompt;
    expect(prompt).toContain(`Goal: ${title}.`);
    expect(prompt).toContain(`Allocation: 10.000000000000000019 ${inputSymbol}; selecting XOR`);
    expect(prompt).toMatch(/costSamples #1 [0-4]\/4, #2 [0-4]\/4, #3 [0-4]\/4 24h episodes beating idle/);
    expect(prompt.length).toBeLessThanOrEqual(2000);
  });
});

describe('research window lifecycle', () => {
  it('reports metadata only and marks holdout exposure before dispatching validation', async () => {
    const onHistoryPrepared = vi.fn();
    const onValidationStarted = vi.fn(() => {
      expect(observed.batches).toHaveLength(1);
    });
    const test = harness(() => NOW, { onHistoryPrepared, onValidationStarted });
    await test.research.run(input, test.client);
    expect(onHistoryPrepared).toHaveBeenCalledExactlyOnceWith({
      completedThrough: NOW,
      validationFrom: test.history.candles[118].timestamp,
    });
    expect(onValidationStarted).toHaveBeenCalledExactlyOnceWith({
      from: test.history.candles[118].timestamp,
      to: NOW,
    });
    expect(observed.batches).toHaveLength(2);
  });

  it('waits for the durable exposure write before any held-out worker reads', async () => {
    let committed!: () => void;
    const onValidationStarted = vi.fn(() => new Promise<void>((resolve) => (committed = resolve)));
    const test = harness(() => NOW, { onValidationStarted });
    const running = test.research.run(input, test.client);
    await vi.waitFor(() => expect(onValidationStarted).toHaveBeenCalledOnce());
    expect(observed.batches).toHaveLength(1);
    committed();
    await running;
    expect(observed.batches).toHaveLength(2);
  });

  it('does not consume validation after training rejects, and lets a window guard stop dispatch', async () => {
    const onValidationStarted = vi.fn();
    const rejected = harness(() => NOW, { onValidationStarted });
    rejected.history.candles.forEach((candle) => {
      candle.close = '100';
    });
    await expect(rejected.research.run(input, rejected.client)).rejects.toThrow();
    expect(onValidationStarted).not.toHaveBeenCalled();
    observed.batches = [];
    const guarded = harness(() => NOW, {
      onValidationStarted: () => {
        throw new Error('reserved-window-used');
      },
    });
    await expect(guarded.research.run(input, guarded.client)).rejects.toThrow('reserved-window-used');
    expect(observed.batches).toHaveLength(1);
  });

  it('honors cancellation from the exposure callback before validation runs', async () => {
    const callback = vi.fn(() => test.research.cancel());
    const test = harness(() => NOW, { onValidationStarted: callback });
    await expect(test.research.run(input, test.client)).rejects.toThrow();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(observed.batches).toHaveLength(1);
  });
});

describe('automatic strategy research', () => {
  it.each(['legacy', 'one-item batch'] as const)(
    'adds distinct predeclared signals to a desktop %s without exposing validation to drafting',
    async (format) => {
      const test = harness();
      Object.assign(test.client, { draftTransport: 'desktop' as const });
      vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => {
        const strategy = suggestion(bot, { amount: defaultCostSampleAmounts[0], intervalMs: 6 * HOUR });
        return {
          strategy,
          ...(format === 'one-item batch' ? { strategies: [strategy] } : {}),
          usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
        };
      });
      const result = await test.research.run(input, test.client);
      const training = observed.batches[0].filter((_, index) => index % 4 === 0).map((item) => item.strategy!);
      expect(training).toHaveLength(3);
      expect(training.map((strategy) => strategy.kind)).toEqual(['dca', 'rules', 'rules']);
      expect(training.every((strategy) => strategy.amount === defaultCostSampleAmounts[0])).toBe(true);
      expect(training[1].rules?.entry.conditions).toEqual([
        { kind: 'momentum', window: 6, direction: 'below', threshold: '-1' },
      ]);
      expect(training[2].rules?.entry.conditions).toEqual([{ kind: 'trend', window: 12, direction: 'above' }]);
      expect(vi.mocked(test.client.suggest).mock.calls[0][1]).toEqual(test.history.candles.slice(0, 117));
      expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
      expect(observed.batches[1].every((item) => item.strategy?.kind === result.bot.strategy.kind)).toBe(true);
      expect(result.candidates).toBe(3);
    }
  );

  it('keeps a failed desktop single draft in training and preserves fee, impact and loss limits', async () => {
    const test = harness();
    Object.assign(test.client, { draftTransport: 'desktop' as const });
    test.history.candles.forEach((candle) => {
      candle.close = '100';
    });
    const onValidationStarted = vi.fn();
    const researcher = createAutopilotResearch({
      loadHistory: test.loadHistory,
      loadFees: test.loadFees,
      now: () => NOW,
      onValidationStarted,
    });
    const failure = await researcher.run(input, test.client).catch((error: unknown) => error);
    expect(readAutopilotQualificationDiagnostics(failure)).toMatchObject({ stage: 'training' });
    expect(observed.batches).toHaveLength(1);
    expect(observed.batches[0]).toHaveLength(12);
    expect(onValidationStarted).not.toHaveBeenCalled();
    for (const definition of observed.batches[0]) {
      expect(definition.goal?.maxLossPercent).toBe('5');
      expect(definition.settings.slippagePercent).toBe('0.5');
    }
    expect(test.loadFees.mock.calls.slice(-3).map(([bot]) => bot.strategy.amount)).toEqual(
      Array(3).fill(observed.batches[0][0].strategy!.amount)
    );
  });

  it('uses only exact eligible partial sizes for desktop sibling signals when the submitted seed is infeasible', async () => {
    const test = harness();
    Object.assign(test.client, { draftTransport: 'desktop' as const });
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => ({
      ...(await original(bot)),
      priceImpactPercent: ['1', '5', '9.9'].includes(bot.strategy.amount) ? '2' : '0',
    }));
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { amount: '9.9', intervalMs: 6 * HOUR }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    await test.research
      .run(
        {
          ...input,
          assets: [kusd, input.assets[0]],
          assetInAddress: kusd.address,
          assetOutAddress: XOR.address,
          capital: '10',
          feeBudgetXor: '1',
          valuationAsset: 'output',
        },
        test.client
      )
      .catch(() => undefined);
    expect(test.loadFees.mock.calls.slice(0, 4).map(([bot]) => bot.strategy.amount)).toEqual(['1', '2.5', '5', '3.75']);
    const training = observed.batches[0].filter((_, index) => index % 4 === 0).map((item) => item.strategy!);
    expect(training.map((strategy) => strategy.amount)).toEqual(['3.75', '2.5']);
    expect(training.map((strategy) => strategy.kind)).toEqual(['rules', 'rules']);
    expect(test.loadFees.mock.calls.filter(([bot]) => bot.strategy.amount === '9.9')).toHaveLength(1);
    expect(test.loadFees.mock.calls.filter(([bot]) => bot.strategy.amount === '3.75')).toHaveLength(2);
    expect(test.loadFees.mock.calls.filter(([bot]) => bot.strategy.amount === '2.5')).toHaveLength(2);
  });

  it('stops before drafting when five exact buy sizes breach impact', async () => {
    const test = harness();
    Object.assign(test.client, { draftTransport: 'desktop' as const });
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => ({
      ...(await original(bot)),
      priceImpactPercent: '2',
    }));
    const failure = await test.research.run(input, test.client).catch((error: unknown) => error);
    expect(failure).toMatchObject({ message: 'bots.errors.policy' });
    expect(readAutopilotQualificationDiagnostics(failure)).toBeNull();
    expect(test.client.suggest).not.toHaveBeenCalled();
    expect(observed.batches).toHaveLength(0);
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual([
      ...defaultCostSampleAmounts,
      '5',
      '2.5',
    ]);
  });

  it('discovers a smaller exact within-impact buy before drafting without inferring other sizes', async () => {
    const test = harness();
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => ({
      ...(await original(bot)),
      priceImpactPercent: bot.strategy.amount === '5' ? '0.5' : '2',
    }));
    vi.mocked(test.client.suggest).mockRejectedValueOnce(new Error('draft-reached'));
    await expect(test.research.run(input, test.client)).rejects.toThrow('draft-reached');
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual([...defaultCostSampleAmounts, '5']);
    const [draft, , , constraints] = vi.mocked(test.client.suggest).mock.calls[0];
    expect(draft.strategy.amount).toBe('5');
    expect(constraints?.sizing?.feeSampleAmountCodec).toBe(toCodec('5', XOR.decimals));
    expect(constraints?.costSamples?.map((sample) => sample.amountInCodec)).toEqual(
      [...defaultCostSampleAmounts, '5'].map((amount) => toCodec(amount, XOR.decimals))
    );
    expect(constraints?.costs?.buy.priceImpactPercent).toBe('0.5');
    expect(observed.batches).toHaveLength(0);
  });

  it('quotes and evaluates three authored strategies, then freezes one training winner for validation', async () => {
    const test = harness();
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => {
      const first = suggestion(bot, { amount: '4', intervalMs: 6 * HOUR });
      const second = suggestion(bot, { amount: '5', intervalMs: 12 * HOUR });
      const third = suggestion(bot, { amount: '6', intervalMs: 24 * HOUR });
      return {
        strategy: first,
        strategies: [first, second, third],
        usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
      };
    });
    const result = await test.research.run(input, test.client);
    const training = observed.batches[0].filter((_, index) => index % 4 === 0).map((item) => item.strategy!);
    expect(training.map(({ amount, intervalMs }) => [amount, intervalMs])).toEqual([
      ['4', 6 * HOUR],
      ['5', 12 * HOUR],
      ['6', 24 * HOUR],
    ]);
    expect(test.loadFees.mock.calls.slice(-3).map(([bot]) => [bot.strategy.amount, bot.strategy.intervalMs])).toEqual([
      ['4', 6 * HOUR],
      ['5', 12 * HOUR],
      ['6', 24 * HOUR],
    ]);
    expect(observed.batches[1]).toHaveLength(2);
    expect(
      observed.batches[1].every((item) => JSON.stringify(item.strategy) === JSON.stringify(result.bot.strategy))
    ).toBe(true);
    expect(result.candidates).toBe(3);
    expect(result.bot.policy.feeBudgetCodec).toBe(toCodec(input.feeBudgetXor, XOR.decimals));
    expect(result.bot.goal?.maxLossPercent).toBe(input.maxLossPercent);
  });

  it('skips only a candidate with an unavailable exact training quote before selecting a holdout winner', async () => {
    const onValidationStarted = vi.fn();
    const test = harness(() => NOW, { onValidationStarted });
    const quote = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      if (bot.strategy.amount === '5') throw new Error('bots.errors.quote');
      return quote(bot);
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => {
      const first = suggestion(bot, { amount: '4', intervalMs: 6 * HOUR });
      const second = suggestion(bot, { amount: '5', intervalMs: 12 * HOUR });
      const third = suggestion(bot, { amount: '6', intervalMs: 24 * HOUR });
      return {
        strategy: first,
        strategies: [first, second, third],
        usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
      };
    });

    const result = await test.research.run(input, test.client);
    expect(observed.batches[0]).toHaveLength(8);
    expect(observed.batches[0].filter((_, index) => index % 4 === 0).map((item) => item.strategy!.amount)).toEqual([
      '4',
      '6',
    ]);
    expect(observed.batches[1]).toHaveLength(2);
    expect(observed.batches[1].every((item) => item.strategy!.amount === result.bot.strategy.amount)).toBe(true);
    expect(onValidationStarted).toHaveBeenCalledOnce();
    expect(result.candidates).toBe(2);
  });

  it('reports drafted versus tested counts when an exact quote screens out one authored strategy', async () => {
    const test = harness();
    for (const candle of test.history.candles) candle.close = '100';
    const quote = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      if (bot.strategy.amount === '5') throw new Error('bots.errors.quote');
      return quote(bot);
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => {
      const first = suggestion(bot, { amount: '4', intervalMs: 6 * HOUR });
      const second = suggestion(bot, { amount: '5', intervalMs: 12 * HOUR });
      return { strategy: first, strategies: [first, second], usage: { inputTokens: 0, outputTokens: 0, requests: 1 } };
    });

    const failure = await test.research.run(input, test.client).catch((error: unknown) => error);
    expect(readAutopilotQualificationDiagnostics(failure)).toMatchObject({
      stage: 'training',
      failures: [{ candidate: 1, reasons: expect.arrayContaining(['netLoss']) }],
      screening: {
        submitted: 2,
        dropped: [{ candidate: 2, reasons: ['quoteUnavailable', 'noSmallerExactSample'] }],
      },
    });
    expect(observed.batches[0]).toHaveLength(4);
  });

  it('keeps original draft numbers when the first authored strategy is screened before training', async () => {
    const test = harness();
    for (const candle of test.history.candles) candle.close = '100';
    const quote = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      if (bot.strategy.amount === '5') throw new Error('bots.errors.quote');
      return quote(bot);
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => {
      const first = suggestion(bot, { amount: '5', intervalMs: 12 * HOUR });
      const second = suggestion(bot, { amount: '4', intervalMs: 6 * HOUR });
      return { strategy: first, strategies: [first, second], usage: { inputTokens: 0, outputTokens: 0, requests: 1 } };
    });

    const failure = await test.research.run(input, test.client).catch((error: unknown) => error);
    expect(readAutopilotQualificationDiagnostics(failure)).toMatchObject({
      stage: 'training',
      failures: [{ candidate: 2, reasons: expect.arrayContaining(['netLoss']) }],
      screening: {
        submitted: 2,
        dropped: [{ candidate: 1, reasons: ['quoteUnavailable', 'noSmallerExactSample'] }],
      },
    });
    expect(observed.batches[0]).toHaveLength(4);
    expect(observed.batches[0][0].strategy!.amount).toBe('4');
  });

  it('retries an unquotable authored order at one smaller exact sample without changing its signal or cadence', async () => {
    const test = harness();
    const quote = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      if (bot.strategy.amount === '50') throw new Error('bots.errors.quote');
      return quote(bot);
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => {
      const first = suggestion(bot, { amount: defaultCostSampleAmounts[2], intervalMs: 6 * HOUR });
      const second = suggestion(bot, {
        kind: 'sma',
        amount: '50',
        intervalMs: 6 * HOUR,
        fastWindow: 2,
        slowWindow: 3,
        signalTiming: 'closed-hour',
      });
      const third = suggestion(bot, { amount: '6', intervalMs: 24 * HOUR });
      return {
        strategy: first,
        strategies: [first, second, third],
        usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
      };
    });

    const result = await test.research.run(input, test.client);
    const training = observed.batches[0].filter((_, index) => index % 4 === 0).map((item) => item.strategy!);
    expect(training.map(({ kind, amount, intervalMs }) => [kind, amount, intervalMs])).toEqual([
      ['dca', defaultCostSampleAmounts[2], 6 * HOUR],
      ['sma', defaultCostSampleAmounts[2], 6 * HOUR],
      ['dca', '6', 24 * HOUR],
    ]);
    expect(training[1].signalTiming).toBe('closed-hour');
    expect(training[1].fastWindow).toBe(2);
    expect(training[1].slowWindow).toBe(3);
    expect(test.loadFees.mock.calls.slice(-4).map(([bot]) => [bot.strategy.kind, bot.strategy.amount])).toEqual([
      ['dca', defaultCostSampleAmounts[2]],
      ['sma', '50'],
      ['sma', defaultCostSampleAmounts[2]],
      ['dca', '6'],
    ]);
    expect(result.candidates).toBe(3);
  });

  it.each([
    { limit: 'buy impact', patch: { priceImpactPercent: '1.1' } },
    { limit: 'buy fee', patch: { networkFeeXor: '1.1', networkFeeCodec: toCodec('1.1', XOR.decimals) } },
  ])('re-quotes a smaller 3.75 KUSD authored order when its 4 KUSD $limit exceeds policy', async ({ patch }) => {
    const test = harness();
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    for (const candle of test.history.candles) candle.close = '100';
    const quote = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      const fees = await quote(bot);
      if (bot.strategy.amount === '5') return { ...fees, priceImpactPercent: '1.4', sellPriceImpactPercent: '1.4' };
      if (bot.strategy.amount === '3.75') return { ...fees, priceImpactPercent: '0.9', sellPriceImpactPercent: '0.9' };
      if (bot.strategy.amount === '4') return { ...fees, ...patch };
      return fees;
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => {
      const strategy = suggestion(bot, { amount: '4', intervalMs: 6 * HOUR });
      return {
        strategy,
        strategies: [strategy],
        usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
      };
    });

    const failure = await test.research
      .run(
        {
          ...input,
          assets: [...input.assets, kusd],
          assetInAddress: kusd.address,
          assetOutAddress: XOR.address,
          capital: '10',
          feeBudgetXor: '1',
          valuationAsset: 'output',
        },
        test.client
      )
      .catch((error: unknown) => error);
    expect(readAutopilotQualificationDiagnostics(failure)?.stage).toBe('training');
    expect(observed.batches).toHaveLength(1);
    expect(observed.batches[0].filter((_, index) => index % 4 === 0).map((run) => run.strategy!.amount)).toEqual([
      '3.75',
    ]);
    expect(observed.batches[0][0].strategy).toMatchObject({ kind: 'dca', intervalMs: 6 * HOUR });
    expect(test.loadFees.mock.calls.map(([bot]) => [bot.strategy.amount, bot.strategy.intervalMs])).toEqual([
      ['1', HOUR],
      ['2.5', HOUR],
      ['5', HOUR],
      ['3.75', HOUR],
      ['4', 6 * HOUR],
      ['3.75', 6 * HOUR],
    ]);
  });

  it.each([
    { limit: 'reverse impact', patch: { sellPriceImpactPercent: '1.1' } },
    {
      limit: 'reverse fee',
      patch: { sellNetworkFeeXor: '1.1', sellNetworkFeeCodec: toCodec('1.1', XOR.decimals) },
    },
  ])('replays a two-way SMA with no sell signal despite its unused $limit', async ({ patch }) => {
    const test = harness();
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    for (const candle of test.history.candles) candle.close = '100';
    const quote = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => ({
      ...(await quote(bot)),
      ...patch,
    }));
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => {
      const buyOnly = suggestion(bot, { amount: '4', intervalMs: 6 * HOUR });
      const twoWay = suggestion(bot, {
        kind: 'sma',
        amount: '4',
        intervalMs: 12 * HOUR,
        fastWindow: 2,
        slowWindow: 3,
        signalTiming: 'closed-hour',
      });
      return {
        strategy: buyOnly,
        strategies: [buyOnly, twoWay],
        usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
      };
    });

    const failure = await test.research
      .run(
        {
          ...input,
          assets: [...input.assets, kusd],
          assetInAddress: kusd.address,
          assetOutAddress: XOR.address,
          capital: '10',
          feeBudgetXor: '1',
          valuationAsset: 'output',
        },
        test.client
      )
      .catch((error: unknown) => error);
    expect(readAutopilotQualificationDiagnostics(failure)).toMatchObject({
      stage: 'training',
      screening: { submitted: 2, dropped: [] },
    });
    expect(
      vi.mocked(test.client.suggest).mock.calls[0][3]?.costSamples?.every((sample) => sample.status === 'available')
    ).toBe(true);
    expect(vi.mocked(test.client.suggest).mock.calls[0][0].strategy.prompt).toContain('Optimistic one-buy training');
    expect(observed.batches).toHaveLength(1);
    expect(observed.batches[0]).toHaveLength(8);
    expect(observed.batches[0][0].strategy).toMatchObject({ kind: 'dca', amount: '4' });
    expect(observed.batches[0][4].strategy).toMatchObject({ kind: 'sma', amount: '4' });
    expect(observed.runs[0].slice(4).flatMap((run) => run.result!.tradeMarkers)).toEqual([]);
  });

  it('qualifies a rules candidate that buys but never sells despite a costly reverse quote', async () => {
    const test = harness();
    const quote = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => ({
      ...(await quote(bot)),
      sellPriceImpactPercent: '1.1',
      sellNetworkFeeXor: '1.1',
      sellNetworkFeeCodec: toCodec('1.1', XOR.decimals),
    }));
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => {
      const strategy = suggestion(bot, {
        kind: 'rules',
        amount: '10',
        rules: {
          version: 1,
          entry: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'above' }] },
          exit: { operator: 'all', conditions: [{ kind: 'trend', window: 2, direction: 'below' }] },
        },
      });
      return { strategy, strategies: [strategy], usage: { inputTokens: 0, outputTokens: 0, requests: 1 } };
    });

    const result = await test.research.run(input, test.client);
    expect(result.bot.strategy).toMatchObject({ kind: 'rules', amount: '10' });
    expect(result.research.qualification!.trades).toBeGreaterThan(0);
    expect(observed.batches.map((batch) => batch.length)).toEqual([4, 2]);
    const actions = observed.runs.flat(1).flatMap((run) => run.result!.tradeMarkers.map((trade) => trade.action));
    expect(actions).toContain('buy');
    expect(actions).not.toContain('sell');
  });

  it.each([
    { limit: 'impact', patch: { sellPriceImpactPercent: '1.1' }, gate: 'priceImpact' },
    {
      limit: 'fee',
      patch: { sellNetworkFeeXor: '1.1', sellNetworkFeeCodec: toCodec('1.1', XOR.decimals) },
      gate: 'feeBudget',
    },
  ])('rejects an actual replay sell at its reverse $limit gate', async ({ patch, gate }) => {
    const test = harness();
    test.history.candles.forEach((candle, index) => {
      candle.close = index % 12 < 8 ? '90' : '106';
    });
    const quote = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => ({ ...(await quote(bot)), ...patch }));
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => {
      const strategy = suggestion(bot, {
        kind: 'rules',
        amount: '10',
        intervalMs: HOUR,
        rules: {
          version: 1,
          entry: {
            operator: 'all',
            conditions: [{ kind: 'deviation', window: 2, direction: 'below', threshold: '0' }],
          },
          exit: { operator: 'all', conditions: [{ kind: 'deviation', window: 2, direction: 'above', threshold: '0' }] },
        },
      });
      return { strategy, strategies: [strategy], usage: { inputTokens: 0, outputTokens: 0, requests: 1 } };
    });

    const outcome = await test.research.run(input, test.client).catch((error: unknown) => error);
    if (outcome instanceof Error)
      expect(readAutopilotQualificationDiagnostics(outcome)).toMatchObject({
        stage: 'training',
        screening: { submitted: 1, dropped: [] },
      });
    expect(observed.batches[0]).toHaveLength(4);
    const runs = observed.runs.flat(1);
    expect(runs.flatMap((run) => run.result!.tradeMarkers.map((trade) => trade.action))).toContain('buy');
    const sell = runs
      .flatMap((run) => run.result!.candidates)
      .find((candidate) => candidate.action === 'sell' && candidate.reason === 'bots.rules.exitMatch');
    expect(sell).toMatchObject({ reason: 'bots.rules.exitMatch', selected: false });
    expect(sell!.checks.find((check) => check.key === 'signal')).toMatchObject({ passed: true });
    expect(sell!.checks.find((check) => check.key === gate)).toMatchObject({ passed: false });
    expect(runs.flatMap((run) => run.result!.tradeMarkers.map((trade) => trade.action))).not.toContain('sell');
  });

  it.each([
    { limit: 'impact', patch: { priceImpactPercent: '1.1' }, reason: 'priceImpact' },
    {
      limit: 'fee cap',
      patch: { networkFeeXor: '1.1', networkFeeCodec: toCodec('1.1', XOR.decimals) },
      reason: 'feeBudget',
    },
  ])('reports an authored candidate dropped by its smaller exact $limit quote', async ({ patch, reason }) => {
    const onValidationStarted = vi.fn();
    const test = harness(() => NOW, { onValidationStarted });
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    for (const candle of test.history.candles) candle.close = '100';
    const quote = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      const fees = await quote(bot);
      if (bot.strategy.amount === '5') return { ...fees, priceImpactPercent: '1.4' };
      if (bot.strategy.amount === '4') return { ...fees, ...patch };
      if (bot.strategy.amount === '3.75')
        return bot.strategy.intervalMs === HOUR ? { ...fees, priceImpactPercent: '0.9' } : { ...fees, ...patch };
      return fees;
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => {
      const strategy = suggestion(bot, { amount: '4', intervalMs: 6 * HOUR });
      return { strategy, strategies: [strategy], usage: { inputTokens: 0, outputTokens: 0, requests: 1 } };
    });

    const failure = await test.research
      .run(
        {
          ...input,
          assets: [...input.assets, kusd],
          assetInAddress: kusd.address,
          assetOutAddress: XOR.address,
          capital: '10',
          feeBudgetXor: '1',
          valuationAsset: 'output',
        },
        test.client
      )
      .catch((error: unknown) => error);
    expect(readAutopilotQualificationDiagnostics(failure)).toMatchObject({
      stage: 'training',
      failures: [],
      screening: { submitted: 1, dropped: [{ candidate: 1, reasons: [reason] }] },
    });
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual([
      '1',
      '2.5',
      '5',
      '3.75',
      '4',
      '3.75',
    ]);
    expect(observed.batches).toHaveLength(0);
    expect(onValidationStarted).not.toHaveBeenCalled();
  });

  it('rejects an entirely unquotable batch without reading the holdout', async () => {
    const onValidationStarted = vi.fn();
    const test = harness(() => NOW, { onValidationStarted });
    const quote = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      if (['4', '5', '6'].includes(bot.strategy.amount)) throw new Error('bots.errors.quote');
      return quote(bot);
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => {
      const first = suggestion(bot, { amount: '4', intervalMs: 6 * HOUR });
      const second = suggestion(bot, { amount: '5', intervalMs: 12 * HOUR });
      const third = suggestion(bot, { amount: '6', intervalMs: 24 * HOUR });
      return {
        strategy: first,
        strategies: [first, second, third],
        usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
      };
    });

    const failure = await test.research.run(input, test.client).catch((error: unknown) => error);
    expect(readAutopilotQualificationDiagnostics(failure)).toMatchObject({
      stage: 'training',
      failures: [],
      screening: {
        submitted: 3,
        dropped: [1, 2, 3].map((candidate) => ({
          candidate,
          reasons: ['quoteUnavailable', 'noSmallerExactSample'],
        })),
      },
    });
    expect(observed.batches).toHaveLength(0);
    expect(onValidationStarted).not.toHaveBeenCalled();
  });

  it('keeps fee receipts separate for equivalent codec amounts with different decimal spelling', async () => {
    const test = harness();
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => {
      const first = suggestion(bot, { amount: '4', intervalMs: 6 * HOUR });
      const second = suggestion(bot, {
        kind: 'sma',
        amount: '4.0',
        intervalMs: 6 * HOUR,
        fastWindow: 2,
        slowWindow: 3,
        signalTiming: 'closed-hour',
      });
      return { strategy: first, strategies: [first, second], usage: { inputTokens: 0, outputTokens: 0, requests: 1 } };
    });
    const result = await test.research.run(input, test.client);
    expect(result.candidates).toBe(2);
    expect(observed.batches[0].filter((_, index) => index % 4 === 0).map((item) => item.strategy!.amount)).toEqual([
      '4',
      '4.0',
    ]);
    expect(test.loadFees.mock.calls.slice(-2).map(([bot]) => bot.strategy.amount)).toEqual(['4', '4.0']);
    expect([observed.runs[0][0].fees?.amountIn, observed.runs[0][4].fees?.amountIn]).toEqual(['4', '4.0']);
  });

  it('keeps distinct candidate quotes separate when amount and cadence match', async () => {
    const test = harness();
    const baseFees = test.loadFees.getMockImplementation()!;
    let blockNumber = 123;
    test.loadFees.mockImplementation(async (bot) => ({
      ...(await baseFees(bot)),
      blockNumber: ++blockNumber,
    }));
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => {
      const first = suggestion(bot, { amount: '4', intervalMs: 6 * HOUR });
      const second = suggestion(bot, {
        kind: 'sma',
        amount: '4',
        intervalMs: 6 * HOUR,
        fastWindow: 2,
        slowWindow: 3,
        signalTiming: 'closed-hour',
      });
      return { strategy: first, strategies: [first, second], usage: { inputTokens: 0, outputTokens: 0, requests: 1 } };
    });
    await test.research.run(input, test.client);
    const quoted = await Promise.all(test.loadFees.mock.results.slice(-2).map((result) => result.value));
    expect(quoted[0].blockNumber).not.toBe(quoted[1].blockNumber);
    expect([observed.runs[0][0].fees?.blockNumber, observed.runs[0][4].fees?.blockNumber]).toEqual(
      quoted.map((fees) => fees.blockNumber)
    );
  });

  it.each([
    { name: 'losing actual XOR', largeFinal: '9.9', largeIdle: '10', largeReturn: '-1', netChange: '-0.03' },
    { name: 'losing actual excess XOR', largeFinal: '10.1', largeIdle: '10.2', largeReturn: '1', netChange: '0.07' },
  ])(
    'rejects positive mean percentages while $name on unequal opening values',
    ({ largeFinal, largeIdle, largeReturn, netChange }) => {
      // Explicit synthetic XOR-denominated accounting observations isolate the
      // selection rule; no market observations or engine results are substituted.
      const rows = [
        {
          startAt: NOW - 48 * HOUR,
          endAt: NOW - 24 * HOUR,
          initialValue: '1',
          finalValue: '1.04',
          heldFinalValue: '1',
          returnPercent: '4',
          drawdownPercent: '0',
          trades: 1,
          coverage: 1,
          outcome: 'expired' as const,
        },
        {
          startAt: NOW - 24 * HOUR,
          endAt: NOW,
          initialValue: '10',
          finalValue: largeFinal,
          heldFinalValue: largeIdle,
          returnPercent: largeReturn,
          drawdownPercent: '1',
          trades: 1,
          coverage: 1,
          outcome: 'expired' as const,
        },
      ];
      const measured = summarizeGoalEpisodes(rows);
      expect(new FPNumber(measured.returnPercent).gt(new FPNumber('0'))).toBe(true);
      expect(measured.excessReturnPercent).toBe('1.5');
      expect(measured.netChange).toBe(netChange);
      expect(measured.excessChange).toBe('-0.03');
      expect(qualificationReasons(measured, '5')).toEqual(['netLoss']);
    }
  );

  it('explains the fixed opening loss before requesting fees, drafting or selecting any candidate', async () => {
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    const request: AutopilotInput = {
      ...input,
      assets: [kusd, input.assets[0]],
      assetInAddress: kusd.address,
      assetOutAddress: XOR.address,
      capital: '10',
      feeBudgetXor: '1',
      valuationAsset: 'output',
    };
    const original = structuredClone(request);
    const outcomes: ReturnType<typeof readAutopilotQualificationDiagnostics>[] = [];
    for (const laterClose of ['0.01', '10000']) {
      const test = harness();
      test.history.candles.forEach((candle, index) => {
        candle.close = index === 0 ? '4.627275257177647266' : index === 1 ? '5.485617430406035512' : laterClose;
        candle.feeClose = candle.close;
      });
      const before = structuredClone(test.history);
      const failure = await test.research.run(request, test.client).catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).message).toBe('bots.autopilot.errors.openingRejected');
      const diagnostics = readAutopilotQualificationDiagnostics(failure);
      expect(diagnostics).toEqual({
        stage: 'opening',
        failures: [],
        opening: {
          lossPercent: '10.6972341206832258130349913977100777',
          maxLossPercent: '5',
          valuationSymbol: 'XOR',
          openedAt: test.history.candles[0].timestamp,
          firstTradeAt: test.history.candles[1].timestamp,
        },
      });
      outcomes.push(diagnostics);
      expect(test.history).toEqual(before);
      expect(test.loadFees).not.toHaveBeenCalled();
      expect(test.client.suggest).not.toHaveBeenCalled();
      expect(observed.batches).toHaveLength(0);
      expect(test.progress).toEqual([{ phase: 'history' }]);
    }
    expect(outcomes[0]).toEqual(outcomes[1]);
    expect(request).toEqual(original);
  });

  it.each([
    { symbol: 'KUSD', capital: '10', fee: '1', ceiling: '10', sample: '1', samples: ['1', '2.5', '5'] },
    { symbol: 'XOR', capital: '10', fee: '1', ceiling: '9', sample: '1', samples: ['1', '2.25', '4.5'] },
    {
      symbol: 'XOR',
      capital: '1.000000000000000003',
      fee: '1',
      ceiling: '0.000000000000000003',
      sample: '0.000000000000000001',
      samples: ['0.000000000000000001'],
    },
    {
      symbol: 'KUSD',
      capital: '10.000000000000000019',
      fee: '1',
      ceiling: '10.000000000000000019',
      sample: '1.000000000000000001',
      samples: ['1.000000000000000001', '2.500000000000000004', '5.000000000000000009'],
    },
    {
      symbol: 'XOR',
      capital: '10.000000000000000019',
      fee: '1.000000000000000001',
      ceiling: '9.000000000000000018',
      sample: '1.000000000000000001',
      samples: ['1.000000000000000001', '2.250000000000000004', '4.500000000000000009'],
    },
  ])(
    'separates $sample fee sample from $ceiling spendable $symbol and $capital total budget',
    async ({ symbol, capital, fee, ceiling, sample, samples }) => {
      const test = harness();
      const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
      const assetIn = symbol === 'XOR' ? XOR : kusd;
      const assetOut = symbol === 'XOR' ? VAL : XOR;
      vi.mocked(test.client.suggest).mockRejectedValueOnce(new Error('draft-reached'));
      await expect(
        test.research.run(
          {
            ...input,
            assets: [...input.assets, kusd],
            assetInAddress: assetIn.address,
            assetOutAddress: assetOut.address,
            capital,
            feeBudgetXor: fee,
          },
          test.client
        )
      ).rejects.toThrow('draft-reached');
      const draft = vi.mocked(test.client.suggest).mock.calls[0][0];
      expect(test.loadFees.mock.calls[0][0].strategy.amount).toBe(sample);
      expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual(samples);
      expect(vi.mocked(test.client.suggest).mock.calls[0][3]?.costSamples?.map((point) => point.amountInCodec)).toEqual(
        samples.map((amount) => toCodec(amount, assetIn.decimals))
      );
      expect(draft.strategy.amount).toBe(sample);
      expect(draft.policy.maxTradeCodec[assetIn.address]).toBe(toCodec(ceiling, assetIn.decimals));
      expect(draft.portfolio.initial[assetIn.address]).toBe(toCodec(capital, assetIn.decimals));
      expect(draft.policy.feeBudgetCodec).toBe(toCodec(fee, XOR.decimals));
      expect(draft.portfolio.holdings).toEqual(draft.portfolio.initial);
      expect(draft.portfolio.trades).toBe(0);
      expect(spendableHoldingCodec(draft, assetOut.address)).toBe('0');
      expect(codec(draft.policy.maxTradeCodec[assetOut.address])).toBeGreaterThan(0n);
      if (symbol === 'KUSD') expect(draft.portfolio.holdings[XOR.address]).toBe(toCodec(fee, XOR.decimals));
      expect(draft.strategy.prompt).toContain('Sell only acquired output above the fee reserve');
    }
  );

  it('collects ordered partial-cost probes sequentially before the single draft', async () => {
    const test = harness();
    const original = test.loadFees.getMockImplementation()!;
    const events: string[] = [];
    let release!: () => void;
    test.loadFees.mockImplementation(async (bot) => {
      events.push(`start:${bot.strategy.amount}`);
      if (bot.strategy.amount === defaultCostSampleAmounts[1])
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      const fees = await original(bot);
      events.push(`end:${bot.strategy.amount}`);
      return fees;
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async () => {
      events.push('draft');
      throw new Error('draft-reached');
    });
    const pending = test.research.run(input, test.client).catch((error: unknown) => error);
    await vi.waitFor(() => expect(test.loadFees).toHaveBeenCalledTimes(2));
    expect(test.client.suggest).not.toHaveBeenCalled();
    expect(events).toEqual([
      `start:${defaultCostSampleAmounts[0]}`,
      `end:${defaultCostSampleAmounts[0]}`,
      `start:${defaultCostSampleAmounts[1]}`,
    ]);
    release();
    expect(await pending).toEqual(new Error('draft-reached'));
    expect(events).toEqual([
      ...defaultCostSampleAmounts.flatMap((amount) => [`start:${amount}`, `end:${amount}`]),
      'draft',
    ]);
    expect(observed.batches).toHaveLength(0);
  });

  it('quotes an exact size between a passing 2.5 KUSD sample and a 5 KUSD impact failure before drafting', async () => {
    const test = harness();
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => ({
      ...(await original(bot)),
      priceImpactPercent: bot.strategy.amount === '5' ? '1.4' : bot.strategy.amount === '3.75' ? '0.9' : '0.3',
    }));
    vi.mocked(test.client.suggest).mockRejectedValueOnce(new Error('draft-reached'));
    await expect(
      test.research.run(
        {
          ...input,
          assets: [...input.assets, kusd],
          assetInAddress: kusd.address,
          assetOutAddress: XOR.address,
          capital: '10',
          feeBudgetXor: '1',
        },
        test.client
      )
    ).rejects.toThrow('draft-reached');
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual(['1', '2.5', '5', '3.75']);
    const [, training, , constraints] = vi.mocked(test.client.suggest).mock.calls[0];
    expect(constraints?.costSamples?.map((sample) => sample.amountInCodec)).toEqual(
      ['1', '2.5', '5', '3.75'].map((amount) => toCodec(amount, kusd.decimals))
    );
    expect(constraints?.costSamples?.[3]).toMatchObject({
      status: 'available',
      buy: { priceImpactPercent: '0.9' },
    });
    expect(training).toEqual(test.history.candles.slice(0, 117));
    expect(observed.batches).toHaveLength(0);
  });

  it('quotes one smaller exact size when the first midpoint fails only the impact cap', async () => {
    const onValidationStarted = vi.fn();
    const test = harness(() => NOW, { onValidationStarted });
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'K'.repeat(20), decimals: 18 };
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      const fees = await original(bot);
      if (bot.strategy.amount === '3.125')
        return {
          ...fees,
          priceImpactPercent: '0.85',
          networkFeeXor: '0.0002',
          networkFeeCodec: toCodec('0.0002', XOR.decimals),
          finalizedAt: NOW - 60_000,
          blockNumber: 124,
          blockHash: `0x${'3'.repeat(64)}`,
        };
      return {
        ...fees,
        priceImpactPercent: bot.strategy.amount === '5' ? '1.349' : bot.strategy.amount === '3.75' ? '1.015' : '0.679',
      };
    });
    vi.mocked(test.client.suggest).mockRejectedValueOnce(new Error('draft-reached'));
    await expect(
      test.research.run(
        {
          ...input,
          assets: [...input.assets, kusd],
          assetInAddress: kusd.address,
          assetOutAddress: XOR.address,
          capital: '10',
          feeBudgetXor: '1',
          valuationAsset: 'output',
          title: 'x'.repeat(160),
        },
        test.client
      )
    ).rejects.toThrow('draft-reached');
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual(['1', '2.5', '5', '3.75', '3.125']);
    const [draft, , , constraints] = vi.mocked(test.client.suggest).mock.calls[0];
    const samples = constraints?.costSamples;
    expect(samples?.map((sample) => sample.amountInCodec)).toEqual(
      ['1', '2.5', '5', '3.75', '3.125'].map((amount) => toCodec(amount, kusd.decimals))
    );
    expect(samples?.[3]).toMatchObject({ status: 'available', buy: { priceImpactPercent: '1.015' } });
    expect(samples?.[4]).toMatchObject({
      status: 'available',
      finalizedAt: NOW - 60_000,
      blockHash: `0x${'3'.repeat(64)}`,
      buy: { networkFeeXor: '0.0002', priceImpactPercent: '0.85' },
    });
    expect(draft.strategy.prompt).toMatch(
      /costSamples #1 [0-4]\/4, #2 [0-4]\/4, #5 [0-4]\/4 24h episodes beating idle/
    );
    expect(draft.strategy.prompt.length).toBeLessThanOrEqual(2000);
    expect(onValidationStarted).not.toHaveBeenCalled();
    expect(observed.batches).toHaveLength(0);
  });

  it('tests the exact feasible 2.5 KUSD sample beside a 3.75 KUSD seed, not a known over-limit double', async () => {
    const test = harness();
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      const impact = bot.strategy.amount === '5' ? '1.4' : bot.strategy.amount === '3.75' ? '0.9' : '0.3';
      return { ...(await original(bot)), priceImpactPercent: impact, sellPriceImpactPercent: impact };
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { amount: '3.75', intervalMs: HOUR }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    await test.research
      .run(
        {
          ...input,
          assets: [...input.assets, kusd],
          assetInAddress: kusd.address,
          assetOutAddress: XOR.address,
          capital: '10',
          feeBudgetXor: '1',
          valuationAsset: 'output',
        },
        test.client
      )
      .catch(() => undefined);
    expect(observed.batches[0].filter((_, index) => index % 4 === 0).map((run) => run.strategy!.amount)).toEqual([
      '3.75',
      '2.5',
      '1',
    ]);
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual(['1', '2.5', '5', '3.75']);
    expect(test.client.suggest).toHaveBeenCalledTimes(1);
    expect(observed.batches).toHaveLength(1);
  });

  it('excludes an unavailable midpoint and an exact over-impact sample, then quotes a fallback size', async () => {
    const test = harness();
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      if (bot.strategy.amount === '3.75') throw new Error('bots.errors.quote');
      const impact = bot.strategy.amount === '5' ? '1.4' : '0.3';
      return { ...(await original(bot)), priceImpactPercent: impact, sellPriceImpactPercent: impact };
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { amount: '2.5', intervalMs: HOUR }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    await test.research
      .run(
        {
          ...input,
          assets: [...input.assets, kusd],
          assetInAddress: kusd.address,
          assetOutAddress: XOR.address,
          capital: '10',
          feeBudgetXor: '1',
          valuationAsset: 'output',
        },
        test.client
      )
      .catch(() => undefined);
    expect(observed.batches[0].filter((_, index) => index % 4 === 0).map((run) => run.strategy!.amount)).toEqual([
      '2.5',
      '1',
      '1.25',
    ]);
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual(['1', '2.5', '5', '3.75', '1.25']);
    expect(vi.mocked(test.client.suggest).mock.calls[0][3]?.costSamples?.[3]).toEqual({
      amountInCodec: toCodec('3.75', 18),
      status: 'unavailable',
      reason: 'quoteUnavailable',
    });
    expect(observed.batches).toHaveLength(1);
  });

  it('leaves an unavailable adaptive quote explicit and does not fabricate a feasible interval', async () => {
    const test = harness();
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      if (bot.strategy.amount === '37.125000000000000006') throw new Error('bots.errors.quote');
      return {
        ...(await original(bot)),
        priceImpactPercent: bot.strategy.amount === defaultCostSampleAmounts[2] ? '2' : '0',
      };
    });
    vi.mocked(test.client.suggest).mockRejectedValueOnce(new Error('draft-reached'));
    await expect(test.research.run(input, test.client)).rejects.toThrow('draft-reached');
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual([
      ...defaultCostSampleAmounts,
      '37.125000000000000006',
    ]);
    expect(vi.mocked(test.client.suggest).mock.calls[0][3]?.costSamples?.[3]).toEqual({
      amountInCodec: toCodec('37.125000000000000006', 18),
      status: 'unavailable',
      reason: 'quoteUnavailable',
    });
    expect(observed.batches).toHaveLength(0);
  });

  it('refuses to draft when the adaptive quote describes stale finalized fees', async () => {
    const test = harness();
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      const quote = await original(bot);
      if (bot.strategy.amount === '37.125000000000000006') quote.finalizedAt = NOW - 300_001;
      return { ...quote, priceImpactPercent: bot.strategy.amount === defaultCostSampleAmounts[2] ? '2' : '0' };
    });
    await expect(test.research.run(input, test.client)).rejects.toThrow('bots.errors.stale');
    expect(test.loadFees).toHaveBeenCalledTimes(4);
    expect(test.client.suggest).not.toHaveBeenCalled();
    expect(observed.batches).toHaveLength(0);
  });

  it('shows each quoted fee against the opening loss allowance before drafting without claiming later infeasibility', async () => {
    const test = harness();
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    test.history.candles.forEach((candle, index) => {
      candle.close = index < 117 ? '6' : '987654321';
      candle.feeClose = candle.close;
    });
    const original = test.loadFees.getMockImplementation()!;
    let observed = 0;
    test.loadFees.mockImplementation(async (bot) => {
      const networkFeeXor = ['0.21', '0.1', '0.11'][observed++];
      return { ...(await original(bot)), networkFeeXor, networkFeeCodec: toCodec(networkFeeXor, 18) };
    });
    vi.mocked(test.client.suggest).mockRejectedValueOnce(new Error('draft-reached'));
    await expect(
      test.research.run(
        {
          ...input,
          assets: [...input.assets, kusd],
          assetInAddress: kusd.address,
          assetOutAddress: XOR.address,
          capital: '10',
          feeBudgetXor: '1',
          valuationAsset: 'output',
        },
        test.client
      )
    ).rejects.toThrow('draft-reached');
    const [draft, training, , constraints] = vi.mocked(test.client.suggest).mock.calls[0];
    const samples = constraints!.costSamples!;
    expect(samples).toHaveLength(3);
    const first = samples[0];
    const second = samples[1];
    if (first.status !== 'available' || second.status !== 'available') throw new Error('fixture');
    // 10 KUSD plus the protected 1 XOR reserve at 6 KUSD/XOR is 16 KUSD.
    // The first observed 0.21 XOR fee costs 1.26 KUSD: exactly 7.875%.
    expect(first.openingFeeScenario).toEqual({
      protocol: 'opening-fee-scenario-v1',
      valuationAsset: 'output',
      lossMetric: 'drawdown',
      maxLossPercent: '5',
      opening: {
        timestamp: test.history.candles[0].timestamp,
        feeOnlyLossPercent: '7.875',
        feeOnlyReachesLossLimit: true,
      },
      firstPossibleTrade: {
        timestamp: test.history.candles[1].timestamp,
        feeOnlyLossPercent: '7.875',
        feeOnlyReachesLossLimit: true,
      },
      laterOpportunity: 'not-assessed',
    });
    expect(second.openingFeeScenario?.opening.feeOnlyLossPercent).toBe('3.75');
    expect(second.openingFeeScenario?.opening.feeOnlyReachesLossLimit).toBe(false);
    expect(training).toEqual(test.history.candles.slice(0, 117));
    expect(JSON.stringify(constraints)).not.toContain('987654321');
    expect(draft.strategy.prompt).toContain('not later feasibility or trading authority');
    expect(draft.portfolio.holdings).toEqual(draft.portfolio.initial);
    expect(draft.goal!.maxLossPercent).toBe('5');
    expect(observed).toBe(3);
  });

  it('exposes only each sample’s own dated costs, preserving the original reference and training boundary', async () => {
    const test = harness();
    const original = test.loadFees.getMockImplementation()!;
    let index = 0;
    test.loadFees.mockImplementation(async (bot) => {
      const n = index++;
      const networkFeeXor = ['0.0001', '0.0002', '0.0003'][n];
      return {
        ...(await original(bot)),
        networkFeeXor,
        networkFeeCodec: toCodec(networkFeeXor, 18),
        finalizedAt: NOW - n * 1000,
        blockHash: `0x${String(n + 2).repeat(64)}`,
        amountOut: '987654321.123456789',
        sellAmountIn: '987654321.123456789',
        route: [bot.assetIn.address, bot.assetOut.address],
      };
    });
    vi.mocked(test.client.suggest).mockRejectedValueOnce(new Error('draft-reached'));
    await expect(test.research.run(input, test.client)).rejects.toThrow('draft-reached');
    const [draft, training, , constraints] = vi.mocked(test.client.suggest).mock.calls[0];
    expect(constraints?.costSamples).toEqual(
      defaultCostSampleAmounts.map((amount, n) =>
        expect.objectContaining({
          amountInCodec: toCodec(amount, 18),
          status: 'available',
          finalizedAt: NOW - n * 1000,
          blockHash: `0x${String(n + 2).repeat(64)}`,
          buy: { networkFeeXor: ['0.0001', '0.0002', '0.0003'][n], swapFeePercent: '0.1', priceImpactPercent: '0' },
          sell: { networkFeeXor: '0.0001', swapFeePercent: '0.1', priceImpactPercent: '0' },
        })
      )
    );
    expect(constraints?.costs).toMatchObject({
      finalizedAt: NOW,
      blockHash: `0x${'2'.repeat(64)}`,
      buy: { networkFeeXor: '0.0001' },
    });
    expect(JSON.stringify(constraints?.costSamples)).not.toMatch(
      /987654321|amountOut|route|endpoint|denominator|genesisHash/
    );
    expect(training).toEqual(test.history.candles.slice(0, 117));
    expect(draft.portfolio.holdings).toEqual(draft.portfolio.initial);
    expect(draft.policy.feeBudgetCodec).toBe(toCodec(input.feeBudgetXor, 18));
    expect(
      test.loadFees.mock.calls.every(
        ([bot]) => codec(toCodec(bot.strategy.amount, 18)) < codec(spendableHoldingCodec(bot, bot.assetIn.address))
      )
    ).toBe(true);
    expect(observed.batches).toHaveLength(0);
  });

  it.each([1, 2])('retains an unavailable partial probe %s without fabricating a zero-cost point', async (missing) => {
    const test = harness();
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      if (bot.strategy.amount === defaultCostSampleAmounts[missing]) throw new Error('bots.errors.quote');
      return original(bot);
    });
    vi.mocked(test.client.suggest).mockRejectedValueOnce(new Error('draft-reached'));
    await expect(test.research.run(input, test.client)).rejects.toThrow('draft-reached');
    const points = vi.mocked(test.client.suggest).mock.calls[0][3]?.costSamples;
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual(defaultCostSampleAmounts);
    expect(points).toHaveLength(3);
    expect(points![missing]).toEqual({
      amountInCodec: toCodec(defaultCostSampleAmounts[missing], 18),
      status: 'unavailable',
      reason: 'quoteUnavailable',
    });
    expect(points!.filter((_, n) => n !== missing).every((point) => point.status === 'available')).toBe(true);
    expect(observed.batches).toHaveLength(0);
  });

  it.each([
    new Error('bots.errors.stale'),
    new Error('bots.errors.quote.extra'),
    new Error('provider failed'),
    { message: 'bots.errors.quote' },
  ])('does not disguise a non-quote probe failure as unavailable: %s', async (failure) => {
    const test = harness();
    test.loadFees.mockImplementationOnce(test.loadFees.getMockImplementation()!).mockRejectedValueOnce(failure);
    await expect(test.research.run(input, test.client)).rejects.toBe(failure);
    expect(test.loadFees).toHaveBeenCalledTimes(2);
    expect(test.client.suggest).not.toHaveBeenCalled();
    expect(observed.batches).toHaveLength(0);
  });

  it.each(['identity', 'expired', 'finalized', 'amount'] as const)(
    'rejects invalid %s evidence on an additional probe before drafting',
    async (fault) => {
      const test = harness();
      const original = test.loadFees.getMockImplementation()!;
      test.loadFees.mockImplementationOnce(original).mockImplementationOnce(async (bot) => {
        const fees = await original(bot);
        if (fault === 'identity') fees.denominator = '2000';
        if (fault === 'expired') fees.expiresAt = NOW;
        if (fault === 'finalized') fees.finalizedAt = NOW - 300_001;
        if (fault === 'amount') fees.amountIn = defaultCostSampleAmounts[0];
        return fees;
      });
      await expect(test.research.run(input, test.client)).rejects.toThrow('bots.errors.stale');
      expect(test.loadFees).toHaveBeenCalledTimes(2);
      expect(test.client.suggest).not.toHaveBeenCalled();
      expect(observed.batches).toHaveLength(0);
    }
  );

  it('rechecks earlier sample freshness when a later sequential probe took too long', async () => {
    let current = NOW;
    const test = harness(() => current);
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      if (bot.strategy.amount === defaultCostSampleAmounts[2]) current += 300_001;
      return { ...(await original(bot)), queriedAt: current, finalizedAt: current, expiresAt: current + 300_000 };
    });
    await expect(test.research.run(input, test.client)).rejects.toThrow('bots.errors.stale');
    expect(test.loadFees).toHaveBeenCalledTimes(3);
    expect(test.client.suggest).not.toHaveBeenCalled();
    expect(observed.batches).toHaveLength(0);
  });

  it('does not select expired samples after a slow draft and requotes each fallback hypothesis', async () => {
    let current = NOW;
    const test = harness(() => current);
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    for (const candle of test.history.candles) candle.close = '100';
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      const impact = bot.strategy.amount === '5' || bot.strategy.amount === '7.5' ? '1.4' : '0.3';
      return {
        ...(await original(bot)),
        queriedAt: current,
        finalizedAt: current,
        expiresAt: current + 300_000,
        priceImpactPercent: impact,
        sellPriceImpactPercent: impact,
      };
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => {
      current += 300_001;
      return {
        strategy: suggestion(bot, { amount: '3.75', intervalMs: HOUR }),
        usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
      };
    });
    const failure = await test.research
      .run(
        {
          ...input,
          assets: [...input.assets, kusd],
          assetInAddress: kusd.address,
          assetOutAddress: XOR.address,
          capital: '10',
          feeBudgetXor: '1',
          valuationAsset: 'output',
        },
        test.client
      )
      .catch((error: unknown) => error);
    expect(readAutopilotQualificationDiagnostics(failure)?.stage).toBe('training');
    expect(observed.batches[0].filter((_, index) => index % 4 === 0).map((run) => run.strategy!.amount)).toEqual([
      '3.75',
      '1.875',
      '7.5',
    ]);
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual([
      '1',
      '2.5',
      '5',
      '3.75',
      '3.75',
      '1.875',
      '7.5',
    ]);
    expect(observed.batches).toHaveLength(1);
  });

  it('honors a changed candidate quote even when that size passed before drafting', async () => {
    const test = harness();
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    for (const candle of test.history.candles) candle.close = '100';
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      const impact =
        bot.strategy.amount === '5'
          ? '1.4'
          : bot.strategy.amount === '2.5' && bot.strategy.intervalMs === 6 * HOUR
            ? '2'
            : '0.3';
      return { ...(await original(bot)), priceImpactPercent: impact, sellPriceImpactPercent: impact };
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { amount: '3.75', intervalMs: 6 * HOUR }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    const failure = await test.research
      .run(
        {
          ...input,
          assets: [...input.assets, kusd],
          assetInAddress: kusd.address,
          assetOutAddress: XOR.address,
          capital: '10',
          feeBudgetXor: '1',
          valuationAsset: 'output',
        },
        test.client
      )
      .catch((error: unknown) => error);
    expect(readAutopilotQualificationDiagnostics(failure)?.stage).toBe('training');
    expect(observed.batches[0].filter((_, index) => index % 4 === 0).map((run) => run.strategy!.amount)).toEqual([
      '3.75',
      '2.5',
      '1',
    ]);
    expect(test.loadFees.mock.calls.filter(([bot]) => bot.strategy.amount === '2.5')).toHaveLength(2);
    expect(observed.runs[0].slice(4, 8).every((run) => run.result?.result.trades === 0)).toBe(true);
    expect(
      observed.runs[0]
        .slice(4, 8)
        .every((run) =>
          run.result?.candidates.some((candidate) =>
            candidate.checks.some((check) => check.key === 'priceImpact' && !check.passed)
          )
        )
    ).toBe(true);
    expect(observed.batches).toHaveLength(1);
  });

  it('cancels a pending partial probe before drafting and ignores its late completion', async () => {
    const test = harness();
    const original = test.loadFees.getMockImplementation()!;
    let finish!: (fees: ResearchFeeSnapshot) => void;
    test.loadFees.mockImplementationOnce(original).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const controller = new AbortController();
    const pending = test.research.run(input, test.client, controller.signal);
    await vi.waitFor(() => expect(test.loadFees).toHaveBeenCalledTimes(2));
    controller.abort();
    await expect(pending).rejects.toThrow('bots.errors.stale');
    finish(await original(test.loadFees.mock.calls[1][0]));
    await Promise.resolve();
    expect(test.loadFees).toHaveBeenCalledTimes(2);
    expect(test.client.suggest).not.toHaveBeenCalled();
    expect(observed.batches).toHaveLength(0);
  });

  it('prefers exact sampled sizes and ignores mutations to the assistant’s cost copy', async () => {
    const test = harness();
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot, _history, _signal, constraints) => {
      const available = constraints!.costSamples!.filter((point) => point.status === 'available');
      available[1].buy.networkFeeXor = '999';
      available[2].buy.priceImpactPercent = '99';
      return {
        strategy: suggestion(bot, { amount: defaultCostSampleAmounts[1], intervalMs: HOUR }),
        usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
      };
    });
    const result = await test.research.run(input, test.client);
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual(defaultCostSampleAmounts);
    expect(observed.batches[0].filter((_, index) => index % 4 === 0).map((run) => run.strategy!.amount)).toEqual([
      defaultCostSampleAmounts[1],
      defaultCostSampleAmounts[0],
      defaultCostSampleAmounts[2],
    ]);
    expect(result.candidates).toBe(3);
    expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
    expect(
      observed.runs.flat().every((run) => run.fees?.networkFeeXor === '0.0001' && run.fees?.priceImpactPercent === '0')
    ).toBe(true);
  });

  it('reuses matching exact 10 KUSD partial samples without changing funding', async () => {
    const test = harness();
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { amount: '2.5', intervalMs: HOUR }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    const result = await test.research.run(
      {
        ...input,
        assets: [...input.assets, kusd],
        assetInAddress: kusd.address,
        assetOutAddress: XOR.address,
        capital: '10',
        feeBudgetXor: '1',
      },
      test.client
    );
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual(['1', '2.5', '5']);
    expect(observed.batches[0].filter((_, index) => index % 4 === 0).map((run) => run.strategy!.amount)).toEqual([
      '2.5',
      '1',
      '5',
    ]);
    expect(result.candidates).toBe(3);
    expect(result.bot.portfolio.initial[kusd.address]).toBe(toCodec('10', 18));
    expect(result.bot.portfolio.initial[XOR.address]).toBe(toCodec('1', 18));
    expect(result.bot.portfolio.holdings).toEqual(result.bot.portfolio.initial);
    expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
  });

  it('selects an independently verified alternative when the default reference quote is unavailable', async () => {
    const test = harness();
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      const fees = await original(bot);
      if (bot.strategy.amount !== defaultCostSampleAmounts[1]) return fees;
      return {
        ...fees,
        networkFeeXor: '0.0002',
        networkFeeCodec: toCodec('0.0002', XOR.decimals),
        blockHash: `0x${'3'.repeat(64)}`,
      };
    });
    test.loadFees.mockRejectedValueOnce(new Error('bots.errors.quote'));
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { amount: defaultCostSampleAmounts[1] }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    const result = await test.research.run(input, test.client);
    const [draft, , , constraints] = vi.mocked(test.client.suggest).mock.calls[0];
    expect(test.loadFees.mock.calls.slice(0, 3).map(([bot]) => bot.strategy.amount)).toEqual(defaultCostSampleAmounts);
    expect(draft.strategy.amount).toBe(defaultCostSampleAmounts[1]);
    expect(constraints?.sizing?.feeSampleAmountCodec).toBe(toCodec(defaultCostSampleAmounts[1], XOR.decimals));
    expect(constraints?.costSamples?.[0]).toEqual({
      amountInCodec: toCodec(defaultCostSampleAmounts[0], XOR.decimals),
      status: 'unavailable',
      reason: 'quoteUnavailable',
    });
    const selected = constraints?.costSamples?.[1];
    if (!selected || selected.status !== 'available') throw new Error('fixture');
    expect(constraints?.costs?.buy).toEqual(selected.buy);
    expect(constraints?.costs?.blockHash).toBe(selected.blockHash);
    expect(constraints?.costs?.blockHash).toBe(`0x${'3'.repeat(64)}`);
    expect(constraints?.costs?.buy.networkFeeXor).toBe('0.0002');
    expect(result.candidates).toBe(3);
    expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
  });

  it('preserves the 10 KUSD to XOR goal and separate 1 XOR reserve when the 1 KUSD quote is unavailable', async () => {
    const test = harness();
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    test.history.candles.forEach((candle, index) => {
      candle.close = index % 12 < 8 ? '100' : '104';
      candle.feeClose = candle.close;
    });
    test.loadFees.mockRejectedValueOnce(new Error('bots.errors.quote'));
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, {
        amount: '2.5',
        kind: 'rules',
        intervalMs: 2 * HOUR,
        rules: {
          version: 1,
          entry: {
            operator: 'all',
            conditions: [{ kind: 'deviation', window: 2, direction: 'below', threshold: '0' }],
          },
          exit: { operator: 'all', conditions: [{ kind: 'deviation', window: 2, direction: 'above', threshold: '0' }] },
        },
      }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    const result = await test.research.run(
      {
        ...input,
        assets: [...input.assets, kusd],
        assetInAddress: kusd.address,
        assetOutAddress: XOR.address,
        capital: '10',
        feeBudgetXor: '1',
        maxLossPercent: '10',
        targetReturnPercent: '5',
        valuationAsset: 'output',
      },
      test.client
    );
    const [draft, , , constraints] = vi.mocked(test.client.suggest).mock.calls[0];
    expect(test.loadFees.mock.calls.slice(0, 3).map(([bot]) => bot.strategy.amount)).toEqual(['1', '2.5', '5']);
    expect(draft.strategy.amount).toBe('2.5');
    expect(constraints?.sizing).toMatchObject({
      capitalCodec: toCodec('10', kusd.decimals),
      feeSampleAmountCodec: toCodec('2.5', kusd.decimals),
    });
    expect(constraints?.costSamples?.[0]).toEqual({
      amountInCodec: toCodec('1', kusd.decimals),
      status: 'unavailable',
      reason: 'quoteUnavailable',
    });
    const selected = constraints?.costSamples?.[1];
    if (!selected || selected.status !== 'available') throw new Error('fixture');
    expect(constraints?.costs?.buy).toEqual(selected.buy);
    expect(constraints?.costs?.blockHash).toBe(selected.blockHash);
    expect(result.bot.portfolio.initial[kusd.address]).toBe(toCodec('10', kusd.decimals));
    expect(result.bot.portfolio.initial[XOR.address]).toBe(toCodec('1', XOR.decimals));
    expect(result.bot.portfolio.holdings).toEqual(result.bot.portfolio.initial);
    expect(result.bot.policy.feeBudgetCodec).toBe(toCodec('1', XOR.decimals));
    expect(result.bot.policy.maxPriceImpactPercent).toBe('1');
    expect(result.bot.goal).toMatchObject({ maxLossPercent: '10', targetReturnPercent: '5', valuationAsset: 'output' });
    expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
    expect(observed.batches[1][0].strategy).toEqual(result.bot.strategy);
  });

  it('binds default reference costs to the verified copy even if a loader mutates its earlier object', async () => {
    const test = harness();
    const original = test.loadFees.getMockImplementation()!;
    let initial: ResearchFeeSnapshot | undefined;
    test.loadFees.mockImplementation(async (bot) => {
      const fees = await original(bot);
      if (bot.strategy.amount === defaultCostSampleAmounts[0]) initial = fees;
      if (bot.strategy.amount === defaultCostSampleAmounts[1] && initial) {
        initial.networkFeeXor = '0.9';
        initial.networkFeeCodec = toCodec('0.9', XOR.decimals);
      }
      return fees;
    });
    vi.mocked(test.client.suggest).mockRejectedValueOnce(new Error('draft-reached'));
    await expect(test.research.run(input, test.client)).rejects.toThrow('draft-reached');
    const [draft, , , constraints] = vi.mocked(test.client.suggest).mock.calls[0];
    expect(draft.strategy.amount).toBe(defaultCostSampleAmounts[0]);
    expect(constraints?.costs?.buy.networkFeeXor).toBe('0.0001');
    expect(constraints?.costSamples?.[0].status).toBe('available');
  });

  it('keeps all unavailable exact probes scoped to quote discovery without a draft', async () => {
    const test = harness();
    test.loadFees.mockRejectedValue(new Error('bots.errors.quote'));
    await expect(test.research.run(input, test.client)).rejects.toThrow('bots.errors.quote');
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual([
      ...defaultCostSampleAmounts,
      '5',
      '2.5',
    ]);
    expect(test.client.suggest).not.toHaveBeenCalled();
    expect(observed.batches).toHaveLength(0);
  });

  it('deduplicates a tiny allocation and never probes zero base units', async () => {
    const test = harness();
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    test.loadFees.mockRejectedValue(new Error('bots.errors.quote'));
    await expect(
      test.research.run(
        {
          ...input,
          assets: [...input.assets, kusd],
          assetInAddress: kusd.address,
          assetOutAddress: XOR.address,
          capital: '0.000000000000000003',
          feeBudgetXor: '1',
        },
        test.client
      )
    ).rejects.toThrow('bots.errors.quote');
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual(['0.000000000000000001']);
    expect(test.client.suggest).not.toHaveBeenCalled();
  });

  it.each(['stale', 'genesis', 'pair', 'amount'] as const)(
    'fails closed on %s alternative evidence after an unavailable default quote',
    async (fault) => {
      const test = harness();
      const original = test.loadFees.getMockImplementation()!;
      test.loadFees.mockRejectedValueOnce(new Error('bots.errors.quote')).mockImplementationOnce(async (bot) => {
        const fees = await original(bot);
        if (fault === 'stale') fees.finalizedAt = NOW - 300_001;
        if (fault === 'genesis') fees.genesisHash = `0x${'f'.repeat(64)}`;
        if (fault === 'pair') fees.assetInAddress = `0x${'f'.repeat(64)}`;
        if (fault === 'amount') fees.amountIn = defaultCostSampleAmounts[0];
        return fees;
      });
      await expect(test.research.run(input, test.client)).rejects.toThrow('bots.errors.stale');
      expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual(
        defaultCostSampleAmounts.slice(0, 2)
      );
      expect(test.client.suggest).not.toHaveBeenCalled();
    }
  );

  it('does not disguise an alternative provider failure as another unavailable quote', async () => {
    const test = harness();
    const providerFailure = new Error('provider failed');
    test.loadFees.mockRejectedValueOnce(new Error('bots.errors.quote')).mockRejectedValueOnce(providerFailure);
    await expect(test.research.run(input, test.client)).rejects.toBe(providerFailure);
    expect(test.loadFees).toHaveBeenCalledTimes(2);
    expect(test.client.suggest).not.toHaveBeenCalled();
  });

  it('does not continue alternative probes after a canceled default quote', async () => {
    const test = harness();
    const controller = new AbortController();
    let started!: () => void;
    const began = new Promise<void>((resolve) => {
      started = resolve;
    });
    test.loadFees.mockImplementationOnce(async () => {
      started();
      return new Promise<ResearchFeeSnapshot>(() => {});
    });
    const pending = test.research.run(input, test.client, controller.signal);
    await began;
    controller.abort();
    await expect(pending).rejects.toThrow('bots.errors.stale');
    expect(test.loadFees).toHaveBeenCalledTimes(1);
    expect(test.client.suggest).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'requotes a selected previously unavailable partial sample; remains unavailable=%s',
    async (stillUnavailable) => {
      const test = harness();
      const original = test.loadFees.getMockImplementation()!;
      let quarterCalls = 0;
      test.loadFees.mockImplementation(async (bot) => {
        if (bot.strategy.amount === defaultCostSampleAmounts[1]) {
          quarterCalls++;
          if (quarterCalls === 1 || stillUnavailable) throw new Error('bots.errors.quote');
        }
        return original(bot);
      });
      vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
        strategy: suggestion(bot, { amount: defaultCostSampleAmounts[1], intervalMs: HOUR }),
        usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
      }));
      if (stillUnavailable) {
        await expect(test.research.run(input, test.client)).rejects.toThrow('bots.errors.quote');
        expect(observed.batches).toHaveLength(0);
      } else {
        const result = await test.research.run(input, test.client);
        expect(result.candidates).toBe(3);
        expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
      }
      expect(quarterCalls).toBe(2);
      expect(test.client.suggest).toHaveBeenCalledTimes(1);
      expect(vi.mocked(test.client.suggest).mock.calls[0][3]?.costSamples?.[1]).toEqual({
        amountInCodec: toCodec(defaultCostSampleAmounts[1], 18),
        status: 'unavailable',
        reason: 'quoteUnavailable',
      });
    }
  );

  it('keeps the advanced lab trade percentage and policy unchanged', () => {
    const settings = { ...createLabDefaultSettings(NOW), capital: '10', feeBudgetXor: '1' };
    const bot = createResearchBot(settings, input.assets, NOW);
    expect(settings.tradePercent).toBe(10);
    expect(bot.strategy.amount).toBe('1');
    expect(bot.policy.maxTradeCodec[XOR.address]).toBe(toCodec('1', XOR.decimals));
  });

  it('accepts an AI-sized 2 KUSD order within 10 KUSD and requotes it while preserving all capital and risk limits', async () => {
    const test = harness();
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { amount: '2', intervalMs: 6 * HOUR }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    const result = await test.research.run(
      {
        ...input,
        assets: [...input.assets, kusd],
        assetInAddress: kusd.address,
        assetOutAddress: XOR.address,
        capital: '10',
        feeBudgetXor: '1',
      },
      test.client
    );
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual(['1', '2.5', '5', '2', '2.5', '1']);
    expect(observed.batches[0].filter((_, index) => index % 4 === 0).map((run) => run.strategy!.amount)).toEqual([
      '2',
      '2.5',
      '1',
    ]);
    expect(['2', '2.5', '1']).toContain(result.bot.strategy.amount);
    expect(result.bot.policy.maxTradeCodec[kusd.address]).toBe(toCodec(result.bot.strategy.amount, kusd.decimals));
    expect(result.bot.portfolio.initial[kusd.address]).toBe(toCodec('10', kusd.decimals));
    expect(result.bot.portfolio.initial[XOR.address]).toBe(toCodec('1', XOR.decimals));
    expect(result.bot.portfolio.holdings).toEqual(result.bot.portfolio.initial);
    expect(result.bot.policy.feeBudgetCodec).toBe(toCodec('1', XOR.decimals));
    expect(result.bot.goal?.maxLossPercent).toBe(input.maxLossPercent);
    expect(result.bot.goal?.lossMetric).toBe('drawdown');
    expect(vi.mocked(test.client.suggest).mock.calls[0][0].goal?.lossMetric).toBe('drawdown');
    expect(vi.mocked(test.client.suggest).mock.calls[0][0].strategy.prompt).toContain('from peak portfolio value');
    expect(vi.mocked(test.client.suggest).mock.calls[0][0].strategy.prompt.length).toBeLessThanOrEqual(2000);
    const desktop = await createDesktopAiClient({ portable: true }, {} as Document);
    await desktop.connect({ connectionId: desktop.connectionId });
    const [draftBot, training, , constraints] = vi.mocked(test.client.suggest).mock.calls[0];
    const awaitingDraft = desktop.suggest(draftBot, training, undefined, constraints);
    const publicContext = desktop.readContext();
    expect(publicContext.assets.map((asset) => asset.symbol)).toEqual(['KUSD', 'XOR']);
    expect(publicContext.constraints.sizing?.capitalCodec).toBe(toCodec('10', kusd.decimals));
    expect(publicContext.trainingCutoff).toBe(training.at(-1)!.timestamp);
    desktop.disconnect();
    await expect(awaitingDraft).rejects.toThrow('bots.errors.stale');
    expect(result.research.qualification!.trades).toBeGreaterThanOrEqual(1);
    expect(result.research.feeObservation?.amountIn).toBe(result.bot.strategy.amount);
    expect(result.bot.policy.maxTradeCodec[XOR.address]).toBe(
      vi.mocked(test.client.suggest).mock.calls[0][0].policy.maxTradeCodec[XOR.address]
    );
  });

  it('excludes an all-budget draft from research and quotes only smaller orders within 10 KUSD', async () => {
    const test = harness();
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { amount: '10', intervalMs: HOUR }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    const result = await test.research.run(
      {
        ...input,
        assets: [...input.assets, kusd],
        assetInAddress: kusd.address,
        assetOutAddress: XOR.address,
        capital: '10',
        feeBudgetXor: '1',
      },
      test.client
    );
    expect(observed.batches).toHaveLength(2);
    expect(observed.batches[0].filter((_, index) => index % 4 === 0).map((run) => run.strategy!.amount)).toEqual([
      '5',
      '2.5',
      '1',
    ]);
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual(['1', '2.5', '5']);
    expect(result.bot.strategy.amount).toBe('5');
    expect(result.bot.portfolio.initial[kusd.address]).toBe(toCodec('10', kusd.decimals));
    expect(result.research.qualification!.trades).toBeGreaterThanOrEqual(1);
    expect(observed.batches[0].every((run) => run.settings.capital === '10')).toBe(true);
  });

  it('ranks exact sampled orders with their own execution costs and freezes the winning quote for holdout', async () => {
    const test = harness();
    for (const [index, candle] of test.history.candles.entries()) candle.close = String(100 + Math.max(0, index - 60));
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      const favorable = bot.strategy.amount === defaultCostSampleAmounts[1];
      const network = favorable ? '0.0002' : '0.19';
      return {
        ...(await original(bot)),
        networkFeeXor: network,
        networkFeeCodec: toCodec(network, XOR.decimals),
        sellNetworkFeeXor: network,
        sellNetworkFeeCodec: toCodec(network, XOR.decimals),
        swapFeePercent: favorable ? '0.1' : '9',
        sellSwapFeePercent: favorable ? '0.1' : '9',
      };
    });
    const result = await test.research.run(input, test.client);
    expect(result.bot.strategy.amount).toBe(defaultCostSampleAmounts[1]);
    expect(result.bot.policy.maxTradeCodec[XOR.address]).toBe(toCodec(defaultCostSampleAmounts[1], XOR.decimals));
    expect(result.research.feeObservation?.amountIn).toBe(defaultCostSampleAmounts[1]);
    expect(result.research.networkFeeXor).toBe('0.0002');
    expect(result.research.swapFeePercent).toBe('0.1');
    expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
    expect(observed.batches[1][0].strategy).toEqual(observed.batches[0][4].strategy);
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual([
      ...defaultCostSampleAmounts,
      '10.000000000000000001',
      defaultCostSampleAmounts[1],
      defaultCostSampleAmounts[2],
    ]);
    expect(result.bot.portfolio.initial[XOR.address]).toBe(toCodec(input.capital, XOR.decimals));
    expect(result.bot.policy.feeBudgetCodec).toBe(toCodec(input.feeBudgetXor, XOR.decimals));
    expect(result.bot.goal!.maxLossPercent).toBe(input.maxLossPercent);
  });

  it('floors fallback candidate sizes at token precision when exact samples are unavailable', async () => {
    const test = harness();
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      if (defaultCostSampleAmounts.slice(1).includes(bot.strategy.amount)) throw new Error('bots.errors.quote');
      return original(bot);
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { amount: '5.000000000000000019' }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    const result = await test.research.run(input, test.client);
    expect(observed.batches[0].filter((_, index) => index % 4 === 0).map((run) => run.strategy!.amount)).toEqual([
      '5.000000000000000019',
      defaultCostSampleAmounts[0],
      '2.500000000000000009',
    ]);
    expect(result.bot.portfolio.initial[XOR.address]).toBe(toCodec(input.capital, XOR.decimals));
  });

  it('can select a larger partial order using its own fees without increasing capital or retuning holdout', async () => {
    const test = harness();
    test.history.candles.forEach((candle, index) => {
      candle.close = index % 12 < 8 ? '90' : '106';
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, {
        amount: '10',
        kind: 'rules',
        intervalMs: HOUR,
        rules: {
          version: 1,
          entry: {
            operator: 'all',
            conditions: [{ kind: 'deviation', window: 2, direction: 'below', threshold: '0' }],
          },
          exit: { operator: 'all', conditions: [{ kind: 'deviation', window: 2, direction: 'above', threshold: '0' }] },
        },
      }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      const larger = bot.strategy.amount === defaultCostSampleAmounts[1];
      const networkFeeXor = larger ? '0.0001' : '0.19';
      return {
        ...(await original(bot)),
        networkFeeXor,
        networkFeeCodec: toCodec(networkFeeXor, XOR.decimals),
        sellNetworkFeeXor: networkFeeXor,
        sellNetworkFeeCodec: toCodec(networkFeeXor, XOR.decimals),
        swapFeePercent: larger ? '0.1' : '10',
        sellSwapFeePercent: larger ? '0.1' : '10',
      };
    });
    const result = await test.research.run(input, test.client);
    expect(result.bot.strategy.amount).toBe(defaultCostSampleAmounts[1]);
    expect(result.research.feeObservation?.amountIn).toBe(defaultCostSampleAmounts[1]);
    expect(result.bot.policy.maxTradeCodec[XOR.address]).toBe(toCodec(defaultCostSampleAmounts[1], XOR.decimals));
    expect(result.bot.portfolio.initial[XOR.address]).toBe(toCodec(input.capital, XOR.decimals));
    expect(result.bot.policy.feeBudgetCodec).toBe(toCodec(input.feeBudgetXor, XOR.decimals));
    expect(result.bot.goal?.maxLossPercent).toBe(input.maxLossPercent);
    expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
    expect(observed.batches[1][0].strategy).toEqual(observed.batches[0][8].strategy);
    expect(test.client.suggest).toHaveBeenCalledTimes(1);
  });

  it.each([
    { symbol: 'KUSD', amount: '5', expected: ['5', '2.5', '1'] },
    { symbol: 'XOR', amount: '4', expected: ['4', '4.5', '2.25'] },
  ])(
    'keeps both sizing directions below spendable $symbol capital and preserves the reserve',
    async ({ symbol, amount, expected }) => {
      const test = harness();
      const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
      const assetIn = symbol === 'XOR' ? XOR : kusd;
      const assetOut = symbol === 'XOR' ? VAL : XOR;
      vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
        strategy: suggestion(bot, { amount, intervalMs: HOUR }),
        usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
      }));
      // Sizing is tested even when the synthetic price path later fails qualification.
      await test.research
        .run(
          {
            ...input,
            assets: [...input.assets, kusd],
            assetInAddress: assetIn.address,
            assetOutAddress: assetOut.address,
            capital: '10',
            feeBudgetXor: '1',
          },
          test.client
        )
        .catch(() => undefined);
      expect(observed.batches[0].filter((_, index) => index % 4 === 0).map((run) => run.strategy!.amount)).toEqual(
        expected
      );
      expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual(
        symbol === 'KUSD' ? ['1', '2.5', '5'] : ['1', '2.25', '4.5', '4']
      );
      expect(test.loadFees.mock.calls.every(([bot]) => bot.strategy.amount !== '10')).toBe(true);
      expect(test.loadFees.mock.calls.every(([bot]) => bot.policy.feeBudgetCodec === toCodec('1', XOR.decimals))).toBe(
        true
      );
      expect(
        test.loadFees.mock.calls.every(
          ([bot]) => bot.portfolio.initial[assetIn.address] === toCodec('10', assetIn.decimals)
        )
      ).toBe(true);
    }
  );

  it('rejects an unrepresentable output ceiling before episode dispatch while retaining a nonzero fee sample', async () => {
    const test = harness();
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { amount: '0.000000000000000003', intervalMs: HOUR }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    await expect(
      test.research.run(
        {
          ...input,
          assets: [...input.assets, kusd],
          assetInAddress: kusd.address,
          assetOutAddress: XOR.address,
          capital: '0.000000000000000003',
          feeBudgetXor: '1',
        },
        test.client
      )
    ).rejects.toThrow('bots.errors.amount');
    expect(test.loadFees.mock.calls[0][0].strategy.amount).toBe('0.000000000000000001');
    expect(observed.batches).toHaveLength(0);
  });

  it('rejects a spendable budget too small to leave capital after a positive order before drafting', async () => {
    const test = harness();
    await expect(
      test.research.run(
        {
          ...input,
          capital: '1.000000000000000001',
          feeBudgetXor: '1',
        },
        test.client
      )
    ).rejects.toThrow('bots.errors.amount');
    expect(test.client.suggest).not.toHaveBeenCalled();
    expect(test.loadFees).not.toHaveBeenCalled();
  });

  it('drafts and chooses only from training, tests a frozen winner once, and returns fresh exact capital', async () => {
    const test = harness();
    const original = structuredClone(input);
    const result = await test.research.run(input, test.client);
    expect(test.loadHistory).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ days: 7, historyStartAt: NOW - 168 * HOUR, historyEndAt: NOW }),
      expect.any(AbortSignal)
    );
    const count = Math.floor(test.history.candles.length * 0.7);
    expect(test.client.suggest).toHaveBeenCalledTimes(1);
    expect(vi.mocked(test.client.suggest).mock.calls[0][1]).toEqual(test.history.candles.slice(0, count));
    expect(observed.batches).toHaveLength(2);
    expect(observed.batches[0]).toHaveLength(12);
    expect(observed.batches[0].every((item) => item.settings.validation === 'none')).toBe(true);
    expect(observed.batches[1]).toHaveLength(2);
    expect(observed.batches[1][0].settings).toMatchObject({
      validation: 'none',
      trainPercent: 70,
      optimize: false,
      historyStartAt: test.history.candles[118].timestamp,
      historyEndAt: test.history.candles[142].timestamp,
    });
    expect(
      observed.batches[0].some(
        (item) => JSON.stringify(item.strategy) === JSON.stringify(observed.batches[1][0].strategy)
      )
    ).toBe(true);
    expect(result.bot.strategy.amount).toBe(defaultCostSampleAmounts[2]);
    expect(result.bot.policy.maxTradeCodec[XOR.address]).toBe(toCodec(defaultCostSampleAmounts[2], XOR.decimals));
    const draft = vi.mocked(test.client.suggest).mock.calls[0][0];
    expect(draft.policy.maxTradeCodec[VAL.address]).toBe(result.bot.policy.maxTradeCodec[VAL.address]);
    // 100.000000000000000019 / the first training close 100, rounded down to 18 decimals.
    expect(draft.policy.maxTradeCodec[VAL.address]).toBe(toCodec('1', VAL.decimals));
    expect(draft.portfolio.holdings[VAL.address]).toBe('0');
    expect(result.bot.policy.feeBudgetCodec).toBe('1000000000000000001');
    expect(result.bot.policy.sessionDurationMs).toBe(24 * HOUR);
    expect(result.bot.portfolio.initial[XOR.address]).toBe('100000000000000000019');
    expect(result.bot.portfolio.holdings).toEqual(result.bot.portfolio.initial);
    expect(result.bot.portfolio.trades).toBe(0);
    expect(result.bot.status).toBe('idle');
    expect(result.bot.goal).toEqual({
      title: input.title,
      targetReturnPercent: '10',
      maxLossPercent: '5',
      durationMs: 24 * HOUR,
      lossMetric: 'drawdown',
      targetRequiresIdleOutperformance: true,
    });
    expect(result.bot.goalState).toBeUndefined();
    expect(result.denomination).toEqual(test.history.identity);
    expect(result.research.feeObservation?.amountIn).toBe(result.bot.strategy.amount);
    expect(result.research.qualification).toMatchObject({ candidates: 3, coverage: 1 });
    expect(result.research.qualification!.startAt).toBe(test.history.candles[count + 1].timestamp);
    expect(result.research.qualification!.trades).toBeGreaterThanOrEqual(1);
    expect(result.research.qualification!.returnPercent).not.toBe(result.research.returnPercent);
    expect(result.candidates).toBe(3);
    expect(test.progress.slice(0, 2)).toEqual([{ phase: 'history' }, { phase: 'drafting' }]);
    expect(test.progress.filter((item) => item.phase === 'testing')).toEqual(
      Array.from({ length: 15 }, (_, completed) => ({ phase: 'testing', completed, total: 14 }))
    );
    expect(test.progress.at(-1)).toEqual({ phase: 'ready', completed: 14, total: 14 });
    expect(test.loadFees).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      allowHistoricalFinalizedState: false,
    });
    expect(test.client.propose).not.toHaveBeenCalled();
    expect(test.client.disconnect).not.toHaveBeenCalled();
    expect(input).toEqual(original);
  });

  it('uses all predetermined 24-hour episodes, shared boundary marks, prior-only warmup and the frozen output ceiling', async () => {
    const test = harness();
    const result = await test.research.run(input, test.client);
    const time = (index: number) => test.history.candles[index].timestamp;
    const ranges = (definitions: ExperimentDefinition[]) =>
      definitions.map((definition) => [definition.settings.historyStartAt, definition.settings.historyEndAt]);
    const trainingRanges = [
      [0, 24],
      [24, 48],
      [48, 72],
      [72, 96],
    ].map(([start, end]) => [time(start), time(end)]);
    expect(ranges(observed.batches[0])).toEqual([...trainingRanges, ...trainingRanges, ...trainingRanges]);
    expect(ranges(observed.batches[1])).toEqual([
      [time(118), time(142)],
      [time(142), time(166)],
    ]);
    for (const definition of observed.batches.flat()) {
      const start = test.history.candles.findIndex((candle) => candle.timestamp === definition.settings.historyStartAt);
      const receipt = result.research.goalEpisodes!;
      if (receipt.protocol !== 'goal-episodes-v3') throw new Error('expected warmed protocol');
      expect(definition.warmupCandles).toEqual(
        [...receipt.history.warmupCandles, ...test.history.candles.slice(0, start)].slice(-201)
      );
      expect(definition.outputTradeLimitCodec).toBe(toCodec('1', VAL.decimals));
      expect(definition.goal).toEqual(result.bot.goal);
      expect(definition.settings).toMatchObject({
        capital: input.capital,
        feeBudgetXor: input.feeBudgetXor,
        validation: 'none',
        optimize: false,
      });
    }
    const metadata = result.research.goalEpisodes!;
    expect(metadata.training).toMatchObject({ startAt: time(0), endAt: time(116), tailCandles: 20 });
    expect(metadata.validation).toMatchObject({ startAt: time(118), endAt: time(167), tailCandles: 1 });
    expect(metadata.training.episodes).toHaveLength(4);
    expect(metadata.validation.episodes).toHaveLength(2);
    expect(
      [...metadata.training.episodes, ...metadata.validation.episodes].every(
        (row) => row.initialValue === input.capital
      )
    ).toBe(true);
    expect(result.research.startAt).toBe(time(0));
    expect(result.research.endAt).toBe(time(167));
    expect(result.research.qualification!.endAt).toBe(time(166));
    expect(validateGoalResearchSnapshot(result.research)).toEqual(metadata);
    expect(() => assertGoalResearchBinding(result.bot, metadata)).not.toThrow();
    expect(result.bot.goalState).toBeUndefined();
    expect(result.bot.portfolio.holdings).toEqual(result.bot.portfolio.initial);
    // Replayed P&L is retained as evidence, never copied into the user's opening holdings.
    expect(observed.runs[1].some((run) => run.result!.result.equity.at(-1)!.value !== input.capital)).toBe(true);
  });

  it('keeps terminal 24-hour valuation after a target latches and stops further orders', async () => {
    const test = harness();
    const result = await test.research.run({ ...input, targetReturnPercent: '1' }, test.client);
    const run = observed.runs[1][0].result!;
    const evaluation = run.goalEvaluation!;
    expect(evaluation.state.outcome).toBe('target');
    expect(evaluation.state.completedAt).toBeLessThan(evaluation.endingTimestamp);
    expect(run.result.equity.at(-1)!.timestamp).toBe(evaluation.endingTimestamp);
    expect(run.result.equity.filter((point) => point.timestamp > evaluation.state.completedAt!).length).toBeGreaterThan(
      0
    );
    expect(run.tradeMarkers.length).toBeGreaterThan(0);
    expect(run.tradeMarkers.every((trade) => trade.timestamp <= evaluation.state.completedAt!)).toBe(true);
    expect(result.research.goalEpisodes!.validation.episodes[0].finalValue).toBe(run.result.equity.at(-1)!.value);
    expect(result.bot.goalState).toBeUndefined();
    expect(result.bot.portfolio.trades).toBe(0);
  });

  it.each([
    'goal',
    'warmup',
    'output-limit',
    'bot-goal',
    'bot-strategy',
    'bot-input-limit',
    'bot-output-limit',
    'bot-impact-limit',
    'bot-capital',
    'request-goal',
  ] as const)('rejects altered %s provenance before choosing any training winner', async (fault) => {
    const test = harness();
    observed.tamper = (runs, batch) => {
      if (batch !== 1) return;
      const run = runs[1];
      const result = run.result!;
      const evaluation = result.goalEvaluation!;
      if (fault === 'goal') evaluation.goal.durationMs = 23 * HOUR;
      if (fault === 'warmup') evaluation.warmupCandles![0].close = '999';
      if (fault === 'output-limit') evaluation.outputTradeLimitCodec = '1';
      if (fault === 'bot-goal') result.bot.goal!.maxLossPercent = '50';
      if (fault === 'bot-strategy') result.bot.strategy.amount = '1';
      if (fault === 'bot-input-limit') result.bot.policy.maxTradeCodec[result.bot.assetIn.address] = '1';
      if (fault === 'bot-output-limit') result.bot.policy.maxTradeCodec[result.bot.assetOut.address] = '1';
      if (fault === 'bot-impact-limit') result.bot.policy.maxPriceImpactPercent = '3';
      if (fault === 'bot-capital') result.bot.portfolio.initial[result.bot.assetIn.address] = '1';
      if (fault === 'request-goal') {
        run.goal!.maxLossPercent = '50';
        evaluation.goal.maxLossPercent = '50';
        result.bot.goal!.maxLossPercent = '50';
      }
    };
    await expect(test.research.run(input, test.client)).rejects.toThrow('bots.errors.stale');
    expect(observed.batches).toHaveLength(1);
    expect(test.client.suggest).toHaveBeenCalledTimes(1);
    expect(test.progress.some((progress) => progress.phase === 'ready')).toBe(false);
  });

  it.each(['goal', 'warmup', 'output-limit', 'bot-strategy'] as const)(
    'rejects altered held-out %s provenance without trying another winner',
    async (fault) => {
      const test = harness();
      observed.tamper = (runs, batch) => {
        if (batch !== 2) return;
        const result = runs[0].result!;
        if (fault === 'goal') result.goalEvaluation!.goal.maxLossPercent = '50';
        if (fault === 'warmup') delete result.goalEvaluation!.warmupCandles;
        if (fault === 'output-limit') delete result.goalEvaluation!.outputTradeLimitCodec;
        if (fault === 'bot-strategy') result.bot.strategy.intervalMs = HOUR;
      };
      await expect(test.research.run(input, test.client)).rejects.toThrow('bots.errors.stale');
      expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
      expect(test.client.suggest).toHaveBeenCalledTimes(1);
      expect(test.progress.some((progress) => progress.phase === 'ready')).toBe(false);
    }
  );

  it('retains a losing episode in the mean rather than selecting only profitable days', async () => {
    const test = harness();
    test.history.candles.forEach((candle, index) => {
      candle.close = String(100 + Math.max(0, index - 24));
    });
    const result = await test.research.run(input, test.client);
    const rows = result.research.goalEpisodes!.training.episodes;
    expect(rows).toHaveLength(4);
    expect(new FPNumber(rows[0].returnPercent).lt(new FPNumber('0'))).toBe(true);
    expect(rows[0].trades).toBeGreaterThan(0);
    expect(rows.slice(1).every((row) => new FPNumber(row.returnPercent).gt(new FPNumber('0')))).toBe(true);
    expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
  });

  it('retains abstention episodes with zero trades instead of requiring a fill on every day', async () => {
    const test = harness();
    test.history.candles.forEach((candle, index) => {
      candle.close = String(100 + Math.max(0, index - 24));
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, {
        kind: 'rules',
        rules: {
          version: 1,
          entry: { operator: 'all', conditions: [{ kind: 'trend', direction: 'above', window: 2 }] },
          exit: null,
        },
      }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    const result = await test.research.run(input, test.client);
    const rows = result.research.goalEpisodes!.training.episodes;
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ trades: 0, returnPercent: '0', coverage: 1, outcome: 'expired' });
    expect(rows.slice(1).every((row) => row.trades > 0)).toBe(true);
    expect(validateGoalResearchSnapshot(result.research)).toEqual(result.research.goalEpisodes);
  });

  it('rejects positive idle output drift when trading adds a net loss after costs', async () => {
    const test = harness();
    test.history.candles.forEach((candle, index) => {
      candle.close = String(400 - index);
    });
    const failure = await test.research
      .run({ ...input, valuationAsset: 'output' }, test.client)
      .catch((error: unknown) => error);
    const diagnostics = readAutopilotQualificationDiagnostics(failure);
    expect(diagnostics?.stage).toBe('training');
    expect(
      diagnostics?.failures.every(
        (row) => row.reasons.includes('netLoss') && !row.reasons.includes('insufficientTrades')
      )
    ).toBe(true);
    expect(observed.batches).toHaveLength(1);
    expect(test.client.suggest).toHaveBeenCalledTimes(1);
  });

  it('rejects a cadence beyond the goal duration instead of silently shortening it', async () => {
    const test = harness();
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { intervalMs: 25 * HOUR }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    await expect(test.research.run(input, test.client)).rejects.toThrow('bots.errors.proposal');
    expect(observed.batches).toHaveLength(0);
    expect(test.loadFees).toHaveBeenCalledTimes(3);
  });

  it('observes capped fees before drafting and exposes costs and sample constraints without validation candles', async () => {
    const test = harness();
    await test.research.run(input, test.client);
    expect(test.loadFees.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(test.client.suggest).mock.invocationCallOrder[0]
    );
    const [draft, training, , constraints] = vi.mocked(test.client.suggest).mock.calls[0];
    expect(test.loadFees.mock.calls[0][0].strategy.amount).toBe('10.000000000000000001');
    expect(draft.strategy.prompt).toContain('1 to 24 hour interval');
    expect(draft.strategy.prompt).toContain('not in every 24-hour episode');
    expect(draft.strategy.prompt).toContain('completed fill and after-cost excess over idle');
    expect(draft.strategy.prompt).toContain('selective long-only rules entry with exit:null');
    expect(draft.strategy.prompt).toContain('Do not manufacture a trade to satisfy a daily count');
    expect(draft.strategy.prompt).toContain('dated current scenarios, not historical execution observations');
    expect(draft.strategy.prompt).toContain('The reference-size first buy has an observed 0.0001 XOR network fee');
    expect(draft.strategy.prompt.length).toBeLessThanOrEqual(2000);
    expect(constraints).toEqual({
      minimumIntervalMs: HOUR,
      maximumIntervalMs: 24 * HOUR,
      minimumTrades: 1,
      trainingCandles: 117,
      validationCandles: 50,
      goalEpisodes: {
        protocol: 'goal-episodes-v3',
        durationMs: 24 * HOUR,
        trainingEpisodes: 4,
        validationEpisodes: 2,
        trainingTailCandles: 20,
        validationTailCandles: 1,
        aggregation: 'mean-net-return',
        minimumTradesPerPartition: 1,
        signalWarmup: {
          candles: 201,
          firstCompletedAt: NOW - 368 * HOUR,
          lastCompletedAt: NOW - 168 * HOUR,
          use: 'signals-only',
          prices: 'not-supplied',
        },
      },
      costSamples: defaultCostSampleAmounts.map((amount) =>
        expect.objectContaining({
          amountInCodec: toCodec(amount, XOR.decimals),
          status: 'available',
          finalizedAt: NOW,
          blockHash: `0x${'2'.repeat(64)}`,
          buy: { networkFeeXor: '0.0001', swapFeePercent: '0.1', priceImpactPercent: '0' },
          sell: { networkFeeXor: '0.0001', swapFeePercent: '0.1', priceImpactPercent: '0' },
        })
      ),
      sizing: {
        capitalCodec: toCodec(input.capital, XOR.decimals),
        spendableInputCodec: toCodec('99.000000000000000018', XOR.decimals),
        feeSampleAmountCodec: toCodec('10.000000000000000001', XOR.decimals),
      },
      goal: {
        targetReturnPercent: '10',
        maxLossPercent: '5',
        durationMs: 24 * HOUR,
        valuationAsset: 'input',
        lossMetric: 'drawdown',
        targetRequiresIdleOutperformance: true,
      },
      costs: {
        basis: 'current-finalized-scenario',
        finalizedAt: NOW,
        blockHash: `0x${'2'.repeat(64)}`,
        slippagePercent: '0.5',
        feeReserveXor: input.feeBudgetXor,
        reserveFunding: 'included-in-input',
        reverseLotBasis: 'expected-forward-output',
        buy: { networkFeeXor: '0.0001', swapFeePercent: '0.1', priceImpactPercent: '0' },
        sell: { networkFeeXor: '0.0001', swapFeePercent: '0.1', priceImpactPercent: '0' },
      },
    });
    expect(training).toEqual(test.history.candles.slice(0, 117));
  });

  it('reuses fresh exact sample fees only for the same amount and cadence', async () => {
    const test = harness();
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { amount: bot.strategy.amount, intervalMs: HOUR }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    await test.research.run(input, test.client);
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual(defaultCostSampleAmounts);
    expect(observed.batches[0].filter((_, index) => index % 4 === 0).map((run) => run.strategy!.amount)).toEqual(
      defaultCostSampleAmounts
    );
    expect(observed.batches).toHaveLength(2);
  });

  it('keeps the output-goal cost prompt inside the desktop limit with the maximum goal title', async () => {
    const test = harness();
    vi.mocked(test.client.suggest).mockRejectedValueOnce(new Error('draft-reached'));
    await expect(
      test.research.run({ ...input, valuationAsset: 'output', title: 'x'.repeat(160) }, test.client)
    ).rejects.toThrow('draft-reached');
    const prompt = vi.mocked(test.client.suggest).mock.calls[0][0].strategy.prompt;
    expect(vi.mocked(test.client.suggest).mock.calls[0][3]?.goal?.valuationAsset).toBe('output');
    expect(prompt.length).toBeLessThanOrEqual(2000);
  });

  it.each(['amount', 'cadence'] as const)('reobserves fees when the draft changes its %s', async (change) => {
    const test = harness();
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(
        bot,
        change === 'amount' ? { amount: '5', intervalMs: HOUR } : { amount: bot.strategy.amount, intervalMs: 6 * HOUR }
      ),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    await test.research.run(input, test.client);
    expect(test.loadFees).toHaveBeenCalledTimes(change === 'amount' ? 4 : 6);
    expect(test.loadFees.mock.calls[3][0].strategy).toMatchObject({
      amount: change === 'amount' ? '5' : '10.000000000000000001',
      intervalMs: change === 'amount' ? HOUR : 6 * HOUR,
    });
    expect(observed.batches[0].filter((_, index) => index % 4 === 0).map((run) => run.strategy!.amount)).toEqual(
      change === 'amount' ? ['5', defaultCostSampleAmounts[0], defaultCostSampleAmounts[1]] : defaultCostSampleAmounts
    );
    expect(test.loadFees.mock.calls.slice(3).map(([bot]) => bot.strategy.amount)).toEqual(
      change === 'amount' ? ['5'] : defaultCostSampleAmounts
    );
  });

  it('rejects a refreshed quote that still describes the preflight amount', async () => {
    const test = harness();
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees
      .mockImplementationOnce(original)
      .mockImplementationOnce(original)
      .mockImplementationOnce(original)
      .mockImplementation(async (bot) => ({
        ...(await original(bot)),
        amountIn: '10.000000000000000001',
      }));
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { amount: '5', intervalMs: HOUR }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    await expect(test.research.run(input, test.client)).rejects.toThrow('bots.errors.stale');
    expect(test.loadFees).toHaveBeenCalledTimes(4);
    expect(observed.batches).toHaveLength(0);
  });

  it('refreshes an expired preflight observation after slow AI even when amount and cadence are unchanged', async () => {
    let current = NOW;
    const test = harness(() => current);
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => ({
      ...(await original(bot)),
      queriedAt: current,
      finalizedAt: current,
      expiresAt: current + 300_000,
    }));
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => {
      current += 300_001;
      return {
        strategy: suggestion(bot, { amount: bot.strategy.amount, intervalMs: HOUR }),
        usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
      };
    });
    await test.research.run(input, test.client);
    expect(test.loadFees).toHaveBeenCalledTimes(6);
    expect((await test.loadFees.mock.results[3].value).queriedAt).toBe(current);
  });

  it('rejects expiry of the frozen winning quote instead of silently refreshing or selecting another candidate', async () => {
    let current = NOW;
    const test = harness(() => current);
    const load = test.loadHistory.getMockImplementation()!;
    test.loadHistory.mockImplementationOnce(load).mockImplementationOnce(async (bot) => {
      current += 300_001;
      return load(bot);
    });
    await expect(test.research.run(input, test.client)).rejects.toThrow('bots.errors.stale');
    expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
    expect(test.loadFees).toHaveBeenCalledTimes(6);
    expect(test.client.suggest).toHaveBeenCalledTimes(1);
    expect(test.progress.some((item) => item.phase === 'ready')).toBe(false);
  });

  it('cancels while awaiting candidate-specific fees and ignores their late completion', async () => {
    const test = harness();
    const original = test.loadFees.getMockImplementation()!;
    let finishQuote!: (fees: ResearchFeeSnapshot) => void;
    test.loadFees
      .mockImplementationOnce(original)
      .mockImplementationOnce(original)
      .mockImplementationOnce(original)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishQuote = resolve;
          })
      );
    const controller = new AbortController();
    const pending = test.research.run(input, test.client, controller.signal);
    await vi.waitFor(() => expect(test.loadFees).toHaveBeenCalledTimes(4));
    controller.abort();
    await expect(pending).rejects.toThrow('bots.errors.stale');
    finishQuote(await original(test.loadFees.mock.calls[3][0]));
    await Promise.resolve();
    expect(observed.batches).toHaveLength(0);
    expect(test.loadFees).toHaveBeenCalledTimes(4);
    expect(test.progress.some((item) => item.phase === 'ready')).toBe(false);
  });

  it('accepts one action per 24-hour episode without speeding the submitted cadence up', async () => {
    const test = harness();
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { intervalMs: 24 * HOUR }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    const result = await test.research.run(input, test.client);
    expect(result.bot.strategy.intervalMs).toBe(24 * HOUR);
    expect(observed.batches.flat().every((item) => item.strategy!.intervalMs === 24 * HOUR)).toBe(true);
    expect(result.research.goalEpisodes!.training.episodes.map((row) => row.trades)).toEqual([1, 1, 1, 1]);
    expect(result.research.goalEpisodes!.validation.episodes.map((row) => row.trades)).toEqual([1, 1]);
    expect(result.research.qualification!.trades).toBe(2);
  });

  it('preserves the submitted feasible cadence across size candidates and all risk limits', async () => {
    const test = harness();
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { intervalMs: 12 * HOUR }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    const result = await test.research.run(input, test.client);
    expect(observed.batches[0].filter((_, index) => index % 4 === 0).map((item) => item.strategy!.intervalMs)).toEqual([
      12 * HOUR,
      12 * HOUR,
      12 * HOUR,
    ]);
    expect(result.bot.goal?.maxLossPercent).toBe('5');
    expect(result.bot.policy.feeBudgetCodec).toBe(toCodec(input.feeBudgetXor, XOR.decimals));
    expect(result.research.qualification!.trades).toBeGreaterThanOrEqual(1);
  });

  it('rejects an unaffordable first buy even when a reverse fee fits the reserve', async () => {
    const test = harness();
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => ({
      ...(await original(bot)),
      networkFeeXor: '1.000000000000000002',
      networkFeeCodec: toCodec('1.000000000000000002', XOR.decimals),
      sellNetworkFeeXor: '0.25',
      sellNetworkFeeCodec: toCodec('0.25', XOR.decimals),
    }));
    await expect(test.research.run(input, test.client)).rejects.toThrow('bots.autopilot.errors.insufficientFeeBudget');
    expect(test.client.suggest).not.toHaveBeenCalled();
    expect(test.loadFees.mock.calls.map(([bot]) => bot.strategy.amount)).toEqual([
      ...defaultCostSampleAmounts,
      '5',
      '2.5',
    ]);
    expect(observed.batches).toHaveLength(0);
  });

  it('drafts after a smaller exact buy quote fits even when the reference fee exceeds one XOR', async () => {
    const test = harness();
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    for (const candle of test.history.candles) candle.close = '100';
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => {
      const fees = await original(bot);
      const networkFeeXor = bot.strategy.amount === '1' ? '1.1' : '0.25';
      return { ...fees, networkFeeXor, networkFeeCodec: toCodec(networkFeeXor, XOR.decimals) };
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => {
      const strategy = suggestion(bot, { amount: '2.5', intervalMs: 6 * HOUR });
      return { strategy, strategies: [strategy], usage: { inputTokens: 0, outputTokens: 0, requests: 1 } };
    });

    const failure = await test.research
      .run(
        {
          ...input,
          assets: [...input.assets, kusd],
          assetInAddress: kusd.address,
          assetOutAddress: XOR.address,
          capital: '10',
          feeBudgetXor: '1',
          valuationAsset: 'output',
        },
        test.client
      )
      .catch((error: unknown) => error);

    expect(readAutopilotQualificationDiagnostics(failure)?.stage).toBe('training');
    expect(test.client.suggest).toHaveBeenCalledOnce();
    const context = vi.mocked(test.client.suggest).mock.calls[0][3];
    expect(context?.costSamples?.slice(0, 2)).toMatchObject([
      {
        amountInCodec: toCodec('1', kusd.decimals),
        status: 'available',
        finalizedAt: NOW,
        blockHash: `0x${'2'.repeat(64)}`,
        buy: { networkFeeXor: '1.1' },
      },
      {
        amountInCodec: toCodec('2.5', kusd.decimals),
        status: 'available',
        finalizedAt: NOW,
        blockHash: `0x${'2'.repeat(64)}`,
        buy: { networkFeeXor: '0.25' },
      },
    ]);
    expect(vi.mocked(test.client.suggest).mock.calls[0][0].strategy.prompt).toContain(
      'The reference-size first buy has an observed 0.25 XOR network fee'
    );
    expect(context?.sizing?.feeSampleAmountCodec).toBe(toCodec('2.5', kusd.decimals));
    expect(context?.costs?.buy.networkFeeXor).toBe('0.25');
    // The candidate receives its own quote at the proposed size and cadence.
    expect(test.loadFees.mock.calls.map(([bot]) => [bot.strategy.amount, bot.strategy.intervalMs])).toEqual([
      ['1', HOUR],
      ['2.5', HOUR],
      ['5', HOUR],
      ['2.5', 6 * HOUR],
    ]);
    expect(observed.batches).toHaveLength(1);
  });

  it('accepts an exact first-buy fee budget without rounding up or changing the allocation', async () => {
    const test = harness();
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => ({
      ...(await original(bot)),
      networkFeeXor: '1',
      networkFeeCodec: toCodec('1', XOR.decimals),
      sellNetworkFeeXor: '0.3',
      sellNetworkFeeCodec: toCodec('0.3', XOR.decimals),
    }));
    vi.mocked(test.client.suggest).mockRejectedValueOnce(new Error('draft-reached'));
    await expect(test.research.run({ ...input, feeBudgetXor: '1' }, test.client)).rejects.toThrow('draft-reached');
    expect(test.client.suggest).toHaveBeenCalledTimes(1);
    expect(test.loadFees.mock.calls[0][0].policy.feeBudgetCodec).toBe(toCodec('1', XOR.decimals));
  });

  it('rechecks minimum fee funding when the selected amount needs a new quote', async () => {
    const test = harness();
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees
      .mockImplementationOnce(original)
      .mockImplementationOnce(original)
      .mockImplementationOnce(original)
      .mockImplementationOnce(async (bot) => ({
        ...(await original(bot)),
        networkFeeXor: '1.000000000000000002',
        networkFeeCodec: toCodec('1.000000000000000002', XOR.decimals),
        sellNetworkFeeXor: '0.3',
        sellNetworkFeeCodec: toCodec('0.3', XOR.decimals),
      }));
    await expect(test.research.run(input, test.client)).rejects.toThrow('bots.autopilot.errors.insufficientFeeBudget');
    expect(test.client.suggest).toHaveBeenCalledTimes(1);
    expect(test.loadFees).toHaveBeenCalledTimes(4);
    expect(observed.batches).toHaveLength(0);
  });

  it.each(['1', '1.000000000000000001'])(
    'applies the actual 1% template impact limit to a %s%% quote without loosening it',
    async (impact) => {
      const test = harness();
      const original = test.loadFees.getMockImplementation()!;
      test.loadFees.mockImplementation(async (bot) => ({
        ...(await original(bot)),
        priceImpactPercent: impact,
        sellPriceImpactPercent: impact,
      }));
      if (impact === '1') {
        const result = await test.research.run(input, test.client);
        expect(result.bot.policy.maxPriceImpactPercent).toBe('1');
        expect(result.research.qualification!.trades).toBeGreaterThan(0);
      } else {
        const failure = await test.research.run(input, test.client).catch((error: unknown) => error);
        expect(failure).toMatchObject({ message: 'bots.errors.policy' });
        expect(test.client.suggest).not.toHaveBeenCalled();
        expect(test.loadFees).toHaveBeenCalledTimes(5);
        expect(observed.batches).toHaveLength(0);
      }
      expect(observed.runs.flat().every((run) => run.result!.bot.policy.maxPriceImpactPercent === '1')).toBe(true);
    }
  );

  it('explains actual training admission costs without changing the budget or loss limit', async () => {
    const test = harness();
    for (const candle of test.history.candles) candle.close = '100';
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => ({
      ...(await original(bot)),
      networkFeeXor: '0.6',
      networkFeeCodec: toCodec('0.6', XOR.decimals),
      sellNetworkFeeXor: '0.6',
      sellNetworkFeeCodec: toCodec('0.6', XOR.decimals),
    }));
    const error = await test.research
      .run({ ...input, capital: '10' }, test.client)
      .catch((failure: unknown) => failure);
    const diagnostics = readAutopilotQualificationDiagnostics(error);
    expect(diagnostics?.stage).toBe('training');
    expect(diagnostics?.failures).toHaveLength(3);
    expect(diagnostics?.failures.every((failure) => failure.reasons.includes('goalTradeCost'))).toBe(true);
    expect(diagnostics?.failures.every((failure) => failure.reasons.includes('insufficientTrades'))).toBe(true);
    expect(observed.batches).toHaveLength(1);
    for (const run of observed.runs[0]) {
      expect(run.result!.result.trades).toBe(0);
      expect(run.result!.result.portfolio.feesPaidCodec).toBe('0');
      expect(run.result!.bot.goal!.maxLossPercent).toBe('5');
    }
  });

  it('omits unsupported worker check evidence without inferring impact from zero trades', async () => {
    const test = harness();
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => ({
      ...(await original(bot)),
      priceImpactPercent: bot.strategy.intervalMs === HOUR ? '0' : '2',
    }));
    observed.tamper = (runs) => {
      for (const run of runs) for (const candidate of run.result!.candidates) candidate.checks = [];
    };
    const error = await test.research.run(input, test.client).catch((failure: unknown) => failure);
    const diagnostics = readAutopilotQualificationDiagnostics(error);
    expect(diagnostics?.stage).toBe('training');
    expect(diagnostics?.failures.every((failure) => failure.reasons.includes('insufficientTrades'))).toBe(true);
    expect(diagnostics?.failures.some((failure) => failure.reasons.includes('priceImpact'))).toBe(false);
  });

  it('retains cumulative fee exhaustion only from actual failed training opportunities', async () => {
    const test = harness();
    for (const candle of test.history.candles) candle.close = '100';
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => ({
      ...(await original(bot)),
      networkFeeXor: '0.6',
      networkFeeCodec: toCodec('0.6', XOR.decimals),
      sellNetworkFeeXor: '0.6',
      sellNetworkFeeCodec: toCodec('0.6', XOR.decimals),
    }));
    const error = await test.research.run(input, test.client).catch((failure: unknown) => failure);
    const diagnostics = readAutopilotQualificationDiagnostics(error);
    expect(diagnostics?.stage).toBe('training');
    expect(diagnostics?.failures).toHaveLength(3);
    expect(diagnostics?.failures.every((failure) => failure.reasons.includes('feeBudget'))).toBe(true);
    expect(observed.batches).toHaveLength(1);
    expect(test.client.suggest).toHaveBeenCalledOnce();
    for (const run of observed.runs[0]) {
      expect(run.result!.result.trades).toBe(1);
      expect(run.result!.result.portfolio.feesPaidCodec).toBe(toCodec('0.6', XOR.decimals));
      expect(run.result!.bot.policy.feeBudgetCodec).toBe(toCodec(input.feeBudgetXor, XOR.decimals));
      expect(
        run.result!.candidates.some((candidate) => {
          const failed = candidate.checks.filter((check) => !check.passed);
          return !candidate.selected && failed.length === 1 && failed[0].key === 'feeBudget';
        })
      ).toBe(true);
    }
  });

  it('does not use explanatory blockers to disqualify an otherwise passing training candidate', async () => {
    const test = harness();
    observed.tamper = (runs, batch) => {
      if (batch !== 1) return;
      for (const run of runs) {
        const candidate = run.result!.candidates[0];
        candidate.selected = false;
        for (const check of candidate.checks) {
          check.passed = check.key !== 'priceImpact';
          delete check.reason;
        }
      }
    };
    const result = await test.research.run(input, test.client);
    expect(result.research.qualification!.trades).toBeGreaterThan(0);
    expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
  });

  it('retains only bounded training reasons when no candidate passes', async () => {
    const test = harness();
    for (const candle of test.history.candles) candle.close = '100';
    const error = await test.research.run(input, test.client).catch((failure: unknown) => failure);
    const diagnostics = readAutopilotQualificationDiagnostics(error);
    expect(diagnostics?.stage).toBe('training');
    expect(diagnostics?.failures).toHaveLength(3);
    expect(diagnostics?.failures.every((failure) => failure.reasons.includes('netLoss'))).toBe(true);
    expect(Object.keys(diagnostics!)).toEqual(['stage', 'failures']);
    expect(observed.batches).toHaveLength(1);
    expect(test.client.suggest).toHaveBeenCalledTimes(1);
  });

  it('does not select a different candidate after the untouched holdout loses money', async () => {
    const test = harness();
    observed.tamper = (runs, batch) => {
      if (batch !== 2) return;
      for (const run of runs) {
        for (const [index, candidate] of run.result!.candidates.entries()) {
          candidate.selected = false;
          for (const check of candidate.checks) {
            check.passed = check.key !== ['priceImpact', 'goal', 'feeBudget'][index % 3];
            delete check.reason;
            if (!check.passed && check.key === 'goal') check.reason = 'bots.errors.goalTradeCost';
          }
        }
      }
    };
    const count = Math.floor(test.history.candles.length * 0.7);
    for (const [index, candle] of test.history.candles.entries())
      if (index > count) candle.close = String(1000 - index * 3);
    const error = await test.research.run(input, test.client).catch((failure: unknown) => failure);
    expect(error).toMatchObject({ message: 'bots.autopilot.errors.noStrategy' });
    const diagnostics = readAutopilotQualificationDiagnostics(error);
    expect(diagnostics?.stage).toBe('validation');
    expect(diagnostics?.failures).toHaveLength(1);
    expect(diagnostics?.failures[0].reasons).toContain('netLoss');
    expect(diagnostics?.failures[0].reasons).not.toContain('priceImpact');
    expect(diagnostics?.failures[0].reasons).not.toContain('goalTradeCost');
    expect(diagnostics?.failures[0].reasons).not.toContain('feeBudget');
    expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
    expect(test.client.suggest).toHaveBeenCalledTimes(1);
    expect(
      vi
        .mocked(test.client.suggest)
        .mock.calls[0][1].every((candle) => candle.timestamp < test.history.candles[count].timestamp)
    ).toBe(true);
    expect(test.progress.some((item) => item.phase === 'ready')).toBe(false);
  });

  it('selects and gates output-token growth while preserving the original input allocation', async () => {
    const test = harness();
    test.history.candles.forEach((candle, index) => {
      candle.close = index % 12 < 8 ? '100' : '104';
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, {
        kind: 'rules',
        intervalMs: 2 * HOUR,
        rules: {
          version: 1,
          entry: {
            operator: 'all',
            conditions: [{ kind: 'deviation', window: 2, direction: 'below', threshold: '0' }],
          },
          exit: { operator: 'all', conditions: [{ kind: 'deviation', window: 2, direction: 'above', threshold: '0' }] },
        },
      }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    const result = await test.research.run({ ...input, valuationAsset: 'output' }, test.client);
    expect(vi.mocked(test.client.suggest).mock.calls[0][3]?.goal?.valuationAsset).toBe('output');
    expect(result.bot.strategy.intervalMs).toBe(2 * HOUR);
    expect(result.bot.goal?.valuationAsset).toBe('output');
    expect(result.research.valuationAsset).toBe('output');
    expect(result.research.returnPercent.startsWith('-')).toBe(false);
    expect(result.research.returnPercent).not.toBe('0');
    expect(result.research.qualification!.returnPercent.startsWith('-')).toBe(false);
    expect(result.research.qualification!.returnPercent).not.toBe('0');
    expect(result.bot.portfolio.initial[XOR.address]).toBe('100000000000000000019');
    expect(result.bot.portfolio.initial[VAL.address]).toBe('0');
    expect(result.bot.portfolio.holdings).toEqual(result.bot.portfolio.initial);
    expect(result.bot.portfolio.trades).toBe(0);
    expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
  });

  it('replays an exact 10 KUSD maximum plus a separate 1 XOR reserve against the XOR goal', async () => {
    const test = harness();
    const kusd = { address: `0x02000c${'0'.repeat(58)}`, symbol: 'KUSD', decimals: 18 };
    test.history.candles.forEach((candle, index) => {
      candle.close = index % 12 < 8 ? '100' : '104';
      candle.feeClose = candle.close;
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, {
        kind: 'rules',
        intervalMs: 2 * HOUR,
        rules: {
          version: 1,
          entry: {
            operator: 'all',
            conditions: [{ kind: 'deviation', window: 2, direction: 'below', threshold: '0' }],
          },
          exit: { operator: 'all', conditions: [{ kind: 'deviation', window: 2, direction: 'above', threshold: '0' }] },
        },
      }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    const result = await test.research.run(
      {
        ...input,
        assets: [...input.assets, kusd],
        assetInAddress: kusd.address,
        assetOutAddress: XOR.address,
        capital: '10',
        feeBudgetXor: '1',
        valuationAsset: 'output',
        targetReturnPercent: '5',
        maxLossPercent: '10',
      },
      test.client
    );
    const metadata = result.research.goalEpisodes!;
    expect(result.bot.goal).toMatchObject({
      valuationAsset: 'output',
      targetReturnPercent: '5',
      maxLossPercent: '10',
      durationMs: 24 * HOUR,
    });
    expect(result.bot.portfolio.initial[kusd.address]).toBe(toCodec('10', 18));
    expect(result.bot.portfolio.initial[XOR.address]).toBe(toCodec('1', 18));
    expect(result.bot.portfolio.holdings).toEqual(result.bot.portfolio.initial);
    expect(result.bot.policy.feeBudgetCodec).toBe(toCodec('1', 18));
    expect(result.bot.policy.maxPriceImpactPercent).toBe('1');
    expect(codec(toCodec(result.bot.strategy.amount, 18))).toBeGreaterThan(0n);
    expect(codec(toCodec(result.bot.strategy.amount, 18))).toBeLessThan(codec(toCodec('10', 18)));
    expect(codec(result.bot.policy.maxTradeCodec[kusd.address])).toBeLessThan(codec(toCodec('10', 18)));
    expect(metadata.binding.outputTradeLimitCodec).toBe(toCodec('0.1', 18));
    expect(metadata.training.episodes[0].initialValue).toBe('1.1');
    expect(new FPNumber(result.research.qualification!.returnPercent).gt(new FPNumber('0'))).toBe(true);
    expect(validateGoalResearchSnapshot(result.research)).toEqual(metadata);
    expect(() => assertGoalResearchBinding(result.bot, metadata)).not.toThrow();
  });

  it('rejects input-token gains when the same strategy loses value in the selected output token', async () => {
    const test = harness();
    await expect(test.research.run({ ...input, valuationAsset: 'output' }, test.client)).rejects.toThrow(
      'bots.autopilot.errors.noStrategy'
    );
    expect(observed.batches).toHaveLength(1);
    expect(test.progress.some((item) => item.phase === 'ready')).toBe(false);
  });

  it('rejects a frozen output-token winner that loses output buying power on the untouched holdout', async () => {
    const test = harness();
    test.history.candles.forEach((candle, index) => {
      candle.close = index <= 117 ? (index % 12 < 8 ? '100' : '104') : String(104 + index - 118);
    });
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, {
        kind: 'rules',
        intervalMs: 2 * HOUR,
        rules: {
          version: 1,
          entry: {
            operator: 'all',
            conditions: [{ kind: 'deviation', window: 2, direction: 'below', threshold: '0' }],
          },
          exit: { operator: 'all', conditions: [{ kind: 'deviation', window: 2, direction: 'above', threshold: '0' }] },
        },
      }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    await expect(test.research.run({ ...input, valuationAsset: 'output' }, test.client)).rejects.toThrow(
      'bots.autopilot.errors.noStrategy'
    );
    expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
    expect(test.client.suggest).toHaveBeenCalledTimes(1);
  });

  it('rejects a training search with no profitable candidate before examining the holdout', async () => {
    const test = harness();
    test.history.candles.forEach((candle, index) => {
      candle.close = String(400 - index);
    });
    await expect(test.research.run(input, test.client)).rejects.toThrow('bots.autopilot.errors.noStrategy');
    expect(observed.batches).toHaveLength(1);
  });

  it('rejects a strategy with too few fills even when market prices rise', async () => {
    const test = harness();
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { kind: 'threshold', direction: 'above', threshold: '1' }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    await expect(test.research.run(input, test.client)).rejects.toThrow('bots.autopilot.errors.noStrategy');
    expect(observed.batches).toHaveLength(1);
  });

  it('rejects positive held-out returns when observed drawdown exceeds the chosen loss limit', async () => {
    const test = harness();
    for (const [index, candle] of test.history.candles.entries()) {
      if (index > 117) candle.close = index === 145 ? '150' : String(300 + index * 3);
    }
    await expect(test.research.run(input, test.client)).rejects.toThrow('bots.autopilot.errors.noStrategy');
    expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
  });

  it('requires sufficient held-out fills rather than counting profitable training trades', async () => {
    const test = harness();
    for (const [index, candle] of test.history.candles.entries()) if (index > 117) candle.close = String(400 + index);
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { kind: 'threshold', direction: 'below', threshold: '250' }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    await expect(test.research.run(input, test.client)).rejects.toThrow('bots.autopilot.errors.noStrategy');
    expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
  });

  it('tests exact sizes while preserving rule conditions and closed-hour evaluation', async () => {
    const test = harness();
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, {
        kind: 'rules',
        rules: {
          version: 1,
          entry: { operator: 'all', conditions: [{ kind: 'trend', direction: 'above', window: 6 }] },
          exit: null,
        },
      }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    const result = await test.research.run(input, test.client);
    expect(
      observed.batches[0]
        .filter((_, index) => index % 4 === 0)
        .map((item) => item.strategy!.rules!.entry.conditions[0].window)
    ).toEqual([6, 6, 6]);
    expect(observed.batches[0].filter((_, index) => index % 4 === 0).map((item) => item.strategy!.amount)).toEqual([
      ...defaultCostSampleAmounts,
    ]);
    expect(result.bot.strategy.kind).toBe('rules');
  });

  it('normalizes a generated SMA to hourly closed candles and a bounded session before research', async () => {
    const test = harness();
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { kind: 'sma', intervalMs: 6000, signalTiming: 'live-price' }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    // A monotonic series has no repeated crossings, so sample requirements reject it after evaluating the bounded candidates.
    await expect(test.research.run(input, test.client)).rejects.toThrow('bots.autopilot.errors.noStrategy');
    expect(observed.batches[0]).toHaveLength(12);
    expect(
      observed.batches[0].every(
        (item) => item.strategy!.intervalMs === HOUR && item.strategy!.signalTiming === 'closed-hour'
      )
    ).toBe(true);
  });

  it.each(['missing', 'stale', 'gap', 'future', 'unverified', 'fee-price'] as const)(
    'fails closed on %s history before contacting AI',
    async (fault) => {
      const test = harness();
      if (fault === 'missing') test.history.missing = 1;
      if (fault === 'stale')
        test.history.candles.forEach((candle) => {
          candle.timestamp -= 3 * HOUR;
        });
      if (fault === 'gap') test.history.candles[30].timestamp += HOUR;
      if (fault === 'future') test.history.candles.at(-1)!.timestamp += HOUR;
      if (fault === 'unverified') test.history.denominationVerified = false;
      if (fault === 'fee-price') test.history.candles[0].feeClose = undefined;
      await expect(test.research.run(input, test.client)).rejects.toThrow();
      expect(test.client.suggest).not.toHaveBeenCalled();
      expect(test.loadFees).not.toHaveBeenCalled();
    }
  );

  it.each(['identity', 'expired', 'finalized', 'missing-fee'] as const)(
    'fails closed on %s fee evidence before drafting',
    async (fault) => {
      const test = harness();
      const original = test.loadFees.getMockImplementation()!;
      test.loadFees.mockImplementationOnce(async (bot) => {
        const fees = await original(bot);
        if (fault === 'identity') fees.denominator = '2000';
        if (fault === 'expired') fees.expiresAt = NOW;
        if (fault === 'finalized') fees.finalizedAt = NOW - 300_001;
        if (fault === 'missing-fee') fees.networkFeeCodec = '0';
        return fees;
      });
      await expect(test.research.run(input, test.client)).rejects.toThrow('bots.errors.stale');
      expect(observed.batches).toHaveLength(0);
      expect(test.client.suggest).not.toHaveBeenCalled();
    }
  );

  it('rejects AI trade sizes above the exact user allocation limit before re-quoting or testing', async () => {
    const test = harness();
    vi.mocked(test.client.suggest).mockImplementationOnce(async (bot) => ({
      strategy: suggestion(bot, { amount: '99.000000000000000019' }),
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    }));
    await expect(test.research.run(input, test.client)).rejects.toThrow('bots.errors.proposal');
    expect(test.loadFees).toHaveBeenCalledTimes(3);
    expect(observed.batches).toHaveLength(0);
  });

  it('cancels an uncooperative AI request and never resumes testing when it resolves late', async () => {
    const test = harness();
    let resolve!: (value: Awaited<ReturnType<BotAiClient['suggest']>>) => void;
    vi.mocked(test.client.suggest).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    const controller = new AbortController();
    const pending = test.research.run(input, test.client, controller.signal);
    await vi.waitFor(() => expect(test.client.suggest).toHaveBeenCalledTimes(1));
    controller.abort();
    await expect(pending).rejects.toThrow('bots.errors.stale');
    resolve({
      strategy: vi.mocked(test.client.suggest).mock.calls[0][0].strategy,
      usage: { inputTokens: 0, outputTokens: 0, requests: 1 },
    });
    await Promise.resolve();
    expect(observed.batches).toHaveLength(0);
    expect(test.loadFees).toHaveBeenCalledTimes(3);
    expect(test.progress.some((item) => item.phase === 'ready')).toBe(false);
  });

  it('keeps the separate XOR fee allocation exact for non-XOR capital', async () => {
    const test = harness();
    const quoteAsset = { address: `0x${'9'.repeat(64)}`, symbol: 'TEST', decimals: 18 };
    const result = await test.research.run(
      { ...input, assets: [...input.assets, quoteAsset], assetInAddress: quoteAsset.address },
      test.client
    );
    expect(result.bot.portfolio.initial[quoteAsset.address]).toBe('100000000000000000019');
    expect(result.bot.portfolio.initial[XOR.address]).toBe('1000000000000000001');
    expect(result.bot.portfolio.holdings).toEqual(result.bot.portfolio.initial);
  });

  it('makes an aborted or disposed run inert before loading history', async () => {
    const test = harness();
    const controller = new AbortController();
    controller.abort();
    await expect(test.research.run(input, test.client, controller.signal)).rejects.toThrow('bots.errors.stale');
    test.research.dispose();
    await expect(test.research.run(input, test.client)).rejects.toThrow('bots.errors.stale');
    expect(test.loadHistory).not.toHaveBeenCalled();
  });

  it('honors cancellation at a phase change before allocating research workers', async () => {
    const test = harness();
    const controller = new AbortController();
    const research = createAutopilotResearch({
      loadHistory: test.loadHistory,
      loadFees: test.loadFees,
      now: () => NOW,
      onProgress: (progress) => {
        if (progress.phase === 'testing') controller.abort();
      },
    });
    await expect(research.run(input, test.client, controller.signal)).rejects.toThrow('bots.errors.stale');
    expect(observed.batches).toHaveLength(0);
  });

  it.each(['identity', 'observation'] as const)(
    'refuses readiness after %s changes during research',
    async (change) => {
      const test = harness();
      const load = test.loadHistory.getMockImplementation()!;
      test.loadHistory.mockImplementationOnce(load).mockImplementationOnce(async (bot) => {
        const revised = structuredClone(test.history);
        if (change === 'identity') revised.identity!.denominator = '2000';
        else revised.candles[20].close = '99';
        return indexedHistory(bot, revised);
      });
      await expect(test.research.run(input, test.client)).rejects.toThrow('bots.errors.stale');
      expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
      expect(test.progress.some((item) => item.phase === 'ready')).toBe(false);
    }
  );

  it('requires indexed warmup evidence before drafting and rejects a legacy study without relabeling it', async () => {
    const test = harness();
    test.loadHistory.mockResolvedValueOnce(test.history as AutopilotHistory);
    await expect(test.research.run(input, test.client)).rejects.toThrow();
    expect(test.client.suggest).not.toHaveBeenCalled();
    expect(test.loadFees).not.toHaveBeenCalled();
  });

  it('rechecks the signal-only prefix before review and does not expose whole-study receipts to workers', async () => {
    const test = harness();
    const load = test.loadHistory.getMockImplementation()!;
    test.loadHistory.mockImplementationOnce(load).mockImplementationOnce(async (bot) => {
      const changed = await load(bot);
      const receipt = changed.goalHistory;
      const prefix = structuredClone(receipt.warmupCandles);
      prefix[0].close = '99';
      changed.goalHistory = createGoalHistoryEvidence(
        bot,
        {
          history: { ...test.history, candles: [...prefix, ...test.history.candles] },
          boundaries: [...receipt.warmupBoundaries, ...receipt.studyBoundaries],
        },
        receipt.studyStartAt,
        receipt.studyEndAt
      );
      return changed;
    });
    await expect(test.research.run(input, test.client)).rejects.toThrow('bots.errors.stale');
    expect(observed.batches.map((batch) => batch.length)).toEqual([12, 2]);
    for (const run of observed.runs.flat()) {
      expect(run.result!.source.history).not.toHaveProperty('goalHistory');
      expect(run.result!.source.history.candles).toHaveLength(25);
    }
    expect(test.progress.some((item) => item.phase === 'ready')).toBe(false);
  });
});

describe('five observed exact impact preflight failures', () => {
  it('brands only the five fresh exact impact-only failures before drafting or exposing validation', async () => {
    const onValidationStarted = vi.fn();
    const test = harness(() => NOW, { onValidationStarted });
    const original = test.loadFees.getMockImplementation()!;
    test.loadFees.mockImplementation(async (bot) => ({ ...(await original(bot)), priceImpactPercent: '2' }));
    const failure = await test.research.run(input, test.client).catch((error: unknown) => error);
    expect(readAutopilotImpactPreflightDiagnostics(failure)).toEqual({
      stage: 'preflight',
      cause: 'priceImpact',
      sampleCount: 5,
    });
    expect(test.loadFees).toHaveBeenCalledTimes(5);
    expect(
      new Set(test.loadFees.mock.calls.map(([bot]) => toCodec(bot.strategy.amount, bot.assetIn.decimals))).size
    ).toBe(5);
    expect(test.client.suggest).not.toHaveBeenCalled();
    expect(onValidationStarted).not.toHaveBeenCalled();
    expect(observed.batches).toHaveLength(0);
    expect(readAutopilotQualificationDiagnostics(failure)).toBeNull();
  });

  it.each(['unavailable', 'mixedPolicy', 'stale'] as const)(
    'does not brand %s observations as five verified impact-only failures',
    async (variant) => {
      const test = harness();
      const original = test.loadFees.getMockImplementation()!;
      test.loadFees.mockImplementation(async (bot) => {
        if (variant === 'unavailable' && bot.strategy.amount === defaultCostSampleAmounts[0])
          throw new Error('bots.errors.quote');
        const fees = { ...(await original(bot)), priceImpactPercent: '2' };
        if (variant === 'mixedPolicy' && bot.strategy.amount === defaultCostSampleAmounts[0]) {
          fees.networkFeeXor = '2';
          fees.networkFeeCodec = toCodec('2', XOR.decimals);
        }
        if (variant === 'stale') fees.finalizedAt = NOW - 300_001;
        return fees;
      });
      const failure = await test.research.run(input, test.client).catch((error: unknown) => error);
      expect(readAutopilotImpactPreflightDiagnostics(failure)).toBeNull();
      expect(test.client.suggest).not.toHaveBeenCalled();
      expect(observed.batches).toHaveLength(0);
    }
  );
});
