import { createGoalHistoryEvidence, type AutopilotHistory } from '@/features/bot-trading/goal-history';
import type { IndexedPoolHistoryWithEvidence } from '@/features/bot-trading/pool-history';
import type { BotCandle, BotDefinition } from '@/features/bot-trading/types';

const HOUR = 3_600_000;

/** Synthetic hourly marks and block receipts only; never observations or successful real trades. */
export function goalHistoryFixture(
  bot: BotDefinition,
  studyStartAt: number,
  studyCandles: BotCandle[] = Array.from({ length: 168 }, (_, index) => ({
    timestamp: studyStartAt + (index + 1) * HOUR,
    close: '2',
    feeClose: '1',
  })),
  identity = { genesisHash: `0x${'4'.repeat(64)}`, denominator: '1' }
): { combined: IndexedPoolHistoryWithEvidence; history: AutopilotHistory } {
  const candles = [
    ...Array.from({ length: 201 }, (_, index) => ({
      timestamp: studyStartAt - (200 - index) * HOUR,
      close: studyCandles[0].close,
      feeClose: studyCandles[0].feeClose,
    })),
    ...studyCandles.map((row) => ({ ...row })),
  ];
  const combined: IndexedPoolHistoryWithEvidence = {
    history: { candles, missing: 0, denominationVerified: true, identity: { ...identity } },
    boundaries: candles.map((row, index) => ({
      kind: 'indexed-finalized-hour-boundary',
      completedAtMs: row.timestamp,
      ...identity,
      closing: {
        height: index * 600 + 1,
        hash: `0x${(index * 2 + 1).toString(16).padStart(64, '0')}`,
        timestampSeconds: row.timestamp / 1000 - 6,
      },
      successor: {
        height: index * 600 + 2,
        hash: `0x${(index * 2 + 2).toString(16).padStart(64, '0')}`,
        timestampSeconds: row.timestamp / 1000,
      },
      arrivalTimeKnown: false,
    })),
  };
  return {
    combined,
    history: {
      ...combined.history,
      candles: studyCandles.map((row) => ({ ...row })),
      goalHistory: createGoalHistoryEvidence(bot, combined, studyStartAt, studyStartAt + 168 * HOUR),
    },
  };
}
