import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { XOR, VAL } from '@/lib/substrate/sdk/assets/consts';
import ExperimentCard from '@/features/bot-trading/components/ExperimentCard.vue';
import ExperimentEquity from '@/features/bot-trading/components/ExperimentEquity.vue';
import { RESEARCH_DEFAULT_SETTINGS, runResearch } from '@/features/bot-trading/research';
import type { ExperimentRun } from '@/features/bot-trading/experiments';

vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const assets = [XOR, VAL];
const settings = {
  ...RESEARCH_DEFAULT_SETTINGS,
  validation: 'none' as const,
  historyStartAt: undefined,
  historyEndAt: undefined,
  intervalHours: 1,
  networkFeeXor: '0.1',
  swapFeePercent: '0',
  sellNetworkFeeXor: '0.1',
  sellSwapFeePercent: '0',
};
const research = () =>
  runResearch(settings, assets, {
    kind: 'historical',
    history: {
      candles: ['2', '3', '4', '3'].map((close, index) => ({
        close,
        feeClose: '1',
        timestamp: Date.UTC(2026, 8, 1, index),
      })),
      missing: 0,
      denominationVerified: true,
    },
  });
const run = (): ExperimentRun => ({
  id: 'run-1',
  name: 'Dip study',
  settings,
  status: 'complete',
  progress: 1,
  result: research(),
  createdAt: Date.UTC(2026, 8, 1),
});

describe('ExperimentCard', () => {
  it.each(['loss', 'no trades'] as const)(
    'offers practice first for a completed %s result and keeps live review explicit',
    async (scenario) => {
      const experiment = run();
      experiment.result!.result.returnPercent = scenario === 'loss' ? '-12.5' : '0';
      experiment.result!.result.trades = scenario === 'loss' ? 2 : 0;
      if (scenario === 'no trades') experiment.result!.candidates = [];
      const original = structuredClone(experiment);
      const wrapper = mount(ExperimentCard, {
        props: { run: experiment },
        global: { stubs: { TradeDistribution: true } },
      });
      const actions = wrapper.get('.experiment-launch').findAll('button');
      expect(actions[0].attributes('data-testid')).toBe('experiment-paper');
      expect(actions[0].text()).toContain('bots.simpleResults.practiceFirst');
      expect(actions[1].text()).toBe('bots.calmSetup.reviewLive');
      expect(wrapper.get('[data-testid="experiment-return"]').text()).toBe(scenario === 'loss' ? '-12.50%' : '0.00%');
      await actions[0].trigger('click');
      expect(wrapper.emitted('savePaper')).toEqual([[]]);
      expect(wrapper.emitted('createBot')).toBeUndefined();
      await actions[1].trigger('click');
      expect(wrapper.emitted('createBot')).toEqual([[]]);
      expect(experiment).toEqual(original);
      wrapper.unmount();
    }
  );

  it('leads with marked starting/final values, after-cost change and a holding comparison before the start action', () => {
    const experiment = run();
    experiment.result!.result.equity = [
      { timestamp: 1, value: '100', benchmark: '100' },
      { timestamp: 2, value: '115.123456', benchmark: '110' },
    ];
    const wrapper = mount(ExperimentCard, {
      props: { run: experiment, selected: true },
      global: { stubs: { TradeDistribution: true } },
    });
    expect(wrapper.get('[data-testid="experiment-start-value"]').text()).toBe('100 XOR');
    expect(wrapper.get('[data-testid="experiment-final-value"]').text()).toBe('115.1234 XOR');
    expect(wrapper.get('[data-testid="experiment-net-change"]').text()).toBe('+15.1234 XOR');
    expect(wrapper.get('[data-testid="experiment-vs-holding"]').text()).toBe('+5.1234XOR');
    expect(wrapper.text()).toContain('bots.simpleResults.historicalNote');
    const html = wrapper.html();
    expect(html.indexOf('data-testid="experiment-outcome"')).toBeLessThan(
      html.indexOf('data-testid="experiment-create"')
    );
    expect(html.indexOf('data-testid="experiment-create"')).toBeLessThan(html.indexOf('<trade-distribution-stub'));
    expect(wrapper.findComponent({ name: 'TradeDistribution' }).props('valuationTimestamp')).toBe(
      experiment.result!.source.history.candles.at(-1)!.timestamp
    );
    wrapper.unmount();
  });

  it('shows actual check/signal/fill counts and routes the dominant blockage to editable settings', async () => {
    const experiment = run();
    const source = experiment.result!.candidates[0];
    experiment.result!.candidates = [
      { ...source, selected: true, checks: [{ key: 'signal', passed: true }] },
      {
        ...source,
        selected: false,
        checks: [
          { key: 'signal', passed: false },
          { key: 'balance', passed: false },
        ],
      },
      {
        ...source,
        selected: false,
        checks: [
          { key: 'signal', passed: true },
          { key: 'balance', passed: false },
        ],
      },
    ];
    const wrapper = mount(ExperimentCard, {
      props: { run: experiment },
      global: { stubs: { TradeDistribution: true } },
    });
    expect(wrapper.get('[data-testid="experiment-checks"]').text()).toBe('3');
    expect(wrapper.get('[data-testid="experiment-signals"]').text()).toBe('2');
    expect(wrapper.get('[data-testid="experiment-trades"]').text()).toBe('1');
    expect(wrapper.get('[data-testid="experiment-dominant-block"]').text()).toBe(
      'bots.simpleResults.blockReason.balance'
    );
    await wrapper.get('[data-testid="experiment-review"]').trigger('click');
    expect(wrapper.emitted('reviewSettings')).toEqual([['order-size']]);
    await wrapper.get('[data-testid="experiment-paper"]').trigger('click');
    expect(wrapper.emitted('savePaper')).toEqual([[]]);
    expect(experiment.result!.candidates).toHaveLength(3);
    wrapper.unmount();
  });

  it('leaves decision inspection inside the chart and forwards its review action', async () => {
    const wrapper = mount(ExperimentCard, {
      props: { run: run(), selected: true },
      global: { stubs: { TradeDistribution: true } },
    });
    const renderer = wrapper.findComponent({ name: 'TradeDistribution' });
    renderer.vm.$emit('select', 'trade-1');
    renderer.vm.$emit('reviewLimits');
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('select')).toBeUndefined();
    expect(wrapper.emitted('reviewSettings')).toEqual([['order-size']]);
    wrapper.unmount();
  });

  it('keeps full-period, held-out, drawdown and holding evidence together with the test window', () => {
    const experiment = run();
    const result = experiment.result!;
    result.result.returnPercent = '435.2';
    result.result.drawdownPercent = '76.29';
    result.validation = {
      ...result.validation,
      mode: 'holdout',
      folds: [
        {
          index: 1,
          trainStart: Date.UTC(2026, 7, 1),
          trainEnd: Date.UTC(2026, 7, 20),
          testStart: Date.UTC(2026, 7, 22),
          testEnd: Date.UTC(2026, 8, 1),
          settings: result.settings,
          train: result.result,
          test: { ...result.result, returnPercent: '0', trades: 0 },
          searchCount: 1,
        },
      ],
    };
    const wrapper = mount(ExperimentCard, {
      props: { run: experiment },
      global: { stubs: { TradeDistribution: true } },
    });
    expect(wrapper.get('[data-testid="experiment-return"]').text()).toBe('+435.20%');
    expect(wrapper.get('[data-testid="experiment-heldout"]').text()).toBe('0.00%');
    expect(wrapper.get('[data-testid="experiment-drawdown"]').text()).toBe('76.29%');
    expect(wrapper.get('[data-testid="experiment-benchmark"]').text()).toBe('0.00%');
    expect(wrapper.get('[data-testid="experiment-no-heldout-fills"]').text()).toContain(
      'bots.uxResults.noHeldOutFills'
    );
    expect(wrapper.text()).toContain('2026-08-22 – 2026-09-01 UTC');
    expect(wrapper.getComponent({ name: 'TradeDistribution' }).isVisible()).toBe(true);
    wrapper.unmount();
  });

  it('keeps completed charts visible regardless of selection and distinguishes disabled validation from zero', async () => {
    const wrapper = mount(ExperimentCard, {
      props: { run: run() },
      global: { stubs: { TradeDistribution: true } },
    });
    expect(wrapper.get('[data-testid="experiment-heldout"]').text()).toBe('—');
    expect(wrapper.text()).toContain('bots.uxResults.notTested');
    const renderer = wrapper.getComponent({ name: 'TradeDistribution' });
    expect(renderer.isVisible()).toBe(true);
    expect(wrapper.get('.experiment-trace').isVisible()).toBe(true);
    expect(wrapper.get('.mini-equity').isVisible()).toBe(true);
    expect(wrapper.find('details, summary, [data-testid="experiment-show-flow"]').exists()).toBe(false);
    expect(wrapper.emitted('select')).toBeUndefined();
    await wrapper.setProps({ selected: true });
    expect(wrapper.getComponent({ name: 'TradeDistribution' }).element).toBe(renderer.element);
    await wrapper.setProps({ selected: false });
    expect(renderer.isVisible()).toBe(true);
    expect(wrapper.get('.experiment-trace').isVisible()).toBe(true);
    wrapper.unmount();
  });

  it('shows final evidence immediately and never starts a post-calculation replay', async () => {
    const experiment = run();
    const wrapper = mount(ExperimentCard, {
      props: { run: experiment, selected: true, pinned: false, paused: true },
      global: { stubs: { TradeDistribution: true } },
    });
    const renderer = wrapper.findComponent({ name: 'TradeDistribution' });
    expect(renderer.props('trades')).toEqual(experiment.result!.candidates);
    expect(renderer.props('compact')).toBe(true);
    expect(renderer.props('paused')).toBe(true);
    expect(wrapper.get('[data-testid="experiment-trades"]').text()).toBe(String(experiment.result!.result.trades));
    expect(wrapper.get('[data-testid="experiment-return"]').text()).not.toBe('—');
    expect(renderer.props('live')).toBe(true);
    expect(renderer.props('calculating')).toBe(false);
    const finalLabel = wrapper.get('[data-testid="experiment-return"]').text();
    renderer.vm.$emit('replay', { settledCount: 0 });
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-testid="experiment-return"]').text()).toBe(finalLabel);
    expect(wrapper.get('[data-testid="experiment-live-return"]').text()).toBe(finalLabel);
    expect(wrapper.text()).toContain('XOR → VAL');
    wrapper.unmount();
  });

  it('emits shortlist, select, duplicate and bot actions without mutating a completed experiment', async () => {
    const experiment = run();
    const wrapper = mount(ExperimentCard, {
      props: { run: experiment },
      global: { stubs: { TradeDistribution: true } },
    });
    for (const [testId, event] of [
      ['experiment-select', 'select'],
      ['experiment-pin', 'pin'],
      ['experiment-duplicate', 'duplicate'],
      ['experiment-create', 'createBot'],
    ]) {
      await wrapper.get(`[data-testid="${testId}"]`).trigger('click');
      expect(wrapper.emitted(event)).toHaveLength(1);
    }
    expect(experiment.status).toBe('complete');
    wrapper.unmount();
  });

  it('shows actual checkpoints and preserves evidence plus error details when calculation stops', async () => {
    const experiment = run();
    experiment.status = 'running';
    experiment.progress = 0.42;
    experiment.partial = {
      phase: 'replay',
      checkpoint: 1,
      scope: 'study',
      scopeCompleted: 2,
      scopeTotal: 4,
      decisions: experiment.result!.candidates.slice(0, 2),
      gateTotals: Object.fromEntries(
        ['signal', 'cooldown', 'balance', 'tradeLimit', 'feeBudget'].map((key) => [key, { passed: 2, rejected: 0 }])
      ) as import('@/features/bot-trading/research').ResearchGateTotals,
      candidates: experiment.result!.candidates.slice(0, 2),
      tradeMarkers: [],
      bot: experiment.result!.bot,
      result: { ...experiment.result!.result, returnPercent: '1.23', drawdownPercent: '0.4' },
      costs: experiment.result!.costs,
      summary: experiment.result!.summary,
      completed: 2,
      total: 4,
      equity: experiment.result!.result.equity.slice(0, 2),
      trades: 1,
      timestamp: Date.UTC(2026, 8, 1, 1),
    };
    experiment.result = undefined;
    const wrapper = mount(ExperimentCard, {
      props: { run: experiment },
      global: { stubs: { TradeDistribution: true } },
    });
    const renderer = wrapper.findComponent({ name: 'TradeDistribution' });
    expect(renderer.props('live')).toBe(true);
    expect(renderer.props('calculating')).toBe(true);
    expect(renderer.props('calculation')).toEqual(experiment.partial);
    expect(renderer.props('trades')).toEqual(experiment.partial!.candidates);
    expect(wrapper.get('[data-testid="experiment-drawdown"]').text()).toBe('0.40%');
    expect(wrapper.get('[data-testid="experiment-return"]').text()).not.toBe('—');
    expect(wrapper.get('[data-testid="experiment-return"]').text()).toBe(
      wrapper.get('[data-testid="experiment-live-return"]').text()
    );
    expect(wrapper.text()).toContain('bots.lab.returnSoFar');
    expect(wrapper.text()).toContain('bots.lab.processingData');
    expect(wrapper.get('[data-testid="experiment-trades"]').text()).toBe('1');
    expect(wrapper.get('[data-testid="experiment-create"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('42');
    expect(wrapper.get('.trace-line').attributes('d')).toMatch(/^M/);
    expect(wrapper.get('.trace-caption').text()).toContain('09-01 01:00 UTC');
    const studyCandidates = experiment.partial!.candidates;
    experiment.partial = {
      ...experiment.partial!,
      checkpoint: 2,
      scope: 'train',
      candidates: [],
      studyCandidates,
      decisions: [{ ...studyCandidates[0], id: 'training-only', pnl: undefined }],
    };
    await wrapper.setProps({ run: { ...experiment } });
    expect(wrapper.findComponent({ name: 'TradeDistribution' }).props('trades')).toEqual(studyCandidates);
    experiment.partial = { ...experiment.partial!, checkpoint: 3, scope: 'test', studyCandidates: undefined };
    await wrapper.setProps({ run: { ...experiment } });
    expect(wrapper.findComponent({ name: 'TradeDistribution' }).props('trades')).toEqual([]);
    experiment.partial = { ...experiment.partial!, studyCandidates };
    await wrapper.setProps({ run: { ...experiment, status: 'error', error: 'bots.errors.history' } });
    expect(wrapper.findComponent({ name: 'TradeDistribution' }).props('calculating')).toBe(false);
    expect(wrapper.get('[role="alert"]').text()).toBe('bots.errors.history');
    expect(wrapper.get('[data-testid="experiment-return"]').text()).toBe('+1.23%');
    wrapper.unmount();
  });
});

describe('ExperimentEquity', () => {
  it('plots every supplied strategy and permits selecting a curve from the legend', async () => {
    const wrapper = mount(ExperimentEquity, {
      props: {
        results: [
          { id: 'a', name: 'First', result: research() },
          { id: 'b', name: 'Second', result: research() },
        ],
        selectedId: 'a',
      },
    });
    expect(wrapper.findAll('.equity-series')).toHaveLength(2);
    expect(wrapper.get('[data-series="b"]').attributes('style')).toContain('opacity: 0.3');
    await wrapper.findAll('.equity-legend-item')[1].trigger('click');
    expect(wrapper.emitted('select')).toEqual([['b']]);
    await wrapper.get('input').setValue('0');
    expect(wrapper.findAll('.equity-legend-item strong').every((node) => node.text() === '0.00%')).toBe(true);
    wrapper.unmount();
  });

  it('provides an honest empty state instead of simulated curves', () => {
    const wrapper = mount(ExperimentEquity, { props: { results: [] } });
    expect(wrapper.text()).toContain('bots.lab.compareEmpty');
    expect(wrapper.find('svg').exists()).toBe(false);
    wrapper.unmount();
  });
});
