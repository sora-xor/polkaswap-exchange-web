import { describe, it, expect } from 'vitest';
import { buildGoalQualificationClockV2 } from '../../../../scripts/bots/goal-qualification-clock-builder-v2';
import { buildGoalQualificationClockV2 as buildBrowserClock } from '@/features/bot-trading/goal-callback-builder-v2';
import { buildGoalQualificationClock } from '../../../../scripts/bots/goal-qualification-clock-builder';
import {
  verifyGoalQualificationClockV2,
  goalClockCheckCutoff,
} from '../../../../src/features/bot-trading/goal-qualification-clock-v2';
import { GOAL_EXACT_POLICY } from '../../../../src/features/bot-trading/goal-exact-ledger';
const START = 3600000,
  END = START + 86400000;
const hash = (n: number) => '0x' + n.toString(16).padStart(64, '0');
function fixture(offset = 37000) {
  return {
    episode: { startAtMs: START, endAtMs: END },
    model: {
      kind: 'modeled-finalized-callbacks' as const,
      model: 'fixed-nonnegative-delays-v1' as const,
      finalityDelayMs: 0,
      callbackDelayMs: 0,
      processingDelayMs: 0,
      checkDurationMs: 30000,
    },
    source: {
      sourceId: 'invented-v2-clock',
      genesisHash: GOAL_EXACT_POLICY.genesisHash,
      manifestSha256: 'a'.repeat(64),
      preregistrationSha256: 'b'.repeat(64),
    },
    blocks: Array.from({ length: 1442 }, (_, i) => ({
      height: 100 + i,
      hash: hash(100 + i),
      parentHash: hash(99 + i),
      timestampMs: START + offset + (i - 1) * 60000,
    })),
  };
}
describe('explicit deadline-cancelled clock v2', () => {
  // Frozen original Node builder 3acc32ac…fc2611 generated these synthetic vectors before the browser port.
  it.each([
    [
      29000,
      '921d38ee11edfaa07df61e8eb5e11da27fac56061ba3ed43da8b964bc37f3e09',
      '9e332aa89b5a047b7586863283c8c927aa13c16f00e716bc169db52464eeefbb',
    ],
    [
      30000,
      '0f42f60b2efa607b744a10665bed89118d7ea5adf92b2a5e57f38fdf14dae487',
      '822a739135f0c92f076cfcb9a49cfd453f0641a0825effd3569f113cdd243d67',
    ],
    [
      37000,
      '128ea555fb433ac49e53a675e9d0b6643097b47f74a0aa9ffa99ee90c9323da6',
      '01504d4e35239fd0607a53d9f068605b43e9fd9f80809460801860e3e434d743',
    ],
  ] as const)(
    'preserves original trace/check digests in the browser at offset %i',
    (offset, traceSha256, checksSha256) => {
      expect(buildGoalQualificationClockV2).toBe(buildBrowserClock);
      const result = buildBrowserClock(fixture(offset));
      expect(result.traceSha256).toBe(traceSha256);
      expect(result.checksSha256).toBe(checksSha256);
      expect(result.policySha256).toBe('e6cc6ff3f483751fd81cbfd1fe0dc1351727ab1d3f51895e40ff47ce81f3d120');
    }
  );
  it('retains the final started check without pretending its 30 seconds completed', () => {
    const input = fixture(),
      r = buildGoalQualificationClockV2(input);
    expect(() => buildGoalQualificationClock(input)).toThrow('deadline-crossing');
    expect(r.checks).toHaveLength(1440);
    expect(r.checks.at(-1)).toMatchObject({
      id: 1440,
      checkedAtMs: END - 23000,
      cancelledAtMs: END,
      plannedCompletedAtMs: END + 7000,
    });
    expect(r.checks.at(-1)).not.toHaveProperty('completedAtMs');
    expect(r.trace.events.slice(-2)).toEqual([
      { kind: 'deadline-cancel', checkId: 1440, atMs: END },
      { kind: 'deadline', atMs: END },
    ]);
    expect(goalClockCheckCutoff(r.checks.at(-1)!)).toBe(END);
    expect(r.trace.events.filter((e) => e.kind === 'complete')).toHaveLength(1439);
  });
  it('gives deadline cancellation priority over a modeled completion exactly at deadline', () => {
    const r = buildGoalQualificationClockV2(fixture(30000));
    expect(r.checks.at(-1)).toMatchObject({ cancelledAtMs: END, plannedCompletedAtMs: END });
  });
  it('keeps fully completed final checks when they actually finish before deadline', () => {
    const r = buildGoalQualificationClockV2(fixture(29000));
    expect(r.checks.at(-1)).toMatchObject({ completedAtMs: END - 1000 });
    expect(r.trace.events.some((e) => e.kind === 'deadline-cancel')).toBe(false);
  });
  it.each(['missing', 'wrong-id', 'early', 'late-complete', 'extra-callback'] as const)(
    'rejects %s cancellation forgery',
    (kind) => {
      const f = fixture(),
        original = buildGoalQualificationClockV2(f).trace,
        trace = { ...original, events: structuredClone([...original.events]) };
      const at = trace.events.length - 2;
      if (kind === 'missing') trace.events.splice(at, 1);
      else if (kind === 'wrong-id') trace.events[at] = { kind: 'deadline-cancel', checkId: 1439, atMs: END };
      else if (kind === 'early') trace.events[at] = { kind: 'deadline-cancel', checkId: 1440, atMs: END - 1 };
      else if (kind === 'late-complete') trace.events[at] = { kind: 'complete', checkId: 1440, atMs: END + 7000 };
      else
        trace.events.splice(at + 1, 0, {
          kind: 'callback',
          arrivedAtMs: END,
          processedAtMs: END,
          block: f.blocks.at(-1)!,
        });
      expect(() => verifyGoalQualificationClockV2(trace, f.model, f.episode)).toThrow();
    }
  );
  it('does not excuse an earlier callback gap', () => {
    const f = fixture();
    f.blocks.splice(50, 1);
    f.blocks = f.blocks.map((b, i) => ({ ...b, height: 100 + i, hash: hash(100 + i), parentHash: hash(99 + i) }));
    expect(() => buildGoalQualificationClockV2(f)).toThrow('scheduler-gap');
  });
});
