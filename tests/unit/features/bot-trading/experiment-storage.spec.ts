import { describe, expect, it } from 'vitest';
import { KUSD, XOR } from '@/lib/substrate/sdk/assets/consts';
import { toCodec } from '@/features/bot-trading/amounts';
import {
  copyStoredExperiment,
  createExperimentStorage,
  retainExperiments,
} from '@/features/bot-trading/experiment-storage';
import type { ExperimentDefinition, ExperimentRun } from '@/features/bot-trading/experiments';
import { RESEARCH_DEFAULT_SETTINGS, runResearch } from '@/features/bot-trading/research';
import type { ResearchFeeSnapshot } from '@/features/bot-trading/research-fees';
import type { BotDefinition, BotGoal, BotHistory } from '@/features/bot-trading/types';

const HOUR = 3_600_000;
const START = Date.UTC(2026, 8, 14);
const NOW = START + 24 * HOUR;
const assets = [KUSD, XOR].map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));
const goal = (): BotGoal => ({
  title: 'Grow XOR',
  durationMs: 24 * HOUR,
  valuationAsset: 'output',
  lossMetric: 'drawdown',
  targetReturnPercent: '5',
  maxLossPercent: '5',
});

/** Synthetic observations and fees exercise persistence only; no provider or wallet is used. */
function history(prices = Array<string>(25).fill('10')): BotHistory {
  return {
    candles: prices.map((close, index) => ({ timestamp: START + index * HOUR, close })),
    missing: 0,
    denominationVerified: true,
    identity: { genesisHash: `0x${'b'.repeat(64)}`, denominator: '1' },
  };
}

function fees(bot: BotDefinition): ResearchFeeSnapshot {
  return {
    networkFeeXor: '0.001',
    networkFeeCodec: toCodec('0.001', 18),
    swapFeePercent: '0',
    priceImpactPercent: '0',
    sellNetworkFeeXor: '0.001',
    sellNetworkFeeCodec: toCodec('0.001', 18),
    sellSwapFeePercent: '0',
    sellPriceImpactPercent: '0',
    queriedAt: NOW,
    expiresAt: NOW + 60_000,
    blockNumber: 10,
    blockHash: `0x${'a'.repeat(64)}`,
    genesisHash: `0x${'b'.repeat(64)}`,
    endpoint: 'wss://research-test.invalid',
    denominator: '1',
    amountIn: bot.strategy.amount,
    amountOut: '0.5',
    sellAmountIn: '0.5',
    sellAmountOut: '5',
    assetInAddress: bot.assetIn.address,
    assetOutAddress: bot.assetOut.address,
    dexId: 0,
    route: [bot.assetIn.address, bot.assetOut.address],
    routeFees: [],
    sellDexId: 0,
    sellRoute: [bot.assetOut.address, bot.assetIn.address],
    sellRouteFees: [],
  };
}

/** Real engine replay supplies the result shape instead of a hand-authored successful outcome. */
function complete(
  options: { prices?: string[]; legacy?: boolean; context?: boolean; idleTarget?: boolean } = {}
): ExperimentRun {
  const def: ExperimentDefinition = {
    id: options.legacy ? 'legacy' : 'goal',
    name: 'Public study',
    settings: {
      ...RESEARCH_DEFAULT_SETTINGS,
      assetInAddress: KUSD.address,
      assetOutAddress: XOR.address,
      capital: '10',
      feeBudgetXor: '1',
      tradePercent: 50,
      intervalHours: 1,
      intervalBlocks: undefined,
      historyStartAt: START,
      historyEndAt: NOW,
      validation: 'none',
      optimize: false,
      networkFeeXor: '0.001',
      swapFeePercent: '0',
      sellNetworkFeeXor: '0.001',
      sellSwapFeePercent: '0',
      slippagePercent: '0.01',
    },
    ...(!options.legacy
      ? {
          goal: {
            ...goal(),
            ...(options.idleTarget ? { targetRequiresIdleOutperformance: true as const } : {}),
          },
          ...(options.context !== false
            ? {
                warmupCandles: [-3, -2, -1].map((offset) => ({ timestamp: START + offset * HOUR, close: '10' })),
                outputTradeLimitCodec: toCodec('0.3', 18),
              }
            : {}),
        }
      : {}),
  };
  const result = runResearch(def.settings, assets, { kind: 'historical', history: history(options.prices) }, NOW, {
    ...(def.goal ? { goal: def.goal } : {}),
    ...(def.warmupCandles ? { warmupCandles: def.warmupCandles } : {}),
    ...(def.outputTradeLimitCodec ? { outputTradeLimitCodec: def.outputTradeLimitCodec } : {}),
  });
  return { ...def, result, fees: fees(result.bot), createdAt: NOW, status: 'complete', progress: 1 };
}

/** Minimal injected IndexedDB boundary keeps this storage test independent of browser services. */
function storage() {
  const values = new Map<string, unknown>();
  const db = {
    createObjectStore: () => {},
    close: () => {},
    onversionchange: null,
    transaction: () => {
      const tx = {
        oncomplete: null as (() => void) | null,
        onabort: null as (() => void) | null,
        onerror: null,
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
          put: (value: unknown, key: string) => values.set(key, structuredClone(value)),
          delete: (key: string) => values.delete(key),
        }),
      };
      return tx;
    },
  };
  const open = () => {
    const request = {
      result: db,
      onupgradeneeded: null as (() => void) | null,
      onsuccess: null as (() => void) | null,
    };
    queueMicrotask(() => {
      request.onupgradeneeded?.();
      request.onsuccess?.();
    });
    return request;
  };
  return createExperimentStorage({ open } as unknown as IDBFactory);
}

describe('goal experiment persistence', () => {
  it('round-trips the new per-epoch idle benchmark without changing old saved goals', () => {
    const studied = complete({ idleTarget: true });
    const saved = copyStoredExperiment(studied);
    expect(saved.goal).toMatchObject({ targetRequiresIdleOutperformance: true });
    expect(saved.result!.goalEvaluation!.state).toMatchObject({
      outcome: 'expired',
      idleHoldings: studied.result!.bot.portfolio.initial,
      idleLastValue: '2',
    });
    const missing = structuredClone(studied);
    delete missing.result!.goalEvaluation!.state.idleHoldings;
    expect(() => copyStoredExperiment(missing)).toThrow('bots.errors.goal');
    expect(copyStoredExperiment(complete()).goal).not.toHaveProperty('targetRequiresIdleOutperformance');
  });
  it('round-trips detached replay evidence and exact public inputs through the isolated library', async () => {
    const run = complete();
    const library = storage();
    await library.save(run);
    const [saved] = await library.list();
    expect(saved).toEqual(copyStoredExperiment(run));
    expect(saved.result!.goalEvaluation).toMatchObject({
      goal: goal(),
      fundingTimestamp: START,
      endingTimestamp: NOW,
      outputTradeLimitCodec: toCodec('0.3', 18),
      warmupCandles: run.warmupCandles,
      state: { startedAt: START, outcome: 'expired', baselineValue: '2', completedAt: NOW },
    });
    expect(saved.result!.bot.status).toBe('idle');
    expect(saved.result!.bot).not.toHaveProperty('goalState');
    saved.goal!.title = 'Mutated';
    saved.warmupCandles![0].close = '999';
    saved.result!.goalEvaluation!.state.lastValue = '999';
    const [reloaded] = await library.list();
    expect(reloaded).toEqual(copyStoredExperiment(run));
    expect(run.goal!.title).toBe('Grow XOR');
    library.close();
  });

  it.each([
    { prices: ['10', '10', '5', ...Array<string>(22).fill('20')], outcome: 'target' },
    { prices: ['10', '10', '20', ...Array<string>(22).fill('5')], outcome: 'loss' },
  ])('keeps the latched $outcome even when marked equity changes afterward', ({ prices, outcome }) => {
    const run = complete({ prices });
    expect(run.result!.goalEvaluation!.state).toMatchObject({ outcome, completedAt: START + 2 * HOUR });
    expect(run.result!.result.equity.at(-1)!.value).not.toBe(run.result!.result.equity[2].value);
    expect(copyStoredExperiment(run).result!.goalEvaluation).toEqual(run.result!.goalEvaluation);
  });

  it('preserves absent goal context and legacy result shapes', () => {
    const minimal = copyStoredExperiment(complete({ context: false }));
    expect(minimal).not.toHaveProperty('warmupCandles');
    expect(minimal.result!.goalEvaluation).not.toHaveProperty('warmupCandles');
    expect(minimal.result!.goalEvaluation).not.toHaveProperty('outputTradeLimitCodec');
    const legacy = complete({ legacy: true });
    const saved = copyStoredExperiment(legacy);
    expect(saved.result).toEqual(JSON.parse(JSON.stringify(legacy.result)));
    expect(saved).not.toHaveProperty('goal');
    expect(saved.result).not.toHaveProperty('goalEvaluation');
    expect(saved.result!.bot).not.toHaveProperty('goal');
  });

  const tampering: [string, (run: ExperimentRun) => void][] = [
    [
      'missing evaluation',
      (run) => {
        delete run.result!.goalEvaluation;
      },
    ],
    [
      'missing state',
      (run) => {
        Reflect.deleteProperty(run.result!.goalEvaluation!, 'state');
      },
    ],
    [
      'missing bot goal',
      (run) => {
        delete run.result!.bot.goal;
      },
    ],
    [
      'changed bot goal',
      (run) => {
        run.result!.bot.goal!.targetReturnPercent = '10';
      },
    ],
    [
      'changed evaluation goal',
      (run) => {
        run.result!.goalEvaluation!.goal.maxLossPercent = '10';
      },
    ],
    [
      'active cached bot',
      (run) => {
        run.result!.bot.goalState = run.result!.goalEvaluation!.state;
      },
    ],
    [
      'wrong funding',
      (run) => {
        run.result!.goalEvaluation!.fundingTimestamp += HOUR;
      },
    ],
    [
      'wrong endpoint',
      (run) => {
        run.result!.goalEvaluation!.endingTimestamp -= HOUR;
      },
    ],
    [
      'wrong state start',
      (run) => {
        run.result!.goalEvaluation!.state.startedAt -= HOUR;
      },
    ],
    [
      'completion outside replay',
      (run) => {
        run.result!.goalEvaluation!.state.completedAt = NOW + HOUR;
      },
    ],
    [
      'active state at deadline',
      (run) => {
        run.result!.goalEvaluation!.state.outcome = 'active';
        delete run.result!.goalEvaluation!.state.completedAt;
      },
    ],
    [
      'changed return arithmetic',
      (run) => {
        run.result!.goalEvaluation!.state.returnPercent = '100';
      },
    ],
    [
      'invented opening baseline',
      (run) => {
        Object.assign(run.result!.goalEvaluation!.state, {
          baselineValue: '999',
          lastValue: '999',
          peakValue: '999',
          returnPercent: '0',
        });
      },
    ],
    [
      'unreached target',
      (run) => {
        run.result!.goalEvaluation!.state.outcome = 'target';
      },
    ],
    [
      'wrong source span',
      (run) => {
        run.result!.source.history.candles.pop();
      },
    ],
    [
      'source missing data',
      (run) => {
        run.result!.source.history.missing = 1;
      },
    ],
    [
      'source timestamp gap',
      (run) => {
        run.result!.source.history.candles[3].timestamp += HOUR;
      },
    ],
    [
      'changed validation mode',
      (run) => {
        run.result!.validation.mode = 'holdout';
      },
    ],
    [
      'optimized replay',
      (run) => {
        run.result!.settings.optimize = run.settings.optimize = true;
      },
    ],
    [
      'missing warmup provenance',
      (run) => {
        delete run.result!.goalEvaluation!.warmupCandles;
      },
    ],
    [
      'changed warmup provenance',
      (run) => {
        run.result!.goalEvaluation!.warmupCandles![0].close = '99';
      },
    ],
    [
      'warmup funding gap',
      (run) => {
        for (const candle of run.warmupCandles!) candle.timestamp -= HOUR;
        run.result!.goalEvaluation!.warmupCandles = structuredClone(run.warmupCandles);
      },
    ],
    [
      'missing fixed cap provenance',
      (run) => {
        delete run.result!.goalEvaluation!.outputTradeLimitCodec;
      },
    ],
    [
      'changed fixed cap provenance',
      (run) => {
        run.result!.goalEvaluation!.outputTradeLimitCodec = '1';
      },
    ],
    [
      'changed bot output cap',
      (run) => {
        run.result!.bot.policy.maxTradeCodec[XOR.address] = '1';
      },
    ],
    [
      'goal credentials',
      (run) => {
        Object.assign(run.result!.goalEvaluation!.goal, { apiKey: 'never-store' });
      },
    ],
    [
      'state credentials',
      (run) => {
        Object.assign(run.result!.goalEvaluation!.state, { walletPassword: 'never-store' });
      },
    ],
  ];

  it.each(tampering)('rejects %s', (_label, mutate) => {
    const run = complete();
    mutate(run);
    expect(() => copyStoredExperiment(run)).toThrow();
  });

  it.each(['evaluation', 'bot goal', 'bot state'])('rejects unsolicited %s on a legacy study', (field) => {
    const run = complete({ legacy: true });
    const observation = complete().result!.goalEvaluation!;
    if (field === 'evaluation') run.result!.goalEvaluation = observation;
    if (field === 'bot goal') run.result!.bot.goal = goal();
    if (field === 'bot state') run.result!.bot.goalState = observation.state;
    expect(() => copyStoredExperiment(run)).toThrow('bots.errors.storage');
  });

  it('discards a corrupted goal record while retaining valid goal and legacy studies', () => {
    const corrupt = complete();
    corrupt.id = 'corrupt';
    corrupt.result!.goalEvaluation!.state.returnPercent = '100';
    const retained = retainExperiments([corrupt, complete(), complete({ legacy: true })]);
    expect(retained.map((run) => run.id)).toEqual(['goal', 'legacy']);
  });
});
