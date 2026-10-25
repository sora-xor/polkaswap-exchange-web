import type { AutopilotInput } from './autopilot';
import {
  AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE,
  AUTOPILOT_SCREENING_REASONS,
  AUTOPILOT_TRAINING_REASONS,
  type AutopilotImpactPreflightDiagnostics,
  type AutopilotQualificationDiagnostics,
  type AutopilotQualificationFailure,
  type AutopilotScreeningEvidence,
} from './autopilot-diagnostics';
import type { BotProvider } from './types';

/** Only training candidate and quote-screening reason codes from one verified completed hour. */
export interface AutopilotTrainingWatchDiagnostics {
  readonly stage: 'training';
  readonly completedThrough: number;
  /** Exact canonical copy of the already-stored public watch intent; never grants authority. */
  readonly intentKey: string;
  readonly failures: readonly AutopilotQualificationFailure[];
  readonly screening?: Readonly<AutopilotScreeningEvidence>;
}

/** A pre-draft failure code bound to verified public history, without its quote or opening figures. */
export interface AutopilotWatchFailure {
  readonly completedThrough: number;
  readonly intentKey: string;
  readonly errorKey:
    | 'bots.autopilot.errors.openingRejected'
    | 'bots.autopilot.errors.insufficientFeeBudget'
    | 'bots.errors.quote'
    | typeof AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE;
  /** Only the observed preflight cause and fixed sample count, never amounts or quote figures. */
  readonly preflight?: AutopilotImpactPreflightDiagnostics;
}

/** Tab-local, unsigned opportunity intent. It cannot restore an AI client or trading authority. */
export interface AutopilotWatchCheckpoint {
  version: 1;
  savedAt: number;
  identity: string;
  network: string;
  assistantKind: BotProvider | 'desktop';
  input: Omit<AutopilotInput, 'assets'>;
  lastAttemptedCompletedThrough: number;
  /** A bounded explanation of this exact attempted training hour, never validation evidence. */
  trainingDiagnostics?: AutopilotTrainingWatchDiagnostics;
  /** Only an allowlisted pre-draft error and its verified history hour. */
  lastFailure?: AutopilotWatchFailure;
}

/** Public saved-plan presentation; displaying it never makes a different wallet eligible to resume. */
export interface AutopilotWatchRecovery {
  readonly input: Readonly<AutopilotWatchCheckpoint['input']>;
  readonly walletAddress: string;
  readonly trainingDiagnostics?: AutopilotTrainingWatchDiagnostics;
  readonly lastFailure?: AutopilotWatchFailure;
}
type WatchIntent = Pick<
  AutopilotWatchCheckpoint,
  'identity' | 'network' | 'assistantKind' | 'input' | 'lastAttemptedCompletedThrough'
>;

const KEY = 'polkaswap-bots-opportunity-watch-v1';
const HOUR = 3_600_000;
const MAX_AGE = 7 * 24 * HOUR;
const MAX_BYTES = 4_096;
const ASSISTANTS = new Set(['desktop', 'openai', 'claude', 'jev', 'custom']);
const RECORD_FIELDS = [
  'version',
  'savedAt',
  'identity',
  'network',
  'assistantKind',
  'input',
  'lastAttemptedCompletedThrough',
] as const;
const OPTIONAL_RECORD_FIELDS = ['trainingDiagnostics', 'lastFailure'] as const;
const WATCH_FAILURE_KEYS = new Set([
  'bots.autopilot.errors.openingRejected',
  'bots.autopilot.errors.insufficientFeeBudget',
  'bots.errors.quote',
  AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE,
]);
const INPUT_FIELDS = [
  'assetInAddress',
  'assetOutAddress',
  'capital',
  'feeBudgetXor',
  'maxLossPercent',
  'targetReturnPercent',
  'title',
] as const;
const decimal = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 100 && /^\d+(?:\.\d+)?$/.test(value);
const bounded = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max;
const plain = (value: unknown): value is Record<string, unknown> =>
  Boolean(
    value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
  );
/** Reject unknown object properties before a stored explanation reaches the UI. */
const exactFields = (value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []) =>
  required.every((field) => Object.prototype.hasOwnProperty.call(value, field)) &&
  Object.keys(value).every((field) => required.includes(field) || optional.includes(field));
/** Require an actual completed boundary no later than the current wall-clock hour. */
const validCompletedHour = (value: unknown, now: number) =>
  Number.isSafeInteger(value) &&
  (value as number) > 0 &&
  (value as number) % HOUR === 0 &&
  (value as number) <= Math.floor(now / HOUR) * HOUR;
/** Keep each failure to unique, known reason codes within the fixed candidate bounds. */
const validReasons = (value: unknown, allowed: readonly string[]) =>
  Array.isArray(value) &&
  value.length >= 1 &&
  value.length <= allowed.length &&
  Object.keys(value).length === value.length &&
  value.every((reason) => typeof reason === 'string' && allowed.includes(reason)) &&
  new Set(value).size === value.length;

/** Bind an explanation to the exact public inputs and original hour without a collision-prone checksum. */
function trainingIntentKey(intent: WatchIntent, completedThrough: number): string {
  const input = intent.input;
  return JSON.stringify([
    intent.identity,
    intent.network,
    intent.assistantKind,
    input.assetInAddress,
    input.assetOutAddress,
    input.capital,
    input.feeBudgetXor,
    input.maxLossPercent,
    input.targetReturnPercent,
    input.title,
    input.valuationAsset ?? null,
    completedThrough,
  ]);
}

/** Reject nested additions and any result that belongs to another hour or to the holdout. */
function validTrainingDiagnostics(
  value: unknown,
  intent: WatchIntent,
  now: number
): value is AutopilotTrainingWatchDiagnostics {
  if (
    !plain(value) ||
    !exactFields(value, ['stage', 'completedThrough', 'intentKey', 'failures'], ['screening']) ||
    value.stage !== 'training' ||
    !validCompletedHour(value.completedThrough, now) ||
    (value.completedThrough as number) > intent.lastAttemptedCompletedThrough ||
    (value.completedThrough as number) < intent.lastAttemptedCompletedThrough - MAX_AGE ||
    value.intentKey !== trainingIntentKey(intent, value.completedThrough as number) ||
    !Array.isArray(value.failures) ||
    value.failures.length > 3 ||
    Object.keys(value.failures).length !== value.failures.length
  )
    return false;
  const candidates = new Set<number>();
  for (const failure of value.failures) {
    if (
      !plain(failure) ||
      !exactFields(failure, ['candidate', 'reasons']) ||
      !Number.isSafeInteger(failure.candidate) ||
      (failure.candidate as number) < 1 ||
      (failure.candidate as number) > 3 ||
      candidates.has(failure.candidate as number) ||
      !validReasons(failure.reasons, AUTOPILOT_TRAINING_REASONS)
    )
      return false;
    candidates.add(failure.candidate as number);
  }
  if (!('screening' in value)) return candidates.size >= 1;
  const screening = value.screening;
  if (
    !plain(screening) ||
    !exactFields(screening, ['submitted', 'dropped']) ||
    !Number.isSafeInteger(screening.submitted) ||
    (screening.submitted as number) < 1 ||
    (screening.submitted as number) > 3 ||
    !Array.isArray(screening.dropped) ||
    screening.dropped.length > (screening.submitted as number) ||
    Object.keys(screening.dropped).length !== screening.dropped.length ||
    candidates.size + screening.dropped.length !== screening.submitted
  )
    return false;
  for (const dropped of screening.dropped) {
    if (
      !plain(dropped) ||
      !exactFields(dropped, ['candidate', 'reasons']) ||
      !Number.isSafeInteger(dropped.candidate) ||
      (dropped.candidate as number) < 1 ||
      (dropped.candidate as number) > (screening.submitted as number) ||
      candidates.has(dropped.candidate as number) ||
      !validReasons(dropped.reasons, AUTOPILOT_SCREENING_REASONS)
    )
      return false;
    candidates.add(dropped.candidate as number);
  }
  return (
    candidates.size === screening.submitted &&
    Array.from({ length: screening.submitted as number }, (_, index) => index + 1).every((candidate) =>
      candidates.has(candidate)
    )
  );
}

/** A stored preflight cause is a fixed public label; executable properties and numerical evidence are rejected. */
function validImpactPreflight(value: unknown): value is AutopilotImpactPreflightDiagnostics {
  if (!plain(value)) return false;
  const fields = Object.getOwnPropertyDescriptors(value);
  return (
    Reflect.ownKeys(fields).length === 3 &&
    ['stage', 'cause', 'sampleCount'].every((key) => fields[key] && 'value' in fields[key]) &&
    fields.stage.value === 'preflight' &&
    fields.cause.value === 'priceImpact' &&
    fields.sampleCount.value === 5
  );
}

/** Keep an error attached to the same public intent and a completed hour actually attempted. */
function validWatchFailure(value: unknown, intent: WatchIntent, now: number): value is AutopilotWatchFailure {
  if (!plain(value) || !exactFields(value, ['completedThrough', 'intentKey', 'errorKey'], ['preflight'])) return false;
  const preflight = Object.getOwnPropertyDescriptor(value, 'preflight');
  if (
    value.errorKey === AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE
      ? !preflight || !('value' in preflight) || !validImpactPreflight(preflight.value)
      : Boolean(preflight)
  )
    return false;
  return (
    validCompletedHour(value.completedThrough, now) &&
    (value.completedThrough as number) <= intent.lastAttemptedCompletedThrough &&
    (value.completedThrough as number) >= intent.lastAttemptedCompletedThrough - MAX_AGE &&
    value.intentKey === trainingIntentKey(intent, value.completedThrough as number) &&
    typeof value.errorKey === 'string' &&
    WATCH_FAILURE_KEYS.has(value.errorKey)
  );
}

/** Copy only a known pre-draft error; never retain a provider message or numerical fee evidence. */
export function copyAutopilotWatchFailure(
  errorKey: unknown,
  completedThrough: number,
  intent: WatchIntent,
  preflight?: AutopilotImpactPreflightDiagnostics
): AutopilotWatchFailure | null {
  if (preflight !== undefined && !validImpactPreflight(preflight)) return null;
  const copied = {
    completedThrough,
    intentKey: trainingIntentKey(intent, completedThrough),
    errorKey,
    ...(preflight
      ? { preflight: { stage: 'preflight' as const, cause: 'priceImpact' as const, sampleCount: 5 as const } }
      : {}),
  };
  return validWatchFailure(copied, intent, Date.now()) ? copied : null;
}

/** Copy only allowlisted training reasons; dated fees, prices and provider text remain memory-only. */
export function copyAutopilotTrainingWatchDiagnostics(
  diagnostics: AutopilotQualificationDiagnostics | null,
  completedThrough: number,
  intent: WatchIntent
): AutopilotTrainingWatchDiagnostics | null {
  if (!diagnostics || diagnostics.stage !== 'training') return null;
  const copied: AutopilotTrainingWatchDiagnostics = {
    stage: 'training',
    completedThrough,
    intentKey: trainingIntentKey(intent, completedThrough),
    failures: diagnostics.failures.map(({ candidate, reasons }) => ({ candidate, reasons: [...reasons] })),
    ...(diagnostics.screening
      ? {
          screening: {
            submitted: diagnostics.screening.submitted,
            dropped: diagnostics.screening.dropped.map(({ candidate, reasons }) => ({
              candidate,
              reasons: [...reasons],
            })),
          },
        }
      : {}),
  };
  return validTrainingDiagnostics(copied, intent, Date.now()) ? copied : null;
}

/** Strictly validate stored public fields; amount precision and live identity are checked again by the caller. */
export function validAutopilotWatchCheckpoint(value: unknown, now = Date.now()): value is AutopilotWatchCheckpoint {
  if (!plain(value) || !exactFields(value, RECORD_FIELDS, OPTIONAL_RECORD_FIELDS)) return false;
  if (
    value.version !== 1 ||
    !Number.isSafeInteger(value.savedAt) ||
    (value.savedAt as number) > now ||
    (value.savedAt as number) < now - MAX_AGE ||
    !bounded(value.identity, 2_048) ||
    !bounded(value.network, 1_024) ||
    !ASSISTANTS.has(value.assistantKind as string) ||
    !validCompletedHour(value.lastAttemptedCompletedThrough, now)
  )
    return false;
  const input = value.input;
  if (
    !plain(input) ||
    Object.keys(input).length < INPUT_FIELDS.length ||
    Object.keys(input).length > INPUT_FIELDS.length + 1 ||
    INPUT_FIELDS.some((field) => !Object.prototype.hasOwnProperty.call(input, field))
  )
    return false;
  const validInput =
    Object.keys(input).every(
      (field) => INPUT_FIELDS.includes(field as (typeof INPUT_FIELDS)[number]) || field === 'valuationAsset'
    ) &&
    bounded(input.assetInAddress, 1_024) &&
    bounded(input.assetOutAddress, 1_024) &&
    input.assetInAddress !== input.assetOutAddress &&
    bounded(input.title, 256) &&
    decimal(input.capital) &&
    decimal(input.feeBudgetXor) &&
    decimal(input.maxLossPercent) &&
    decimal(input.targetReturnPercent) &&
    (input.valuationAsset === undefined || input.valuationAsset === 'input' || input.valuationAsset === 'output');
  return (
    validInput &&
    (!('trainingDiagnostics' in value) ||
      validTrainingDiagnostics(value.trainingDiagnostics, value as unknown as WatchIntent, now)) &&
    (!('lastFailure' in value) || validWatchFailure(value.lastFailure, value as unknown as WatchIntent, now))
  );
}

/** Browser storage may be unavailable; research itself remains usable without reload recovery. */
function tabStorage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** Read one same-tab checkpoint, forgetting malformed or expired data. */
export function readAutopilotWatchCheckpoint(now = Date.now()): AutopilotWatchCheckpoint | null {
  const storage = tabStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    if (raw.length > MAX_BYTES) throw Error('checkpoint');
    const value: unknown = JSON.parse(raw);
    if (!validAutopilotWatchCheckpoint(value, now)) throw Error('checkpoint');
    return value;
  } catch {
    try {
      storage.removeItem(KEY);
    } catch {
      /* Storage may become unavailable mid-read. */
    }
    return null;
  }
}

/** Commit the attempted-hour watermark before an asynchronous research request can escape. */
export function writeAutopilotWatchCheckpoint(checkpoint: AutopilotWatchCheckpoint): boolean {
  const storage = tabStorage();
  if (!storage || !validAutopilotWatchCheckpoint(checkpoint)) return false;
  try {
    const raw = JSON.stringify(checkpoint);
    if (raw.length > MAX_BYTES) return false;
    storage.setItem(KEY, raw);
    return true;
  } catch {
    return false;
  }
}

/** Explicitly discard the unsigned checkpoint. */
export function clearAutopilotWatchCheckpoint(): void {
  try {
    tabStorage()?.removeItem(KEY);
  } catch {
    /* Storage is optional. */
  }
}
