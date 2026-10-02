import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  buildGoalQualificationClock,
  GoalCallbackBuildError,
  GOAL_CALLBACK_BUILDER_POLICY,
  type GoalCallbackBuildInput,
} from '../../../../scripts/bots/goal-qualification-clock-builder';
import { GOAL_EXACT_POLICY } from '../../../../src/features/bot-trading/goal-exact-ledger';
import { verifyGoalQualificationClock } from '../../../../src/features/bot-trading/goal-qualification-clock';

const START = 3_600_000,
  END = START + 86_400_000;
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const sha = (n: number) => n.toString(16).padStart(64, '0');
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
/** Invented timestamps, not market observations. All source identities are synthetic. */
function fixture(step = 6000, offset = 0): GoalCallbackBuildInput {
  const times: number[] = [];
  for (let at = START + offset - step; at < END; at += step) times.push(at);
  times.push(times.at(-1)! + step);
  return {
    episode: { startAtMs: START, endAtMs: END },
    model: {
      kind: 'modeled-finalized-callbacks',
      model: 'fixed-nonnegative-delays-v1',
      finalityDelayMs: 0,
      callbackDelayMs: 0,
      processingDelayMs: 0,
      checkDurationMs: 3000,
    },
    source: {
      sourceId: 'invented-clock-fixture',
      genesisHash: GOAL_EXACT_POLICY.genesisHash,
      manifestSha256: sha(1),
      preregistrationSha256: sha(2),
    },
    blocks: times.map((timestampMs, i) => ({
      height: 100 + i,
      hash: hash(100 + i),
      parentHash: hash(99 + i),
      timestampMs,
    })),
  };
}
function failure(input: GoalCallbackBuildInput, reason: string) {
  try {
    buildGoalQualificationClock(input);
  } catch (error) {
    expect(error).toBeInstanceOf(GoalCallbackBuildError);
    expect((error as GoalCallbackBuildError).diagnostic.reason).toBe(reason);
    return error as GoalCallbackBuildError;
  }
  throw Error('Expected builder failure');
}

describe('offline modeled canonical callback builder', () => {
  it('retains complete boundary provenance and emits a verifier-accepted immutable trace', () => {
    const input = fixture();
    const result = buildGoalQualificationClock(input);
    expect(result.policy).toBe(GOAL_CALLBACK_BUILDER_POLICY);
    expect(result.coverage).toMatchObject({
      firstCallbackHeight: 101,
      lastCallbackHeight: 14500,
      callbackCount: 14400,
    });
    expect(result.coverage.predecessor).toEqual(input.blocks[0]);
    expect(result.coverage.successor).toEqual(input.blocks.at(-1));
    expect(result.checks).toHaveLength(1440);
    expect(result.checks[0]).toMatchObject({ id: 1, checkedAtMs: START, completedAtMs: START + 3000 });
    expect(result.trace.events.at(-1)).toEqual({ kind: 'deadline', atMs: END });
    expect(result.checks).toEqual(verifyGoalQualificationClock(result.trace, result.model, input.episode));
    expect(result.blocksSha256).toBe(digest(input.blocks));
    expect(result.traceSha256).toBe(digest(result.trace));
    expect(result.checksSha256).toBe(digest(result.checks));
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.trace.events)).toBe(true);
    expect(Object.isFrozen(result.checks[0].arrival.block)).toBe(true);
    expect(Object.isFrozen(result.source)).toBe(true);
    input.source.manifestSha256 = sha(99);
    input.blocks[1].timestampMs++;
    input.model.checkDurationMs = 1;
    expect(result.source.manifestSha256).toBe(sha(1));
    expect(result.checks[0].arrival.block.timestampMs).toBe(START);
    expect(result.model.checkDurationMs).toBe(3000);
  });

  it('models distinct finality, callback and processing delays without calling them observed', () => {
    const input = fixture();
    input.model = { ...input.model, finalityDelayMs: 100, callbackDelayMs: 200, processingDelayMs: 400 };
    const result = buildGoalQualificationClock(input);
    expect(result.checks[0]).toMatchObject({
      checkedAtMs: START + 700,
      completedAtMs: START + 3700,
      arrival: { arrivedAtMs: START + 300, processedAtMs: START + 700, block: { timestampMs: START } },
    });
    expect(result.policy.startup).toBe('block-generated-callbacks-only-no-subscription-replay');
  });

  it('shifts all later due times after an 18-second late eligible callback rather than catching up', () => {
    const input = fixture();
    const selected = input.blocks.filter((b) => ![START + 60000, START + 66000, START + 72000].includes(b.timestampMs));
    input.blocks = selected.map((b, i) => ({ ...b, height: 100 + i, hash: hash(100 + i), parentHash: hash(99 + i) }));
    const result = buildGoalQualificationClock(input);
    expect(result.checks.slice(0, 3).map((c) => c.checkedAtMs)).toEqual([START, START + 78000, START + 138000]);
    expect(result.trace.events.filter((e) => e.kind === 'callback')).toHaveLength(input.blocks.length - 2);
  });

  it('keeps busy callbacks and drains only the newest callback at the exact completion time', () => {
    const input = fixture();
    input.model.checkDurationMs = 59000;
    const result = buildGoalQualificationClock(input);
    expect(result.checks[0].completedAtMs).toBe(START + 59000);
    expect(result.checks[1].checkedAtMs).toBe(START + 60000);
    const callbacks = result.trace.events.filter((e) => e.kind === 'callback');
    expect(callbacks).toHaveLength(14400);
    expect(result.trace.events.slice(0, 12).map((e) => e.kind)).toEqual([
      'callback',
      'callback',
      'callback',
      'callback',
      'callback',
      'callback',
      'callback',
      'callback',
      'callback',
      'callback',
      'complete',
      'callback',
    ]);
  });

  it('declares completion first when it coincides with a callback arrival', () => {
    const input = fixture();
    input.model.checkDurationMs = 6000;
    const result = buildGoalQualificationClock(input);
    expect(result.trace.events.slice(0, 3).map((e) => e.kind)).toEqual(['callback', 'complete', 'callback']);
    expect(result.trace.events[1]).toEqual({ kind: 'complete', checkId: 1, atMs: START + 6000 });
  });

  it('places a completion after a callback whose processing finishes at that same instant', () => {
    const input = fixture();
    input.model.processingDelayMs = 500;
    input.model.checkDurationMs = 6000;
    const result = buildGoalQualificationClock(input);
    expect(result.trace.events.slice(0, 3).map((e) => e.kind)).toEqual(['callback', 'callback', 'complete']);
    expect(result.trace.events[1]).toMatchObject({ arrivedAtMs: START + 6000, processedAtMs: START + 6500 });
    expect(result.trace.events[2]).toEqual({ kind: 'complete', checkId: 1, atMs: START + 6500 });
  });

  it('permits exactly 60 seconds between scheduler ticks, and rejects longer gaps', () => {
    const input = fixture(60000);
    expect(buildGoalQualificationClock(input).checks).toHaveLength(1440);
    const bad = fixture(60001);
    failure(bad, 'scheduler-gap');
  });

  it.each(['missing-predecessor', 'extra-predecessor', 'missing-successor', 'extra-successor'])(
    'rejects %s instead of silently selecting a narrower window',
    (kind) => {
      const input = fixture();
      const blocks = [...input.blocks];
      if (kind === 'missing-predecessor') blocks.shift();
      if (kind === 'missing-successor') blocks.pop();
      if (kind === 'extra-predecessor')
        blocks.unshift({ height: 99, hash: hash(99), parentHash: hash(98), timestampMs: START - 12000 });
      if (kind === 'extra-successor') {
        const b = blocks.at(-1)!;
        blocks.push({
          height: b.height + 1,
          hash: hash(b.height + 1),
          parentHash: b.hash,
          timestampMs: b.timestampMs + 6000,
        });
      }
      input.blocks = blocks;
      const error = failure(input, 'missing-coverage');
      expect(error.diagnostic.blocksSha256).toBe(digest(input.blocks));
      expect(error.diagnostic.source).toEqual(input.source);
    }
  );

  it('defines boundary coverage by modeled arrival rather than by chain timestamp', () => {
    const input = fixture();
    input.model.finalityDelayMs = 6000;
    failure(input, 'missing-coverage');
    input.blocks = input.blocks.map((b) => ({ ...b, timestampMs: b.timestampMs - 6000 }));
    const result = buildGoalQualificationClock(input);
    expect(result.checks[0].arrival.arrivedAtMs).toBe(START);
    expect(result.checks[0].arrival.block.timestampMs).toBe(START - 6000);
  });

  it.each(['gap', 'parent', 'duplicate-hash', 'backward-time', 'genesis', 'forward-parent'])(
    'rejects canonical metadata contradiction: %s',
    (kind) => {
      const input = fixture();
      if (kind === 'gap') input.blocks = input.blocks.filter((_, i) => i !== 10);
      if (kind === 'parent') input.blocks[10].parentHash = hash(88);
      if (kind === 'duplicate-hash') input.blocks[10].hash = input.blocks[0].hash;
      if (kind === 'backward-time') input.blocks[10].timestampMs = input.blocks[9].timestampMs;
      if (kind === 'genesis') input.blocks[10].parentHash = GOAL_EXACT_POLICY.genesisHash;
      if (kind === 'forward-parent') input.blocks[0].parentHash = input.blocks[5].hash;
      failure(input, 'invalid-blocks');
    }
  );

  it('rejects callbacks overlapping earlier synchronous callback processing', () => {
    const input = fixture();
    input.model.processingDelayMs = 7000;
    failure(input, 'event-overlap');
  });
  it('rejects a fixed completion inside synchronous callback processing without delaying it', () => {
    const input = fixture();
    input.model.processingDelayMs = 1000;
    input.model.checkDurationMs = 5500;
    failure(input, 'event-overlap');
  });
  it('rejects an in-episode callback that processes at the deadline', () => {
    const input = fixture(6000, 5000);
    input.model.processingDelayMs = 1000;
    failure(input, 'deadline-crossing');
  });
  it('rejects a check completing at the deadline without moving the deadline or dropping the last check', () => {
    const input = fixture();
    input.model.checkDurationMs = 60000;
    failure(input, 'deadline-crossing');
  });
  it('rejects a terminal scheduler gap after the last completed check', () => {
    const input = fixture();
    const blocks = input.blocks.filter((b) => b.timestampMs < END - 70000 || b.timestampMs >= END);
    input.blocks = blocks.map((b, i) => ({ ...b, height: 100 + i, hash: hash(100 + i), parentHash: hash(99 + i) }));
    failure(input, 'scheduler-gap');
  });

  it('never invokes input getters, toJSON hooks, array accessors or block accessors', () => {
    for (const location of ['input', 'source', 'model', 'array', 'block', 'toJSON']) {
      const input = fixture(60000);
      const getter = vi.fn();
      if (location === 'input') Object.defineProperty(input, 'episode', { get: getter });
      if (location === 'source') Object.defineProperty(input.source, 'manifestSha256', { get: getter });
      if (location === 'model') Object.defineProperty(input.model, 'checkDurationMs', { get: getter });
      if (location === 'array') Object.defineProperty(input.blocks, 2, { get: getter });
      if (location === 'block') Object.defineProperty(input.blocks[2], 'hash', { get: getter });
      if (location === 'toJSON') Object.assign(input.blocks[2], { toJSON: getter });
      expect(() => buildGoalQualificationClock(input)).toThrow(GoalCallbackBuildError);
      expect(getter).not.toHaveBeenCalled();
    }
  });
  it('rejects sparse and extended arrays without treating them as complete evidence', () => {
    const sparse = fixture();
    delete (sparse.blocks as unknown[])[3];
    failure(sparse, 'invalid-blocks');
    const extra = fixture();
    Object.assign(extra.blocks, { hidden: true });
    failure(extra, 'invalid-blocks');
  });
  it.each([0, -1, 60001, NaN, Infinity, 0.5])('rejects unsupported duration %s', (duration) => {
    const input = fixture(60000);
    input.model.checkDurationMs = duration;
    failure(input, 'unsupported-model');
  });
  it('rejects an observed model or delay totals outside the existing declared profile', () => {
    const input = fixture(60000);
    input.model = { kind: 'observed-finalized-callbacks', recorderSha256: sha(1) } as unknown as typeof input.model;
    failure(input, 'unsupported-model');
    const other = fixture(60000);
    other.model.finalityDelayMs = 60000;
    other.model.callbackDelayMs = 1;
    failure(other, 'unsupported-model');
  });
  it('rejects unsafe time arithmetic, non-24h episodes and wrong source identity', () => {
    const unsafe = fixture();
    unsafe.blocks[1].timestampMs = Number.MAX_SAFE_INTEGER;
    unsafe.model.callbackDelayMs = 1;
    failure(unsafe, 'invalid-blocks');
    const wrong = fixture();
    wrong.episode.endAtMs++;
    failure(wrong, 'invalid-input');
    const foreign = fixture();
    foreign.source.genesisHash = hash(1);
    failure(foreign, 'invalid-source');
  });
  it('bounds both source rows and generated events', () => {
    const tooMany = fixture();
    tooMany.blocks = Array(30003).fill(tooMany.blocks[0]);
    failure(tooMany, 'invalid-blocks');
    const dense = fixture(3000); // 28,800 callbacks plus 1,440 completions and deadline exceed 30,000 events.
    dense.model.checkDurationMs = 1000;
    failure(dense, 'event-limit');
  });
  it('keeps failure provenance detached and immutable', () => {
    const input = fixture(60001);
    const error = failure(input, 'scheduler-gap');
    const prior = copy(error.diagnostic);
    input.source.sourceId = 'changed';
    input.blocks[0].timestampMs++;
    expect(error.diagnostic).toEqual(prior);
    expect(Object.isFrozen(error.diagnostic)).toBe(true);
    expect(Object.isFrozen(error.diagnostic.source)).toBe(true);
  });
});
