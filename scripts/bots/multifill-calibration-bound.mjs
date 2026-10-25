/**
 * Offline, NONCAUSAL terminal-wealth upper bound, never an executable strategy.
 * All-in switches at hourly spot ratios relax partial sizing, LP fees, impact,
 * slippage, base-unit rounding and drawdown admission. The dated fixed network
 * fee is a scenario, not a historical fee or paid transaction. This module has
 * no network, wallet or submission API and never opens validation data.
 *
 * Proof assumptions: fixed historical prices are unaffected by these trades.
 * Decompose partial inventory into portions following subsets of action times.
 * The best whole-capital route dominates their weighted terminal wealth and
 * uses no more actions/fees than the partial strategy. Thus ONLY the global
 * maximum over 0..9 fills bounds mixed inventory; an exactly-k alternating
 * state does not bound all partial strategies with exactly k fills. Within a
 * full-switch (hour, fill count, asset) state, larger capital dominates smaller
 * capital because future rates are positive and reserve depends only on count.
 * Removing a drawdown or executable-size restriction makes this an optimistic
 * diagnostic; success here cannot establish causal or executable profitability.
 */
import { createHash } from 'node:crypto';
import { FIRST_CLOSE, LAST_CLOSE, HOUR, UNIT, joinedCalibrationMarks } from './seven-day-calibration-bound.mjs';

export { FIRST_CLOSE, LAST_CLOSE, HOUR, UNIT };
export const DAILY_HOURS = 24;
export const DAILY_EPISODES = 28;
export const DATED_FEE_CODEC = '100020712589707326';
export const CALIBRATION_DATA_SHA256 = '2180d4381ebacd0ea14d22adcb9e81e76924928baf273eb7049adbeac1274653';
const OLD_REGISTRATION_SHA256 = '7a8863d77249da51c34967843df4dbc72f6f2db903b06377269fe3852d339055';
const KIND = 'tc1-multifill-calibration-registration-v1';
const assert = (condition, key) => {
  if (!condition) throw new Error(`multifill-calibration: ${key}`);
};
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const gcd = (left, right) => {
  let a = left < 0n ? -left : left;
  let b = right;
  while (b) [a, b] = [b, a % b];
  return a;
};
/** Normalize signed exact fractions; no comparison uses decimal rendering. */
const fraction = (numerator, denominator = 1n) => {
  assert(typeof numerator === 'bigint' && typeof denominator === 'bigint' && denominator > 0n, 'fraction');
  const divisor = gcd(numerator, denominator);
  return { n: numerator / divisor, d: denominator / divisor };
};
const add = (a, b) => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
const subtract = (a, b) => fraction(a.n * b.d - b.n * a.d, a.d * b.d);
const multiply = (a, b) => fraction(a.n * b.n, a.d * b.d);
const divide = (a, b) => {
  assert(b.n > 0n, 'positive-divisor');
  return fraction(a.n * b.d, a.d * b.n);
};
const compare = (a, b) => {
  const difference = a.n * b.d - b.n * a.d;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
};
const integer = (value, key) => {
  assert(typeof value === 'string' && /^(0|[1-9]\d{0,119})$/.test(value), key);
  return BigInt(value);
};

/** Signed decimal display truncates toward zero; exact numerator/denominator remain authoritative. */
export function rationalJson(numerator, denominator = 1n, places = 18) {
  const value = fraction(numerator, denominator);
  assert(Number.isSafeInteger(places) && places >= 0 && places <= 36, 'display-places');
  const absolute = value.n < 0n ? -value.n : value.n;
  const scale = 10n ** BigInt(places);
  const scaled = (absolute * scale) / value.d;
  const sign = value.n < 0n ? '-' : '';
  const decimal = places
    ? `${sign}${scaled / scale}.${String(scaled % scale).padStart(places, '0')}`
    : `${sign}${scaled}`;
  return { numerator: value.n.toString(), denominator: value.d.toString(), decimal };
}
const json = (value) => rationalJson(value.n, value.d);
const iso = (seconds) => new Date(seconds * 1000).toISOString();

/** Check a contiguous synthetic or saved mark series without fetching observations. */
function validateMarks(marks, length) {
  assert(Array.isArray(marks) && marks.length === length && length >= 2, 'marks-length');
  for (let index = 0; index < marks.length; index++) {
    const mark = marks[index];
    assert(mark && Number.isSafeInteger(mark.completedAt) && mark.completedAt > 0, 'mark-time');
    assert(index === 0 || mark.completedAt === marks[index - 1].completedAt + HOUR, 'mark-gap');
    assert(
      typeof mark.base === 'bigint' && mark.base > 0n && typeof mark.target === 'bigint' && mark.target > 0n,
      'mark-ratio'
    );
  }
}

/**
 * Exact DP over at most 24 hours; synthetic options support independent tests.
 * A transition uses only previous-hour states, so mark 0 cannot trade and no
 * same-mark chain is possible. The reserve is never part of tradable capital.
 * Waiting and zero fills remain candidates; a flat fee-paying trade cannot win.
 */
export function assessMultifillEpisode(marks, options = {}) {
  assert(Array.isArray(marks), 'marks-length');
  validateMarks(marks, marks.length);
  assert(marks.length <= DAILY_HOURS + 1, 'episode-length');
  const allocation = integer(options.allocationKusdCodec ?? (10n * UNIT).toString(), 'allocation');
  const reserve = integer(options.feeReserveXorCodec ?? UNIT.toString(), 'reserve');
  const fee = integer(options.feeCodec ?? DATED_FEE_CODEC, 'fee');
  const feeBudget = integer(options.feeBudgetCodec ?? reserve.toString(), 'fee-budget');
  const maxFills = options.maxFills ?? 9;
  assert(allocation > 0n && reserve > 0n && feeBudget <= reserve, 'economics');
  assert(Number.isSafeInteger(maxFills) && maxFills >= 0 && maxFills <= 9, 'fill-cap');
  const cap = Math.min(maxFills, marks.length - 1);
  let states = Array.from({ length: cap + 1 }, () => ({ KUSD: null, XOR: null }));
  states[0].KUSD = { capital: fraction(allocation), actions: [] };
  for (let index = 1; index < marks.length; index++) {
    const previous = states;
    states = previous.map((state) => ({ ...state }));
    const mark = marks[index];
    for (let fills = 0; fills < cap; fills++) {
      if (BigInt(fills + 1) * fee > feeBudget) continue;
      for (const asset of ['KUSD', 'XOR']) {
        const state = previous[fills][asset];
        if (!state) continue;
        const nextAsset = asset === 'KUSD' ? 'XOR' : 'KUSD';
        const rate = asset === 'KUSD' ? fraction(mark.base, mark.target) : fraction(mark.target, mark.base);
        const capital = multiply(state.capital, rate);
        const existing = states[fills + 1][nextAsset];
        if (!existing || compare(capital, existing.capital) > 0) {
          states[fills + 1][nextAsset] = {
            capital,
            actions: [
              ...state.actions,
              { markIndex: index, completedAt: mark.completedAt, from: asset, to: nextAsset },
            ],
          };
        }
      }
    }
  }
  const opening = add(fraction(reserve), multiply(fraction(allocation), fraction(marks[0].base, marks[0].target)));
  const terminal = marks.at(-1);
  const terminalRate = fraction(terminal.base, terminal.target);
  const idleFinal = add(fraction(reserve), multiply(fraction(allocation), terminalRate));
  const candidates = [];
  let best;
  for (let fills = 0; fills <= cap; fills++) {
    for (const asset of ['KUSD', 'XOR']) {
      const state = states[fills][asset];
      if (!state) continue;
      const remainingReserve = reserve - BigInt(fills) * fee;
      const tradableXor = asset === 'XOR' ? state.capital : multiply(state.capital, terminalRate);
      const final = add(fraction(remainingReserve), tradableXor);
      const candidate = { fills, asset, remainingReserve, capital: state.capital, final, actions: state.actions };
      candidates.push(candidate);
      if (!best || compare(final, best.final) > 0) best = candidate;
    }
  }
  const net = subtract(best.final, opening);
  const excess = subtract(best.final, idleFinal);
  const summarizeCandidate = (candidate) => ({
    fills: candidate.fills,
    asset: candidate.asset,
    remainingReserveXorCodec: candidate.remainingReserve.toString(),
    tradableCapitalCodec: json(candidate.capital),
    finalXorCodec: json(candidate.final),
    actions: candidate.actions,
  });
  return {
    episodeStart: iso(marks[0].completedAt),
    episodeEnd: iso(terminal.completedAt),
    model: 'noncausal-relaxed-full-switch-upper-bound',
    executable: false,
    qualificationAllowed: false,
    openingXorCodec: json(opening),
    idleFinalXorCodec: json(idleFinal),
    best: summarizeCandidate(best),
    frontierMeaning: 'exact-count full-switch states only; not bounds on exactly-k partial strategies',
    frontier: candidates.map(summarizeCandidate),
    netXor: json(divide(net, fraction(UNIT))),
    netReturnPercent: json(multiply(divide(net, opening), fraction(100n))),
    excessIdleXor: json(divide(excess, fraction(UNIT))),
    excessIdlePercent: json(multiply(divide(excess, opening), fraction(100n))),
  };
}

/**
 * Split only the fixed 673 saved calibration marks into 28 funded 24h episodes.
 * Each shared endpoint starts a fresh 10 KUSD + 1 XOR allocation; no inventory,
 * fee spend or action state carries across episodes. Means include idle days.
 * Excess percentage uses opening equity, matching net-minus-idle return points.
 */
export function assessMultifillCalibration(marks) {
  validateMarks(marks, DAILY_EPISODES * DAILY_HOURS + 1);
  assert(marks[0].completedAt === FIRST_CLOSE && marks.at(-1).completedAt === LAST_CLOSE, 'calibration-window');
  const episodes = Array.from({ length: DAILY_EPISODES }, (_, index) =>
    assessMultifillEpisode(marks.slice(index * DAILY_HOURS, (index + 1) * DAILY_HOURS + 1))
  );
  const metrics = ['netXor', 'netReturnPercent', 'excessIdleXor', 'excessIdlePercent'];
  const means = Object.fromEntries(
    metrics.map((key) => {
      const total = episodes.reduce(
        (sum, episode) => add(sum, fraction(BigInt(episode[key].numerator), BigInt(episode[key].denominator))),
        fraction(0n)
      );
      return [key, json(divide(total, fraction(BigInt(DAILY_EPISODES))))];
    })
  );
  return {
    kind: 'tc1-multifill-calibration-bound-v1',
    model: 'NONCAUSAL relaxed terminal-wealth oracle; no LP fee, impact, slippage, rounding or drawdown constraints',
    executable: false,
    qualificationAllowed: false,
    targetGainUsedAsGate: false,
    episodeHours: DAILY_HOURS,
    episodeCount: DAILY_EPISODES,
    allocationKusdCodec: (10n * UNIT).toString(),
    feeReserveXorCodec: UNIT.toString(),
    datedNetworkFeeCodec: DATED_FEE_CODEC,
    maximumFillsPerEpisode: 9,
    firstActionMark: 1,
    maximumActionsPerHour: 1,
    means,
    positiveMeanNetAndExcess: metrics.every((key) => BigInt(means[key].numerator) > 0n),
    episodes,
  };
}

/** Build the exact preregistration body from code bytes only, before reading observations. */
export function createMultifillRegistrationBody(studyId, registeredAt, sources) {
  assert(typeof studyId === 'string' && /^[a-z0-9-]{1,120}$/.test(studyId), 'study-id');
  assert(typeof registeredAt === 'string' && new Date(registeredAt).toISOString() === registeredAt, 'registered-at');
  return {
    studyId,
    registeredAt,
    purpose:
      'Training-only noncausal relaxed multi-fill terminal-wealth upper bound; no strategy selection or live action.',
    sourceHashes: {
      analyzerSha256: sha256(sources.analyzer),
      analyzerTestSha256: sha256(sources.tests),
      fixedHistoryReaderSha256: sha256(sources.reader),
      protocolSha256: sha256(sources.protocol),
      calibrationObservationsSha256: CALIBRATION_DATA_SHA256,
      priorRegistrationBodySha256: OLD_REGISTRATION_SHA256,
    },
    scope: {
      firstClose: FIRST_CLOSE,
      lastClose: LAST_CLOSE,
      marks: 673,
      episodeHours: DAILY_HOURS,
      episodeCount: DAILY_EPISODES,
    },
    economics: {
      allocationKusdCodec: (10n * UNIT).toString(),
      feeReserveXorCodec: UNIT.toString(),
      datedNetworkFeeCodec: DATED_FEE_CODEC,
      feeFunding: 'protected-reserve-only',
      maxFills: 9,
      firstActionMark: 1,
      maxActionsPerHour: 1,
      tradableActions: 'wait-or-all-in-switch',
      arithmetic: 'exact-bigint-rational-no-rounding',
      objective: 'maximum-terminal-XOR-including-remaining-reserve-and-idle',
      omittedConstraints: ['LP-fees', 'price-impact', 'slippage', 'base-unit-rounding', 'drawdown'],
      targetGainUsedAsGate: false,
      executable: false,
      qualificationAllowed: false,
    },
    access: {
      mode: 'saved-training-calibration-only',
      networkAllowed: false,
      validationAllowed: false,
      holdoutAllowed: false,
      developmentFoldsAllowed: false,
      financialActions: false,
    },
  };
}

/** Verify every preregistered field, three code bindings and protocol, rejecting altered access. */
export function verifyMultifillRegistration(registration, sources) {
  assert(registration?.kind === KIND, 'registration-kind');
  assert(registration.sha256 === sha256(JSON.stringify(registration.body)), 'registration-digest');
  const expected = createMultifillRegistrationBody(
    registration.body?.studyId,
    registration.body?.registeredAt,
    sources
  );
  assert(JSON.stringify(registration.body) === JSON.stringify(expected), 'registration-binding');
  return registration.body;
}

/** Verify saved data bytes before parsing and joining; never fetch or substitute observations. */
export function assessRegisteredMultifillCalibration(registration, sources, observationBytes) {
  verifyMultifillRegistration(registration, sources);
  assert(sha256(observationBytes) === CALIBRATION_DATA_SHA256, 'observations-digest');
  const observations = JSON.parse(observationBytes.toString('utf8'));
  assert(observations.registrationSha256 === OLD_REGISTRATION_SHA256, 'prior-registration');
  const marks = joinedCalibrationMarks(observations.assets?.KUSD?.rows, observations.assets?.XOR?.rows);
  return {
    registrationSha256: registration.sha256,
    observationsSha256: CALIBRATION_DATA_SHA256,
    ...assessMultifillCalibration(marks),
  };
}
