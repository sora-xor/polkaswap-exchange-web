import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  reportCausalGoalCalibration,
  formatCausalCalibrationReport,
} from '../../../../scripts/bots/report-causal-goal-calibration';

const START = Date.parse('2026-06-30T19:00:00.000Z'),
  HOUR = 3600000,
  DAY = HOUR * 24,
  UNIT = 10n ** 18n;
const CANDIDATES = ['momentum-breakout', 'rebound-from-discount', 'trend-pullback-accumulation'];
const directories: string[] = [];
afterEach(async () => {
  for (const path of directories.splice(0)) await rm(path, { recursive: true, force: true });
});
const canonical = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
          .join(',')}}`
      : JSON.stringify(value);
const digest = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
const ratio = (value: bigint) => ({ numerator: String(value), denominator: '1' });
interface FixtureEvent {
  kind: string;
  atMs: number;
  reason?: string;
  signalIndex?: number;
  pending?: { signalIndex: number; decidedAtMs: number; targetExecutionAtMs: number };
}
function decimal(n: bigint, d: bigint): string {
  const unit = 10n ** 36n,
    raw = (n * unit) / d,
    magnitude = raw < 0n ? -raw : raw;
  const tail = String(magnitude % unit)
    .padStart(36, '0')
    .replace(/0+$/, '');
  return `${raw < 0n ? '-' : ''}${magnitude / unit}${tail ? `.${tail}` : ''}`;
}
function fixtureResult(ordinal: number, candidate: string) {
  const start = START + ordinal * DAY,
    initial = 100n * UNIT,
    delta = (BigInt(ordinal - 14) * UNIT) / 100n,
    final = initial + delta;
  const equity = (accountingAtMs: number, observedAtMs: number, value = initial) => ({
    accountingAtMs,
    observedAtMs,
    value: ratio(value),
    idleValue: ratio(initial),
  });
  const hourly = Array.from({ length: 25 }, (_, index) =>
    equity(start + index * HOUR, start + index * HOUR - 6000, index === 24 ? final : initial)
  );
  const control = [equity(start, start - 6000)];
  for (let index = 0; index < 24; index++) {
    control.push(equity(start + index * HOUR, start + index * HOUR));
    if (index === 1) control.push(equity(start + HOUR, start + HOUR));
  }
  return {
    protocol: 'causal-goal-calibration-v1',
    candidate,
    status: 'complete',
    diagnostics: [] as string[],
    hourlyEquity: hourly,
    controlEquity: control,
    bot: { portfolio: { trades: 1, feesPaidCodec: '100000000000000001' } },
    outcome: 'expired',
    stoppedAtMs: start + DAY,
    signalsConsumed: 24,
    quoteRequests: 1,
    events: [
      { kind: 'scenario-fill', atMs: start + HOUR },
      { kind: 'rejected', atMs: start + 2 * HOUR, reason: 'impact' },
      { kind: 'cancelled', atMs: start + 23 * HOUR, reason: 'deadline' },
      { kind: 'terminal', atMs: start + DAY, reason: 'expired' },
    ] as FixtureEvent[],
    summary: {
      initialValue: ratio(initial),
      finalValue: ratio(final),
      heldFinalValue: ratio(initial),
      netXor: decimal(delta, UNIT),
      returnPercent: decimal(delta * 100n, initial),
      excessReturnPercent: decimal(delta * 100n, initial),
      fills: 1,
      retrospectiveDrawdownPercent: decimal(delta < 0n ? -delta * 100n : 0n, initial),
      controlDrawdownPercent: '0',
    },
    observedFill: false,
    transactionSubmitted: false,
    qualificationAuthority: false,
  };
}
async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'causal-report-test-'));
  directories.push(directory);
  const body = {
    kind: 'causal-goal-calibration-registration-v1',
    scope: {
      startAtMs: START,
      endAtMs: START + 28 * DAY,
      episodes: 28,
      hours: 24,
      warmupStartAtMs: START - 13 * HOUR,
      warmupEndAtMs: START - HOUR,
    },
    calibration: { sha256: '2180d4381ebacd0ea14d22adcb9e81e76924928baf273eb7049adbeac1274653' },
    candidates: Object.fromEntries(CANDIDATES.map((name) => [name, {}])),
    access: { calibrationOnly: true, untouchedValidation: false, financialActions: false },
  };
  const registration = { body, sha256: digest(body) };
  const results = Array.from({ length: 28 }, (_, ordinal) =>
    CANDIDATES.map((candidate) => fixtureResult(ordinal, candidate))
  );
  const write = async (name: string, value: unknown) => {
    const path = join(directory, name);
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, JSON.stringify(value));
  };
  const seal = async () => {
    await write('registration.json', registration);
    await write('acquisition-started.json', { registrationSha256: registration.sha256, restartAllowed: false });
    for (const [ordinal, row] of results.entries())
      for (const result of row) await write(`episodes/${ordinal}/${result.candidate}.json`, result);
    await write('first-episode-complete.json', {
      ordinal: 0,
      candidates: CANDIDATES,
      resultsSha256: digest(results[0]),
    });
    await write('complete.json', {
      registrationSha256: registration.sha256,
      episodes: 28,
      candidates: CANDIDATES,
      resultsSha256: digest(results),
      observedFill: false,
      transactionSubmitted: false,
      qualificationAuthority: false,
    });
  };
  await seal();
  return { directory, write, seal, results, registration };
}

/** A gap fixture retains one fill, one expired order, and one stale signal per independent episode. */
async function gapFixture() {
  const data = await fixture();
  data.registration.body.kind = 'causal-gap-calibration-registration-v1';
  data.registration.sha256 = digest(data.registration.body);
  for (const [ordinal, row] of data.results.entries())
    for (const result of row) {
      const start = START + ordinal * DAY;
      result.protocol = 'causal-goal-calibration-gap-v1';
      result.hourlyEquity[3].observedAtMs = start + 3 * HOUR - 12001;
      result.controlEquity[4].observedAtMs += 12001;
      result.controlEquity[4].accountingAtMs += 12001;
      const controls = result.controlEquity.slice(1).filter((_, i) => i !== 2);
      const pending = (index: number) => ({
        signalIndex: index,
        decidedAtMs: controls[index].observedAtMs + 12000,
        targetExecutionAtMs: start + (index + 1) * HOUR,
      });
      result.events = [];
      for (let i = 0; i < 24; i++) {
        const at = controls[i].observedAtMs;
        if (i === 2)
          result.events.push({
            kind: 'cancelled',
            atMs: start + 2 * HOUR + 12000,
            signalIndex: 1,
            pending: pending(1),
            reason: 'execution-window-expired',
          });
        result.events.push({ kind: 'risk', atMs: at, reason: 'active' });
        if (i === 1)
          result.events.push(
            { kind: 'scenario-fill', atMs: at, signalIndex: 0, pending: pending(0) },
            { kind: 'risk', atMs: at, reason: 'active' }
          );
        result.events.push({
          kind: 'signal',
          atMs: at + 12000,
          signalIndex: i,
          reason: i === 3 ? 'stale-closing-state' : 'rules',
        });
        if (i === 23) result.events.push({ kind: 'cancelled', atMs: at + 12000, signalIndex: i, reason: 'deadline' });
      }
      result.events.push({ kind: 'terminal', atMs: start + DAY, reason: 'expired' });
      Object.assign(result, {
        timing: {
          closingStateTimestampsMs: result.hourlyEquity.map((item) => item.observedAtMs),
          closingStateAgesMs: result.hourlyEquity.map((item) => item.accountingAtMs - item.observedAtMs),
          potentialExecutionLagsMs: controls.slice(1).map((item, i) => item.observedAtMs - start - (i + 1) * HOUR),
          timelyClosingStates: 24,
          timelyPotentialExecutions: 22,
          staleSignalHourCount: 1,
          staleSignalSkipCount: 1,
          pendingLateCancelCount: 1,
        },
      });
    }
  await data.seal();
  return data;
}

describe('causal calibration artifact report', () => {
  it('reports gap accounting independently of timely windows, stale skips and expired pending orders', async () => {
    const data = await gapFixture();
    const report = await reportCausalGoalCalibration(data.directory);
    expect(report.status).toBe('complete');
    expect(report.timingMode).toBe('gap');
    expect(report.candidates?.[0].timing).toEqual({
      closingStates: 700,
      timelyClosingStates: 672,
      potentialExecutions: 644,
      timelyPotentialExecutions: 616,
      staleSignalHours: 28,
      staleSignalSkips: 28,
      pendingLateCancellations: 28,
    });
    expect(report.candidates?.[0].totalFills).toBe(28);
    expect(report.candidates?.[0].cancellations).toEqual({ 'execution-window-expired': 28, deadline: 28 });
    expect(formatCausalCalibrationReport(report)).toContain('616/644 timely potential execution windows');
    expect(report.limitations.join(' ')).toContain('not uninterrupted tradability');
  });

  it('rejects protocol substitution rather than treating the strict run as gap-aware', async () => {
    const data = await gapFixture();
    data.results[0][0].protocol = 'causal-goal-calibration-v1';
    await data.seal();
    expect((await reportCausalGoalCalibration(data.directory)).status).toBe('incomplete');
    data.results[0][0].protocol = 'causal-goal-calibration-gap-v1';
    data.registration.body.kind = 'causal-goal-calibration-registration-v1';
    data.registration.sha256 = digest(data.registration.body);
    await data.seal();
    expect((await reportCausalGoalCalibration(data.directory)).coverage.invalid).toBe(84);
  });

  it('rejects rehashed false timing counts and stale signals relabeled as evaluated', async () => {
    const data = await gapFixture(),
      result = data.results[0][0];
    const timing = (result as typeof result & { timing: { timelyPotentialExecutions: number } }).timing;
    timing.timelyPotentialExecutions = 23;
    await data.seal();
    expect((await reportCausalGoalCalibration(data.directory)).candidates).toBeUndefined();
    timing.timelyPotentialExecutions = 22;
    result.events.find((item) => item.kind === 'signal' && item.signalIndex === 3)!.reason = 'rules';
    await data.seal();
    expect((await reportCausalGoalCalibration(data.directory)).status).toBe('incomplete');
  });

  it('rejects expiry after the control, at the eligible tie, or attributed to another signal', async () => {
    const data = await gapFixture(),
      result = data.results[0][0];
    const event = result.events.find((item) => item.reason === 'execution-window-expired')!;
    event.atMs++;
    await data.seal();
    expect((await reportCausalGoalCalibration(data.directory)).status).toBe('incomplete');
    event.atMs--;
    event.pending!.targetExecutionAtMs += HOUR;
    await data.seal();
    expect((await reportCausalGoalCalibration(data.directory)).status).toBe('incomplete');
    event.pending!.targetExecutionAtMs -= HOUR;
    result.controlEquity[4].observedAtMs--;
    result.controlEquity[4].accountingAtMs--;
    const signal = result.events.find((item) => item.kind === 'signal' && item.signalIndex === 2)!;
    signal.atMs--;
    const timing = (
      result as typeof result & { timing: { potentialExecutionLagsMs: number[]; timelyPotentialExecutions: number } }
    ).timing;
    timing.potentialExecutionLagsMs[1]--;
    timing.timelyPotentialExecutions++;
    await data.seal();
    expect((await reportCausalGoalCalibration(data.directory)).status).toBe('incomplete');
  });

  it('rejects hypothetical fills after the unchanged 12-second admission limit', async () => {
    const data = await gapFixture(),
      result = data.results[0][0];
    for (const row of result.controlEquity.slice(2, 4)) {
      row.accountingAtMs += 12001;
      row.observedAtMs += 12001;
    }
    result.events.find((item) => item.kind === 'scenario-fill')!.atMs += 12001;
    await data.seal();
    const report = await reportCausalGoalCalibration(data.directory);
    expect(report.status).toBe('incomplete');
    expect(report.candidates).toBeUndefined();
  });

  it('rejects candidate-specific native timestamps even when timing counts and all digests agree', async () => {
    const data = await gapFixture(),
      result = data.results[0][0];
    result.hourlyEquity[3].observedAtMs--;
    const timing = (
      result as typeof result & { timing: { closingStateTimestampsMs: number[]; closingStateAgesMs: number[] } }
    ).timing;
    timing.closingStateTimestampsMs[3]--;
    timing.closingStateAgesMs[3]++;
    await data.seal();
    const report = await reportCausalGoalCalibration(data.directory);
    expect(report.coverage.complete).toBe(84);
    expect(report.status).toBe('incomplete');
    expect(report.diagnostics).toContain('candidate-shared-evidence-mismatch');
    expect(report.candidates).toBeUndefined();
  });

  it('rejects candidate-specific unchanged-holdings values that fabricate positive excess', async () => {
    const data = await gapFixture(),
      result = data.results[0][0];
    result.hourlyEquity[24].idleValue = ratio(99n * UNIT);
    result.summary.heldFinalValue = ratio(99n * UNIT);
    result.summary.excessReturnPercent = '0.86';
    await data.seal();
    const report = await reportCausalGoalCalibration(data.directory);
    expect(report.coverage.complete).toBe(84);
    expect(report.diagnostics).toContain('candidate-shared-evidence-mismatch');
    expect(report.candidates).toBeUndefined();
  });

  it('rejects an opening baseline disconnected from its closing state and overlapping hour brackets', async () => {
    const data = await gapFixture(),
      result = data.results[0][0];
    result.controlEquity[0].observedAtMs--;
    await data.seal();
    expect((await reportCausalGoalCalibration(data.directory)).status).toBe('incomplete');
    result.controlEquity[0].observedAtMs++;
    const at = START + 3 * HOUR - 12001;
    result.controlEquity[4].observedAtMs = at;
    result.controlEquity[4].accountingAtMs = at;
    result.events.find((item) => item.kind === 'risk' && item.atMs === START + 2 * HOUR + 12001)!.atMs = at;
    result.events.find((item) => item.kind === 'signal' && item.signalIndex === 2)!.atMs = at + 12000;
    const timing = (result as typeof result & { timing: { potentialExecutionLagsMs: number[] } }).timing;
    timing.potentialExecutionLagsMs[1] = HOUR - 12001;
    await data.seal();
    expect((await reportCausalGoalCalibration(data.directory)).status).toBe('incomplete');
  });

  it('reports all 84 independent episodes using exact signed ratios, fee sums, medians and separate drawdowns', async () => {
    const { directory } = await fixture();
    const report = await reportCausalGoalCalibration(directory);
    expect(report.status).toBe('complete');
    expect(report.coverage).toEqual({ expected: 84, present: 84, complete: 84, incomplete: 0, missing: 0, invalid: 0 });
    expect(report.candidates?.map((row) => row.candidate)).toEqual(CANDIDATES);
    for (const item of report.candidates!) {
      expect(item.meanReturnPercent).toEqual({ numerator: '-1', denominator: '200', decimal: '-0.005' });
      expect(item.medianReturnPercent).toEqual(item.meanReturnPercent);
      expect(item.meanExcessReturnPercent).toEqual(item.meanReturnPercent);
      expect(item.medianExcessReturnPercent).toEqual(item.meanReturnPercent);
      expect(item.positiveExcessEpisodes).toBe(13);
      expect(item.tradedEpisodes).toBe(28);
      expect(item.totalFills).toBe(28);
      expect(item.totalFeesPaidCodec).toBe('2800000000000000028');
      expect(item.totalFeesPaidXor).toBe('2.800000000000000028');
      expect(item.maximumControlDrawdownPercent.decimal).toBe('0');
      expect(item.maximumRetrospectiveDrawdownPercent.decimal).toBe('0.14');
      expect(item.rejections).toEqual({ impact: 28 });
      expect(item.cancellations).toEqual({ deadline: 28 });
      expect(item.outcomes).toEqual({ expired: 28 });
    }
    expect(formatCausalCalibrationReport(report)).toContain('independently funded');
    expect(report.qualificationAuthority).toBe(false);
  });

  it('retains failure and incomplete-prefix diagnostics without producing any aggregate', async () => {
    const { directory, write, results, registration } = await fixture();
    await rm(join(directory, 'complete.json'));
    for (let ordinal = 4; ordinal < 28; ordinal++)
      await rm(join(directory, `episodes/${ordinal}`), { recursive: true });
    await write('episodes/4/momentum-breakout.json', {
      ...results[4][0],
      status: 'incomplete',
      diagnostics: ['Causal calibration: boundary-proof'],
      summary: undefined,
    });
    await write('failed.json', {
      registrationSha256: registration.sha256,
      reason: 'causal-acquisition:episode-incomplete',
      observedFill: false,
    });
    const report = await reportCausalGoalCalibration(directory);
    expect(report.status).toBe('incomplete');
    expect(report.candidates).toBeUndefined();
    expect(report.coverage).toEqual({
      expected: 84,
      present: 13,
      complete: 12,
      incomplete: 1,
      missing: 71,
      invalid: 0,
    });
    expect(report.incompleteEpisodes?.[0].diagnostics).toEqual(['Causal calibration: boundary-proof']);
    expect(report.retainedFailure?.reason).toBe('causal-acquisition:episode-incomplete');
    expect(formatCausalCalibrationReport(report)).toContain('No aggregate candidate statistics');
  });

  it('rejects registration, complete-result and first-episode digest tampering', async () => {
    const data = await fixture();
    data.registration.body.scope.hours = 25;
    await data.write('registration.json', data.registration);
    expect((await reportCausalGoalCalibration(data.directory)).diagnostics).toContain('registration-digest');
    data.registration.body.scope.hours = 24;
    await data.seal();
    await data.write('episodes/0/momentum-breakout.json', { ...data.results[0][0], quoteRequests: 2 });
    expect((await reportCausalGoalCalibration(data.directory)).diagnostics).toContain(
      'complete-result-digest-or-coverage'
    );
    await data.seal();
    await data.write('first-episode-complete.json', {
      ordinal: 0,
      candidates: CANDIDATES,
      resultsSha256: '0'.repeat(64),
    });
    const report = await reportCausalGoalCalibration(data.directory);
    expect(report.diagnostics).toContain('first-episode-digest');
    expect(report.candidates).toBeUndefined();
  });

  it('rejects date, candidate, summary and fill-count substitutions even when digests are recomputed', async () => {
    const data = await fixture();
    data.results[0][0].hourlyEquity[1].accountingAtMs += HOUR;
    await data.seal();
    expect((await reportCausalGoalCalibration(data.directory)).diagnostics).toContain(
      'invalid-episode:0:momentum-breakout'
    );
    data.results[0][0] = fixtureResult(0, CANDIDATES[0]);
    data.results[0][0].summary.returnPercent = '99';
    await data.seal();
    expect((await reportCausalGoalCalibration(data.directory)).status).toBe('incomplete');
    data.results[0][0] = fixtureResult(0, CANDIDATES[0]);
    data.results[0][0].bot.portfolio.trades = 2;
    await data.seal();
    expect((await reportCausalGoalCalibration(data.directory)).status).toBe('incomplete');
    data.results[0][0] = fixtureResult(0, CANDIDATES[0]);
    await data.seal();
    await data.write('episodes/0/momentum-breakout.json', data.results[0][1]);
    expect((await reportCausalGoalCalibration(data.directory)).status).toBe('incomplete');
  });

  it('does not turn positive zero-fill idle revaluation into positive excess or a traded episode', async () => {
    const data = await fixture(),
      result = data.results[27][0];
    result.bot.portfolio = { trades: 0, feesPaidCodec: '0' };
    result.summary.fills = 0;
    result.controlEquity.splice(3, 1);
    result.events = result.events.filter((item) => item.kind !== 'scenario-fill');
    result.hourlyEquity[24].idleValue = result.summary.finalValue;
    result.summary.heldFinalValue = result.summary.finalValue;
    result.summary.excessReturnPercent = '0';
    await data.seal();
    const report = await reportCausalGoalCalibration(data.directory);
    expect(report.status).toBe('complete');
    expect(report.candidates?.[0].tradedEpisodes).toBe(27);
    expect(report.candidates?.[0].positiveExcessEpisodes).toBe(12);
    expect(report.candidates?.[0].episodes[27].returnPercent.decimal).toBe('0.13');
    expect(report.candidates?.[0].episodes[27].excessReturnPercent.decimal).toBe('0');
  });

  it('returns incomplete for missing registration or a missing result without inferring a strategy pass', async () => {
    const data = await fixture();
    await rm(join(data.directory, 'episodes/27/trend-pullback-accumulation.json'));
    expect((await reportCausalGoalCalibration(data.directory)).coverage.missing).toBe(1);
    await rm(join(data.directory, 'registration.json'));
    const report = await reportCausalGoalCalibration(data.directory);
    expect(report.status).toBe('incomplete');
    expect(report.candidates).toBeUndefined();
    expect(report.qualificationAuthority).toBe(false);
  });

  it('rejects rehashed target/loss labels without the exact control crossing and rejects an opening fill', async () => {
    const data = await fixture();
    for (const outcome of ['target', 'loss']) {
      const result = (data.results[0][0] = fixtureResult(0, CANDIDATES[0]));
      result.outcome = outcome;
      result.stoppedAtMs = START + HOUR;
      result.events.at(-1)!.reason = outcome;
      await data.seal();
      expect((await reportCausalGoalCalibration(data.directory)).diagnostics).toContain(
        'invalid-episode:0:momentum-breakout'
      );
    }
    const result = (data.results[0][0] = fixtureResult(0, CANDIDATES[0]));
    result.events[0].atMs = START;
    result.controlEquity[2].accountingAtMs = START;
    result.controlEquity[2].observedAtMs = START;
    await data.seal();
    expect((await reportCausalGoalCalibration(data.directory)).status).toBe('incomplete');
  });

  it('accepts a target triggered by its first fill only with strict idle outperformance, and rejects fills after a stop', async () => {
    const data = await fixture(),
      result = data.results[0][0];
    const finish = async () => {
      await data.seal();
      return reportCausalGoalCalibration(data.directory);
    };
    result.controlEquity[3].value = ratio(105n * UNIT);
    result.outcome = 'target';
    result.stoppedAtMs = START + HOUR;
    result.events.at(-1)!.reason = 'target';
    result.summary.controlDrawdownPercent = decimal(5n * 100n, 105n);
    expect((await finish()).status).toBe('complete');
    result.controlEquity[3].idleValue = ratio(105n * UNIT);
    expect((await finish()).status).toBe('incomplete');
    result.controlEquity[3].idleValue = ratio(100n * UNIT);
    result.controlEquity[1].value = ratio(90n * UNIT);
    result.summary.controlDrawdownPercent = '10';
    result.outcome = 'loss';
    result.stoppedAtMs = START;
    result.events.at(-1)!.reason = 'loss';
    expect((await finish()).status).toBe('incomplete');
  });

  it('keeps post-stop valuation drawdown distinct from the first 10% loss crossing', async () => {
    const data = await fixture(),
      result = data.results[0][0];
    result.bot.portfolio = { trades: 0, feesPaidCodec: '0' };
    result.summary.fills = 0;
    result.events = result.events.filter((item) => item.kind !== 'scenario-fill');
    result.controlEquity.splice(3, 1);
    for (const [index, row] of result.controlEquity.entries()) {
      row.value = ratio((index === 0 ? 100n : index === 1 ? 90n : 80n) * UNIT);
      row.idleValue = row.value;
    }
    result.hourlyEquity[24].value = ratio(80n * UNIT);
    result.hourlyEquity[24].idleValue = ratio(80n * UNIT);
    result.summary.finalValue = ratio(80n * UNIT);
    result.summary.heldFinalValue = ratio(80n * UNIT);
    result.summary.netXor = '-20';
    result.summary.returnPercent = '-20';
    result.summary.excessReturnPercent = '0';
    result.summary.controlDrawdownPercent = '20';
    result.summary.retrospectiveDrawdownPercent = '20';
    result.outcome = 'loss';
    result.stoppedAtMs = START;
    result.events.at(-1)!.reason = 'loss';
    await data.seal();
    const report = await reportCausalGoalCalibration(data.directory);
    expect(report.status).toBe('complete');
    expect(report.candidates?.[0].outcomes.loss).toBe(1);
    expect(report.candidates?.[0].maximumControlDrawdownPercent.decimal).toBe('20');
  });
});
