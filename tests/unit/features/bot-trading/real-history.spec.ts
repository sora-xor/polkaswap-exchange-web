// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { XOR, VAL } from '@/lib/substrate/sdk/assets/consts';
import { FPNumber } from '@/lib/substrate/math';
import { parseArchivedBotHistory } from '@/features/bot-trading/archive-history';
import { createPlaygroundBot } from '@/features/bot-trading/playground';
import { RESEARCH_DEFAULT_SETTINGS, runResearch, type ResearchSettings } from '@/features/bot-trading/research';
import { createResearchReplay } from '@/features/bot-trading/research-replay';
import { decimalRatio, runBacktest } from '@/features/bot-trading/engine';
import { fromCodec } from '@/features/bot-trading/amounts';
import observedFees from '../../../fixtures/bot-trading/mainnetFees20260914.json';

// The shared unit setup substitutes fake asset identifiers; integration requires canonical chain metadata.
vi.unmock('@/lib/substrate/sdk/assets/consts');
vi.unmock('@sora-substrate/sdk/build/assets/consts');

interface CapturedArchive {
  startAt: number;
  endAt: number;
  generatedAt: number;
  genesisHash: string;
  rows: Array<{ timestamp: number; denominator: string; missing?: boolean; pools: Record<string, [string, string]> }>;
}

// These are the real bundled archive and a frozen public finalized fee observation.
// No data is generated and no provider or network service is called by this suite.
const capture = JSON.parse(
  await readFile(path.resolve(__dirname, '../../../../public/bot-history/sora-mainnet-hourly-2026-03-01.json'), 'utf8')
) as CapturedArchive;
const assets = [XOR, VAL].map(({ address, symbol, decimals }) => ({ address, symbol, decimals }));
const now = Date.now();
const baseSettings: ResearchSettings = {
  ...RESEARCH_DEFAULT_SETTINGS,
  historyStartAt: capture.startAt,
  historyEndAt: capture.endAt,
  validation: 'none',
  // 100 XOR / 10% matches the observed 10 XOR fee-calibration notional.
  capital: '100',
  tradePercent: 10,
  feeBudgetXor: '10',
  networkFeeXor: observedFees.networkFeeXor,
  swapFeePercent: observedFees.swapFeePercent,
  sellNetworkFeeXor: observedFees.sellNetworkFeeXor,
  sellSwapFeePercent: observedFees.sellSwapFeePercent,
};
const bot = createPlaygroundBot(baseSettings, assets, now);
const source = {
  kind: 'historical' as const,
  history: parseArchivedBotHistory(
    capture,
    bot,
    {
      startAt: capture.startAt,
      endAt: capture.endAt,
      genesisHash: observedFees.genesisHash,
      currentDenominator: observedFees.denominator,
    },
    now
  ),
};

// This integration replays all 4,851 archived candles and three expanding folds,
// each with three exact-decimal optimizer variants. Its observed 15.6s replay
// needs a scoped 30s test budget; ordinary tests keep the global 15s deadline.
const ARCHIVE_TRAINING_TIMEOUT_MS = 30_000;

/** Use the same observed directional fees for the independent shared-engine comparison. */
const costs = {
  slippagePercent: baseSettings.slippagePercent,
  feeCodec: observedFees.networkFeeCodec,
  swapFeePercent: observedFees.swapFeePercent,
  sellFeeCodec: observedFees.sellNetworkFeeCodec,
  sellSwapFeePercent: observedFees.sellSwapFeePercent,
};

describe('real bundled March 2026 history integration', () => {
  it('starts at the first completed March 1 hour with exact archived pool-reserve prices', () => {
    expect(capture.startAt).toBe(Date.UTC(2026, 2, 1));
    expect(source.history.candles[0].timestamp).toBe(Date.UTC(2026, 2, 1, 1));
    expect(source.history.provenance?.kind).toBe('archive-pool-spot');
    expect(capture.genesisHash).toBe(observedFees.genesisHash);
    expect(capture.rows[0].denominator).toBe(observedFees.denominator);
    expect(source.history.denominationVerified).toBe(true);
    const first = capture.rows[0].pools[VAL.address];
    expect(source.history.candles[0].close).toBe(
      decimalRatio(
        new FPNumber(fromCodec(first[0], XOR.decimals), 36),
        new FPNumber(fromCodec(first[1], VAL.decimals), 36)
      ).toString()
    );
    expect(source.history.candles[0].feeClose).toBe('1');
    expect(source.history.candles.length + source.history.missing).toBe((capture.endAt - capture.startAt) / 3_600_000);
  });

  it.each(['dca', 'threshold', 'sma'] as const)(
    'replays every real %s candidate with directional fees and exact progressive accounting',
    (preset) => {
      const started = performance.now();
      const run = runResearch({ ...baseSettings, preset }, assets, source, now);
      const replayMs = performance.now() - started;
      expect(run.candidates).toHaveLength(source.history.candles.length - 1);
      expect(run.result).toEqual(runBacktest(run.bot, source.history, costs));
      for (const trade of run.candidates) {
        expect(trade.costs.networkFeeXor).toBe(
          trade.action === 'buy' ? observedFees.networkFeeXor : observedFees.sellNetworkFeeXor
        );
        expect(trade.selected).toBe(trade.checks.every((check) => check.passed));
      }
      const snapshots = createResearchReplay(run);
      expect(snapshots).toHaveLength(run.candidates.length + 1);
      expect(snapshots[0]).toMatchObject({ selectedProfit: '0', returnPercent: '0', networkFeeXor: '0' });
      expect(snapshots.at(-1)).toMatchObject({ ...run.summary, ...run.costs, returnPercent: run.result.returnPercent });
      console.info(
        'real-history-profile',
        JSON.stringify({
          preset,
          validation: 'none',
          candles: source.history.candles.length,
          trades: run.result.trades,
          replayMs: Math.round(replayMs),
        })
      );
    }
  );

  it.each(['dca', 'threshold', 'sma'] as const)(
    'trains %s using three chronological folds of the actual archive',
    (preset) => {
      const started = performance.now();
      const run = runResearch(
        { ...baseSettings, preset, validation: 'walk-forward', trainPercent: 50, folds: 3, optimize: true },
        assets,
        source,
        now
      );
      const replayMs = performance.now() - started;
      expect(run.candidates).toHaveLength(source.history.candles.length - 1);
      expect(run.validation.folds).toHaveLength(3);
      expect(run.validation.tuned).toBe(true);
      for (const fold of run.validation.folds) {
        expect(fold.searchCount).toBe(3);
        expect(fold.selectionObjective).toBe('net-training-return');
        expect(fold.trainStart).toBe(source.history.candles[0].timestamp);
        expect(fold.trainEnd).toBeLessThan(fold.testStart);
        expect(fold.testEnd).toBeLessThanOrEqual(source.history.candles.at(-1)!.timestamp);
        const trainCandles = source.history.candles.filter(
          ({ timestamp }) => timestamp >= fold.trainStart && timestamp <= fold.trainEnd
        );
        const testCandles = source.history.candles.filter(
          ({ timestamp }) => timestamp >= fold.testStart && timestamp <= fold.testEnd
        );
        expect(fold.trainEvidence).toMatchObject({
          candleCount: trainCandles.length,
          candidateCount: trainCandles.length - 1,
        });
        expect(fold.testEvidence).toMatchObject({
          candleCount: testCandles.length,
          candidateCount: testCandles.length - 1,
        });
        expect(fold.settings).toMatchObject({
          sellNetworkFeeXor: observedFees.sellNetworkFeeXor,
          sellSwapFeePercent: observedFees.sellSwapFeePercent,
        });
      }
      expect(run.validation.folds[0].testEnd).toBeLessThan(run.validation.folds[1].testStart);
      expect(run.validation.folds[1].testEnd).toBeLessThan(run.validation.folds[2].testStart);
      console.info(
        'real-history-profile',
        JSON.stringify({
          preset,
          validation: 'walk-forward',
          optimized: true,
          candles: source.history.candles.length,
          replayMs: Math.round(replayMs),
        })
      );
    },
    ARCHIVE_TRAINING_TIMEOUT_MS
  );

  it('ships a complete hourly audit trail through its declared capture cutoff', () => {
    expect(capture.rows).toHaveLength((capture.endAt - capture.startAt) / 3_600_000);
    expect(capture.rows.at(-1)?.timestamp).toBe(capture.endAt);
    for (let index = 0; index < capture.rows.length; index++) {
      expect(capture.rows[index].timestamp).toBe(capture.startAt + (index + 1) * 3_600_000);
    }
  });
});
