import type { PlaygroundSource } from '@/features/bot-trading/playground';

/**
 * Fabricated observations for unit tests only. This mocks the verified provider
 * boundary to exercise the replay engine; these prices are not market evidence
 * and this module must never be imported by production code.
 */
export function createMockHistoricalSource(now = Date.UTC(2026, 8, 14, 12)): PlaygroundSource {
  const hour = 3_600_000;
  const pattern = ['2', '3', '4', '5', '6', '5', '4', '3', '2', '1'];
  return {
    kind: 'historical',
    history: {
      candles: Array.from({ length: 361 }, (_, index) => ({
        timestamp: now - (360 - index) * hour,
        close: pattern[Math.floor(index / 4) % pattern.length],
        feeClose: '1',
      })),
      missing: 0,
      denominationVerified: true,
    },
  };
}
