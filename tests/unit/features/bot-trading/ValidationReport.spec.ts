import { mount } from '@vue/test-utils';
import { compileStyle, parse } from '@vue/compiler-sfc';
import { compileString } from 'sass';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ValidationReport from '@/features/bot-trading/components/ValidationReport.vue';
import validationSource from '@/features/bot-trading/components/ValidationReport.vue?raw';
import type { ResearchEvaluationEvidence, ResearchFold, ResearchResult } from '@/features/bot-trading/research';
import type { BacktestResult } from '@/features/bot-trading/types';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
  }),
}));

const START = Date.UTC(2026, 2, 1);
const DAY = 86_400_000;
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Explicit test outcomes keep the presentation test independent of the trading engine. */
function result(returnPercent: string, trades: number, drawdownPercent = '2'): BacktestResult {
  return {
    portfolio: { initial: {}, holdings: {}, feesPaidCodec: '0', trades },
    equity: [],
    trades,
    returnPercent,
    drawdownPercent,
    coverage: 1,
  };
}

/** Three disjoint test periods with earlier, expanding training windows. */
function fold(index: number, returnPercent = '1', trades = 5): ResearchFold {
  const trainEnd = START + (index + 1) * DAY;
  return {
    index,
    trainStart: START,
    trainEnd,
    testStart: trainEnd + 7_200_000,
    testEnd: trainEnd + DAY + 7_200_000 - 1,
    settings: {
      preset: 'dca',
      capital: '100',
      tradePercent: 10,
      intervalHours: 1,
      days: 30,
      thresholdPercent: 5,
      fastWindow: 2,
      slowWindow: 3,
      validation: 'walk-forward',
      trainPercent: 50,
      folds: 3,
      optimize: false,
      slippagePercent: '0.1',
      feeBudgetXor: '1',
      networkFeeXor: '0.1',
      swapFeePercent: '0.3',
    },
    train: result('4', 10),
    test: result(returnPercent, trades, String(index)),
    searchCount: 1,
    purge: { candleCount: 1, start: trainEnd + 3_600_000, end: trainEnd + 3_600_000 },
  };
}

/** Reuse the exact component prop boundary; older folds deliberately omit optional benchmark evidence. */
function validation(folds = [fold(1), fold(2), fold(3)]): ResearchResult['validation'] {
  return { mode: 'walk-forward', folds, purgeCandles: 1, tuned: false };
}

/** Precomputed engine evidence for the benchmark and normalized-return columns. */
function evidence(): ResearchEvaluationEvidence {
  return {
    candleCount: 25,
    candidateCount: 24,
    durationMs: DAY,
    warmupCandles: 3,
    returnPerDayPercent: '0.05',
    excessReturnPercent: '0.5',
    benchmark: {
      returnPercent: '0.5',
      drawdownPercent: '1',
      trades: 1,
      initialValue: '100',
      finalValue: '100.5',
      costs: { networkFeeXor: '0.1', networkFeeInCapital: '0.1', swapFeeInCapital: '0.3' },
    },
  };
}

describe('ValidationReport', () => {
  it('shows the held-out-data method without invented fold results before validation exists', () => {
    const wrapper = mount(ValidationReport);
    expect(wrapper.get('h3').text()).toBe('bots.validationInsights.title');
    expect(wrapper.get('[data-testid="validation-verdict"]').text()).toContain('not-validated');
    expect(wrapper.text()).toContain('bots.validationInsights.method');
    expect(wrapper.text()).toContain('bots.research.enableValidation');
    expect(wrapper.findAll('tbody tr')).toHaveLength(0);
    expect(wrapper.find('progress').exists()).toBe(false);
  });

  it('keeps one evidence row per fold and uses signed returns rather than decorative status colors', () => {
    const wrapper = mount(ValidationReport, {
      props: { validation: validation([fold(1, '1'), fold(2, '-2'), fold(3, '0')]) },
    });
    expect(wrapper.findAll('tbody tr')).toHaveLength(3);
    expect(wrapper.findAll('thead th')).toHaveLength(7);
    expect(wrapper.get('[data-testid="validation-positive-periods"]').text()).toBe('1 / 3');
    expect(wrapper.get('[data-testid="validation-median-return"]').text()).toBe('0.00%');
    expect(wrapper.get('[data-testid="validation-worst-drawdown"]').text()).toBe('3.00%');
    expect(wrapper.get('[data-testid="validation-worst-drawdown"]').classes()).toContain('is-negative');
    const rows = wrapper.findAll('tbody tr');
    expect(rows[0].findAll('td')[1].classes()).toContain('is-positive');
    expect(rows[1].findAll('td')[1].classes()).toContain('is-negative');
    expect(rows[2].findAll('td')[1].classes()).toContain('is-neutral');
    expect(wrapper.get('[data-testid="validation-beat-benchmark"]').text()).toBe('0 / 0');
    expect(rows[0].findAll('td')[2].text()).toBe('—');
  });

  it('uses a shared timeline scale, preserves the excluded candle and labels exact UTC dates', () => {
    const wrapper = mount(ValidationReport, { props: { validation: validation() } });
    const width = (id: string) =>
      Number.parseFloat((wrapper.get(`[data-testid="${id}"]`).element as HTMLElement).style.width);
    expect(width('validation-train-2')).toBeGreaterThan(width('validation-train-1'));
    expect(width('validation-test-1')).toBeCloseTo(width('validation-test-3'), 8);
    expect(wrapper.findAll('.timeline-gap')).toHaveLength(3);
    expect(wrapper.get('[data-testid="validation-train-1"]').attributes('title')).toContain('2026-03-01 00:00:00 UTC');
    expect(wrapper.get('[data-testid="validation-test-1"]').attributes('title')).toContain('2026-03-03 02:00:00 UTC');
    expect(wrapper.get('.timeline-dates').text()).toContain('2026-03-04 01:59:59 UTC');
  });

  it('shows only actual evaluator progress and removes it when work ends', async () => {
    const wrapper = mount(ValidationReport, {
      props: { progress: { scope: 'test', fold: 2, scopeCompleted: 2, scopeTotal: 5 } },
    });
    expect(wrapper.get('progress').attributes('value')).toBe('40');
    expect(wrapper.get('[data-testid="validation-progress"]').text()).toContain('bots.validationInsights.scopes.test');
    expect(wrapper.get('[data-testid="validation-progress"]').text()).toContain(
      'bots.validationInsights.periodNumber 2'
    );
    expect(wrapper.get('[data-testid="validation-progress"]').text()).toContain('2 / 5');
    expect(wrapper.text()).not.toContain('bots.research.enableValidation');
    await wrapper.setProps({ progress: { scope: 'train', scopeCompleted: 12, scopeTotal: 10 } });
    expect(wrapper.get('progress').attributes('value')).toBe('100');
    await wrapper.setProps({ progress: { scope: 'train', scopeCompleted: 1, scopeTotal: 0 } });
    expect(wrapper.get('progress').attributes('value')).toBe('0');
    await wrapper.setProps({ progress: null });
    expect(wrapper.find('progress').exists()).toBe(false);
    expect(wrapper.text()).toContain('bots.research.enableValidation');
  });

  it('preserves tiny losses and exact benchmark differences while labeling linear daily rates', () => {
    const first = fold(1, '-0.0001');
    const second = fold(2, '1');
    second.trainEvidence = evidence();
    second.testEvidence = evidence();
    const wrapper = mount(ValidationReport, { props: { validation: validation([first, second]) } });
    expect(wrapper.get('[data-testid="validation-fold-1"]').findAll('td')[1].text()).toContain('-0.00010%');
    expect(wrapper.get('[data-testid="validation-fold-1"]').findAll('td')[1].text()).not.toContain('+0.00%');
    const cells = wrapper.get('[data-testid="validation-fold-2"]').findAll('td');
    expect(cells[1].get('small').text()).toBe('bots.validationInsights.perDay +0.05%');
    expect(cells[2].text()).toBe('+0.50%');
    expect(cells[3].text()).toBe('bots.validationInsights.percentagePoints +0.50');
    expect(wrapper.get('[data-testid="validation-beat-benchmark"]').text()).toBe('1 / 1');
  });

  it('keeps sparse-sample interpretation and detailed assumptions visible without opening a disclosure', () => {
    const values = validation([fold(1, '1', 1)]);
    values.tuned = true;
    const wrapper = mount(ValidationReport, { props: { validation: values } });
    expect(wrapper.get('[data-testid="validation-interpretation"]').text()).toBe(
      'bots.validationInsights.insufficient 1 5'
    );
    expect(wrapper.get('[data-testid="validation-samples"]').text()).toBe('bots.validationInsights.samples 0 1 1');
    const methodology = wrapper.get('[data-testid="validation-details"]');
    expect(wrapper.find('details, summary').exists()).toBe(false);
    expect(methodology.element.tagName).toBe('SECTION');
    expect(methodology.get('h4').text()).toBe('assets.details');
    expect(methodology.get('.validation-criterion').isVisible()).toBe(true);
    expect(methodology.get('[data-testid="validation-notes"]').isVisible()).toBe(true);
    expect(methodology.findAll('tbody tr')).toHaveLength(0);
    expect(wrapper.findAll('.validation-table-scroll tbody tr')).toHaveLength(1);
    expect(methodology.text()).toContain('bots.validationInsights.screen 3 5');
    expect(methodology.text()).toContain('bots.validationInsights.warmup');
    expect(methodology.text()).toContain('bots.validationInsights.benchmarkMethod');
    expect(methodology.text()).toContain('bots.validationInsights.notes.tuning-risk');
    expect(methodology.text()).toContain('bots.validationInsights.notes.no-cost-stress');
  });

  it('shows completed evidence immediately without playback controls, timers, or fabricated phases', async () => {
    const requestFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    const values = validation([fold(1, '1'), fold(2, '-2'), fold(3, '0')]);
    const original = JSON.stringify(values);
    const wrapper = mount(ValidationReport, { props: { validation: values } });
    const timeline = wrapper.get('[data-testid="validation-timeline"]');
    expect(timeline.attributes('aria-label')).toBe('bots.validationInsights.timeline');
    expect(wrapper.find('button').exists()).toBe(false);
    expect(wrapper.find('[data-testid="validation-walkthrough"]').exists()).toBe(false);
    expect(wrapper.find('.timeline-cursor').exists()).toBe(false);
    expect(wrapper.find('.timeline-fill').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('bots.validationMotion.lock');
    expect(wrapper.findAll('.timeline-return').map((value) => value.classes())).toEqual([
      ['timeline-return', 'is-positive'],
      ['timeline-return', 'is-negative'],
      ['timeline-return', 'is-neutral'],
    ]);
    expect(wrapper.findAll('.timeline-dates')).toHaveLength(3);
    expect(wrapper.findAll('.timeline-dates.sr-only')).toHaveLength(0);
    expect(wrapper.get('[data-testid="validation-dates-2"]').text()).toContain('2026-03-04 02:00:00 UTC');
    expect(wrapper.get('.validation-table-scroll').element.closest('details')).toBeNull();
    await wrapper.setProps({ active: false });
    expect(wrapper.findAll('.timeline-period')).toHaveLength(3);
    expect(requestFrame).not.toHaveBeenCalled();
    expect(JSON.stringify(values)).toBe(original);
    expect(wrapper.emitted()).toEqual({});
  });

  it('keeps new evaluator progress separate from previously completed periods', async () => {
    const wrapper = mount(ValidationReport, { props: { validation: validation() } });
    const timeline = wrapper.get('[data-testid="validation-timeline"]');
    const originalEvidence = timeline.html();
    await wrapper.setProps({ progress: { scope: 'test', fold: 2, scopeCompleted: 1, scopeTotal: 4 } });
    expect(wrapper.get('progress').attributes('value')).toBe('25');
    expect(timeline.html()).toBe(originalEvidence);
    expect(wrapper.find('[data-phase]').exists()).toBe(false);
    await wrapper.setProps({ progress: { scope: 'train', fold: 4, scopeCompleted: 3, scopeTotal: 4 } });
    expect(wrapper.get('progress').attributes('value')).toBe('75');
    expect(timeline.html()).toBe(originalEvidence);
    await wrapper.setProps({ progress: null });
    expect(wrapper.find('progress').exists()).toBe(false);
    expect(timeline.html()).toBe(originalEvidence);
  });

  it('shows an excluded-candle gap only when the completed fold records one', () => {
    const first = fold(1);
    delete first.purge;
    const wrapper = mount(ValidationReport, { props: { validation: validation([first]) } });
    expect(wrapper.find('.timeline-gap').exists()).toBe(false);
    expect(wrapper.find('.legend-gap').exists()).toBe(false);
    expect(wrapper.get('[data-testid="validation-dates-1"]').text()).toContain('bots.research.trainingPeriod');
    expect(wrapper.get('[data-testid="validation-dates-1"]').text()).toContain('bots.research.testPeriod');
  });

  it('uses the native theme content and financial-status tokens in either app mode', () => {
    const stylesheet = compileString(parse(validationSource).descriptor.styles[0].content).css;
    const compiled = compileStyle({ source: stylesheet, id: 'data-v-validation-test', scoped: true });
    expect(compiled.errors).toEqual([]);
    expect(compiled.code).toContain('--validation-profit: var(--s-color-status-success-text)');
    expect(compiled.code).toContain('--validation-loss: var(--s-color-status-error-text)');
    expect(compiled.code).not.toMatch(/#[a-f\d]{3,8}\b/i);
    expect(compiled.code).not.toContain('design-system-theme');
    expect(compiled.code).toMatch(/\.validation-heading h3\[data-v-validation-test\][^{]*\{[^}]*text-transform: none/);
    expect(compiled.code).not.toMatch(/animation:|transition:/);
  });
});
