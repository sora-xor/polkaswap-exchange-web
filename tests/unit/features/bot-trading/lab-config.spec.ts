import { describe, expect, it } from 'vitest';
import { XOR, VAL, PSWAP } from '@/lib/substrate/sdk/assets/consts';
import {
  buildLabBatch,
  comparableLabRuns,
  coverageLabel,
  createLabDefaultSettings,
  LAB_DEFAULT_SETTINGS,
  labDecimal,
  labVariants,
  parseLabPins,
  sortLabRuns,
} from '@/features/bot-trading/lab-config';
import { createResearchBot, RESEARCH_DEFAULT_SETTINGS, runResearch } from '@/features/bot-trading/research';
import type { ExperimentRun } from '@/features/bot-trading/experiments';

const assets = [XOR, VAL, PSWAP].map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));
const settings = { ...RESEARCH_DEFAULT_SETTINGS, assetInAddress: XOR.address, assetOutAddress: VAL.address };

describe('strategy lab configuration', () => {
  it('creates independent two-way signal drafts with minute eligibility and untuned chronological tests', () => {
    const now = Date.UTC(2026, 8, 15, 12, 34);
    const draft = createLabDefaultSettings(now);
    expect(draft).toMatchObject({
      preset: 'sma',
      signalTiming: 'live-price',
      intervalBlocks: 10,
      intervalHours: 1,
      tradePercent: 10,
      days: 90,
      validation: 'walk-forward',
      trainPercent: 60,
      folds: 3,
      optimize: false,
      historyStartAt: Date.UTC(2026, 5, 17, 12),
      historyEndAt: Date.UTC(2026, 8, 15, 12),
    });
    draft.intervalBlocks = 1;
    draft.capital = '50';
    expect(createLabDefaultSettings(now).intervalBlocks).toBe(10);
    expect(createLabDefaultSettings(now).capital).toBe('100');
    expect(Object.isFrozen(LAB_DEFAULT_SETTINGS)).toBe(true);
    expect(createLabDefaultSettings(Date.UTC(2026, 3, 1)).historyStartAt).toBe(Date.UTC(2026, 2, 1));
    for (const invalid of [NaN, Infinity, -1, 0.5]) expect(() => createLabDefaultSettings(invalid)).toThrow();
  });

  it('does not force buying or invent a crossover solely because a short cooldown has elapsed', () => {
    const now = Date.UTC(2026, 8, 15, 12);
    const draft = {
      ...createLabDefaultSettings(now),
      validation: 'none' as const,
      networkFeeXor: '0.01',
      sellNetworkFeeXor: '0.01',
      swapFeePercent: '0',
      sellSwapFeePercent: '0',
    };
    const source = {
      kind: 'historical' as const,
      history: {
        candles: Array.from({ length: 24 }, (_, index) => ({
          timestamp: now - (24 - index) * 3_600_000,
          close: '1',
          feeClose: '1',
        })),
        missing: 0,
        denominationVerified: true,
      },
    };
    const result = runResearch(draft, assets, source, now);
    expect(result.bot.strategy.intervalMs).toBe(60_000);
    expect(result.bot.strategy.amount).toBe('10');
    expect(result.result.trades).toBe(0);
    expect(result.result.returnPercent).toBe('0');
    expect(result.costs.networkFeeXor).toBe('0');
  });

  it('keeps three multi-day held-out windows without tuning or inventing higher-resolution observations', () => {
    const now = Date.UTC(2026, 8, 15, 12);
    const draft = {
      ...createLabDefaultSettings(now),
      networkFeeXor: '0.01',
      sellNetworkFeeXor: '0.01',
      swapFeePercent: '0',
      sellSwapFeePercent: '0',
    };
    const result = runResearch(
      draft,
      assets,
      {
        kind: 'historical',
        history: {
          candles: Array.from({ length: 2161 }, (_, index) => ({
            timestamp: draft.historyStartAt! + index * 3_600_000,
            close: '1',
            feeClose: '1',
          })),
          missing: 0,
          denominationVerified: true,
        },
      },
      now
    );
    expect(result.validation.tuned).toBe(false);
    expect(result.validation.folds).toHaveLength(3);
    for (const fold of result.validation.folds) {
      expect(fold.testEnd - fold.testStart).toBeGreaterThan(11 * 86_400_000);
      expect(fold.searchCount).toBe(1);
      expect(fold.test.trades).toBe(0);
      expect(fold.trainEnd).toBeLessThan(fold.testStart);
    }
  });

  it('expands independent output tokens and parameter variations without changing exact allocations', () => {
    let id = 0;
    const runs = buildLabBatch(
      { settings, outputs: [VAL.address, PSWAP.address], presets: ['dca', 'sma'], variations: 3 },
      assets,
      (value) => value.preset,
      () => `run-${++id}`
    );
    expect(runs).toHaveLength(12);
    expect(runs.filter((run) => run.settings.assetOutAddress === PSWAP.address)).toHaveLength(6);
    expect(runs.every((run) => run.settings.assetInAddress === XOR.address && run.settings.capital === '100')).toBe(
      true
    );
    runs[0].settings.capital = '50';
    expect(runs[1].settings.capital).toBe('100');
    expect(settings.capital).toBe('100');
  });

  it('keeps a timing preference when comparing presets but applies it only to SMA execution', () => {
    const now = Date.UTC(2026, 8, 15, 12);
    let id = 0;
    const runs = buildLabBatch(
      {
        settings: createLabDefaultSettings(now),
        outputs: [VAL.address],
        presets: ['dca', 'threshold', 'sma'],
        variations: 1,
      },
      assets,
      (value) => value.preset,
      () => `timing-${++id}`
    );
    expect(runs).toHaveLength(3);
    for (const run of runs) {
      expect(run.settings.signalTiming).toBe('live-price');
      const strategy = createResearchBot(run.settings, assets, now).strategy;
      expect(strategy.signalTiming).toBe(run.settings.preset === 'sma' ? 'live-price' : undefined);
    }
  });

  it('supports a different input token and rejects identical or unavailable pairs before running', () => {
    const build = (output: string) =>
      buildLabBatch(
        { settings: { ...settings, assetInAddress: VAL.address }, outputs: [output], presets: ['dca'], variations: 1 },
        assets,
        () => 'Study',
        () => 'study'
      );
    expect(build(PSWAP.address)[0].settings.assetInAddress).toBe(VAL.address);
    expect(() => build(VAL.address)).toThrow('bots.errors.config');
    expect(() => build('unknown')).toThrow('bots.errors.config');
  });

  it('rejects empty, duplicate, oversized, and invalid batch choices', () => {
    const batch = { settings, outputs: [VAL.address], presets: ['dca' as const], variations: 1 as const };
    for (const patch of [
      { outputs: [] },
      { presets: [] },
      { outputs: [VAL.address, VAL.address] },
      { presets: ['dca', 'dca'] },
      { outputs: Array(5).fill(VAL.address) },
    ]) {
      expect(() =>
        buildLabBatch(
          { ...batch, ...patch } as typeof batch,
          assets,
          () => 'Study',
          () => 'study'
        )
      ).toThrow('bots.errors.config');
    }
    expect(() =>
      buildLabBatch(
        { ...batch, settings: { ...settings, capital: '-1' } },
        assets,
        () => 'Study',
        () => 'study'
      )
    ).toThrow();
  });

  it('clamps and deduplicates nearby rules at supported limits', () => {
    expect(
      labVariants({ ...settings, intervalBlocks: undefined, intervalHours: 1 }, 3).map((value) => value.intervalHours)
    ).toEqual([1, 2]);
    expect(
      labVariants({ ...settings, preset: 'threshold', thresholdPercent: 0 }, 3).map((value) => value.thresholdPercent)
    ).toEqual([0, 4]);
    expect(labVariants({ ...settings, preset: 'sma', fastWindow: 2, slowWindow: 3 }, 3)).toHaveLength(1);
  });

  it('preserves single live cadence but uses distinguishable hourly research variations', () => {
    const blockSettings = { ...settings, intervalBlocks: 1 };
    expect(labVariants(blockSettings, 1)[0].intervalBlocks).toBe(1);
    expect(labVariants(blockSettings, 3).map((value) => value.intervalBlocks)).toEqual([600, 1200, 2400]);
    expect(labVariants({ ...settings, intervalBlocks: 601 }, 3).map((value) => value.intervalBlocks)).toEqual([
      1200, 2400, 4800,
    ]);
    expect(labVariants({ ...settings, intervalBlocks: 432_000 }, 3)).toHaveLength(1);
  });

  it('requires matching market, observed period, coverage and chain identity', () => {
    const first = {
      settings,
      result: {
        source: {
          history: {
            candles: [{ timestamp: 100 }, { timestamp: 200 }],
            missing: 0,
            identity: { genesisHash: 'chain', denominator: '1' },
          },
        },
      },
    } as unknown as ExperimentRun;
    const other = structuredClone(first);
    expect(comparableLabRuns(first, other)).toBe(true);
    other.settings.assetOutAddress = PSWAP.address;
    expect(comparableLabRuns(first, other)).toBe(false);
    other.settings = first.settings;
    other.result!.source.history.candles[1].timestamp = 300;
    expect(comparableLabRuns(first, other)).toBe(false);
    other.result!.source.history = structuredClone(first.result!.source.history);
    other.result!.source.history.identity!.denominator = '10';
    expect(comparableLabRuns(first, other)).toBe(false);
    expect(comparableLabRuns(first, { ...other, result: undefined })).toBe(false);
  });

  it('sorts decimal returns precisely and keeps absent test results last', () => {
    const run = (id: string, value: string, test?: string, createdAt = 1) =>
      ({
        id,
        createdAt,
        result: {
          result: { returnPercent: value, drawdownPercent: value },
          validation: { folds: test ? [{ test: { returnPercent: test } }] : [] },
        },
      }) as unknown as ExperimentRun;
    const values = [run('a', '0.100000000000000001'), run('b', '0.100000000000000002', '-2'), run('c', '0.2', '-1', 3)];
    expect(sortLabRuns(values, 'return').map((value) => value.id)).toEqual(['c', 'b', 'a']);
    expect(sortLabRuns(values, 'drawdown').map((value) => value.id)).toEqual(['a', 'b', 'c']);
    expect(sortLabRuns(values, 'test').map((value) => value.id)).toEqual(['c', 'b', 'a']);
    expect(sortLabRuns(values, 'recent')[0].id).toBe('c');
    expect(values[0].id).toBe('a');
  });

  it('formats display amounts and fractional coverage without changing underlying values', () => {
    expect(labDecimal('0.125', true)).toBe('+0.13');
    expect(labDecimal(undefined)).toBe('—');
    expect(labDecimal('-1.234')).toBe('-1.23');
    expect(coverageLabel(1)).toBe('100.00');
    expect(coverageLabel(0.75)).toBe('75.00');
    expect(coverageLabel(2)).toBe('—');
  });

  it('restores only safe, unique, bounded shortlist identifiers', () => {
    expect(parseLabPins('["first", "first", "second", {}, "<script>"]')).toEqual(['first', 'second']);
    expect(parseLabPins('invalid')).toEqual([]);
    expect(parseLabPins(null)).toEqual([]);
    expect(parseLabPins(JSON.stringify(Array.from({ length: 40 }, (_, i) => `run-${i}`)))).toHaveLength(36);
  });
});
