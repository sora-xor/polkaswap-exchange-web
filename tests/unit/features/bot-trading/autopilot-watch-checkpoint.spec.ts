import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE,
  createAutopilotImpactPreflightError,
  readAutopilotImpactPreflightDiagnostics,
} from '@/features/bot-trading/autopilot-diagnostics';
import {
  clearAutopilotWatchCheckpoint,
  copyAutopilotWatchFailure,
  copyAutopilotTrainingWatchDiagnostics,
  readAutopilotWatchCheckpoint,
  validAutopilotWatchCheckpoint,
  writeAutopilotWatchCheckpoint,
  type AutopilotWatchCheckpoint,
} from '@/features/bot-trading/autopilot-watch-checkpoint';

const HOUR = 3_600_000;
const NOW = Date.parse('2026-09-24T16:05:00Z');
const KEY = 'polkaswap-bots-opportunity-watch-v1';

/** A public watch plan contains exact limits and no assistant or wallet authority. */
const checkpoint = (): AutopilotWatchCheckpoint => ({
  version: 1,
  savedAt: NOW,
  identity: 'wallet-and-node',
  network: 'mainnet',
  assistantKind: 'desktop',
  input: {
    assetInAddress: 'kusd',
    assetOutAddress: 'xor',
    capital: '10',
    feeBudgetXor: '1',
    maxLossPercent: '5',
    targetReturnPercent: '5',
    title: 'Maximize XOR',
    valuationAsset: 'output',
  },
  lastAttemptedCompletedThrough: NOW - 5 * 60_000,
});
const training = (intent = checkpoint()) =>
  copyAutopilotTrainingWatchDiagnostics(
    {
      stage: 'training',
      failures: [{ candidate: 1, reasons: ['netLoss', 'goalTradeCost'] }],
      screening: { submitted: 2, dropped: [{ candidate: 2, reasons: ['priceImpact'] }] },
      feePressure: {
        sharePercent: '58',
        maxLossPercent: '5',
        observedAt: NOW,
        markAt: NOW - HOUR,
      },
    },
    NOW - 5 * 60_000,
    intent
  )!;

describe('unsigned opportunity watch checkpoint', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('round-trips only the exact-intent impact cause and rejects missing, expanded or misbound evidence', () => {
    const intent = checkpoint();
    const preflight = readAutopilotImpactPreflightDiagnostics(createAutopilotImpactPreflightError())!;
    const failure = copyAutopilotWatchFailure(AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE, NOW - 5 * 60_000, intent, preflight)!;
    expect(writeAutopilotWatchCheckpoint({ ...intent, lastFailure: failure })).toBe(true);
    expect(readAutopilotWatchCheckpoint()?.lastFailure).toEqual(failure);
    expect(failure.preflight).toEqual({ stage: 'preflight', cause: 'priceImpact', sampleCount: 5 });
    expect(JSON.stringify(failure)).not.toMatch(
      /amountIn|networkFee|blockHash|observedAt|priceClose|provider|password/i
    );
    expect(copyAutopilotWatchFailure(AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE, NOW - 5 * 60_000, intent)).toBeNull();
    expect(copyAutopilotWatchFailure('bots.errors.policy', NOW - 5 * 60_000, intent, preflight)).toBeNull();
    for (const invalid of [
      { ...intent, lastFailure: { ...failure, preflight: { ...preflight, sampleCount: 4 } } },
      { ...intent, lastFailure: { ...failure, preflight: { ...preflight, priceImpactPercent: '2' } } },
      { ...intent, input: { ...intent.input, capital: '9' }, lastFailure: failure },
      { ...intent, lastFailure: { ...failure, completedThrough: NOW + HOUR - 5 * 60_000 } },
    ])
      expect(validAutopilotWatchCheckpoint(invalid)).toBe(false);
    const getter = vi.fn(() => 'priceImpact');
    const accessor = Object.defineProperty({ ...preflight }, 'cause', { get: getter });
    expect(validAutopilotWatchCheckpoint({ ...intent, lastFailure: { ...failure, preflight: accessor } })).toBe(false);
    expect(getter).not.toHaveBeenCalled();
  });

  it('round-trips only exact public inputs and clears on explicit discard', () => {
    const value = checkpoint();
    expect(writeAutopilotWatchCheckpoint(value)).toBe(true);
    expect(readAutopilotWatchCheckpoint()).toEqual(value);
    expect(sessionStorage.getItem(KEY)).not.toMatch(/password|apiKey|bearer|connectionId|requestId/i);
    clearAutopilotWatchCheckpoint();
    expect(readAutopilotWatchCheckpoint()).toBeNull();
  });

  it('stores only bounded reason codes for the exact attempted training hour', () => {
    const value = { ...checkpoint(), trainingDiagnostics: training() };
    expect(writeAutopilotWatchCheckpoint(value)).toBe(true);
    expect(readAutopilotWatchCheckpoint()?.trainingDiagnostics).toMatchObject({
      stage: 'training',
      completedThrough: NOW - 5 * 60_000,
      failures: [{ candidate: 1, reasons: ['netLoss', 'goalTradeCost'] }],
      screening: { submitted: 2, dropped: [{ candidate: 2, reasons: ['priceImpact'] }] },
    });
    expect(readAutopilotWatchCheckpoint()?.trainingDiagnostics?.intentKey).toContain('"10"');
    expect(sessionStorage.getItem(KEY)).not.toMatch(/sharePercent|markAt|observedAt|feePressure|priceClose|provider/i);
  });

  it.each([
    'bots.autopilot.errors.openingRejected',
    'bots.autopilot.errors.insufficientFeeBudget',
    'bots.errors.quote',
  ] as const)('round-trips only the %s failure code and verified hour', (errorKey) => {
    const intent = checkpoint();
    const lastFailure = copyAutopilotWatchFailure(errorKey, NOW - 5 * 60_000, intent);
    expect(lastFailure).toMatchObject({ errorKey, completedThrough: NOW - 5 * 60_000 });
    expect(writeAutopilotWatchCheckpoint({ ...intent, lastFailure: lastFailure! })).toBe(true);
    expect(readAutopilotWatchCheckpoint()?.lastFailure).toEqual(lastFailure);
    expect(JSON.stringify(readAutopilotWatchCheckpoint()?.lastFailure)).not.toMatch(
      /lossPercent|feePressure|amountOut|provider message/i
    );
  });

  it.each([
    (value: AutopilotWatchCheckpoint) => ({
      ...value,
      lastFailure: { ...copyAutopilotWatchFailure('bots.errors.quote', NOW - 5 * 60_000, value), errorKey: 'secret' },
    }),
    (value: AutopilotWatchCheckpoint) => ({
      ...value,
      lastFailure: { ...copyAutopilotWatchFailure('bots.errors.quote', NOW - 5 * 60_000, value), quote: 'private' },
    }),
    (value: AutopilotWatchCheckpoint) => ({
      ...value,
      lastFailure: {
        ...copyAutopilotWatchFailure('bots.errors.quote', NOW - 5 * 60_000, value),
        completedThrough: NOW + HOUR - 5 * 60_000,
      },
    }),
    (value: AutopilotWatchCheckpoint) => ({
      ...value,
      input: { ...value.input, capital: '9' },
      lastFailure: copyAutopilotWatchFailure('bots.errors.quote', NOW - 5 * 60_000, value),
    }),
  ])('rejects forged, future, expanded or misbound pre-draft failures', (change) => {
    const invalid = change(checkpoint());
    expect(validAutopilotWatchCheckpoint(invalid)).toBe(false);
    sessionStorage.setItem(KEY, JSON.stringify(invalid));
    expect(readAutopilotWatchCheckpoint()).toBeNull();
  });

  it.each([
    (value: AutopilotWatchCheckpoint) => ({
      ...value,
      trainingDiagnostics: { ...training(), completedThrough: NOW + HOUR - 5 * 60_000 },
    }),
    (value: AutopilotWatchCheckpoint) => ({
      ...value,
      trainingDiagnostics: { ...training(), completedThrough: NOW - 8 * 24 * HOUR - 5 * 60_000 },
    }),
    (value: AutopilotWatchCheckpoint) => ({
      ...value,
      input: { ...value.input, capital: '9' },
      trainingDiagnostics: training(),
    }),
    (value: AutopilotWatchCheckpoint) => ({ ...value, identity: 'another-wallet', trainingDiagnostics: training() }),
    (value: AutopilotWatchCheckpoint) => ({
      ...value,
      trainingDiagnostics: { ...training(), stage: 'validation' },
    }),
    (value: AutopilotWatchCheckpoint) => ({
      ...value,
      trainingDiagnostics: { ...training(), feePressure: { sharePercent: '58' } },
    }),
    (value: AutopilotWatchCheckpoint) => ({
      ...value,
      trainingDiagnostics: {
        ...training(),
        failures: [{ candidate: 1, reasons: ['netLoss'], netReturn: '10' }],
      },
    }),
    (value: AutopilotWatchCheckpoint) => ({
      ...value,
      trainingDiagnostics: { ...training(), failures: [{ candidate: 1, reasons: ['validationReturn'] }] },
    }),
    (value: AutopilotWatchCheckpoint) => ({
      ...value,
      trainingDiagnostics: {
        ...training(),
        screening: { submitted: 2, dropped: [{ candidate: 2, reasons: ['priceImpact'], quote: 'secret' }] },
      },
    }),
  ])('rejects an unbound or non-allowlisted nested training record', (change) => {
    const invalid = change(checkpoint());
    expect(validAutopilotWatchCheckpoint(invalid)).toBe(false);
    sessionStorage.setItem(KEY, JSON.stringify(invalid));
    expect(readAutopilotWatchCheckpoint()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('keeps an older training diagnosis on its own hour when a newer hour was attempted', () => {
    const intent = { ...checkpoint(), lastAttemptedCompletedThrough: NOW - 5 * 60_000 + HOUR };
    const value = { ...intent, trainingDiagnostics: training(intent) };
    vi.setSystemTime(NOW + HOUR);
    expect(writeAutopilotWatchCheckpoint(value)).toBe(true);
    expect(readAutopilotWatchCheckpoint()?.trainingDiagnostics?.completedThrough).toBe(NOW - 5 * 60_000);
  });

  it.each([
    (value: AutopilotWatchCheckpoint) => ({ ...value, password: 'secret' }),
    (value: AutopilotWatchCheckpoint) => ({ ...value, version: 2 }),
    (value: AutopilotWatchCheckpoint) => ({ ...value, savedAt: NOW - 8 * 24 * HOUR }),
    (value: AutopilotWatchCheckpoint) => ({ ...value, lastAttemptedCompletedThrough: NOW - 1 }),
    (value: AutopilotWatchCheckpoint) => ({ ...value, input: { ...value.input, capital: '1e1' } }),
    (value: AutopilotWatchCheckpoint) => ({ ...value, input: { ...value.input, apiKey: 'secret' } }),
  ])('rejects malformed, stale or secret-bearing stored data', (change) => {
    const invalid = change(checkpoint());
    expect(validAutopilotWatchCheckpoint(invalid)).toBe(false);
    sessionStorage.setItem(KEY, JSON.stringify(invalid));
    expect(readAutopilotWatchCheckpoint()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('refuses a future attempted hour and oversized storage payload', () => {
    expect(validAutopilotWatchCheckpoint({ ...checkpoint(), lastAttemptedCompletedThrough: NOW + HOUR })).toBe(false);
    sessionStorage.setItem(KEY, 'x'.repeat(4_097));
    expect(readAutopilotWatchCheckpoint()).toBeNull();
  });
});
