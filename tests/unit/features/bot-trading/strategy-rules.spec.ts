import { describe, expect, it, vi } from 'vitest';
import { evaluateStrategyRules, parseStrategyRules, requiredRuleCandles } from '@/features/bot-trading/strategy-rules';
import type { RuleCondition, StrategyRules } from '@/features/bot-trading/strategy-rules';

const trend = (window = 2): RuleCondition => ({ kind: 'trend', window, direction: 'above' });
const rules = (condition: RuleCondition): StrategyRules => ({
  version: 1,
  entry: { operator: 'all', conditions: [condition] },
  exit: null,
});
const candles = (prices: string[]) => prices.map((close, index) => ({ timestamp: index * 3_600_000, close }));
const evaluate = (condition: RuleCondition, prices: string[]) =>
  evaluateStrategyRules(rules(condition), candles(prices));

describe('strategy rule validation', () => {
  it('returns an independent canonical deep copy, including signed decimal thresholds', () => {
    const input: StrategyRules = {
      version: 1,
      entry: {
        operator: 'any',
        conditions: [trend(), { kind: 'momentum', window: 12, direction: 'below', threshold: '-1.5000' }],
      },
      exit: { operator: 'all', conditions: [{ kind: 'mad', window: 200, direction: 'above', threshold: '-0.00' }] },
    };
    const parsed = parseStrategyRules(input)!;
    expect(parsed.entry.conditions[1]).toMatchObject({ threshold: '-1.5' });
    expect(parsed.exit!.conditions[0]).toMatchObject({ threshold: '0' });
    expect(input.entry.conditions[1]).toMatchObject({ threshold: '-1.5000' });
    parsed.entry.conditions[0].window = 99;
    parsed.exit!.conditions.pop();
    expect(input.entry.conditions[0].window).toBe(2);
    expect(input.exit!.conditions).toHaveLength(1);
  });

  it.each([
    null,
    [],
    {},
    { ...rules(trend()), version: 2 },
    { ...rules(trend()), extra: true },
    { version: 1, entry: rules(trend()).entry },
    { ...rules(trend()), entry: { operator: 'all', conditions: [] } },
    { ...rules(trend()), entry: { operator: 'ALL', conditions: [trend()] } },
    { ...rules(trend()), entry: { operator: 'all', conditions: [trend()], id: 'hidden' } },
    { ...rules(trend()), entry: { operator: 'all', conditions: [rules(trend()).entry] } },
    { ...rules(trend()), exit: { operator: 'any', conditions: [] } },
    { ...rules(trend()), entry: { operator: 'any', conditions: Array.from({ length: 5 }, () => trend()) } },
  ])('rejects malformed, nested, missing, or extra structure: %j', (value) => {
    expect(() => parseStrategyRules(value)).toThrow('bots.errors.config');
  });

  it.each([
    { ...trend(), window: 1 },
    { ...trend(), window: 201 },
    { ...trend(), window: 2.5 },
    { ...trend(), window: '2' },
    { ...trend(), window: NaN },
    { ...trend(), direction: 'equal' },
    { ...trend(), kind: 'future' },
    { ...trend(), threshold: '1' },
    { ...trend(), id: 'leaf' },
    { kind: 'momentum', window: 2, direction: 'above' },
    { kind: 'momentum', window: 2, direction: 'above', threshold: '100.000000000000000000000000000000000001' },
    { kind: 'deviation', window: 2, direction: 'above', threshold: '-100.01' },
    { kind: 'mad', window: 2, direction: 'above', threshold: '-0.1' },
    { kind: 'efficiency', window: 2, direction: 'above', threshold: '-0.000000000000000000000000000000000001' },
    { kind: 'efficiency', window: 2, direction: 'above', threshold: '100.000000000000000000000000000000000001' },
    { kind: 'rsi', window: 2, direction: 'below', threshold: '-0.1' },
    { kind: 'rsi', window: 2, direction: 'below', threshold: '100.1' },
    { kind: 'restoring', window: 2, direction: 'above', threshold: '-0.1' },
    { kind: 'restoring', window: 2, direction: 'above', threshold: '100.1' },
    { kind: 'drawdown', window: 2, direction: 'below', threshold: '0.000000000000000000000000000000000001' },
    { kind: 'drawdown', window: 2, direction: 'below', threshold: '-100.000000000000000000000000000000000001' },
    { kind: 'return-quantile', window: 2, direction: 'above', percentile: 0 },
    { kind: 'return-quantile', window: 2, direction: 'above', percentile: 100 },
    { kind: 'return-quantile', window: 2, direction: 'above', percentile: 50.5 },
    { kind: 'return-quantile', window: 2, direction: 'above', percentile: '50' },
  ])('rejects invalid condition settings: %j', (condition) => {
    expect(() => parseStrategyRules(rules(condition as RuleCondition))).toThrow('bots.errors.config');
  });

  it.each(['NaN', 'Infinity', '1e1', '+1', ' 1', '01', '.5', '1.', '0.' + '1'.repeat(37), '1'.repeat(101)])(
    'rejects noncanonical threshold notation %s',
    (threshold) => {
      expect(() => parseStrategyRules(rules({ kind: 'momentum', window: 2, direction: 'above', threshold }))).toThrow(
        'bots.errors.config'
      );
    }
  );

  it('accepts the exact size and numeric boundaries', () => {
    const value: StrategyRules = {
      version: 1,
      entry: { operator: 'all', conditions: Array.from({ length: 4 }, () => trend(200)) },
      exit: {
        operator: 'any',
        conditions: [
          { kind: 'momentum', window: 2, direction: 'above', threshold: '-100' },
          { kind: 'deviation', window: 2, direction: 'below', threshold: '100' },
          { kind: 'return-quantile', window: 2, direction: 'above', percentile: 1 },
          { kind: 'return-quantile', window: 200, direction: 'below', percentile: 99 },
        ],
      },
    };
    expect(parseStrategyRules(value)).toEqual(value);
  });

  it.each(['efficiency', 'rsi', 'drawdown', 'restoring'] as const)(
    'strictly parses and independently canonicalizes %s threshold leaves',
    (kind) => {
      const condition: RuleCondition = { kind, window: 2, direction: 'below', threshold: '-0.000' };
      const input = rules(condition);
      expect(parseStrategyRules(input).entry.conditions[0]).toEqual({ ...condition, threshold: '0' });
      expect(condition.threshold).toBe('-0.000');
      for (const threshold of kind === 'drawdown' ? ['-100', '0'] : ['0', '100']) {
        expect(parseStrategyRules(rules({ ...condition, threshold })).entry.conditions[0]).toEqual({
          ...condition,
          threshold,
        });
      }
      for (const invalid of [
        { kind, window: 2, direction: 'above' },
        { ...condition, window: 1 },
        { ...condition, window: 201 },
        { ...condition, threshold: 50 },
        { ...condition, threshold: '5e1' },
        { ...condition, percentile: 50 },
        { ...condition, direction: 'equal' },
      ]) {
        expect(() => parseStrategyRules(rules(invalid as RuleCondition))).toThrow('bots.errors.config');
      }
      const getter = vi.fn(() => '0');
      const accessor = Object.defineProperty({ ...condition }, 'threshold', { get: getter });
      expect(() => parseStrategyRules(rules(accessor))).toThrow('bots.errors.config');
      expect(getter).not.toHaveBeenCalled();
    }
  );

  it('rejects accessor and symbol fields without invoking getters', () => {
    const accessor = Object.defineProperty({}, 'kind', {
      get: () => {
        throw new Error('must not execute');
      },
    });
    expect(() => parseStrategyRules(rules(accessor as RuleCondition))).toThrow('bots.errors.config');
    expect(() => parseStrategyRules({ ...rules(trend()), [Symbol('extra')]: 1 })).toThrow('bots.errors.config');
  });

  it.each([
    [trend(10), 10],
    [{ kind: 'deviation', window: 10, direction: 'above', threshold: '0' }, 10],
    [{ kind: 'momentum', window: 10, direction: 'above', threshold: '0' }, 11],
    [{ kind: 'efficiency', window: 10, direction: 'above', threshold: '50' }, 11],
    [{ kind: 'rsi', window: 10, direction: 'below', threshold: '30' }, 11],
    [{ kind: 'drawdown', window: 10, direction: 'below', threshold: '-10' }, 10],
    [{ kind: 'restoring', window: 10, direction: 'above', threshold: '0' }, 12],
    [{ kind: 'breakout', window: 10, direction: 'below' }, 11],
    [{ kind: 'mad', window: 10, direction: 'below', threshold: '2' }, 12],
    [{ kind: 'return-quantile', window: 10, direction: 'above', percentile: 75 }, 12],
  ] as [RuleCondition, number][])('counts exact warm-up for %j', (condition, expected) => {
    expect(requiredRuleCandles(rules(condition))).toBe(expected);
  });

  it('includes exit lookbacks and returns zero for invalid rules', () => {
    const value = rules(trend());
    value.exit = { operator: 'all', conditions: [{ kind: 'mad', window: 200, direction: 'above', threshold: '1' }] };
    expect(requiredRuleCandles(value)).toBe(202);
    expect(requiredRuleCandles({} as StrategyRules)).toBe(0);
  });
});

describe('exact close-only rule evaluation', () => {
  it('shares duplicate MAD computation within an observation while returning independent evidence', () => {
    const condition: RuleCondition = { kind: 'mad', window: 2, direction: 'below', threshold: '6' };
    const configuration: StrategyRules = {
      version: 1,
      entry: { operator: 'all', conditions: Array.from({ length: 4 }, () => ({ ...condition })) },
      exit: { operator: 'any', conditions: Array.from({ length: 4 }, () => ({ ...condition })) },
    };
    const sort = vi.spyOn(Array.prototype, 'sort');
    let actual: ReturnType<typeof evaluateStrategyRules>;
    let sortCalls: number;
    try {
      actual = evaluateStrategyRules(configuration, candles(['100', '110', '132', '264']));
      sortCalls = sort.mock.calls.length;
    } finally {
      sort.mockRestore();
    }
    expect(sortCalls!).toBe(2); // One median of returns, one median of absolute deviations.
    expect(actual!).toMatchObject({ entry: true, exit: true, ready: true });
    expect(new Set([...actual!.entryConditions, ...actual!.exitConditions]).size).toBe(8);
    actual!.entryConditions[0].value = '999';
    expect(actual!.exitConditions[0].value).toBe('5');
    expect(actual!.entryConditions[1].value).toBe('5');
    // A new observation must recompute; this prior return sample has MAD zero.
    const changed = evaluateStrategyRules(configuration, candles(['100', '110', '121', '264']));
    expect(changed.entryConditions[0].value).toBe('0');
  });

  it('keeps different thresholds and directions separate in the observation cache', () => {
    const configuration: StrategyRules = {
      version: 1,
      entry: {
        operator: 'any',
        conditions: [
          { kind: 'mad', window: 2, direction: 'below', threshold: '4' },
          { kind: 'mad', window: 2, direction: 'below', threshold: '6' },
          { kind: 'mad', window: 2, direction: 'above', threshold: '6' },
        ],
      },
      exit: null,
    };
    const actual = evaluateStrategyRules(configuration, candles(['100', '110', '132', '264']));
    expect(actual.entryConditions.map((item) => item.passed)).toEqual([false, true, false]);
    expect(actual.entryConditions.map((item) => item.threshold)).toEqual(['4', '6', '6']);
    expect(actual.entry).toBe(true);
  });

  it('compares the latest close with its inclusive window mean', () => {
    expect(evaluate(trend(3), ['1000', '1', '2', '3']).entryConditions[0]).toEqual({
      kind: 'trend',
      ready: true,
      passed: true,
      value: '3',
      threshold: '2',
    });
    expect(evaluate({ ...trend(3), direction: 'below' }, ['3', '2', '1']).entry).toBe(true);
  });

  it('computes N-period simple momentum in percent, not a price difference or N-1 return', () => {
    const condition: RuleCondition = { kind: 'momentum', window: 2, direction: 'above', threshold: '20' };
    expect(evaluate(condition, ['100', '110', '125']).entryConditions[0]).toMatchObject({ value: '25', passed: true });
    expect(evaluate({ ...condition, direction: 'below', threshold: '-20' }, ['100', '110', '75']).entry).toBe(true);
    expect(evaluate(condition, ['100', '110', '120']).entry).toBe(false);
  });

  it('uses preceding channel closes and strict boundaries in both directions', () => {
    expect(
      evaluate({ kind: 'breakout', window: 2, direction: 'above' }, ['1000', '9', '10', '11']).entryConditions[0]
    ).toMatchObject({ value: '11', threshold: '10', passed: true });
    expect(
      evaluate({ kind: 'breakout', window: 2, direction: 'below' }, ['0.1', '9', '10', '8']).entryConditions[0]
    ).toMatchObject({ value: '8', threshold: '9', passed: true });
    expect(evaluate({ kind: 'breakout', window: 2, direction: 'above' }, ['9', '10', '10']).entry).toBe(false);
  });

  it('measures signed deviation from the inclusive mean in percent', () => {
    const condition: RuleCondition = { kind: 'deviation', window: 3, direction: 'above', threshold: '25' };
    expect(evaluate(condition, ['6', '9', '15']).entryConditions[0]).toMatchObject({ value: '50', passed: true });
    expect(
      evaluate({ ...condition, direction: 'below', threshold: '-30' }, ['15', '9', '6']).entryConditions[0]
    ).toMatchObject({ value: '-40', passed: true });
  });

  it('measures unsigned efficiency across exactly N price changes, including the latest change', () => {
    const condition: RuleCondition = { kind: 'efficiency', window: 3, direction: 'above', threshold: '49' };
    // Net distance 20 / traveled distance (10 + 10 + 20) = 50%.
    expect(evaluate(condition, ['999', '100', '110', '100', '120']).entryConditions[0]).toMatchObject({
      value: '50',
      threshold: '49',
      passed: true,
    });
    expect(evaluate(condition, ['120', '110', '120', '100']).entryConditions[0].value).toBe('50');
    for (const prices of [
      ['100', '110', '120', '130'],
      ['130', '120', '110', '100'],
    ]) {
      expect(evaluate(condition, prices).entryConditions[0].value).toBe('100');
    }
    expect(evaluate(condition, ['100', '110', '120', '100']).entryConditions[0].value).toBe('0');
  });

  it('computes simple-window RSI from gains and losses in price units without recursive smoothing', () => {
    const condition: RuleCondition = { kind: 'rsi', window: 3, direction: 'above', threshold: '74' };
    // Gains 10 + 20 and losses 10 -> 75%; percentage-return averaging would differ.
    expect(evaluate(condition, ['999', '100', '110', '100', '120']).entryConditions[0]).toMatchObject({
      value: '75',
      threshold: '74',
      passed: true,
    });
    expect(evaluate(condition, ['120', '110', '120', '100']).entryConditions[0].value).toBe('25');
    expect(evaluate(condition, ['100', '100', '110', '120']).entryConditions[0].value).toBe('100');
    expect(evaluate(condition, ['120', '110', '100', '100']).entryConditions[0].value).toBe('0');
    expect(evaluate(condition, ['100', '100', '100', '100']).entryConditions[0].value).toBe('50');
  });

  it('measures signed drawdown from the trailing inclusive close peak', () => {
    const condition: RuleCondition = { kind: 'drawdown', window: 3, direction: 'below', threshold: '-24' };
    // The older 999 close has left the rolling window; (90 / 120 - 1) * 100 = -25%.
    expect(evaluate(condition, ['999', '120', '100', '90']).entryConditions[0]).toMatchObject({
      value: '-25',
      threshold: '-24',
      passed: true,
    });
    expect(evaluate(condition, ['120', '100', '150']).entryConditions[0].value).toBe('0');
    expect(evaluate(condition, ['120', '100', '120']).entryConditions[0].value).toBe('0');
  });

  it('fits restoring strength with an OLS intercept over only the preceding N transitions', () => {
    const condition: RuleCondition = { kind: 'restoring', window: 3, direction: 'above', threshold: '49' };
    // Prior process is p_next = 50 + 0.5 * p_lag, so Δp = 50 - 0.5 * p_lag.
    const expected = { value: '50', threshold: '49', passed: true };
    expect(evaluate(condition, ['9999', '140', '120', '110', '105', '1000']).entryConditions[0]).toMatchObject(
      expected
    );
    expect(evaluate(condition, ['140', '120', '110', '105', '1']).entryConditions[0]).toMatchObject(expected);
    expect(
      evaluate(condition, ['9007199254741133', '9007199254741113', '9007199254741103', '9007199254741098', '1'])
        .entryConditions[0]
    ).toMatchObject(expected);
    for (const direction of ['above', 'below'] as const) {
      expect(evaluate({ ...condition, direction, threshold: '50' }, ['140', '120', '110', '105', '1000']).entry).toBe(
        false
      );
    }
  });

  it('reports divergent and oscillatory restoring estimates outside the configurable threshold range', () => {
    const condition: RuleCondition = { kind: 'restoring', window: 3, direction: 'above', threshold: '0' };
    // Prior p_next = -50 + 1.5 * p_lag diverges; -100 * b = -50.
    expect(evaluate(condition, ['140', '160', '190', '235', '100']).entryConditions[0]).toMatchObject({
      value: '-50',
      passed: false,
    });
    // Prior p_next = 200 - 0.5 * p_lag oscillates; -100 * b = 150.
    expect(evaluate(condition, ['140', '130', '135', '132.5', '100']).entryConditions[0]).toMatchObject({
      value: '150',
      passed: true,
    });
    expect(
      evaluate({ ...condition, direction: 'below', threshold: '100' }, ['140', '130', '135', '132.5', '100']).entry
    ).toBe(false);
    expect(evaluate(condition, ['100', '110', '120', '130', '100']).entryConditions[0]).toMatchObject({
      value: '0',
      passed: false,
    });
  });

  it('compares fractional restoring estimates without rounding price observations or regression sums', () => {
    const threshold = '33.' + '3'.repeat(36);
    const condition: RuleCondition = { kind: 'restoring', window: 3, direction: 'above', threshold };
    // Multiplying each price by the minimum precision unit leaves the slope at -1/3.
    const prices = ['81', '54', '36', '24', '99'].map((digits) => '0.' + '0'.repeat(34) + digits);
    expect(evaluate(condition, prices).entryConditions[0]).toMatchObject({ value: threshold, threshold, passed: true });
  });

  it('leaves restoring evidence unavailable for insufficient data or zero lag-price variance', () => {
    const condition: RuleCondition = { kind: 'restoring', window: 3, direction: 'above', threshold: '0' };
    for (const prices of [
      [],
      ['140', '120', '110', '105'],
      ['100', '100', '100', '100', '200'],
      ['100', '100', '100', '110', '200'],
    ]) {
      expect(evaluate(condition, prices)).toMatchObject({
        ready: false,
        entry: false,
        entryConditions: [{ kind: 'restoring', ready: false, passed: false, value: null, threshold: null }],
      });
    }
    expect(evaluate(condition, ['140', '120', '110', '105', '100']).ready).toBe(true);
  });

  it('requires uniform cadence only for the restoring lookback, including the decision observation', () => {
    const condition: RuleCondition = { kind: 'restoring', window: 3, direction: 'above', threshold: '0' };
    const history = candles(['140', '120', '110', '105', '100']);
    for (const index of [1, 2, 3, 4]) {
      const uneven = history.map((candle, at) => ({ ...candle, timestamp: candle.timestamp + (at >= index ? 1 : 0) }));
      expect(evaluateStrategyRules(rules(condition), uneven)).toMatchObject({ ready: false, entry: false });
      expect(
        evaluateStrategyRules(rules({ kind: 'rsi', window: 3, direction: 'below', threshold: '30' }), uneven).ready
      ).toBe(true);
    }
    const oldGap = [
      { timestamp: 0, close: '999' },
      ...history.map((candle) => ({ ...candle, timestamp: candle.timestamp + 1 })),
    ];
    expect(evaluateStrategyRules(rules(condition), oldGap).entry).toBe(true);
    const mixed = rules(condition);
    mixed.entry.operator = 'any';
    mixed.entry.conditions.push({ kind: 'rsi', window: 3, direction: 'below', threshold: '30' });
    const gap = history.map((candle, index) => ({ ...candle, timestamp: candle.timestamp + (index === 4 ? 1 : 0) }));
    const result = evaluateStrategyRules(mixed, gap);
    expect(result.entryConditions[1].passed).toBe(true);
    expect(result).toMatchObject({ ready: false, entry: false });
  });

  it.each([
    ['efficiency', 3, '50', ['100', '110', '100', '120']],
    ['rsi', 3, '75', ['100', '110', '100', '120']],
    ['drawdown', 3, '-25', ['120', '100', '90']],
  ] as const)('keeps non-flat %s equality strict in both directions', (kind, window, threshold, prices) => {
    for (const direction of ['above', 'below'] as const) {
      const actual = evaluate({ kind, window, direction, threshold }, [...prices]);
      expect(actual.entryConditions[0]).toMatchObject({ ready: true, value: threshold, passed: false });
      expect(actual.entry).toBe(false);
    }
  });

  it.each([
    ['efficiency', 'above', '33.' + '3'.repeat(36)],
    ['rsi', 'above', '66.' + '6'.repeat(36)],
    ['drawdown', 'below', '-33.' + '3'.repeat(36)],
  ] as const)(
    'compares exact %s fractions before truncating even the smallest supported closes',
    (kind, direction, threshold) => {
      const prices = ['1', '3', '2'].map((digit) => '0.' + '0'.repeat(35) + digit);
      const actual = evaluate({ kind, window: 2, direction, threshold }, prices);
      expect(actual.entryConditions[0]).toMatchObject({ value: threshold, threshold, passed: true });
      expect(actual.entry).toBe(true);
    }
  );

  it.each(['efficiency', 'rsi', 'drawdown'] as const)(
    'warms up %s exactly and evaluates only the supplied trailing decision history',
    (kind) => {
      const condition: RuleCondition = { kind, window: 2, direction: 'below', threshold: '0' };
      const count = kind === 'drawdown' ? 2 : 3;
      expect(evaluate(condition, Array(count - 1).fill('100'))).toMatchObject({ ready: false, entry: false });
      expect(evaluate(condition, Array(count).fill('100')).ready).toBe(true);
      const full = candles(['100', '110', '120', '60']);
      const prefix = full.slice(0, 3);
      const before = evaluateStrategyRules(rules(condition), prefix);
      const after = evaluateStrategyRules(rules(condition), full);
      expect(before.entryConditions[0].value).toBe(kind === 'drawdown' ? '0' : '100');
      expect(after.entryConditions[0].value).not.toBe(before.entryConditions[0].value);
      expect(evaluateStrategyRules(rules(condition), prefix)).toEqual(before);
      // A future observation inserted before an earlier close invalidates the entire sample.
      expect(evaluateStrategyRules(rules(condition), [full[0], full[3], full[2]])).toMatchObject({
        ready: false,
        entry: false,
        exit: false,
      });
    }
  );

  it('computes unscaled MAD around the median of prior returns, excluding the current return', () => {
    const condition: RuleCondition = { kind: 'mad', window: 3, direction: 'below', threshold: '1' };
    // Prior returns are 0%, 0%, 10%; their median and MAD are both zero.
    expect(evaluate(condition, ['100', '100', '100', '110', '990']).entryConditions[0]).toMatchObject({
      value: '0',
      threshold: '1',
      passed: true,
    });
    expect(evaluate(condition, ['100', '100', '100', '110', '1']).entryConditions[0].value).toBe('0');
    // Two prior returns are 10%, 20%; median 15%, absolute deviations 5%, 5%.
    const even = { ...condition, window: 2, direction: 'above' as const, threshold: '4' };
    expect(evaluate(even, ['100', '110', '132', '264']).entryConditions[0]).toMatchObject({ value: '5', passed: true });
  });

  it('interpolates Type-7 quantiles exactly from prior percent returns', () => {
    const condition: RuleCondition = { kind: 'return-quantile', window: 3, direction: 'above', percentile: 25 };
    // Prior returns 0%, 10%, 20% -> Q25 = 5%; current return = 6%.
    expect(evaluate(condition, ['100', '100', '110', '132', '139.92']).entryConditions[0]).toMatchObject({
      value: '6',
      threshold: '5',
      passed: true,
    });
    expect(evaluate(condition, ['100', '100', '110', '132', '138.6']).entry).toBe(false);
    expect(evaluate({ ...condition, direction: 'below' }, ['100', '100', '110', '132', '137.28']).entry).toBe(true);
  });

  it('preserves sub-20-place prices and compares fractions before display rounding', () => {
    expect(
      evaluate(trend(), ['0.000000000000000000000000000000000001', '0.000000000000000000000000000000000002']).entry
    ).toBe(true);
    // Return is 100/3%, strictly above its 36-place truncated decimal threshold.
    expect(
      evaluate({ kind: 'momentum', window: 2, direction: 'above', threshold: '33.' + '3'.repeat(36) }, ['3', '3', '4'])
        .entry
    ).toBe(true);
    // A huge price differs by a single decimal unit; Number coercion would lose it.
    expect(
      evaluate(trend(), ['9007199254740993.000000000000000001', '9007199254740993.000000000000000002']).entry
    ).toBe(true);
  });

  it('returns false on constant-price equality for every kind and direction', () => {
    const conditions: RuleCondition[] = [
      trend(),
      { kind: 'breakout', window: 2, direction: 'above' },
      ...(['momentum', 'deviation', 'mad', 'efficiency', 'drawdown'] as const).map((kind) => ({
        kind,
        window: 2,
        direction: 'above' as const,
        threshold: '0',
      })),
      { kind: 'rsi', window: 2, direction: 'above', threshold: '50' },
      { kind: 'return-quantile', window: 2, direction: 'above', percentile: 99 },
    ];
    for (const condition of conditions) {
      for (const direction of ['above', 'below'] as const) {
        const result = evaluate({ ...condition, direction }, ['1', '1', '1', '1']);
        expect(result.ready).toBe(true);
        expect(result.entry).toBe(false);
      }
    }
  });

  it('keeps all leaves as evidence and applies all/any with separate exits', () => {
    const value: StrategyRules = {
      version: 1,
      entry: {
        operator: 'all',
        conditions: [trend(), { kind: 'momentum', window: 2, direction: 'below', threshold: '0' }],
      },
      exit: {
        operator: 'any',
        conditions: [
          { ...trend(), direction: 'below' },
          { kind: 'breakout', window: 2, direction: 'above' },
        ],
      },
    };
    const actual = evaluateStrategyRules(value, candles(['1', '2', '3']));
    expect(actual).toMatchObject({ ready: true, entry: false, exit: true });
    expect(actual.entryConditions.map((item) => item.passed)).toEqual([true, false]);
    value.entry.operator = 'any';
    expect(evaluateStrategyRules(value, candles(['1', '2', '3'])).entry).toBe(true);
  });

  it('requires all entry and exit leaves to warm up even when an ANY leaf passes', () => {
    const value = rules(trend());
    value.entry.operator = 'any';
    value.entry.conditions.push({ kind: 'mad', window: 2, direction: 'below', threshold: '1' });
    const actual = evaluateStrategyRules(value, candles(['1', '2']));
    expect(actual).toMatchObject({ ready: false, entry: false, exit: false });
    expect(actual.entryConditions[0].passed).toBe(true);
    expect(actual.entryConditions[1]).toMatchObject({ ready: false, value: null, threshold: null });
    value.entry.conditions.pop();
    value.exit = { operator: 'all', conditions: [{ kind: 'breakout', window: 3, direction: 'above' }] };
    expect(evaluateStrategyRules(value, candles(['1', '2'])).entry).toBe(false);
  });

  it.each(['0', '-1', 'NaN', 'Infinity', '1e3', '01', '.5', ' 1', '0.' + '1'.repeat(37)])(
    'fails closed on invalid close %s',
    (close) => {
      expect(evaluate(trend(), ['1', close])).toMatchObject({ ready: false, entry: false, exit: false });
    }
  );

  it('fails closed on duplicate, reversed, negative, fractional and unsafe timestamps', () => {
    for (const timestamp of [0, -1, 0.5, NaN, Number.MAX_SAFE_INTEGER + 1]) {
      expect(
        evaluateStrategyRules(rules(trend()), [
          { close: '1', timestamp: 0 },
          { close: '2', timestamp },
        ])
      ).toMatchObject({ ready: false, entry: false, exit: false });
    }
    expect(evaluateStrategyRules(rules(trend()), candles([]))).toMatchObject({ ready: false, entry: false });
    expect(evaluateStrategyRules({} as StrategyRules, candles(['1', '2']))).toMatchObject({
      ready: false,
      entry: false,
    });
  });

  it.each([
    { kind: 'return-quantile', window: 3, direction: 'below', percentile: 75 },
    { kind: 'efficiency', window: 3, direction: 'above', threshold: '50' },
    { kind: 'rsi', window: 3, direction: 'above', threshold: '50' },
    { kind: 'drawdown', window: 3, direction: 'below', threshold: '-10' },
    { kind: 'restoring', window: 3, direction: 'above', threshold: '0' },
  ] as RuleCondition[])('does not mutate frozen %j rules or candle arrays', (condition) => {
    const value = rules(condition);
    const history = candles(['100', '110', '110', '132', '132']);
    const snapshot = JSON.stringify({ value, history });
    value.entry.conditions.forEach(Object.freeze);
    Object.freeze(value.entry.conditions);
    Object.freeze(value.entry);
    Object.freeze(value);
    history.forEach(Object.freeze);
    Object.freeze(history);
    expect(evaluateStrategyRules(value, history).ready).toBe(true);
    expect(JSON.stringify({ value, history })).toBe(snapshot);
  });
});
