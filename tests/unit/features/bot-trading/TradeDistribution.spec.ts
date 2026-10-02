import { flushPromises, mount } from '@vue/test-utils';
import { compileStyle, parse } from '@vue/compiler-sfc';
import { parse as parseCss } from 'postcss';
import { compileString } from 'sass';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TradeDistribution from '@/features/bot-trading/components/TradeDistribution.vue';
import distributionSource from '@/features/bot-trading/components/TradeDistribution.vue?raw';
import type { DistributionTrade } from '@/features/bot-trading/tradeDistribution';
import type { CalculationUpdate } from '@/features/bot-trading/experiment-visuals';
import * as particleRendering from '@/features/bot-trading/tradeParticleRenderer';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
  }),
}));

/** Exact source outcomes used by both pointer/keyboard inspection and the histogram. */
function trade(id: string, pnl: string, selected = true): DistributionTrade {
  return {
    id,
    timestamp: 1,
    pnl,
    selected,
    checks: [
      { key: 'signal', passed: true },
      { key: 'balance', passed: selected },
    ],
  };
}
const trades = [trade('accepted', '2'), trade('rejected', '-0.000000000000000001', false)];
/** Validation scope evidence deliberately differs from study outcomes to detect accidental replacement. */
function checkpoint(
  index: number,
  scope: CalculationUpdate['scope'] = 'study',
  decisions: DistributionTrade[] = scope === 'study' ? trades : [trade('validation-only', '999', false)]
): CalculationUpdate {
  return {
    checkpoint: index,
    scope,
    scopeCompleted: 32,
    scopeTotal: 64,
    decisions,
    gateTotals: { signal: { passed: 31, rejected: 1 }, balance: { passed: 0, rejected: 32 } },
  };
}

describe('TradeDistribution historical histogram', () => {
  let reduced: boolean;
  let motion: (event: MediaQueryListEvent) => void;
  let frames: Map<number, FrameRequestCallback>;
  let frameId: number;
  let drawing: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    reduced = true;
    frames = new Map();
    frameId = 0;
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    drawing = Object.fromEntries(
      ['clearRect', 'fillRect', 'setTransform', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'arc', 'fill'].map(
        (name) => [name, vi.fn()]
      )
    );
    drawing.createRadialGradient = vi.fn(() => ({ addColorStop: vi.fn() }));
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind) =>
      kind === '2d' ? (drawing as unknown as CanvasRenderingContext2D) : null
    );
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++frameId, callback);
      return frameId;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.stubGlobal('matchMedia', () => ({
      matches: reduced,
      addEventListener: (_name: string, callback: typeof motion) => {
        motion = callback;
      },
      removeEventListener: vi.fn(),
    }));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute('style');
    document.documentElement.removeAttribute('design-system-theme');
  });

  /** Advance one actual presentation frame without relying on wall-clock delays. */
  async function animate(timestamp: number): Promise<void> {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(timestamp));
    await flushPromises();
  }
  /** Expose both supported GPU backends while capturing the exact count-scaled column geometry. */
  function accelerate(backend: 'webgl' | 'webgl2' = 'webgl2') {
    const renderer = {
      backend,
      setColors: vi.fn(),
      setBackground: vi.fn(),
      resize: vi.fn(),
      begin: vi.fn(),
      line: vi.fn(),
      circle: vi.fn(),
      sphere: vi.fn(),
      surface: vi.fn(),
      end: vi.fn(),
      dispose: vi.fn(),
    };
    let lose = () => {};
    vi.spyOn(particleRendering, 'createTradeParticleRenderer').mockImplementation((_canvas, onLost) => {
      lose = onLost ?? (() => {});
      return renderer;
    });
    return { renderer, lose: () => lose() };
  }

  it.each([false, true])('keeps histogram methodology and rule totals visible with compact=%s', async (compact) => {
    const wrapper = mount(TradeDistribution, { props: { trades, compact } });
    await flushPromises();
    expect(wrapper.find('details, summary').exists()).toBe(false);
    expect(wrapper.get('[data-testid="distribution-method"]').element.tagName).toBe('SECTION');
    expect(wrapper.get('[data-testid="distribution-method"] h4').text()).toBe('assets.details');
    expect(wrapper.get('[data-testid="distribution-explanation"]').isVisible()).toBe(true);
    expect(wrapper.get('.rule-totals').element.tagName).toBe('SECTION');
    expect(wrapper.get('.rule-totals h4').text()).toContain('bots.decisionReview.ruleTotals');
    expect(wrapper.get('.flow-gate-note').isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="distribution-gate-balance"]').isVisible()).toBe(true);
    if (compact) expect(wrapper.text()).toContain('bots.validationMotion.historical');
    expect(wrapper.get('[data-testid="decision-count-checked"] dd').text()).toBe('2');
    expect(wrapper.get('[data-testid="decision-count-taken"] dd').text()).toBe('1');
    expect(wrapper.get('[data-testid="distribution-explanation"]').text()).toBe(
      'bots.insights.filteredMeaning bots.uxResults.view.selected'
    );
    expect(wrapper.get('[data-testid="distribution-statistics"]').text()).toContain('bots.insights.median');
    expect(wrapper.text()).toContain('bots.insights.commonEndpoint');
    expect(wrapper.get('[data-testid="distribution-replay"]').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.distribution-flow').exists()).toBe(true);
    expect(wrapper.attributes('data-flow-mode')).toBe('idle');
    expect(wrapper.attributes('data-landed-count')).toBe('2');
    expect(wrapper.attributes('data-incoming-count')).toBe('0');
    expect(drawing.fillRect).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('conserves dense data in signed bin counts and keeps individual candidates keyboard reachable', async () => {
    const input = Array.from({ length: 5000 }, (_, index) =>
      trade(`candidate-${index}`, ((index % 17) - 8).toString(), index % 5 === 0)
    );
    const wrapper = mount(TradeDistribution, { props: { trades: input, compact: true } });
    const bins = wrapper.findAll('[data-bin]');
    expect(bins).toHaveLength(17);
    expect(bins.reduce((sum, bin) => sum + Number(bin.attributes('data-count')), 0)).toBe(5000);
    expect(bins.reduce((sum, bin) => sum + Number(bin.attributes('data-selected-count')), 0)).toBe(1000);
    await wrapper.get('[data-testid="distribution-view-selected"]').trigger('click');
    await wrapper.get('canvas').trigger('keydown', { key: 'End' });
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['candidate-4995']);
    expect(wrapper.get('[data-testid="distribution-focused"]').text()).toContain('1000 1000');
    wrapper.unmount();
  });

  it('explains each chart view beside its exact count without changing the recorded outcomes', async () => {
    const input = [
      trade('gain-a', '2'),
      trade('gain-b', '4'),
      trade('skip-a', '-1', false),
      trade('skip-b', '-2', false),
    ];
    const wrapper = mount(TradeDistribution, { props: { trades: input, compact: true } });
    await wrapper.get('[data-testid="distribution-view-all"]').trigger('click');
    const evidence = wrapper.get('[data-testid="distribution-bin-data"]').html();
    const allStatistics = wrapper.get('[data-testid="distribution-statistics"]').text();
    const explanation = wrapper.get('[data-testid="distribution-view-explanation"]');
    expect(explanation.attributes('id')).toBeTruthy();
    expect(wrapper.find('[data-testid="distribution-filter-note"]').exists()).toBe(false);

    for (const [view, count, positive] of [
      ['all', 4, '2/4'],
      ['selected', 2, '2/2'],
      ['excluded', 2, '0/2'],
    ] as const) {
      const button = wrapper.get(`[data-testid="distribution-view-${view}"]`);
      expect(button.text()).toContain(`bots.uxResults.view.${view}`);
      expect(button.text()).toContain(`bots.uxResults.viewHint.${view}`);
      expect(button.get('strong').text()).toBe(String(count));
      expect(button.attributes('aria-describedby')?.split(/\s+/)).toContain(explanation.attributes('id'));
      await button.trigger('click');
      expect(button.attributes('aria-pressed')).toBe('true');
      expect(wrapper.get('.distribution-axis-name').text()).toBe(`bots.uxResults.view.${view}`);
      expect(explanation.text()).toContain(`bots.uxResults.viewMeaning.${view}`);
      expect(explanation.text()).toContain('4 2 2');
      expect(wrapper.get('[data-testid="distribution-statistics"]').text()).toContain(positive);
      expect(wrapper.get('[data-testid="distribution-bin-data"]').html()).toBe(evidence);
      expect(wrapper.find('[data-testid="distribution-filter-note"]').exists()).toBe(false);
      expect(wrapper.attributes('data-candidate-count')).toBe('4');
      expect(wrapper.emitted('select')).toBeUndefined();
    }
    await wrapper.get('[data-testid="distribution-view-all"]').trigger('click');
    expect(wrapper.get('[data-testid="distribution-statistics"]').text()).toBe(allStatistics);
    wrapper.unmount();
  });

  it('links chart view descriptions to their own experiment when several distributions are mounted', () => {
    const parent = mount({
      components: { TradeDistribution },
      setup: () => ({ trades }),
      template: '<main><TradeDistribution :trades="trades" /><TradeDistribution :trades="trades" /></main>',
    });
    const [first, second] = parent.findAllComponents(TradeDistribution);
    const firstId = first.get('[data-testid="distribution-view-explanation"]').attributes('id');
    const secondId = second.get('[data-testid="distribution-view-explanation"]').attributes('id');
    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();
    expect(firstId).not.toBe(secondId);
    for (const wrapper of [first, second]) {
      const id = wrapper.get('[data-testid="distribution-view-explanation"]').attributes('id');
      for (const view of ['all', 'selected', 'excluded'])
        expect(
          wrapper.get(`[data-testid="distribution-view-${view}"]`).attributes('aria-describedby')?.split(/\s+/)
        ).toContain(id);
    }
    parent.unmount();
  });

  it('shows all hourly checks only while calculating then defaults completed results to trades taken', async () => {
    const wrapper = mount(TradeDistribution, {
      props: { trades, live: true, calculating: true, calculation: checkpoint(1) },
    });
    await wrapper.vm.waitForCheckpoint(1);
    const bins = wrapper.get('[data-testid="distribution-bin-data"]').html();
    expect(wrapper.get('[data-testid="distribution-view-all"]').attributes('aria-pressed')).toBe('true');
    expect(wrapper.get('[data-testid="distribution-view-selected"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="distribution-filter-note"]').text()).toBe('bots.decisionReview.liveAllChecks');
    await wrapper.setProps({ calculating: false });
    expect(wrapper.get('[data-testid="distribution-view-selected"]').attributes('aria-pressed')).toBe('true');
    expect(wrapper.get('[data-testid="distribution-statistics"]').text()).toContain('1/1');
    expect(wrapper.get('[data-testid="distribution-gate-balance"]').text()).toContain('1 1');
    expect(wrapper.get('[data-testid="distribution-bin-data"]').html()).toBe(bins);
    wrapper.unmount();
  });

  it('explains a zero-trade run with real skip reasons and a settings action', async () => {
    const wrapper = mount(TradeDistribution, { props: { trades: [trades[1]] } });
    expect(wrapper.get('[data-testid="distribution-no-trades"]').text()).toContain(
      'bots.decisionReview.noTradesMeaning'
    );
    expect(wrapper.get('[data-testid="flow-skip-reason-balance"] strong').text()).toBe('1');
    expect(wrapper.get('[data-testid="distribution-viewport"]').attributes('style')).toContain('display: none');
    await wrapper.get('[data-testid="distribution-review-limits"]').trigger('click');
    expect(wrapper.emitted('reviewLimits')).toHaveLength(1);
    await wrapper.get('[data-testid="distribution-no-trades"] button').trigger('click');
    expect(wrapper.get('[data-testid="distribution-view-excluded"]').attributes('aria-pressed')).toBe('true');
    wrapper.unmount();
  });

  it('opens a self-contained recorded decision inspector with UTC dates and correctly denominated evidence', async () => {
    const record: DistributionTrade = {
      ...trades[1],
      action: 'buy',
      signalTimestamp: Date.UTC(2026, 8, 1, 12),
      endTimestamp: Date.UTC(2026, 8, 15),
      reason: 'bots.events.thresholdWaiting',
      price: '0.000000000000000123',
      checks: [
        { key: 'signal', passed: true },
        { key: 'balance', passed: false, actual: '1', limit: '1000000000000000000', assetAddress: 'xor' },
      ],
    };
    const wrapper = mount(TradeDistribution, {
      props: {
        trades: [record],
        compact: true,
        symbol: 'XOR',
        outputSymbol: 'VAL',
        evidenceAssets: [{ address: 'xor', decimals: 18, symbol: 'XOR' }],
      },
    });
    await wrapper.get('[data-testid="distribution-view-excluded"]').trigger('click');
    await wrapper.get('[data-testid="distribution-follow"]').trigger('click');
    const inspector = wrapper.get('[data-testid="distribution-decision-inspector"]');
    expect(inspector.text()).toContain('2026-09-01 12:00 UTC');
    expect(inspector.text()).toContain('bots.decisionReview.status.blocked');
    expect(inspector.text()).toContain('bots.decisionReview.evidence.balance 0.000000000000000001 XOR 1 XOR');
    expect(inspector.text()).toContain('bots.decisionReview.skippedOutcome');
    expect(wrapper.get('[data-testid="decision-recorded-reason"]').text()).toBe('bots.events.thresholdWaiting');
    expect(wrapper.get('[data-testid="decision-recorded-price"]').text()).toContain('0.000000000000000123 XOR VAL');
    expect(wrapper.get('[data-testid="distribution-valuation"]').text()).toContain('2026-09-15 00:00 UTC');
    expect(wrapper.attributes('data-flow-mode')).toBe('idle');
    expect(frames.size).toBe(0);
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['rejected']);
    wrapper.unmount();
  });

  it('follows one decision and pauses, seeks and changes replay speed without changing any outcomes', async () => {
    reduced = false;
    const wrapper = mount(TradeDistribution, { props: { trades, live: true } });
    const bins = wrapper.get('[data-testid="distribution-bin-data"]').html();
    const statistics = wrapper.get('[data-testid="distribution-statistics"]').text();
    await wrapper.get('[data-testid="distribution-follow"]').trigger('click');
    expect(wrapper.get('[data-testid="distribution-decision-inspector"]').text()).toContain(
      'bots.decisionReview.status.taken'
    );
    expect(wrapper.get('[data-testid="distribution-landing-count"]').text()).toBe('bots.tradeFlow.landing 0 1');
    await animate(0);
    await animate(1600);
    expect(wrapper.get('[data-testid="decision-check-signal"]').classes()).toContain('is-current');
    await wrapper.get('[data-testid="distribution-pause"]').trigger('click');
    const position = wrapper.get('[data-testid="distribution-seek"]').element as HTMLInputElement;
    expect(position.value).toBe('200');
    expect(frames.size).toBe(0);
    await animate(6000);
    expect(position.value).toBe('200');
    await wrapper.get('[data-testid="distribution-speed"]').setValue('2');
    await wrapper.get('[data-testid="distribution-pause"]').trigger('click');
    await animate(7000);
    await animate(7400);
    expect(position.value).toBe('300');
    await wrapper.get('[data-testid="distribution-seek"]').setValue('750');
    expect(wrapper.get('[data-testid="distribution-pause"]').attributes('aria-pressed')).toBe('true');
    expect(position.value).toBe('750');
    expect(frames.size).toBe(0);
    expect(wrapper.get('[data-testid="distribution-bin-data"]').html()).toBe(bins);
    expect(wrapper.get('[data-testid="distribution-statistics"]').text()).toBe(statistics);
    await wrapper.get('[data-testid="distribution-replay"]').trigger('click');
    expect(wrapper.attributes('data-landed-count')).toBe('2');
    expect(wrapper.attributes('data-flow-mode')).toBe('idle');
    wrapper.unmount();
  });

  it('releases a paused replay on document hiding without changing the chosen view or blocking later calculation', async () => {
    reduced = false;
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const wrapper = mount(TradeDistribution, { props: { trades } });
    await wrapper.get('[data-testid="distribution-follow"]').trigger('click');
    await wrapper.get('[data-testid="distribution-pause"]').trigger('click');
    hidden.mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(wrapper.attributes('data-flow-mode')).toBe('idle');
    expect(wrapper.get('[data-testid="distribution-view-selected"]').attributes('aria-pressed')).toBe('true');
    expect(frames.size).toBe(0);
    wrapper.unmount();
  });

  it('shows the full decision path during calculation and crops empty gates only once results are complete', async () => {
    reduced = false;
    const wrapper = mount(TradeDistribution, {
      props: { trades, live: true, calculating: true, calculation: checkpoint(1) },
    });
    await flushPromises();
    const viewport = wrapper.get('[data-testid="distribution-viewport"]');
    expect(viewport.classes()).not.toContain('is-settled');
    expect(wrapper.attributes('data-flow-mode')).toBe('live');
    await animate(0);
    await animate(640);
    await animate(656);
    await wrapper.vm.waitForCheckpoint(1);
    expect(wrapper.attributes('data-flow-mode')).toBe('idle');
    expect(viewport.classes()).not.toContain('is-settled');
    await wrapper.setProps({ calculating: false });
    expect(viewport.classes()).toContain('is-settled');
    expect(wrapper.attributes('data-landed-count')).toBe('2');
    wrapper.unmount();
  });

  it('expands a finished distribution for replay and restores the compact result when replay finishes or is skipped', async () => {
    reduced = false;
    const wrapper = mount(TradeDistribution, { props: { trades } });
    const viewport = wrapper.get('[data-testid="distribution-viewport"]');
    expect(viewport.classes()).toContain('is-settled');
    await wrapper.get('[data-testid="distribution-replay"]').trigger('click');
    expect(viewport.classes()).not.toContain('is-settled');
    await animate(0);
    await animate(8000);
    await animate(8016);
    expect(viewport.classes()).toContain('is-settled');
    await wrapper.get('[data-testid="distribution-replay"]').trigger('click');
    expect(viewport.classes()).not.toContain('is-settled');
    await wrapper.get('[data-testid="distribution-replay"]').trigger('click');
    expect(viewport.classes()).toContain('is-settled');
    expect(wrapper.attributes('data-landed-count')).toBe('2');
    expect(frames.size).toBe(0);
    wrapper.unmount();
  });

  it('explains each skipped opportunity once and keeps missing decision reasons separate from failed checks', async () => {
    const input: DistributionTrade[] = [
      trade('taken', '2'),
      {
        ...trade('two-failures', '-1', false),
        checks: [
          { key: 'signal', passed: false },
          { key: 'balance', passed: false },
        ],
      },
      trade('balance-only', '-2', false),
      { ...trade('missing-checks', '3', false), checks: [] },
      { ...trade('unexplained-skip', '4', false), checks: trade('passed-checks', '4').checks },
    ];
    const wrapper = mount(TradeDistribution, {
      props: { trades: input, checkLabels: { balance: 'Available capital' } },
    });
    await wrapper.get('[data-testid="distribution-view-all"]').trigger('click');
    const reasons = wrapper.get('[data-testid="flow-skip-reasons"]');
    expect(reasons.findAll('li')).toHaveLength(3);
    expect(wrapper.get('[data-testid="flow-skip-reason-signal"] strong').text()).toBe('1');
    expect(wrapper.get('[data-testid="flow-skip-reason-balance"] strong').text()).toBe('1');
    expect(wrapper.get('[data-testid="flow-skip-reason-balance"]').text()).toContain('Available capital');
    expect(wrapper.get('[data-testid="flow-skip-reason-unknown"] strong').text()).toBe('2');
    expect(wrapper.get('[data-testid="flow-skip-reason-unknown"]').text()).toContain('bots.tradeFlow.unknownReason');
    expect(reasons.findAll('li strong').reduce((sum, count) => sum + Number(count.text()), 0)).toBe(4);
    expect(reasons.text()).toContain('bots.tradeFlow.reasonNote');
    const originalReasons = reasons.html();
    await wrapper.get('[data-testid="distribution-view-selected"]').trigger('click');
    expect(wrapper.find('[data-testid="flow-skip-reasons"]').exists()).toBe(false);
    await wrapper.get('[data-testid="distribution-view-excluded"]').trigger('click');
    expect(wrapper.get('[data-testid="flow-skip-reasons"]').html()).toBe(originalReasons);
    await wrapper.setProps({ trades: [input[0]] });
    expect(wrapper.find('[data-testid="flow-skip-reasons"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('retains the recorded skip reason when an invalid outcome is omitted from the plotted distribution', async () => {
    const wrapper = mount(TradeDistribution, {
      props: { trades: [trade('taken', '2'), trade('invalid-skipped-outcome', 'NaN', false)] },
    });
    await wrapper.get('[data-testid="distribution-view-excluded"]').trigger('click');
    expect(wrapper.attributes('data-candidate-count')).toBe('1');
    expect(wrapper.get('[data-testid="distribution-omitted"]').text()).toContain('1');
    expect(wrapper.get('[data-testid="flow-skip-reason-balance"] strong').text()).toBe('1');
    expect(wrapper.find('[data-testid="flow-skip-reason-unknown"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('uses neutral particles during checks and introduces outcome color only on the route to the result bin', async () => {
    reduced = false;
    const { renderer } = accelerate();
    const wrapper = mount(TradeDistribution, { props: { trades: [trade('profitable-fill', '2')] } });
    await wrapper.get('[data-testid="distribution-replay"]').trigger('click');
    await animate(0);
    renderer.sphere.mockClear();
    await animate(800);
    expect(renderer.sphere).toHaveBeenCalled();
    expect(renderer.sphere.mock.calls.every((call) => call[3] === 'neutral')).toBe(true);
    renderer.sphere.mockClear();
    await animate(5600);
    expect(renderer.sphere).toHaveBeenCalled();
    expect(renderer.sphere.mock.calls.every((call) => call[3] === 'positive')).toBe(true);
    expect(wrapper.attributes('data-landed-count')).toBe('0');
    wrapper.unmount();
  });

  it('updates check counters when actual particles cross each gate instead of showing future decisions early', async () => {
    reduced = false;
    const wrapper = mount(TradeDistribution, { props: { trades } });
    await wrapper.get('[data-testid="distribution-view-all"]').trigger('click');
    expect(wrapper.find('[data-testid="flow-live-counts"]').exists()).toBe(false);
    await wrapper.get('[data-testid="distribution-replay"]').trigger('click');
    await animate(0);
    const signal = wrapper.get('[data-testid="flow-check-count-signal"]');
    const balance = wrapper.get('[data-testid="flow-check-count-balance"]');
    const mobileCounts = wrapper.get('[data-testid="flow-live-counts"]');
    expect(mobileCounts.attributes('aria-label')).toBe('bots.tradeFlow.filteringStep');
    expect(mobileCounts.findAll('li')).toHaveLength(2);
    /** Mobile labels must expose the same observed counts as the chart overlay. */
    function expectMatchingMobileCounts(): void {
      for (const key of ['signal', 'balance']) {
        const row = wrapper.get(`[data-testid="flow-live-count-${key}"]`);
        const overlay = wrapper.get(`[data-testid="flow-check-count-${key}"]`);
        expect(row.get('span').text()).toBe(`bots.research.checks.${key}`);
        expect(row.get('strong').text().replace(/\s+/g, ' ')).toBe(overlay.text().replace(/\s+/g, ' '));
      }
    }
    expect(signal.text()).toBe('bots.tradeFlow.skippedHere 0 · bots.tradeFlow.continued 0');
    expect(balance.text()).toBe('bots.tradeFlow.skippedHere 0 · bots.tradeFlow.continued 0');
    expectMatchingMobileCounts();
    await animate(1600);
    expect(signal.text()).toBe('bots.tradeFlow.skippedHere 0 · bots.tradeFlow.continued 1');
    expect(balance.text()).toBe('bots.tradeFlow.skippedHere 0 · bots.tradeFlow.continued 0');
    expectMatchingMobileCounts();
    await animate(3200);
    expect(balance.text()).toBe('bots.tradeFlow.skippedHere 0 · bots.tradeFlow.continued 1');
    expectMatchingMobileCounts();
    await animate(5400);
    expect(signal.text()).toBe('bots.tradeFlow.skippedHere 0 · bots.tradeFlow.continued 2');
    expect(balance.text()).toBe('bots.tradeFlow.skippedHere 1 · bots.tradeFlow.continued 1');
    expectMatchingMobileCounts();
    expect(wrapper.get('[data-testid="flow-skip-reason-balance"] strong').text()).toBe('1');
    await wrapper.get('[data-testid="distribution-replay"]').trigger('click');
    expect(wrapper.get('[data-testid="distribution-viewport"]').classes()).toContain('is-settled');
    expect(wrapper.find('[data-testid="flow-live-counts"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('counts only the visible opportunities while preserving their original replay timing and full study evidence', async () => {
    reduced = false;
    const input = [
      trade('taken-first', '2'),
      trade('taken-second', '3'),
      trade('skipped-third', '-1', false),
      trade('skipped-fourth', '-2', false),
    ];
    const wrapper = mount(TradeDistribution, { props: { trades: input } });
    await wrapper.get('[data-testid="distribution-view-all"]').trigger('click');
    await flushPromises();
    const evidence = wrapper.get('[data-testid="distribution-bin-data"]').html();
    const maximum = wrapper.attributes('data-histogram-maximum');
    const landing = wrapper.get('[data-testid="distribution-landing-count"]');
    const signal = wrapper.get('[data-testid="flow-check-count-signal"]');
    const balance = wrapper.get('[data-testid="flow-check-count-balance"]');
    const allStatistics = wrapper.get('[data-testid="distribution-statistics"]').text();
    for (const [view, landed, continued, skipped] of [
      ['all', 4, 2, 2],
      ['selected', 2, 2, 0],
      ['excluded', 2, 0, 2],
    ] as const) {
      await wrapper.get(`[data-testid="distribution-view-${view}"]`).trigger('click');
      expect(landing.text()).toBe(`bots.tradeFlow.landing ${landed} ${landed}`);
      expect(balance.text()).toBe(`bots.tradeFlow.skippedHere ${skipped} · bots.tradeFlow.continued ${continued}`);
      expect(wrapper.attributes('data-candidate-count')).toBe('4');
      expect(wrapper.attributes('data-landed-count')).toBe('4');
      expect(wrapper.attributes('data-incoming-count')).toBe('0');
      expect(wrapper.attributes('data-histogram-maximum')).toBe(maximum);
      expect(wrapper.get('[data-testid="distribution-bin-data"]').html()).toBe(evidence);
    }
    await wrapper.get('[data-testid="distribution-view-all"]').trigger('click');
    await wrapper.get('[data-testid="distribution-replay"]').trigger('click');
    await animate(0);
    await animate(4000);
    expect(landing.text()).toBe('bots.tradeFlow.landing 0 4');
    await wrapper.get('[data-testid="distribution-view-selected"]').trigger('click');
    expect(landing.text()).toBe('bots.tradeFlow.landing 0 2');
    expect(signal.text()).toBe('bots.tradeFlow.skippedHere 0 · bots.tradeFlow.continued 2');
    expect(balance.text()).toBe('bots.tradeFlow.skippedHere 0 · bots.tradeFlow.continued 2');
    expect(wrapper.find('[data-testid="flow-skip-reasons"]').exists()).toBe(false);
    await wrapper.get('[data-testid="distribution-view-excluded"]').trigger('click');
    expect(signal.text()).toBe('bots.tradeFlow.skippedHere 0 · bots.tradeFlow.continued 1');
    expect(balance.text()).toBe('bots.tradeFlow.skippedHere 0 · bots.tradeFlow.continued 0');
    expect(landing.text()).toBe('bots.tradeFlow.landing 0 2');
    expect(wrapper.attributes('data-landed-count')).toBe('0');
    expect(wrapper.attributes('data-incoming-count')).toBe('4');
    await animate(6000);
    expect(landing.text()).toBe('bots.tradeFlow.landing 0 2');
    expect(balance.text()).toBe('bots.tradeFlow.skippedHere 2 · bots.tradeFlow.continued 0');
    expect(wrapper.attributes('data-landed-count')).toBe('2');
    expect(wrapper.attributes('data-incoming-count')).toBe('2');
    await wrapper.get('[data-testid="distribution-view-selected"]').trigger('click');
    expect(landing.text()).toBe('bots.tradeFlow.landing 2 2');
    expect(balance.text()).toBe('bots.tradeFlow.skippedHere 0 · bots.tradeFlow.continued 2');
    await wrapper.get('[data-testid="distribution-view-all"]').trigger('click');
    expect(landing.text()).toBe('bots.tradeFlow.landing 2 4');
    expect(wrapper.get('[data-testid="distribution-bin-data"]').html()).toBe(evidence);
    expect(wrapper.get('[data-testid="distribution-statistics"]').text()).toBe(allStatistics);
    expect(wrapper.attributes('data-flow-mode')).toBe('replay');
    expect(wrapper.attributes('data-histogram-maximum')).toBe(maximum);
    wrapper.unmount();
  });

  it('rescales count heights for sparse taken results while retaining shared value ranges', async () => {
    const { renderer } = accelerate();
    const input = [trade('a', '2'), ...Array.from({ length: 7 }, (_, index) => trade(`e${index}`, '2', false))];
    const wrapper = mount(TradeDistribution, { props: { trades: input } });
    await wrapper.get('[data-testid="distribution-view-all"]').trigger('click');
    const maximum = wrapper.attributes('data-histogram-maximum');
    const solidBefore = renderer.line.mock.calls.find((call) => call[4] > 5 && call[6] === 0.94);
    expect(solidBefore).toBeDefined();
    renderer.line.mockClear();
    await wrapper.get('[data-testid="distribution-view-selected"]').trigger('click');
    expect(maximum).toBe('8');
    expect(wrapper.attributes('data-histogram-maximum')).toBe('4');
    const selected = renderer.line.mock.calls.find((call) => call[4] > 5 && call[6] === 0.86);
    expect(selected?.[0]).toBe(solidBefore?.[0]);
    expect(552 - selected![1]).toBe((552 - solidBefore![1]) * 2);
    await wrapper.get('[data-testid="distribution-view-excluded"]').trigger('click');
    expect(wrapper.attributes('data-histogram-maximum')).toBe(maximum);
    expect(wrapper.get('[data-testid="distribution-statistics"]').text()).toContain('7/7');
    wrapper.unmount();
  });

  it.each(['train', 'test'] as const)(
    'retains study outcomes, selection and gate counts throughout %s validation',
    async (scope) => {
      reduced = false;
      const wrapper = mount(TradeDistribution, {
        props: { trades, live: true, calculating: true, calculation: checkpoint(1, scope) },
      });
      await wrapper.vm.waitForCheckpoint(1);
      const before = wrapper.get('[data-testid="distribution-bin-data"]').html();
      await wrapper.get('canvas').trigger('keydown', { key: 'End' });
      await wrapper.setProps({ calculation: checkpoint(2, scope) });
      await wrapper.vm.waitForCheckpoint(2);
      expect(wrapper.get('[data-testid="distribution-bin-data"]').html()).toBe(before);
      expect(wrapper.get('[data-testid="distribution-focused"]').text()).toContain('2 2');
      expect(wrapper.get('[data-testid="distribution-gate-balance"]').text()).toContain('1 2');
      expect(wrapper.get('.distribution-axis').text()).not.toContain('999.0000');
      expect(frames.size).toBe(0);
      expect(wrapper.attributes('data-calculation-progress')).toBe('1.000');
      wrapper.unmount();
    }
  );

  it('lands the first study outcomes before acknowledging their checkpoint and preserves complete evidence', async () => {
    reduced = false;
    const { renderer } = accelerate();
    const wrapper = mount(TradeDistribution, {
      props: { trades: [], live: true, calculating: true, calculation: checkpoint(1, 'study', []) },
    });
    await wrapper.setProps({ trades, calculation: checkpoint(2) });
    const evidence = wrapper.get('[data-testid="distribution-bin-data"]').html();
    const statistics = wrapper.get('[data-testid="distribution-statistics"]').text();
    expect(wrapper.attributes('data-flow-mode')).toBe('live');
    expect(wrapper.attributes('data-landed-count')).toBe('0');
    expect(wrapper.attributes('data-incoming-count')).toBe('2');
    let done = false;
    const pending = wrapper.vm.waitForCheckpoint(2).then(() => {
      done = true;
    });
    renderer.line.mockClear();
    await animate(0);
    expect(renderer.line.mock.calls.some((call) => call[0] === call[2] && call[3] === 552 && call[4] > 5)).toBe(false);
    await animate(320);
    expect(done).toBe(false);
    expect(wrapper.attributes('data-calculation-progress')).toBe('0.500');
    expect(renderer.sphere).toHaveBeenCalled();
    expect(wrapper.get('[data-testid="distribution-bin-data"]').html()).toBe(evidence);
    expect(wrapper.get('[data-testid="distribution-statistics"]').text()).toBe(statistics);
    expect(Number(wrapper.attributes('data-landed-count')) + Number(wrapper.attributes('data-incoming-count'))).toBe(2);
    renderer.line.mockClear();
    await animate(512);
    expect(Number(wrapper.attributes('data-landed-count'))).toBeGreaterThan(0);
    expect(Number(wrapper.attributes('data-landed-count'))).toBeLessThan(2);
    expect(Number(wrapper.attributes('data-landed-count')) + Number(wrapper.attributes('data-incoming-count'))).toBe(2);
    expect(renderer.line.mock.calls.some((call) => call[0] === call[2] && call[3] === 552 && call[4] > 5)).toBe(true);
    expect(wrapper.get('[data-testid="distribution-bin-data"]').html()).toBe(evidence);
    expect(wrapper.get('[data-testid="distribution-statistics"]').text()).toBe(statistics);
    await animate(640);
    expect(done).toBe(false);
    await animate(656);
    await pending;
    expect(done).toBe(true);
    expect(frames.size).toBe(0);
    expect(wrapper.attributes('data-flow-mode')).toBe('idle');
    expect(wrapper.attributes('data-landed-count')).toBe('2');
    expect(wrapper.attributes('data-incoming-count')).toBe('0');
    wrapper.unmount();
  });

  it('does not replay settled study bins when another checkpoint supplies no new outcome evidence', async () => {
    reduced = false;
    const wrapper = mount(TradeDistribution, {
      props: { trades, live: true, calculating: true, calculation: checkpoint(1) },
    });
    await animate(0);
    await animate(640);
    await animate(656);
    await wrapper.setProps({ calculation: checkpoint(2) });
    await wrapper.vm.waitForCheckpoint(2);
    expect(frames.size).toBe(0);
    expect(wrapper.attributes('data-flow-mode')).toBe('idle');
    expect(wrapper.attributes('data-landed-count')).toBe('2');
    wrapper.unmount();
  });

  it('animates only a new extreme outcome while keeping retained candidates landed on the new scale', async () => {
    reduced = false;
    const wrapper = mount(TradeDistribution, {
      props: { trades, live: true, calculating: true, calculation: checkpoint(1, 'test') },
    });
    const incoming = trade('new-extreme', '80');
    await wrapper.setProps({ trades: [...trades, incoming], calculation: checkpoint(2, 'study', [incoming]) });
    expect(wrapper.attributes('data-flow-mode')).toBe('live');
    expect(wrapper.attributes('data-landed-count')).toBe('2');
    expect(wrapper.attributes('data-incoming-count')).toBe('1');
    expect(wrapper.get('.distribution-axis').text()).toContain('80.0000');
    await animate(0);
    await animate(640);
    await animate(656);
    await wrapper.vm.waitForCheckpoint(2);
    expect(frames.size).toBe(0);
    expect(wrapper.get('.distribution-axis').text()).toContain('80.0000');
    expect(wrapper.attributes('data-candidate-count')).toBe('3');
    expect(wrapper.attributes('data-landed-count')).toBe('3');
    wrapper.unmount();
  });

  it('excludes invalid outcomes from live particles and conserves valid retained plus incoming counts', async () => {
    reduced = false;
    const wrapper = mount(TradeDistribution, {
      props: { trades, live: true, calculating: true, calculation: checkpoint(1, 'test') },
    });
    const incoming = [trade('invalid', 'NaN'), trade('new-loss', '-4', false)];
    await wrapper.setProps({ trades: [...trades, ...incoming], calculation: checkpoint(2, 'study', incoming) });
    expect(wrapper.attributes('data-candidate-count')).toBe('3');
    expect(wrapper.attributes('data-landed-count')).toBe('2');
    expect(wrapper.attributes('data-incoming-count')).toBe('1');
    const bins = wrapper.findAll('[data-bin]');
    expect(bins.reduce((sum, bin) => sum + Number(bin.attributes('data-count')), 0)).toBe(3);
    for (const timestamp of [0, 160, 320, 480, 640, 656]) {
      await animate(timestamp);
      expect(Number(wrapper.attributes('data-landed-count')) + Number(wrapper.attributes('data-incoming-count'))).toBe(
        3
      );
    }
    await wrapper.vm.waitForCheckpoint(2);
    expect(wrapper.get('[data-testid="distribution-omitted"]').text()).toContain('1');
    expect(wrapper.attributes('data-landed-count')).toBe('3');
    expect(wrapper.attributes('data-incoming-count')).toBe('0');
    wrapper.unmount();
  });

  it('replays completed evidence only on request while statistics, bin rows and inspection totals stay complete', async () => {
    reduced = false;
    const { renderer } = accelerate();
    const wrapper = mount(TradeDistribution, { props: { trades } });
    await wrapper.get('[data-testid="distribution-view-all"]').trigger('click');
    const bins = wrapper.get('[data-testid="distribution-bin-data"]').html();
    const statistics = wrapper.get('[data-testid="distribution-statistics"]').text();
    const replay = wrapper.get('[data-testid="distribution-replay"]');
    expect(replay.text()).toContain('bots.tradeFlow.replay');
    expect(replay.attributes('disabled')).toBeUndefined();
    expect(frames.size).toBe(0);
    expect(wrapper.attributes('data-flow-mode')).toBe('idle');
    await replay.trigger('click');
    expect(wrapper.attributes('data-flow-mode')).toBe('replay');
    expect(wrapper.attributes('data-landed-count')).toBe('0');
    expect(replay.text()).toContain('bots.tradeFlow.finish');
    await animate(0);
    await animate(4000);
    expect(renderer.sphere).toHaveBeenCalled();
    expect(wrapper.get('[data-testid="distribution-bin-data"]').html()).toBe(bins);
    expect(wrapper.get('[data-testid="distribution-statistics"]').text()).toBe(statistics);
    expect(Number(wrapper.attributes('data-landed-count')) + Number(wrapper.attributes('data-incoming-count'))).toBe(2);
    await wrapper.get('canvas').trigger('keydown', { key: 'End' });
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['rejected']);
    expect(wrapper.get('[data-testid="distribution-focused"]').text()).toContain('2 2');
    await animate(8000);
    await animate(8016);
    expect(wrapper.attributes('data-flow-mode')).toBe('idle');
    expect(wrapper.attributes('data-landed-count')).toBe('2');
    expect(wrapper.attributes('data-incoming-count')).toBe('0');
    expect(wrapper.get('[data-testid="distribution-bin-data"]').html()).toBe(bins);
    expect(wrapper.emitted('replay')?.every(([state]) => (state as { settledCount: number }).settledCount === 2)).toBe(
      true
    );
    expect(frames.size).toBe(0);
    wrapper.unmount();
  });

  it('finishes an explicit replay immediately without rerunning or dropping evidence', async () => {
    reduced = false;
    const wrapper = mount(TradeDistribution, { props: { trades } });
    const before = wrapper.get('[data-testid="distribution-bin-data"]').html();
    await wrapper.get('[data-testid="distribution-replay"]').trigger('click');
    await animate(0);
    await animate(2000);
    await wrapper.get('[data-testid="distribution-replay"]').trigger('click');
    expect(wrapper.attributes('data-flow-mode')).toBe('idle');
    expect(wrapper.attributes('data-landed-count')).toBe('2');
    expect(wrapper.attributes('data-incoming-count')).toBe('0');
    expect(wrapper.get('[data-testid="distribution-bin-data"]').html()).toBe(before);
    expect(wrapper.get('[data-testid="distribution-replay"]').text()).toContain('bots.tradeFlow.replay');
    expect(frames.size).toBe(0);
    wrapper.unmount();
  });

  it.each(['empty', 'reduced', 'paused', 'calculating'] as const)(
    'keeps the replay control visible and disabled when %s',
    async (state) => {
      reduced = state === 'reduced';
      const wrapper = mount(TradeDistribution, {
        props: {
          trades: state === 'empty' ? [] : trades,
          paused: state === 'paused',
          calculating: state === 'calculating',
        },
      });
      await flushPromises();
      const replay = wrapper.get('[data-testid="distribution-replay"]');
      expect(replay.attributes('disabled')).toBeDefined();
      await replay.trigger('click');
      expect(wrapper.attributes('data-flow-mode')).toBe('idle');
      expect(frames.size).toBe(0);
      wrapper.unmount();
    }
  );

  it.each(['reduced', 'hidden', 'paused', 'complete'] as const)(
    'releases presentation immediately when %s',
    async (state) => {
      reduced = state === 'reduced';
      if (state === 'hidden') vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      const wrapper = mount(TradeDistribution, {
        props: {
          trades,
          live: true,
          calculating: state !== 'complete',
          paused: state === 'paused',
          calculation: checkpoint(1),
        },
      });
      await wrapper.vm.waitForCheckpoint(1);
      expect(frames.size).toBe(0);
      expect(wrapper.attributes('data-calculation-progress')).toBe('1.000');
      wrapper.unmount();
    }
  );

  it.each(['hidden', 'reduced', 'paused', 'complete'] as const)(
    'settles a running study and releases its checkpoint when becoming %s',
    async (state) => {
      reduced = false;
      const wrapper = mount(TradeDistribution, {
        props: { trades, live: true, calculating: true, calculation: checkpoint(1) },
      });
      const pending = wrapper.vm.waitForCheckpoint(1);
      await animate(0);
      await animate(320);
      expect(wrapper.attributes('data-flow-mode')).toBe('live');
      if (state === 'hidden') {
        vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
        document.dispatchEvent(new Event('visibilitychange'));
      } else if (state === 'reduced') motion({ matches: true } as MediaQueryListEvent);
      else if (state === 'paused') await wrapper.setProps({ paused: true });
      else await wrapper.setProps({ calculating: false });
      await pending;
      await flushPromises();
      expect(wrapper.attributes('data-flow-mode')).toBe('idle');
      expect(wrapper.attributes('data-landed-count')).toBe('2');
      expect(wrapper.attributes('data-incoming-count')).toBe('0');
      expect(frames.size).toBe(0);
      wrapper.unmount();
    }
  );

  it('honors motion preference changes and unmount without leaving an evaluator waiting', async () => {
    reduced = false;
    const wrapper = mount(TradeDistribution, {
      props: { trades, live: true, calculating: true, calculation: checkpoint(1) },
    });
    const first = wrapper.vm.waitForCheckpoint(1);
    motion({ matches: true } as MediaQueryListEvent);
    await first;
    expect(frames.size).toBe(0);
    const pending = wrapper.vm.waitForCheckpoint(3);
    wrapper.unmount();
    await pending;
  });

  it('describes hovered exact ranges and clicks the first actual candidate in the range', async () => {
    const wrapper = mount(TradeDistribution, { props: { trades } });
    vi.spyOn(wrapper.get('canvas').element, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 900,
      height: 620,
    } as DOMRect);
    wrapper.get('canvas').element.dispatchEvent(new MouseEvent('pointermove', { clientX: 850, clientY: 450 }));
    await flushPromises();
    expect(wrapper.get('[data-testid="distribution-bin-readout"]').text()).toContain('(1.7500, 2.0000]');
    expect(wrapper.get('[data-testid="distribution-bin-readout"]').text()).toContain(
      'bots.decisionReview.binCount 1 bots.uxResults.view.selected'
    );
    expect(wrapper.get('[data-testid="distribution-bin-readout"] strong').attributes('title')).toContain('(1.75, 2]');
    wrapper.get('canvas').element.dispatchEvent(new MouseEvent('click', { clientX: 850, clientY: 450 }));
    await flushPromises();
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['accepted']);
    await wrapper.get('canvas').trigger('pointerleave');
    await wrapper.get('[data-testid="distribution-view-all"]').trigger('click');
    await wrapper.get('canvas').trigger('keydown', { key: 'End' });
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['rejected']);
    expect(wrapper.get('[data-testid="distribution-focused"] strong').classes()).toContain('is-negative');
    await wrapper.get('canvas').trigger('keydown', { key: 'Home' });
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['accepted']);
    await wrapper.get('[data-testid="distribution-next"]').trigger('click');
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['rejected']);
    wrapper.unmount();
  });

  it('does not rescan or reparse a dense dataset when hovering an empty range', async () => {
    let amountReads = 0;
    const input = Array.from({ length: 5000 }, (_, index) => ({
      ...trade(`candidate-${index}`, '2'),
      get pnl() {
        amountReads += 1;
        return '2';
      },
    }));
    const wrapper = mount(TradeDistribution, { props: { trades: input } });
    vi.spyOn(wrapper.get('canvas').element, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 900,
      height: 620,
    } as DOMRect);
    await flushPromises();
    amountReads = 0;
    for (let index = 0; index < 100; index += 1)
      wrapper.get('canvas').element.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 450 }));
    await flushPromises();
    expect(amountReads).toBe(0);
    expect(wrapper.get('[data-testid="distribution-bin-readout"]').text()).toContain(
      'bots.decisionReview.binCount 0 bots.uxResults.view.selected'
    );
    wrapper.unmount();
  });

  it('selects the correct original candidate for each range filter when invalid records precede it', async () => {
    const input = [
      trade('invalid', 'NaN'),
      trade('excluded', '2', false),
      trade('invalid-2', 'Infinity'),
      trade('selected', '2'),
    ];
    const wrapper = mount(TradeDistribution, { props: { trades: input } });
    await wrapper.get('[data-testid="distribution-view-all"]').trigger('click');
    vi.spyOn(wrapper.get('canvas').element, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 900,
      height: 620,
    } as DOMRect);
    wrapper.get('canvas').element.dispatchEvent(new MouseEvent('click', { clientX: 850, clientY: 450 }));
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['excluded']);
    await wrapper.get('[data-testid="distribution-view-selected"]').trigger('click');
    wrapper.get('canvas').element.dispatchEvent(new MouseEvent('click', { clientX: 850, clientY: 450 }));
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['selected']);
    await wrapper.get('[data-testid="distribution-view-excluded"]').trigger('click');
    wrapper.get('canvas').element.dispatchEvent(new MouseEvent('click', { clientX: 850, clientY: 450 }));
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['excluded']);
    const selectedCount = wrapper.emitted('select')?.length;
    wrapper.get('canvas').element.dispatchEvent(new MouseEvent('click', { clientX: 100, clientY: 450 }));
    expect(wrapper.emitted('select')?.length).toBe(selectedCount);
    wrapper.unmount();
  });

  it.each(['webgl', 'webgl2'] as const)(
    'uses %s and retains identical count evidence after context loss',
    async (backend) => {
      const { renderer, lose } = accelerate(backend);
      const wrapper = mount(TradeDistribution, { props: { trades } });
      const before = wrapper.get('[data-testid="distribution-bin-data"]').html();
      await flushPromises();
      expect(wrapper.attributes('data-renderer')).toBe(backend);
      expect(renderer.line).toHaveBeenCalled();
      lose();
      await flushPromises();
      expect(wrapper.attributes('data-renderer')).toBe('canvas2d');
      expect(drawing.fillRect).toHaveBeenCalled();
      expect(wrapper.get('[data-testid="distribution-bin-data"]').html()).toBe(before);
      wrapper.unmount();
    }
  );

  it('settles in-flight candidates and releases the checkpoint when the GPU context is lost', async () => {
    reduced = false;
    const { lose } = accelerate();
    const wrapper = mount(TradeDistribution, {
      props: { trades, live: true, calculating: true, calculation: checkpoint(1) },
    });
    const before = wrapper.get('[data-testid="distribution-bin-data"]').html();
    const pending = wrapper.vm.waitForCheckpoint(1);
    await animate(0);
    await animate(320);
    expect(wrapper.attributes('data-flow-mode')).toBe('live');
    lose();
    await pending;
    await flushPromises();
    expect(wrapper.attributes('data-renderer')).toBe('canvas2d');
    expect(wrapper.attributes('data-flow-mode')).toBe('idle');
    expect(wrapper.attributes('data-landed-count')).toBe('2');
    expect(wrapper.attributes('data-incoming-count')).toBe('0');
    expect(wrapper.get('[data-testid="distribution-bin-data"]').html()).toBe(before);
    expect(frames.size).toBe(0);
    wrapper.unmount();
  });

  it('paints real moving particles with Canvas2D when GPU rendering is unavailable', async () => {
    reduced = false;
    vi.spyOn(particleRendering, 'createTradeParticleRenderer').mockReturnValue(null);
    const wrapper = mount(TradeDistribution, { props: { trades } });
    await wrapper.get('[data-testid="distribution-replay"]').trigger('click');
    await animate(0);
    await animate(2000);
    expect(wrapper.attributes('data-renderer')).toBe('canvas2d');
    expect(drawing.arc).toHaveBeenCalled();
    expect(drawing.fill).toHaveBeenCalled();
    expect(wrapper.attributes('data-flow-mode')).toBe('replay');
    wrapper.unmount();
    expect(frames.size).toBe(0);
  });

  it('updates renderer colors with the theme without changing histogram data', async () => {
    const { renderer } = accelerate();
    const wrapper = mount(TradeDistribution, { props: { trades } });
    const before = wrapper.get('[data-testid="distribution-bin-data"]').html();
    document.documentElement.style.setProperty('--plot-profit', '#00ff00');
    await flushPromises();
    expect(renderer.setColors).toHaveBeenCalled();
    expect(wrapper.get('[data-testid="distribution-bin-data"]').html()).toBe(before);
    wrapper.unmount();
    expect(renderer.dispose).toHaveBeenCalledOnce();
  });

  it('compiles dark colors onto the scoped distribution component instead of the root ancestor', () => {
    const scope = 'data-v-distribution-theme-test';
    const style = parse(distributionSource).descriptor.styles[0];
    const compiled = compileStyle({ source: compileString(style.content).css, id: scope, scoped: style.scoped });
    expect(compiled.errors).toEqual([]);
    const rules: { selector: string; colors: Record<string, string> }[] = [];
    parseCss(compiled.code).walkRules((rule) => {
      const colors: Record<string, string> = {};
      rule.walkDecls(/^--plot-(profit|loss)$/, (declaration) => {
        colors[declaration.prop] = declaration.value;
      });
      if (Object.keys(colors).length) rules.push({ selector: rule.selector, colors });
    });
    expect(rules).toHaveLength(2);
    const dark = rules.find((rule) => rule.selector.includes('design-system-theme'));
    expect(dark?.selector).toBe(`html[design-system-theme=dark] .trade-distribution[${scope}]`);
    expect(dark?.colors).toEqual({ '--plot-profit': '#83e3b2', '--plot-loss': '#ffa6b0' });
    const root = document.createElement('html');
    root.setAttribute('design-system-theme', 'dark');
    const chart = document.createElement('section');
    chart.className = 'trade-distribution';
    chart.setAttribute(scope, '');
    root.append(chart);
    expect(chart.matches(dark!.selector)).toBe(true);
    expect(root.matches(dark!.selector)).toBe(false);
  });

  it.each(['canvas2d', 'webgl2'] as const)(
    'applies the native light and dark plot palette to %s rendering',
    async (backend) => {
      const fills: string[] = [];
      Object.defineProperty(drawing, 'fillStyle', { configurable: true, set: (value: string) => fills.push(value) });
      const renderer = backend === 'webgl2' ? accelerate().renderer : undefined;
      if (!renderer) vi.spyOn(particleRendering, 'createTradeParticleRenderer').mockReturnValue(null);
      vi.stubGlobal('getComputedStyle', () => ({
        getPropertyValue: (property: string) => {
          const dark = document.documentElement.getAttribute('design-system-theme') === 'dark';
          if (property === '--plot-profit') return dark ? '#83e3b2' : '#168a52';
          if (property === '--plot-loss') return dark ? '#ffa6b0' : '#d63743';
          return '';
        },
      }));
      const wrapper = mount(TradeDistribution, { props: { trades } });
      await wrapper.get('[data-testid="distribution-view-all"]').trigger('click');
      await flushPromises();
      if (renderer)
        expect(renderer.setColors).toHaveBeenLastCalledWith(
          expect.objectContaining({ positive: '#168a52', negative: '#d63743' })
        );
      else expect(fills).toEqual(expect.arrayContaining(['#168a52', '#d63743']));
      fills.length = 0;
      document.documentElement.setAttribute('design-system-theme', 'dark');
      await flushPromises();
      if (renderer)
        expect(renderer.setColors).toHaveBeenLastCalledWith(
          expect.objectContaining({ positive: '#83e3b2', negative: '#ffa6b0' })
        );
      else expect(fills).toEqual(expect.arrayContaining(['#83e3b2', '#ffa6b0']));
      wrapper.unmount();
    }
  );

  it('preserves an active replay and its progress when the native theme changes', async () => {
    reduced = false;
    const { renderer } = accelerate();
    const wrapper = mount(TradeDistribution, { props: { trades } });
    await wrapper.get('[data-testid="distribution-replay"]').trigger('click');
    await animate(0);
    await animate(2000);
    const before = wrapper.get('[data-testid="distribution-bin-data"]').html();
    const landed = wrapper.attributes('data-landed-count');
    renderer.setColors.mockClear();
    document.documentElement.style.setProperty('--plot-profit', '#00ff00');
    await flushPromises();
    expect(renderer.setColors).toHaveBeenCalled();
    expect(wrapper.attributes('data-flow-mode')).toBe('replay');
    expect(wrapper.attributes('data-landed-count')).toBe(landed);
    expect(wrapper.get('[data-testid="distribution-bin-data"]').html()).toBe(before);
    expect(frames.size).toBe(1);
    wrapper.unmount();
  });

  it('makes empty and omitted evidence explicit and emits the complete static inspection count', async () => {
    const wrapper = mount(TradeDistribution, { props: { trades: [] } });
    expect(wrapper.find('.distribution-empty').exists()).toBe(true);
    expect(wrapper.get('[data-testid="distribution-next"]').attributes('disabled')).toBeDefined();
    await wrapper.setProps({ trades: [...trades, trade('invalid', 'NaN')] });
    expect(wrapper.get('[data-testid="distribution-omitted"]').text()).toContain('1');
    expect(wrapper.attributes('data-candidate-count')).toBe('2');
    expect(wrapper.emitted('replay')?.at(-1)).toEqual([{ settledCount: 3 }]);
    wrapper.unmount();
  });
});
