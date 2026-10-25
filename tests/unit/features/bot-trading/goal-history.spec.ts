import { describe, expect, it, vi } from 'vitest';
import {
  assertGoalHistoryMatches,
  copyGoalHistoryEvidence,
  createGoalHistoryEvidence,
  GOAL_HISTORY_STUDY_CANDLES,
  GOAL_HISTORY_WARMUP_CANDLES,
} from '@/features/bot-trading/goal-history';
import { botFixture } from './fixtures';
import { goalHistoryFixture } from './goal-history.fixture';

vi.unmock('@polkadot/util-crypto');

const HOUR = 3_600_000,
  START = Date.UTC(2026, 8, 1);
/** Public synthetic token identifiers for the isolated history contract. */
function fixture() {
  const bot = botFixture();
  bot.assetIn = { address: `0x${'1'.repeat(64)}`, symbol: 'KUSD', decimals: 18 };
  bot.assetOut = { address: `0x${'2'.repeat(64)}`, symbol: 'XOR', decimals: 18 };
  bot.policy.feeAsset = { ...bot.assetOut };
  return { bot, ...goalHistoryFixture(bot, START) };
}

describe('retained goal history', () => {
  it('retains exactly 201 prior completed closes separately from the unchanged 168 study closes', () => {
    const { bot, history } = fixture(),
      evidence = history.goalHistory;
    expect(evidence.warmupCandles).toHaveLength(GOAL_HISTORY_WARMUP_CANDLES);
    expect(evidence.studyCandles).toHaveLength(GOAL_HISTORY_STUDY_CANDLES);
    expect(evidence.warmupCandles[0].timestamp).toBe(START - 200 * HOUR);
    expect(evidence.warmupCandles.at(-1)!.timestamp).toBe(START);
    expect(evidence.studyCandles[0].timestamp).toBe(START + HOUR);
    expect(evidence.studyCandles.at(-1)!.timestamp).toBe(START + 168 * HOUR);
    expect(evidence.commitmentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(() => assertGoalHistoryMatches(bot, history, evidence)).not.toThrow();
    const copy = copyGoalHistoryEvidence(JSON.parse(JSON.stringify(evidence)));
    expect(copy).toEqual(evidence);
    copy.warmupCandles[0].close = '99';
    expect(evidence.warmupCandles[0].close).toBe('2');
  });

  it.each([
    'missingPrefix',
    'extraPrefix',
    'missingStudy',
    'feeClose',
    'zeroPrice',
    'gap',
    'denomination',
    'genesis',
    'missingBoundary',
    'openingBoundary',
    'successor',
    'arrival',
    'backwardsBlocks',
  ])('rejects %s before creating a commitment', (field) => {
    const { bot, combined } = fixture();
    const changed = structuredClone(combined);
    if (field === 'missingPrefix') changed.history.candles.shift();
    if (field === 'extraPrefix') changed.history.candles.unshift({ ...changed.history.candles[0] });
    if (field === 'missingStudy') changed.history.candles.pop();
    if (field === 'feeClose') delete changed.history.candles[0].feeClose;
    if (field === 'zeroPrice') changed.history.candles[0].close = '0';
    if (field === 'gap') changed.history.candles[20].timestamp += HOUR;
    if (field === 'denomination') changed.history.identity!.denominator = '10';
    if (field === 'genesis') changed.history.identity!.genesisHash = `0x${'5'.repeat(64)}`;
    if (field === 'missingBoundary') (changed.boundaries as unknown[]).pop();
    if (field === 'openingBoundary')
      Object.assign(changed.boundaries[0], { completedAtMs: changed.history.candles[0].timestamp - HOUR });
    if (field === 'successor')
      Object.assign(changed.boundaries[0].successor, { height: changed.boundaries[0].closing.height + 2 });
    if (field === 'arrival') Object.assign(changed.boundaries[0], { arrivalTimeKnown: true });
    if (field === 'backwardsBlocks')
      Object.assign(changed.boundaries[2], {
        closing: changed.boundaries[0].closing,
        successor: changed.boundaries[0].successor,
      });
    expect(() => createGoalHistoryEvidence(bot, changed, START, START + 168 * HOUR)).toThrow('bots.errors.config');
  });

  it.each(['price', 'feePrice', 'asset', 'denomination', 'blockHash', 'digest', 'policy'])(
    'rejects retained %s tampering',
    (field) => {
      const { history } = fixture(),
        evidence = structuredClone(history.goalHistory);
      if (field === 'price') evidence.warmupCandles[0].close = '3';
      if (field === 'feePrice') evidence.studyCandles[0].feeClose = '3';
      if (field === 'asset') evidence.assetIn.symbol = 'OTHER';
      if (field === 'denomination') evidence.identity.denominator = '2';
      if (field === 'blockHash') Object.assign(evidence.warmupBoundaries[0].closing, { hash: `0x${'9'.repeat(64)}` });
      if (field === 'digest') evidence.commitmentSha256 = '0'.repeat(64);
      if (field === 'policy') Object.assign(evidence, { policy: 'preceding-200-completed-hours' });
      expect(() => copyGoalHistoryEvidence(evidence)).toThrow('bots.errors.config');
    }
  );

  it.each(['input', 'output', 'fee', 'identity', 'study'])('rejects a different current %s context', (field) => {
    const { bot, history } = fixture(),
      evidence = history.goalHistory;
    if (field === 'input') bot.assetIn.symbol = 'OTHER';
    if (field === 'output') bot.assetOut.decimals = 2;
    if (field === 'fee') bot.policy.feeAsset.address = `0x${'9'.repeat(64)}`;
    if (field === 'identity') history.identity!.denominator = '10';
    if (field === 'study') history.candles[0].close = '3';
    expect(() => assertGoalHistoryMatches(bot, history, evidence)).toThrow('bots.errors.config');
  });

  it('rejects accessors and sparse/cyclic arrays without executing untrusted code', () => {
    const { history } = fixture();
    const getter = vi.fn(() => '2');
    Object.defineProperty(history.goalHistory.warmupCandles[0], 'close', { get: getter });
    expect(() => copyGoalHistoryEvidence(history.goalHistory)).toThrow('bots.errors.config');
    expect(getter).not.toHaveBeenCalled();
    const sparse = fixture().history.goalHistory;
    delete sparse.warmupCandles[1];
    expect(() => copyGoalHistoryEvidence(sparse)).toThrow('bots.errors.config');
    const cyclic = fixture().history.goalHistory;
    Object.assign(cyclic, { cyclic });
    expect(() => copyGoalHistoryEvidence(cyclic)).toThrow('bots.errors.config');
  });
});
