import { describe, expect, it } from 'vitest';
import {
  buildRuleFlow,
  formatRuleFlowValue,
  illustrativeRuleCandles,
  ruleFlowEvidence,
  ruleFlowFrame,
  ruleFlowOutcome,
  ruleFlowPath,
  ruleFlowTrace,
} from '@/features/bot-trading/rule-flow';
import { evaluateStrategyRules } from '@/features/bot-trading/strategy-rules';
import { ruleRecipe } from '@/features/bot-trading/rule-recipes';
import type { RuleCondition, StrategyRules } from '@/features/bot-trading/strategy-rules';
import type { BotCandle } from '@/features/bot-trading/types';

const trend: RuleCondition = { kind: 'trend', window: 3, direction: 'above' };
const rules: StrategyRules = {
  version: 1,
  entry: { operator: 'all', conditions: [trend] },
  exit: { operator: 'all', conditions: [{ ...trend, direction: 'below' }] },
};
const candles = (values: string[]): BotCandle[] =>
  values.map((close, index) => ({ timestamp: index * 3600000, close }));
const history = candles(['100', '100', '104', '100', '94', '103', '102', '101']);

describe('composed-rule lesson model', () => {
  it('uses exact evaluator evidence from each prefix and never changes earlier outcomes with future data', () => {
    const model = buildRuleFlow(rules, history);
    expect(model.source).toBe('historical');
    model.observations.forEach((observation, index) =>
      expect(observation.evaluation).toEqual(evaluateStrategyRules(rules, history.slice(0, index + 1)))
    );
    expect(model.observations.map(({ outcome }) => outcome)).toEqual([
      'warmup',
      'warmup',
      'buy',
      'sell',
      'sell',
      'buy',
      'buy',
      'sell',
    ]);
    const changed = buildRuleFlow(rules, [
      ...history.slice(0, 4),
      ...candles(['300', '200', '100', '400']).map((candle, index) => ({
        ...candle,
        timestamp: (index + 4) * 3600000,
      })),
    ]);
    expect(changed.observations.slice(0, 4)).toEqual(model.observations.slice(0, 4));
    expect(ruleFlowEvidence(model.observations[2], 'entry', 0)).toMatchObject({
      ready: true,
      passed: true,
      value: '104',
    });
  });

  it('distinguishes conflicting signals, no signal and unavailable history without inventing fills', () => {
    const same: StrategyRules = { ...rules, exit: { operator: 'all', conditions: [trend] } };
    expect(buildRuleFlow(same, history).observations[2].outcome).toBe('conflict');
    expect(ruleFlowOutcome(evaluateStrategyRules(rules, candles(['100', '100', '100'])))).toBe('hold');
    expect(buildRuleFlow(rules, []).observations).toEqual([]);
    expect(buildRuleFlow(rules, [{ timestamp: 0, close: '0' }]).observations).toEqual([]);
    expect(buildRuleFlow(rules, [{ timestamp: -1, close: '100' }]).observations).toEqual([]);
    expect(buildRuleFlow(rules, [history[0], history[0]]).observations).toEqual([]);
  });

  it('provides a deterministic explicitly illustrative hourly series and bounds actual tails with warmup', () => {
    const sample = illustrativeRuleCandles(48);
    expect(sample).toEqual(illustrativeRuleCandles(48));
    expect(sample[1].timestamp - sample[0].timestamp).toBe(3600000);
    expect(buildRuleFlow(rules).source).toBe('illustrative');
    expect(buildRuleFlow(rules).observations).toHaveLength(48);
    const long = illustrativeRuleCandles(500);
    const complex: StrategyRules = {
      version: 1,
      entry: {
        operator: 'all',
        conditions: [{ kind: 'return-quantile', direction: 'below', percentile: 20, window: 200 }],
      },
      exit: null,
    };
    const model = buildRuleFlow(complex, long);
    expect(model.observations).toHaveLength(48);
    expect(model.observations[0].evaluation.ready).toBe(true);
    expect(model.observations[0].evaluation).toEqual(evaluateStrategyRules(complex, long.slice(0, 453)));
  });

  it('shows both spring entry and exit signals on the authored lesson without an entry/exit deadlock', () => {
    const spring = ruleRecipe('spring');
    const model = buildRuleFlow(spring);
    const sample = illustrativeRuleCandles(97, 'restoring');
    expect(model.source).toBe('illustrative');
    expect(model.observations).toHaveLength(48);
    expect(model.observations.some(({ outcome }) => outcome === 'buy')).toBe(true);
    expect(model.observations.some(({ outcome }) => outcome === 'sell')).toBe(true);
    expect(model.observations.some(({ outcome }) => outcome === 'conflict')).toBe(false);
    model.observations.forEach((observation, index) => {
      expect(observation.evaluation).toEqual(evaluateStrategyRules(spring, sample.slice(0, index + 50)));
    });
    // Extending the authored lesson cannot rewrite its earlier observations.
    expect(illustrativeRuleCandles(105, 'restoring').slice(0, 97)).toEqual(sample);
    expect(buildRuleFlow(spring, sample).observations).toEqual(model.observations);
    expect(buildRuleFlow(spring, []).observations).toEqual([]);
  });

  it('retains the full 202-close restoring lookback before the first of 48 displayed observations', () => {
    const condition: RuleCondition = { kind: 'restoring', window: 200, direction: 'above', threshold: '0' };
    const configuration: StrategyRules = {
      version: 1,
      entry: { operator: 'all', conditions: [condition] },
      exit: null,
    };
    const sample = illustrativeRuleCandles(500, 'restoring');
    const model = buildRuleFlow(configuration, sample);
    expect(model.observations).toHaveLength(48);
    expect(model.observations[0].evaluation.ready).toBe(true);
    expect(model.observations[0].evaluation).toEqual(evaluateStrategyRules(configuration, sample.slice(0, 453)));
  });

  it('keeps unavailable restoring evidence as plot gaps and resumes once cadence is regular', () => {
    const condition: RuleCondition = { kind: 'restoring', window: 3, direction: 'above', threshold: '0' };
    const configuration: StrategyRules = {
      version: 1,
      entry: { operator: 'all', conditions: [condition] },
      exit: null,
    };
    const sample = candles(['140', '120', '110', '105', '100', '105', '107.5', '108.75', '109.375']).map(
      (candle, index) => ({
        ...candle,
        timestamp: candle.timestamp + (index >= 4 ? 1 : 0),
      })
    );
    const model = buildRuleFlow(configuration, sample);
    expect(model.source).toBe('historical');
    expect(model.observations.slice(0, 8).every(({ outcome }) => outcome === 'warmup')).toBe(true);
    expect(model.observations[8].outcome).toBe('buy');
    const trace = ruleFlowTrace(model, 'entry', 0, 780);
    expect(trace.value.slice(0, 8)).toEqual(Array(8).fill(null));
    expect(trace.threshold.slice(0, 8)).toEqual(Array(8).fill(null));
    expect(trace.value[8]).not.toBeNull();
    expect(formatRuleFlowValue(model.observations[4].evaluation.entryConditions[0].value, condition)).toBe('—');
    expect(buildRuleFlow({} as StrategyRules).observations.every(({ outcome }) => outcome === 'warmup')).toBe(true);
  });

  it('holds actual signal-change observations for 1600ms and completes only once', () => {
    const model = buildRuleFlow(rules, history);
    expect(model.stops).toEqual([2, 3, 5]);
    const at = (2 / 7) * 8000;
    expect(ruleFlowFrame(model, at + 100)).toMatchObject({ index: 2, position: 2, holding: true });
    expect(ruleFlowFrame(model, at + 1599).holding).toBe(true);
    expect(ruleFlowFrame(model, at + 1600).holding).toBe(false);
    expect(ruleFlowFrame(model, model.durationMs)).toMatchObject({ complete: true, index: 7, progress: 1 });
    expect(ruleFlowFrame(model, model.durationMs + 100000)).toEqual(ruleFlowFrame(model, model.durationMs));
    expect(ruleFlowFrame(model, NaN).progress).toBe(0);
  });

  it('keeps price and percentage geometry on separate responsive axes and preserves warmup gaps', () => {
    const momentum: StrategyRules = {
      version: 1,
      entry: { operator: 'all', conditions: [{ kind: 'momentum', window: 2, threshold: '1', direction: 'above' }] },
      exit: null,
    };
    const model = buildRuleFlow(momentum, history);
    for (const width of [342, 1200]) {
      const trace = ruleFlowTrace(model, 'entry', 0, width);
      expect(trace.price[0].x).toBe(18);
      expect(trace.price.at(-1)?.x).toBe(width - 18);
      expect(trace.price.every(({ y }) => y >= 18 && y <= 92)).toBe(true);
      expect(trace.value.slice(0, 2)).toEqual([null, null]);
      expect(trace.value.slice(2).every((point) => point && point.y >= 120 && point.y <= 180)).toBe(true);
      expect(ruleFlowPath(trace.value)).toMatch(/^M/);
    }
    expect(ruleFlowPath([{ x: 1, y: 2 }, null, { x: 3, y: 4 }])).toBe('M1.00,2.00 M3.00,4.00');
  });

  it('does not flatten tiny token prices through an arbitrary absolute plotting range', () => {
    const model = buildRuleFlow(
      rules,
      candles(['0.00000000000000000001', '0.00000000000000000002', '0.00000000000000000003'])
    );
    const trace = ruleFlowTrace(model, 'entry', 0, 780);
    expect(Math.abs(trace.price[0].y - trace.price[2].y)).toBeGreaterThan(50);
  });

  it('keeps percentage units and the sign of tiny exact values visible', () => {
    const momentum: RuleCondition = { kind: 'momentum', window: 2, direction: 'above', threshold: '0' };
    expect(formatRuleFlowValue('-0.000000001', momentum)).toBe('−<0.0001%');
    expect(formatRuleFlowValue('0.000000001', momentum)).toBe('+<0.0001%');
    expect(formatRuleFlowValue('123.456789', trend)).toBe('123.4568');
    expect(formatRuleFlowValue('0', momentum)).toBe('0%');
    expect(formatRuleFlowValue(null, momentum)).toBe('—');
  });

  it.each(['efficiency', 'rsi', 'drawdown', 'restoring'] as const)(
    'formats %s as a signed percent without clipping evidence to threshold bounds',
    (kind) => {
      const condition: RuleCondition = { kind, window: 2, direction: 'above', threshold: '0' };
      expect(formatRuleFlowValue('50.123456', condition)).toBe('50.1235%');
      expect(formatRuleFlowValue('-50', condition)).toBe('-50%');
      expect(formatRuleFlowValue('150', condition)).toBe('150%');
      expect(formatRuleFlowValue('-0.000000001', condition)).toBe('−<0.0001%');
    }
  );
});
