import { FPNumber } from '@/lib/substrate/math';
import { toCodec } from './amounts';

const BOT_ERROR_NAMES = new Set([
  'action',
  'amount',
  'backtestAi',
  'balance',
  'busy',
  'config',
  'denomination',
  'endpoint',
  'feeBudget',
  'goal',
  'goalComplete',
  'goalTradeCost',
  'hidden',
  'history',
  'intent',
  'jevStrategyUnsupported',
  'model',
  'network',
  'operation',
  'pending',
  'policy',
  'proposal',
  'provider',
  'quote',
  'receipt',
  'session',
  'stale',
  'stopToEdit',
  'storage',
  'strategy',
  'transaction',
  'wallet',
]);
const AUTOPILOT_ERROR_NAMES = new Set([
  'connection',
  'desktopUnavailable',
  'historyIncomplete',
  'historyUnavailable',
  'insufficientFeeBudget',
  'noStrategy',
  'openingRejected',
  'research',
  'screeningRejected',
  'tradeBudget',
  'trainingRejected',
  'validationRejected',
  'xorReserve',
]);

/** Accept only actual application message keys, never provider text disguised as a key. */
export function isAutopilotErrorKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value === 'bots.codex.expired' || value === AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE) return true;
  if (value.startsWith('bots.autopilot.errors.')) return AUTOPILOT_ERROR_NAMES.has(value.slice(22));
  return value.startsWith('bots.errors.') && BOT_ERROR_NAMES.has(value.slice(12));
}

/** Bounded local qualification explanations; never includes market prices or provider text. */
export type AutopilotQualificationStage = 'opening' | 'training' | 'validation';
export const AUTOPILOT_AGGREGATE_REASONS = Object.freeze([
  'coverage',
  'insufficientTrades',
  'netLoss',
  'drawdown',
] as const);
export const AUTOPILOT_TRAINING_REASONS = Object.freeze([
  ...AUTOPILOT_AGGREGATE_REASONS,
  'priceImpact',
  'goalTradeCost',
  'feeBudget',
] as const);
export type AutopilotQualificationReason = (typeof AUTOPILOT_TRAINING_REASONS)[number];
export const AUTOPILOT_SCREENING_REASONS = Object.freeze([
  'quoteUnavailable',
  'priceImpact',
  'feeBudget',
  'noSmallerExactSample',
] as const);
export type AutopilotScreeningReason = (typeof AUTOPILOT_SCREENING_REASONS)[number];

/** Original authored positions screened out before training, without amounts or market observations. */
export interface AutopilotScreeningEvidence {
  submitted: number;
  dropped: readonly { candidate: number; reasons: readonly AutopilotScreeningReason[] }[];
}

/** A failed candidate's trusted checks, with no observations that could tune a subsequent draft. */
export interface AutopilotQualificationFailure {
  candidate: number;
  reasons: readonly AutopilotQualificationReason[];
}

/** A cost-free lower bound on opening loss, using only the first two training observations. */
export interface AutopilotOpeningEvidence {
  lossPercent: string;
  maxLossPercent: string;
  valuationSymbol: string;
  openedAt: number;
  firstTradeAt: number;
}

/** Dated fee-pressure scenario, using an exact finalized fee and a completed pool mark. */
export interface AutopilotFeePressureEvidence {
  sharePercent: string;
  maxLossPercent: string;
  observedAt: number;
  markAt: number;
}

/** Presentation-only evidence from the fixed training opening, batch, or its single validation run. */
export interface AutopilotQualificationDiagnostics {
  stage: AutopilotQualificationStage;
  failures: readonly AutopilotQualificationFailure[];
  screening?: Readonly<AutopilotScreeningEvidence>;
  opening?: Readonly<AutopilotOpeningEvidence>;
  feePressure?: Readonly<AutopilotFeePressureEvidence>;
}

const trustedDiagnostics = new WeakMap<object, AutopilotQualificationDiagnostics>();

/** Only these factories can attach evidence; cloning, prototypes and public properties confer no trust. */
function qualificationError(
  diagnostics: AutopilotQualificationDiagnostics,
  message = 'bots.autopilot.errors.noStrategy'
): Error {
  const error = new Error(message);
  trustedDiagnostics.set(error, diagnostics);
  return error;
}

/** Copy a strictly bounded opening proof; invalid evidence never becomes a trusted explanation. */
export function createAutopilotOpeningError(evidence: AutopilotOpeningEvidence): Error {
  try {
    if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) throw new Error();
    const prototype = Object.getPrototypeOf(evidence);
    if (prototype !== Object.prototype && prototype !== null) throw new Error();
    const keys = ['lossPercent', 'maxLossPercent', 'valuationSymbol', 'openedAt', 'firstTradeAt'];
    const descriptors = Object.getOwnPropertyDescriptors(evidence);
    if (
      Reflect.ownKeys(descriptors).length !== keys.length ||
      keys.some((key) => !descriptors[key] || !('value' in descriptors[key]))
    )
      throw new Error();
    const { lossPercent, maxLossPercent, valuationSymbol, openedAt, firstTradeAt } = evidence;
    toCodec(lossPercent, 36);
    toCodec(maxLossPercent, 36);
    const loss = new FPNumber(lossPercent, 36);
    const limit = new FPNumber(maxLossPercent, 36);
    if (
      !loss.gt(limit) ||
      loss.gt(new FPNumber('100', 36)) ||
      !limit.gt(new FPNumber('0', 36)) ||
      typeof valuationSymbol !== 'string' ||
      !valuationSymbol ||
      valuationSymbol.length > 32 ||
      valuationSymbol.trim() !== valuationSymbol ||
      /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(valuationSymbol) ||
      !Number.isSafeInteger(openedAt) ||
      openedAt < 0 ||
      !Number.isSafeInteger(firstTradeAt) ||
      firstTradeAt <= openedAt ||
      firstTradeAt > 8_640_000_000_000_000
    )
      throw new Error();
    const opening = Object.freeze({ lossPercent, maxLossPercent, valuationSymbol, openedAt, firstTradeAt });
    return qualificationError(
      Object.freeze({ stage: 'opening', failures: Object.freeze([]), opening }),
      'bots.autopilot.errors.openingRejected'
    );
  } catch {
    return new Error('bots.autopilot.errors.noStrategy');
  }
}

/** Copy a small allowlisted explanation; malformed data falls back to the existing generic error. */
export function createAutopilotQualificationError(
  stage: AutopilotQualificationStage,
  failures: readonly AutopilotQualificationFailure[],
  feePressure?: AutopilotFeePressureEvidence | null,
  screening?: AutopilotScreeningEvidence
): Error {
  const invalid = () => new Error('bots.autopilot.errors.noStrategy');
  const array = (value: unknown, maximum: number, minimum = 1): unknown[] => {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) throw invalid();
    const descriptors = Object.getOwnPropertyDescriptors(value as object);
    const length = descriptors.length.value as number;
    if (
      !Number.isSafeInteger(length) ||
      length < minimum ||
      length > maximum ||
      Reflect.ownKeys(descriptors).length !== length + 1
    )
      throw invalid();
    return Array.from({ length }, (_, index) => {
      const field = descriptors[String(index)];
      if (!field || !('value' in field)) throw invalid();
      return field.value as unknown;
    });
  };
  try {
    if (!['training', 'validation'].includes(stage)) return invalid();
    const allowed: readonly AutopilotQualificationReason[] =
      stage === 'training' ? AUTOPILOT_TRAINING_REASONS : AUTOPILOT_AGGREGATE_REASONS;
    const candidates = new Set<number>();
    const copied = array(failures, stage === 'validation' ? 1 : 3, stage === 'training' && screening ? 0 : 1).map(
      (failure) => {
        if (!failure || typeof failure !== 'object' || Array.isArray(failure)) throw invalid();
        const prototype = Object.getPrototypeOf(failure);
        if (prototype !== Object.prototype && prototype !== null) throw invalid();
        const fields = Object.getOwnPropertyDescriptors(failure);
        if (Reflect.ownKeys(fields).some((key) => typeof key !== 'string' || !('value' in fields[key])))
          throw invalid();
        const candidate = fields.candidate?.value as number;
        const reasons = array(fields.reasons?.value, allowed.length);
        if (
          !Number.isSafeInteger(candidate) ||
          candidate < 1 ||
          candidate > 3 ||
          candidates.has(candidate) ||
          reasons.some((reason) => !allowed.includes(reason as AutopilotQualificationReason))
        )
          throw invalid();
        candidates.add(candidate);
        return Object.freeze({
          candidate,
          reasons: Object.freeze(allowed.filter((reason) => reasons.includes(reason))),
        });
      }
    );
    let screened: Readonly<AutopilotScreeningEvidence> | undefined;
    if (screening !== undefined) {
      if (stage !== 'training' || !screening || typeof screening !== 'object' || Array.isArray(screening))
        throw invalid();
      const fields = Object.getOwnPropertyDescriptors(screening);
      const submitted = fields.submitted?.value as unknown;
      if (!Number.isSafeInteger(submitted) || (submitted as number) < 1 || (submitted as number) > 3) throw invalid();
      const seen = new Set<number>();
      const dropped = array(fields.dropped?.value, submitted as number, 0).map((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw invalid();
        const properties = Object.getOwnPropertyDescriptors(entry);
        const candidate = properties.candidate?.value as unknown;
        const reasons = array(properties.reasons?.value, AUTOPILOT_SCREENING_REASONS.length);
        if (
          !Number.isSafeInteger(candidate) ||
          (candidate as number) < 1 ||
          (candidate as number) > (submitted as number) ||
          seen.has(candidate as number) ||
          reasons.some((reason) => !AUTOPILOT_SCREENING_REASONS.includes(reason as AutopilotScreeningReason))
        )
          throw invalid();
        seen.add(candidate as number);
        return Object.freeze({
          candidate: candidate as number,
          reasons: Object.freeze(AUTOPILOT_SCREENING_REASONS.filter((reason) => reasons.includes(reason))),
        });
      });
      if (
        copied.length + dropped.length !== submitted ||
        copied.some(({ candidate }) => seen.has(candidate) || candidate > (submitted as number))
      )
        throw invalid();
      for (let candidate = 1; candidate <= (submitted as number); candidate++)
        if (!seen.has(candidate) && !candidates.has(candidate)) throw invalid();
      screened = Object.freeze({ submitted: submitted as number, dropped: Object.freeze(dropped) });
    }
    let pressure: Readonly<AutopilotFeePressureEvidence> | undefined;
    if (feePressure != null) {
      if (stage !== 'training' || typeof feePressure !== 'object' || Array.isArray(feePressure)) throw invalid();
      const prototype = Object.getPrototypeOf(feePressure);
      if (prototype !== Object.prototype && prototype !== null) throw invalid();
      const fields = Object.getOwnPropertyDescriptors(feePressure);
      const keys = ['sharePercent', 'maxLossPercent', 'observedAt', 'markAt'];
      if (
        Reflect.ownKeys(fields).length !== keys.length ||
        keys.some((key) => !fields[key] || !('value' in fields[key]))
      )
        throw invalid();
      const { sharePercent, maxLossPercent, observedAt, markAt } = feePressure;
      toCodec(sharePercent, 36);
      toCodec(maxLossPercent, 36);
      const share = new FPNumber(sharePercent, 36);
      if (
        !share.gte(new FPNumber('25', 36)) ||
        share.gt(new FPNumber('10000', 36)) ||
        !new FPNumber(maxLossPercent, 36).gt(new FPNumber('0', 36)) ||
        !Number.isSafeInteger(observedAt) ||
        !Number.isSafeInteger(markAt) ||
        observedAt <= 0 ||
        markAt <= 0 ||
        markAt > observedAt ||
        observedAt - markAt > 2 * 3_600_000
      )
        throw invalid();
      pressure = Object.freeze({ sharePercent, maxLossPercent, observedAt, markAt });
    }
    return qualificationError(
      Object.freeze({
        stage,
        failures: Object.freeze(copied),
        ...(screened ? { screening: screened } : {}),
        ...(pressure ? { feePressure: pressure } : {}),
      })
    );
  } catch {
    return invalid();
  }
}

/** Read only this module's bounded error; similarly shaped provider errors are not trusted. */
export function readAutopilotQualificationDiagnostics(value: unknown): AutopilotQualificationDiagnostics | null {
  return value && typeof value === 'object' ? (trustedDiagnostics.get(value) ?? null) : null;
}

const trustedFeeBudgetErrors = new WeakSet<Error>();

/** A fresh exact buy fee exceeds the selected reserve without changing the user's budget. */
export function createAutopilotFeeBudgetError(): Error {
  const error = new Error('bots.autopilot.errors.insufficientFeeBudget');
  trustedFeeBudgetErrors.add(error);
  return error;
}

/** A provider error with the same message is not evidence of a failed local fee preflight. */
export function isAutopilotFeeBudgetError(value: unknown): value is Error {
  return value instanceof Error && trustedFeeBudgetErrors.has(value);
}

/** Existing localized cause used by observed impact preflight and its bounded desktop status. */
export const AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE = 'historyErrorMessages.liquidityproxy.slippagenottolerated';

/** Five observed exact-size buy samples failed impact only; this says nothing about unquoted sizes. */
export interface AutopilotImpactPreflightDiagnostics {
  readonly stage: 'preflight';
  readonly cause: 'priceImpact';
  readonly sampleCount: 5;
}

const trustedImpactPreflightErrors = new WeakMap<object, AutopilotImpactPreflightDiagnostics>();

/** Called only after five fresh finalized exact quotes have independently failed the current impact cap. */
export function createAutopilotImpactPreflightError(): Error {
  const error = new Error('bots.errors.policy');
  trustedImpactPreflightErrors.set(error, Object.freeze({ stage: 'preflight', cause: 'priceImpact', sampleCount: 5 }));
  return error;
}

/** Error messages, public properties, clones and prototypes never establish observed preflight evidence. */
export function readAutopilotImpactPreflightDiagnostics(value: unknown): AutopilotImpactPreflightDiagnostics | null {
  return value && typeof value === 'object' ? (trustedImpactPreflightErrors.get(value) ?? null) : null;
}
