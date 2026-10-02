import { FPNumber } from '@/lib/substrate/math';
import { XOR, VAL } from '@/lib/substrate/sdk/assets/consts';
import { createPlaygroundBot } from './playground';
import { RESEARCH_DEFAULT_SETTINGS, type ResearchSettings } from './research';
import type { BotAsset } from './types';
import type { ExperimentDefinition, ExperimentRun } from './experiments';

/** New studies use a two-way signal and chronological tests without selecting on historical returns. */
export const LAB_DEFAULT_SETTINGS: Readonly<ResearchSettings> = Object.freeze({
  ...RESEARCH_DEFAULT_SETTINGS,
  preset: 'sma',
  signalTiming: 'live-price',
  intervalHours: 1,
  intervalBlocks: 10,
  days: 90,
  tradePercent: 10,
  validation: 'walk-forward',
  trainPercent: 60,
  folds: 3,
  optimize: false,
  assetInAddress: XOR.address,
  assetOutAddress: VAL.address,
});

/**
 * Create an independent new-study draft ending at the last completed hour.
 * The archive boundary limits available history; this never fabricates earlier
 * observations or rewrites settings belonging to an existing saved study.
 */
export function createLabDefaultSettings(now = Date.now()): ResearchSettings {
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('bots.errors.config');
  const end = Math.floor(now / 3_600_000) * 3_600_000;
  return {
    ...LAB_DEFAULT_SETTINGS,
    historyStartAt: Math.max(LAB_DEFAULT_SETTINGS.historyStartAt ?? 0, end - 90 * 86_400_000),
    historyEndAt: end,
  };
}

/** Explicit batch choices; each output is researched independently against the chosen input. */
export interface LabBatch {
  settings: ResearchSettings;
  outputs: string[];
  presets: ResearchSettings['preset'][];
  variations: 1 | 3;
}

/** Generate nearby user-visible alternatives without altering exact capital or fee amounts. */
export function labVariants(settings: ResearchSettings, count: 1 | 3): ResearchSettings[] {
  if (count === 1) return [{ ...settings }];
  const variants = [-1, 0, 1].map((offset): ResearchSettings => {
    if (settings.preset === 'dca') {
      if (settings.intervalBlocks !== undefined)
        return {
          ...settings,
          // Hourly observations cannot distinguish sub-hour cadence experiments.
          intervalBlocks: Math.min(
            432_000,
            Math.max(600, Math.ceil(settings.intervalBlocks / 600) * 600) * [1, 2, 4][offset + 1]
          ),
        };
      return {
        ...settings,
        intervalHours: Math.max(
          1,
          Math.min(168, settings.intervalHours + offset * Math.max(1, Math.floor(settings.intervalHours / 2)))
        ),
      };
    }
    if (settings.preset === 'threshold') {
      return { ...settings, thresholdPercent: Math.max(0, Math.min(50, settings.thresholdPercent + offset * 4)) };
    }
    return {
      ...settings,
      fastWindow: Math.max(2, Math.min(settings.slowWindow - 1, settings.fastWindow + offset * 2)),
    };
  });
  return variants.filter(
    (value, index) => variants.findIndex((other) => JSON.stringify(other) === JSON.stringify(value)) === index
  );
}

/** Compare only matching markets, chain identities, and actual observation windows. */
export function comparableLabRuns(left: ExperimentRun, right: ExperimentRun): boolean {
  if (!left.result || !right.result) return false;
  const a = left.result.source.history;
  const b = right.result.source.history;
  return (
    left.settings.assetInAddress === right.settings.assetInAddress &&
    left.settings.assetOutAddress === right.settings.assetOutAddress &&
    !!a.candles.length &&
    !!b.candles.length &&
    a.candles[0].timestamp === b.candles[0].timestamp &&
    a.candles.at(-1)!.timestamp === b.candles.at(-1)!.timestamp &&
    a.candles.length === b.candles.length &&
    a.candles.every((candle, index) => candle.timestamp === b.candles[index].timestamp) &&
    a.missing === b.missing &&
    !!a.identity &&
    !!b.identity &&
    a.identity.genesisHash === b.identity.genesisHash &&
    a.identity.denominator === b.identity.denominator
  );
}

/** Materialize a bounded batch; invalid/identical pairs fail before network calls or worker allocation. */
export function buildLabBatch(
  batch: LabBatch,
  assets: BotAsset[],
  name: (settings: ResearchSettings) => string,
  id: () => string
): ExperimentDefinition[] {
  if (
    ![1, 3].includes(batch.variations) ||
    !batch.outputs.length ||
    batch.outputs.length > 4 ||
    !batch.presets.length ||
    batch.presets.length > 3 ||
    new Set(batch.outputs).size !== batch.outputs.length ||
    new Set(batch.presets).size !== batch.presets.length
  ) {
    throw new Error('bots.errors.config');
  }
  const result: ExperimentDefinition[] = [];
  for (const assetOutAddress of batch.outputs) {
    if (assetOutAddress === batch.settings.assetInAddress) throw new Error('bots.errors.config');
    for (const preset of batch.presets) {
      const settings = { ...batch.settings, assetOutAddress, preset };
      for (const variant of labVariants(settings, batch.variations)) {
        createPlaygroundBot(variant, assets);
        result.push({ id: id(), name: name(variant).slice(0, 80), settings: variant });
      }
    }
  }
  if (result.length > 36 || new Set(result.map((run) => run.id)).size !== result.length)
    throw new Error('bots.errors.config');
  return result;
}

/** Compare exact decimal results; incomplete runs remain last and ties preserve original order. */
export function sortLabRuns(runs: ExperimentRun[], sort: 'recent' | 'return' | 'test' | 'drawdown'): ExperimentRun[] {
  if (sort === 'recent') return [...runs].sort((a, b) => b.createdAt - a.createdAt);
  const value = (run: ExperimentRun): string | undefined => {
    if (!run.result) return undefined;
    if (sort === 'test') return run.result.validation.folds.at(-1)?.test.returnPercent;
    return sort === 'drawdown' ? run.result.result.drawdownPercent : run.result.result.returnPercent;
  };
  return [...runs].sort((a, b) => {
    const left = value(a),
      right = value(b);
    if (left === undefined || right === undefined) return left === right ? 0 : left === undefined ? 1 : -1;
    const l = new FPNumber(left, 36),
      r = new FPNumber(right, 36);
    const order = l.eq(r) ? 0 : l.gt(r) ? -1 : 1;
    return sort === 'drawdown' ? -order : order;
  });
}

/** Round labels only; no displayed number is ever reused to construct a trading configuration. */
export function labDecimal(value: string | undefined, signed = false): string {
  if (value === undefined) return '—';
  const amount = new FPNumber(value, 36);
  if (!amount.isFinity()) return '—';
  return `${signed && amount.gt(FPNumber.ZERO) ? '+' : ''}${amount.value.toFixed(2, 4)}`;
}

/** Read only a bounded list of identifiers from presentation storage. */
export function parseLabPins(value: string | null): string[] {
  try {
    const result: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(result)
      ? [
          ...new Set(result.filter((id): id is string => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id))),
        ].slice(0, 36)
      : [];
  } catch {
    return [];
  }
}

/** Coverage is an engine fraction; convert it once to a human-readable percentage. */
export function coverageLabel(value: number): string {
  return Number.isFinite(value) && value >= 0 && value <= 1
    ? new FPNumber(String(value), 36).mul(new FPNumber('100')).toFixed(2)
    : '—';
}
