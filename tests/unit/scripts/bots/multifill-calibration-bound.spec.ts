import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  assessMultifillCalibration,
  assessMultifillEpisode,
  assessRegisteredMultifillCalibration,
  CALIBRATION_DATA_SHA256,
  createMultifillRegistrationBody,
  DAILY_EPISODES,
  DATED_FEE_CODEC,
  FIRST_CLOSE,
  HOUR,
  LAST_CLOSE,
  rationalJson,
  UNIT,
  verifyMultifillRegistration,
} from '../../../../scripts/bots/multifill-calibration-bound.mjs';

type Ratio = { numerator: string; denominator: string; decimal?: string };
type Mark = { completedAt: number; base: bigint; target: bigint };
type Exact = [bigint, bigint];
const sha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
const compare = (a: Exact, b: Exact) => a[0] * b[1] - b[0] * a[1];
const exact = (value: Ratio): Exact => [BigInt(value.numerator), BigInt(value.denominator)];
const mark = (index: number, base = 1n, target = 1n): Mark => ({
  completedAt: FIRST_CLOSE + index * HOUR,
  base,
  target,
});
const marksFor = (rates: Exact[]) => rates.map(([base, target], index) => mark(index, base, target));
const smallEconomics = { allocationKusdCodec: '10', feeReserveXorCodec: '5', feeCodec: '1', maxFills: 4 };

/** Independent exhaustive path enumerator: no pruning, no state merging, no production arithmetic helpers. */
function exhaustive(marks: Mark[], allocation: bigint, reserve: bigint, fee: bigint, maxFills: number): Exact {
  let best: Exact = [-1n, 1n];
  const visit = (index: number, inXor: boolean, amount: Exact, fills: number) => {
    if (index === marks.length) {
      const last = marks.at(-1)!;
      const [n, d] = inXor ? amount : [amount[0] * last.base, amount[1] * last.target];
      const terminal: Exact = [n + (reserve - BigInt(fills) * fee) * d, d];
      if (compare(terminal, best) > 0n) best = terminal;
      return;
    }
    visit(index + 1, inXor, amount, fills);
    if (fills < maxFills && BigInt(fills + 1) * fee <= reserve) {
      const rate = marks[index];
      const converted: Exact = inXor
        ? [amount[0] * rate.target, amount[1] * rate.base]
        : [amount[0] * rate.base, amount[1] * rate.target];
      visit(index + 1, !inXor, converted, fills + 1);
    }
  };
  visit(1, false, [allocation, 1n], 0);
  return best;
}

describe('offline noncausal multi-fill calibration bound', () => {
  it('matches independently enumerated full-switch paths on every short ternary-price series', () => {
    for (let encoded = 0; encoded < 81; encoded++) {
      let value = encoded;
      const rates: Exact[] = [[2n, 3n]];
      for (let hour = 0; hour < 4; hour++) {
        rates.push([BigInt((value % 3) + 1), 2n]);
        value = Math.floor(value / 3);
      }
      const marks = marksFor(rates);
      for (const fee of [0n, 1n, 3n]) {
        const actual = assessMultifillEpisode(marks, { ...smallEconomics, feeCodec: fee.toString() });
        expect(compare(exact(actual.best.finalXorCodec), exhaustive(marks, 10n, 5n, fee, 4))).toBe(0n);
      }
    }
  });

  it('dominates partial-hold mixtures globally and never labels exactly-k states as partial-strategy bounds', () => {
    const marks = marksFor([
      [1n, 1n],
      [2n, 1n],
      [3n, 1n],
    ]);
    const result = assessMultifillEpisode(marks, { ...smallEconomics, maxFills: 2 });
    // Each positive mixture makes two partial buys: x at mark 1, 10-x at mark 2.
    for (let first = 1n; first < 10n; first++) {
      const partialFinal: Exact = [first * 2n + (10n - first) * 3n + 3n, 1n];
      expect(compare(exact(result.best.finalXorCodec), partialFinal)).toBeGreaterThanOrEqual(0n);
    }
    const exactlyTwo = result.frontier.find((candidate: { fills: number }) => candidate.fills === 2)!;
    const halfThenHalf: Exact = [28n, 1n]; // 5*2 + 5*3 + (5 reserve - 2 fees).
    expect(compare(exact(exactlyTwo.finalXorCodec), halfThenHalf)).toBeLessThan(0n);
    expect(compare(exact(result.best.finalXorCodec), halfThenHalf)).toBeGreaterThan(0n);
    expect(result.frontierMeaning).toContain('not bounds on exactly-k partial strategies');
  });

  it('keeps the remaining fee reserve untradeable even when switching would magnify it', () => {
    const result = assessMultifillEpisode(
      marksFor([
        [1n, 1n],
        [3n, 1n],
        [1n, 1n],
      ]),
      smallEconomics
    );
    expect(result.best.fills).toBe(1);
    expect(exact(result.best.tradableCapitalCodec)).toEqual([30n, 1n]);
    expect(result.best.remainingReserveXorCodec).toBe('4');
    expect(exact(result.best.finalXorCodec)).toEqual([34n, 1n]);
    for (const state of result.frontier) {
      expect(BigInt(state.remainingReserveXorCodec)).toBe(5n - BigInt(state.fills));
    }
  });

  it('cannot act at funding mark zero or chain multiple conversions at one completed hour', () => {
    const noOpeningTrade = assessMultifillEpisode(
      marksFor([
        [100n, 1n],
        [1n, 1n],
      ]),
      smallEconomics
    );
    expect(noOpeningTrade.best.fills).toBe(0);
    expect(exact(noOpeningTrade.best.finalXorCodec)).toEqual([15n, 1n]);
    const result = assessMultifillEpisode(
      marksFor([
        [1n, 1n],
        [3n, 1n],
        [1n, 1n],
      ]),
      { ...smallEconomics, maxFills: 9 }
    );
    expect(Math.max(...result.frontier.map((state: { fills: number }) => state.fills))).toBe(2);
    for (const state of result.frontier) {
      const indices = state.actions.map((action: { markIndex: number }) => action.markIndex);
      expect(new Set(indices).size).toBe(state.fills);
      expect(
        indices.every((index: number, position: number) => index >= 1 && (!position || index > indices[position - 1]))
      ).toBe(true);
    }
  });

  it('includes idle and is monotone in fee and fee budget without capitalizing reserve funds', () => {
    const marks = marksFor([
      [1n, 1n],
      [4n, 3n],
      [1n, 3n],
      [2n, 1n],
      [1n, 1n],
    ]);
    let previousFeeResult: Exact | undefined;
    for (const fee of ['0', '1', '2', '5', '6']) {
      const result = assessMultifillEpisode(marks, { ...smallEconomics, feeCodec: fee });
      const current = exact(result.best.finalXorCodec);
      if (previousFeeResult) expect(compare(current, previousFeeResult)).toBeLessThanOrEqual(0n);
      expect(compare(current, exact(result.idleFinalXorCodec))).toBeGreaterThanOrEqual(0n);
      previousFeeResult = current;
    }
    let previousBudgetResult: Exact | undefined;
    for (const budget of ['0', '1', '2', '3', '4', '5']) {
      const result = assessMultifillEpisode(marks, { ...smallEconomics, feeBudgetCodec: budget });
      const current = exact(result.best.finalXorCodec);
      if (previousBudgetResult) expect(compare(current, previousBudgetResult)).toBeGreaterThanOrEqual(0n);
      previousBudgetResult = current;
    }
    const flat = assessMultifillEpisode(
      marksFor([
        [1n, 1n],
        [1n, 1n],
        [1n, 1n],
      ]),
      smallEconomics
    );
    expect(flat.best.fills).toBe(0);
    expect(flat.best.actions).toEqual([]);
  });

  it('preserves exact rational capital and signed displays truncate only for presentation', () => {
    const result = assessMultifillEpisode(
      marksFor([
        [1n, 1n],
        [1n, 3n],
        [1n, 7n],
      ]),
      {
        ...smallEconomics,
        allocationKusdCodec: '1',
        feeCodec: '0',
      }
    );
    expect(exact(result.best.tradableCapitalCodec)).toEqual([1n, 3n]);
    expect(exact(result.best.finalXorCodec)).toEqual([16n, 3n]);
    expect(rationalJson(-1n, 3n, 6)).toEqual({ numerator: '-1', denominator: '3', decimal: '-0.333333' });
    expect(rationalJson(-2n, 4n, 0)).toEqual({ numerator: '-1', denominator: '2', decimal: '-0' });
    expect(rationalJson(2n, 6n, 3)).toEqual({ numerator: '1', denominator: '3', decimal: '0.333' });
    expect(rationalJson(0n, 9n, 2)).toEqual({ numerator: '0', denominator: '1', decimal: '0.00' });
    expect(() => rationalJson(1n, 0n)).toThrow('fraction');
  });

  it('splits exactly 673 marks into 28 independent daily allocations with shared endpoints and exact means', () => {
    const marks = Array.from({ length: 673 }, (_, index) => mark(index));
    marks[1] = mark(1, 3n);
    const result = assessMultifillCalibration(marks);
    expect(result.episodeCount).toBe(DAILY_EPISODES);
    expect(result.episodes).toHaveLength(28);
    expect(result.episodes[0].episodeEnd).toBe(result.episodes[1].episodeStart);
    expect(result.episodes[1].openingXorCodec.numerator).toBe((11n * UNIT).toString());
    expect(result.episodes[1].best.fills).toBe(0);
    expect(result.episodes[1].best.remainingReserveXorCodec).toBe(UNIT.toString());
    expect(result.episodes.at(-1)!.episodeEnd).toBe(new Date(LAST_CLOSE * 1000).toISOString());
    const gainCodec = 20n * UNIT - BigInt(DATED_FEE_CODEC);
    expect(compare(exact(result.means.netXor), [gainCodec, UNIT * 28n])).toBe(0n);
    expect(compare(exact(result.means.netReturnPercent), [gainCodec * 100n, 11n * UNIT * 28n])).toBe(0n);
    expect(result.means.excessIdleXor).toEqual(result.means.netXor);
    expect(result.means.excessIdlePercent).toEqual(result.means.netReturnPercent);
    expect(result.executable).toBe(false);
    expect(result.qualificationAllowed).toBe(false);
    expect(result.targetGainUsedAsGate).toBe(false);
  });

  it('caps production fees at nine and rejects malformed or shifted saved-calibration windows', () => {
    const marks = Array.from({ length: 673 }, (_, index) => mark(index, index % 2 ? 100n : 1n));
    const result = assessMultifillCalibration(marks);
    expect(result.episodes[0].best.fills).toBe(9);
    expect(result.episodes.every((episode: { best: { fills: number } }) => episode.best.fills <= 9)).toBe(true);
    expect(result.episodes[0].best.remainingReserveXorCodec).toBe((UNIT - 9n * BigInt(DATED_FEE_CODEC)).toString());
    expect(() => assessMultifillCalibration(marks.slice(1))).toThrow('marks-length');
    expect(() =>
      assessMultifillCalibration(marks.map((entry) => ({ ...entry, completedAt: entry.completedAt + HOUR })))
    ).toThrow('calibration-window');
    const gap = [...marks];
    gap[1] = { ...gap[1], completedAt: gap[1].completedAt + 1 };
    expect(() => assessMultifillCalibration(gap)).toThrow('mark-gap');
    expect(() => assessMultifillEpisode(marks.slice(0, 26))).toThrow('episode-length');
    for (const invalid of [null, undefined, {}, 'marks']) {
      expect(() => assessMultifillEpisode(invalid)).toThrow('marks-length');
    }
    expect(() => assessMultifillEpisode(marks.slice(0, 2), { maxFills: 10 })).toThrow('fill-cap');
    expect(() => assessMultifillEpisode(marks.slice(0, 2), { feeBudgetCodec: (UNIT + 1n).toString() })).toThrow(
      'economics'
    );
    expect(() => assessMultifillEpisode([{ ...mark(0), base: 0n }, mark(1)])).toThrow('mark-ratio');
  });

  it('binds the new analyzer, tests, old reader, protocol, exact saved-data hash and access without reading data', () => {
    const sources = {
      analyzer: Buffer.from('new DP'),
      tests: Buffer.from('synthetic tests'),
      reader: Buffer.from('old fixed reader'),
      protocol: Buffer.from('sealed protocol'),
    };
    const body = createMultifillRegistrationBody(
      'tc1-multifill-synthetic-test-v1',
      '2026-09-25T05:00:00.000Z',
      sources
    );
    const seal = (value: typeof body) => ({
      kind: 'tc1-multifill-calibration-registration-v1',
      body: value,
      sha256: sha(JSON.stringify(value)),
    });
    const registration = seal(body);
    expect(verifyMultifillRegistration(registration, sources)).toEqual(body);
    expect(body.sourceHashes.calibrationObservationsSha256).toBe(CALIBRATION_DATA_SHA256);
    for (const key of ['analyzer', 'tests', 'reader', 'protocol'] as const) {
      expect(() => verifyMultifillRegistration(registration, { ...sources, [key]: Buffer.from('changed') })).toThrow(
        'registration-binding'
      );
    }
    expect(() => verifyMultifillRegistration({ ...registration, sha256: '0'.repeat(64) }, sources)).toThrow(
      'registration-digest'
    );
    const changedAccess = structuredClone(body);
    changedAccess.access.holdoutAllowed = true;
    expect(() => verifyMultifillRegistration(seal(changedAccess), sources)).toThrow('registration-binding');
    const changedFee = structuredClone(body);
    changedFee.economics.datedNetworkFeeCodec = '1';
    expect(() => verifyMultifillRegistration(seal(changedFee), sources)).toThrow('registration-binding');
    const changedData = structuredClone(body);
    changedData.sourceHashes.calibrationObservationsSha256 = '0'.repeat(64);
    expect(() => verifyMultifillRegistration(seal(changedData), sources)).toThrow('registration-binding');
    expect(() =>
      assessRegisteredMultifillCalibration(registration, sources, Buffer.from('{not observed data}'))
    ).toThrow('observations-digest');
  });
});
