import { describe, expect, it } from 'vitest';
import { selectClockCoverage } from '../../../../output/go-history/goal-archive-engineering-20260920/run-engineering-v2.mts';
import { buildGoalQualificationClockV2 } from '../../../../scripts/bots/goal-qualification-clock-builder-v2';
import { GOAL_EXACT_POLICY } from '../../../../src/features/bot-trading/goal-exact-ledger';
const START = 3600000,
  END = START + 86400000,
  DELAY = 13000;
const hash = (height: number) => '0x' + height.toString(16).padStart(64, '0');
function blocks() {
  return Array.from({ length: 1446 }, (_, i) => ({
    height: 100 + i,
    hash: hash(100 + i),
    parentHash: hash(99 + i),
    timestampMs: START + 37000 - DELAY + (i - 3) * 60000,
  }));
}
describe('v2 engineering callback coverage', () => {
  it('retains both immediate witnesses and the full day without unrelated callbacks', () => {
    const all = blocks(),
      selected = selectClockCoverage(all, START, END, DELAY);
    expect(selected).toHaveLength(1442);
    expect(selected[0]).toEqual(all[2]);
    expect(selected.at(-1)).toEqual(all[1443]);
    expect(all).toHaveLength(1446);
    const clock = buildGoalQualificationClockV2({
      episode: { startAtMs: START, endAtMs: END },
      blocks: selected,
      model: {
        kind: 'modeled-finalized-callbacks',
        model: 'fixed-nonnegative-delays-v1',
        finalityDelayMs: 12000,
        callbackDelayMs: 1000,
        processingDelayMs: 0,
        checkDurationMs: 30000,
      },
      source: {
        sourceId: 'synthetic-engineering-coverage',
        genesisHash: GOAL_EXACT_POLICY.genesisHash,
        manifestSha256: 'a'.repeat(64),
        preregistrationSha256: 'b'.repeat(64),
      },
    });
    expect(clock.checks).toHaveLength(1440);
    expect(clock.checks.at(-1)).toMatchObject({
      checkedAtMs: END - 23000,
      cancelledAtMs: END,
      plannedCompletedAtMs: END + 7000,
    });
    expect(clock.checks.at(-1)).not.toHaveProperty('completedAtMs');
  });
  it('treats exact start arrivals as in-episode and exact deadline arrivals as the successor', () => {
    const all = blocks().map((b) => ({ ...b, timestampMs: b.timestampMs - 37000 }));
    const selected = selectClockCoverage(all, START, END, DELAY);
    expect(selected[1].timestampMs + DELAY).toBe(START);
    expect(selected.at(-1)!.timestampMs + DELAY).toBe(END);
  });
  it('rejects missing predecessor/successor coverage and invalid delay instead of shortening the day', () => {
    const all = blocks();
    expect(() => selectClockCoverage(all.slice(3), START, END, DELAY)).toThrow('callback-coverage');
    expect(() => selectClockCoverage(all.slice(0, 1443), START, END, DELAY)).toThrow('callback-coverage');
    expect(() => selectClockCoverage(all, START, END, -1)).toThrow('arrival-delay');
    expect(() => selectClockCoverage(all, END, START, DELAY)).toThrow('episode');
  });
});
