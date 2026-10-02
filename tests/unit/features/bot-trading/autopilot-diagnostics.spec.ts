import { describe, expect, it, vi } from 'vitest';
import catalog from '@/lang/en.json';
import {
  AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE,
  createAutopilotFeeBudgetError,
  createAutopilotImpactPreflightError,
  readAutopilotImpactPreflightDiagnostics,
  createAutopilotOpeningError,
  createAutopilotQualificationError,
  isAutopilotErrorKey,
  isAutopilotFeeBudgetError,
  readAutopilotQualificationDiagnostics,
  type AutopilotQualificationFailure,
  type AutopilotQualificationStage,
  type AutopilotOpeningEvidence,
} from '@/features/bot-trading/autopilot-diagnostics';

describe('autopilot qualification explanations', () => {
  it('recognizes authoritative application errors and rejects unknown key-shaped provider text', () => {
    expect(catalog.bots.codex.expired).toBeTruthy();
    expect(isAutopilotErrorKey('bots.codex.expired')).toBe(true);
    for (const name of Object.keys(catalog.bots.errors)) expect(isAutopilotErrorKey(`bots.errors.${name}`)).toBe(true);
    for (const name of Object.keys(catalog.bots.autopilot.errors))
      expect(isAutopilotErrorKey(`bots.autopilot.errors.${name}`)).toBe(true);
    for (const value of [
      undefined,
      null,
      {},
      'bots.errors.SecretProviderResponse',
      'bots.autopilot.errors.Secret',
      'bots.errors.wallet.extra',
      'bots.errors.wallet\n',
      'bots.errors.toString',
      'bots.errors.__proto__',
      'bots.codex.expired.extra',
      'bots.codex.SecretProviderResponse',
    ])
      expect(isAutopilotErrorKey(value)).toBe(false);
  });

  it('copies only bounded reason codes and cannot retain caller data or mutate later', () => {
    const failures: AutopilotQualificationFailure[] = [
      { candidate: 1, reasons: ['netLoss', 'insufficientTrades', 'netLoss'] },
      { candidate: 3, reasons: ['drawdown'] },
    ];
    Object.assign(failures[0], { results: { returnPercent: '-19' }, providerText: 'untrusted' });
    const error = createAutopilotQualificationError('training', failures);
    failures[0].candidate = 2;
    failures.splice(1);
    const diagnostics = readAutopilotQualificationDiagnostics(error);
    expect(error.message).toBe('bots.autopilot.errors.noStrategy');
    expect(diagnostics).toEqual({
      stage: 'training',
      failures: [
        { candidate: 1, reasons: ['insufficientTrades', 'netLoss'] },
        { candidate: 3, reasons: ['drawdown'] },
      ],
    });
    expect(JSON.stringify(diagnostics)).not.toContain('returnPercent');
    expect(Object.isFrozen(diagnostics)).toBe(true);
    expect(Object.isFrozen(diagnostics!.failures)).toBe(true);
    expect(Object.isFrozen(diagnostics!.failures[0].reasons)).toBe(true);
  });

  it('does not trust provider objects or errors with lookalike diagnostics', () => {
    const diagnostics = { stage: 'validation', failures: [{ candidate: 1, reasons: ['netLoss'] }] };
    expect(readAutopilotQualificationDiagnostics({ diagnostics })).toBeNull();
    expect(readAutopilotQualificationDiagnostics(Object.assign(new Error('noStrategy'), { diagnostics }))).toBeNull();
    expect(readAutopilotQualificationDiagnostics(null)).toBeNull();
  });

  it('retains training execution causes in canonical order without changing validation disclosure', () => {
    const error = createAutopilotQualificationError('training', [
      { candidate: 1, reasons: ['goalTradeCost', 'priceImpact', 'netLoss', 'feeBudget', 'insufficientTrades'] },
    ]);
    expect(readAutopilotQualificationDiagnostics(error)).toEqual({
      stage: 'training',
      failures: [
        { candidate: 1, reasons: ['insufficientTrades', 'netLoss', 'priceImpact', 'goalTradeCost', 'feeBudget'] },
      ],
    });
    for (const reason of ['priceImpact', 'goalTradeCost', 'feeBudget'] as const)
      expect(
        readAutopilotQualificationDiagnostics(
          createAutopilotQualificationError('validation', [{ candidate: 1, reasons: ['insufficientTrades', reason] }])
        )
      ).toBeNull();
  });

  it('separates authored drafts screened by exact quotes from candidates actually tested', () => {
    const screening = {
      submitted: 3,
      dropped: [
        { candidate: 2, reasons: ['noSmallerExactSample', 'priceImpact', 'priceImpact'] as const },
        { candidate: 3, reasons: ['quoteUnavailable', 'feeBudget'] as const },
      ],
    };
    const error = createAutopilotQualificationError(
      'training',
      [{ candidate: 1, reasons: ['netLoss'] }],
      null,
      screening
    );
    screening.dropped[0].candidate = 1;
    expect(readAutopilotQualificationDiagnostics(error)).toEqual({
      stage: 'training',
      failures: [{ candidate: 1, reasons: ['netLoss'] }],
      screening: {
        submitted: 3,
        dropped: [
          { candidate: 2, reasons: ['priceImpact', 'noSmallerExactSample'] },
          { candidate: 3, reasons: ['quoteUnavailable', 'feeBudget'] },
        ],
      },
    });
    expect(Object.isFrozen(readAutopilotQualificationDiagnostics(error)?.screening?.dropped)).toBe(true);
  });

  it('reports an all-screened batch without pretending any strategy reached training', () => {
    const error = createAutopilotQualificationError('training', [], null, {
      submitted: 1,
      dropped: [{ candidate: 1, reasons: ['quoteUnavailable', 'noSmallerExactSample'] }],
    });
    expect(readAutopilotQualificationDiagnostics(error)).toMatchObject({
      stage: 'training',
      failures: [],
      screening: { submitted: 1, dropped: [{ candidate: 1, reasons: ['quoteUnavailable', 'noSmallerExactSample'] }] },
    });
    expect(
      readAutopilotQualificationDiagnostics(
        createAutopilotQualificationError('training', [], null, { submitted: 1, dropped: [] })
      )
    ).toBeNull();
    expect(
      readAutopilotQualificationDiagnostics(
        createAutopilotQualificationError('validation', [{ candidate: 1, reasons: ['drawdown'] }], null, {
          submitted: 1,
          dropped: [],
        })
      )
    ).toBeNull();
    expect(
      readAutopilotQualificationDiagnostics(
        createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['netLoss'] }], null, {
          submitted: 2,
          dropped: [{ candidate: 1, reasons: ['quoteUnavailable'] }],
        })
      )
    ).toBeNull();
  });

  it('retains only bounded dated fee pressure on a training failure', () => {
    const feePressure = {
      sharePercent: '90.7',
      maxLossPercent: '5',
      observedAt: 7_200_000,
      markAt: 3_600_000,
    };
    const error = createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['drawdown'] }], feePressure);
    feePressure.sharePercent = '0';
    expect(readAutopilotQualificationDiagnostics(error)?.feePressure).toEqual({
      sharePercent: '90.7',
      maxLossPercent: '5',
      observedAt: 7_200_000,
      markAt: 3_600_000,
    });
    expect(Object.isFrozen(readAutopilotQualificationDiagnostics(error)?.feePressure)).toBe(true);
    expect(
      readAutopilotQualificationDiagnostics(
        createAutopilotQualificationError('validation', [{ candidate: 1, reasons: ['drawdown'] }], feePressure)
      )
    ).toBeNull();
    expect(
      readAutopilotQualificationDiagnostics(
        createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['drawdown'] }], {
          ...feePressure,
          sharePercent: 'NaN',
        })
      )
    ).toBeNull();
  });

  it('keeps a 25–49% observed fee warning and candidate failures together', () => {
    const failure = { candidate: 1, reasons: ['netLoss', 'goalTradeCost'] as const };
    const pressure = {
      sharePercent: '40.0',
      maxLossPercent: '10',
      observedAt: 7_200_000,
      markAt: 3_600_000,
    };
    expect(
      readAutopilotQualificationDiagnostics(createAutopilotQualificationError('training', [failure], pressure))
    ).toEqual({
      stage: 'training',
      failures: [{ candidate: 1, reasons: ['netLoss', 'goalTradeCost'] }],
      feePressure: pressure,
    });
    expect(
      readAutopilotQualificationDiagnostics(
        createAutopilotQualificationError('training', [failure], { ...pressure, sharePercent: '24.9' })
      )
    ).toBeNull();
  });

  it('cannot promote clones, inherited identities or replacement properties into trusted evidence', () => {
    const error = createAutopilotQualificationError('training', [{ candidate: 1, reasons: ['priceImpact'] }]);
    const expected = readAutopilotQualificationDiagnostics(error);
    for (const clone of [
      structuredClone(error),
      Object.create(error),
      Object.assign(Object.create(Object.getPrototypeOf(error)), error),
    ])
      expect(readAutopilotQualificationDiagnostics(clone)).toBeNull();
    const getter = vi.fn(() => ({ stage: 'validation', failures: [{ candidate: 1, reasons: ['goalTradeCost'] }] }));
    Object.defineProperty(error, 'diagnostics', { get: getter });
    expect(readAutopilotQualificationDiagnostics(error)).toBe(expected);
    expect(getter).not.toHaveBeenCalled();
  });

  it.each(['failure', 'candidate', 'extra', 'reasons', 'reason'] as const)(
    'rejects a %s accessor without invoking it',
    (location) => {
      const getter = vi.fn(() => 'priceImpact');
      const failures: AutopilotQualificationFailure[] = [{ candidate: 1, reasons: ['priceImpact'] }];
      if (location === 'failure') Object.defineProperty(failures, '0', { get: getter });
      else if (location === 'reason') Object.defineProperty(failures[0].reasons, '0', { get: getter });
      else Object.defineProperty(failures[0], location, { get: getter });
      expect(readAutopilotQualificationDiagnostics(createAutopilotQualificationError('training', failures))).toBeNull();
      expect(getter).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['unknown', [{ candidate: 1, reasons: ['coverage'] }]],
    ['training', []],
    ['training', [{ candidate: 0, reasons: ['coverage'] }]],
    ['training', [{ candidate: 4, reasons: ['coverage'] }]],
    ['training', [{ candidate: 1.5, reasons: ['coverage'] }]],
    ['training', [{ candidate: 1, reasons: [] }]],
    ['training', [{ candidate: 1, reasons: ['provider-message'] }]],
    ['training', [{ candidate: 1, reasons: Array(8).fill('netLoss') }]],
    ['training', [{ candidate: 1, reasons: Array(1) }]],
    ['training', Array(1)],
    [
      'training',
      [
        { candidate: 1, reasons: ['netLoss'] },
        { candidate: 1, reasons: ['drawdown'] },
      ],
    ],
    [
      'validation',
      [
        { candidate: 1, reasons: ['netLoss'] },
        { candidate: 2, reasons: ['drawdown'] },
      ],
    ],
  ])('uses the generic error for malformed %s diagnostics', (stage, failures) => {
    const error = createAutopilotQualificationError(
      stage as AutopilotQualificationStage,
      failures as AutopilotQualificationFailure[]
    );
    expect(error.message).toBe('bots.autopilot.errors.noStrategy');
    expect(readAutopilotQualificationDiagnostics(error)).toBeNull();
  });

  it('retains the frozen winner number without metrics or prices for validation', () => {
    const error = createAutopilotQualificationError('validation', [{ candidate: 3, reasons: ['drawdown'] }]);
    expect(readAutopilotQualificationDiagnostics(error)).toEqual({
      stage: 'validation',
      failures: [{ candidate: 3, reasons: ['drawdown'] }],
    });
  });

  it('explains an insufficient observed fee reserve without suggesting a changed amount', () => {
    const error = createAutopilotFeeBudgetError();
    expect(error.message).toBe('bots.autopilot.errors.insufficientFeeBudget');
    expect(readAutopilotQualificationDiagnostics(error)).toBeNull();
    expect(isAutopilotFeeBudgetError(error)).toBe(true);
    expect(isAutopilotFeeBudgetError(new Error(error.message))).toBe(false);
  });
});

describe('autopilot opening explanations', () => {
  const opening = (): AutopilotOpeningEvidence => ({
    lossPercent: '10.6972341206832258130349913977100777',
    maxLossPercent: '5',
    valuationSymbol: 'XOR',
    openedAt: 1789228800000,
    firstTradeAt: 1789232400000,
  });

  it('preserves exact loss precision in detached frozen evidence without candidate claims', () => {
    const input = opening();
    const expected = { ...input };
    const error = createAutopilotOpeningError(input);
    input.lossPercent = '99';
    input.valuationSymbol = 'changed';
    const diagnostic = readAutopilotQualificationDiagnostics(error)!;
    expect(error.message).toBe('bots.autopilot.errors.openingRejected');
    expect(diagnostic).toEqual({ stage: 'opening', failures: [], opening: expected });
    expect(Object.isFrozen(diagnostic)).toBe(true);
    expect(Object.isFrozen(diagnostic.failures)).toBe(true);
    expect(Object.isFrozen(diagnostic.opening)).toBe(true);
    expect(diagnostic.opening).not.toBe(input);
  });

  it('accepts a strict 36-place excess without rounding it to the limit', () => {
    const evidence = { ...opening(), lossPercent: `5.${'0'.repeat(35)}1` };
    expect(readAutopilotQualificationDiagnostics(createAutopilotOpeningError(evidence))?.opening).toEqual(evidence);
  });

  it.each([
    { lossPercent: '5' },
    { lossPercent: '4.99' },
    { lossPercent: '100.000000000000000001' },
    { lossPercent: '-1' },
    { lossPercent: 'NaN' },
    { lossPercent: '1e1' },
    { lossPercent: '01' },
    { lossPercent: `5.${'0'.repeat(36)}1` },
    { lossPercent: 10 },
    { maxLossPercent: '0' },
    { maxLossPercent: null },
    { maxLossPercent: '100' },
    { valuationSymbol: '' },
    { valuationSymbol: 'X'.repeat(33) },
    { valuationSymbol: ' XOR' },
    { valuationSymbol: 'XOR\n' },
    { valuationSymbol: 'X\u202eOR' },
    { valuationSymbol: 'X\u0000OR' },
    { valuationSymbol: 'X\u2028OR' },
    { openedAt: -1 },
    { openedAt: 0.5 },
    { firstTradeAt: 1789228800000 },
    { firstTradeAt: 1789228799999 },
    { firstTradeAt: Number.NaN },
    { firstTradeAt: 8_640_000_000_000_001 },
    { rawPrice: '5.48' },
  ])('rejects malformed or unproven opening evidence %j', (patch) => {
    const error = createAutopilotOpeningError({ ...opening(), ...patch } as AutopilotOpeningEvidence);
    expect(error.message).toBe('bots.autopilot.errors.noStrategy');
    expect(readAutopilotQualificationDiagnostics(error)).toBeNull();
  });

  it('does not invoke accessors or accept lookalike provider errors', () => {
    let reads = 0;
    const evidence = Object.defineProperty(opening(), 'lossPercent', {
      get() {
        reads++;
        return '10';
      },
    });
    const error = createAutopilotOpeningError(evidence);
    expect(readAutopilotQualificationDiagnostics(error)).toBeNull();
    expect(reads).toBe(0);
    expect(
      readAutopilotQualificationDiagnostics(
        Object.assign(new Error('bots.autopilot.errors.openingRejected'), {
          diagnostics: { stage: 'opening', failures: [], opening: opening() },
        })
      )
    ).toBeNull();
  });
});

describe('observed pre-draft impact evidence', () => {
  it('keeps a bounded preflight cause distinct from qualification and rejects lookalike errors', () => {
    const error = createAutopilotImpactPreflightError();
    const expected = { stage: 'preflight', cause: 'priceImpact', sampleCount: 5 };
    const diagnostics = readAutopilotImpactPreflightDiagnostics(error);
    expect(error.message).toBe('bots.errors.policy');
    expect(isAutopilotErrorKey(AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE)).toBe(true);
    expect(diagnostics).toEqual(expected);
    expect(Object.isFrozen(diagnostics)).toBe(true);
    expect(readAutopilotQualificationDiagnostics(error)).toBeNull();
    for (const untrusted of [
      new Error('bots.errors.policy'),
      Object.assign(new Error('bots.errors.policy'), { preflight: expected }),
      structuredClone(error),
      Object.create(error),
      { preflight: expected },
    ])
      expect(readAutopilotImpactPreflightDiagnostics(untrusted)).toBeNull();
    const getter = vi.fn(() => expected);
    Object.defineProperty(error, 'preflight', { get: getter });
    expect(readAutopilotImpactPreflightDiagnostics(error)).toBe(diagnostics);
    expect(getter).not.toHaveBeenCalled();
  });
});
