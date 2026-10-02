import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import DiscoveryVisuals from '@/features/bot-trading/components/DiscoveryVisuals.vue';
import type { DiscoveryCandidate, DiscoveryMetrics, DiscoverySession } from '@/features/bot-trading/discovery';
import type { StrategyConfig } from '@/features/bot-trading/types';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const DAY = 86_400_000;
const HOUR = 3_600_000;
const startAt = Date.UTC(2026, 5, 25);
const trainingEndAt = startAt + 76 * DAY;
const endAt = startAt + 90 * DAY;
const strategyProps = {
  strategyName: (kind: StrategyConfig['kind']) => `strategy ${kind}`,
  strategySummary: (strategy: StrategyConfig) => `crosses ${strategy.threshold}%`,
};

/** Make an actual frozen discovery window with two directed markets. */
function session(): DiscoverySession {
  return {
    version: 1,
    revision: 1,
    id: 'visual-check',
    createdAt: startAt,
    updatedAt: startAt,
    status: 'researching',
    phase: 'researching',
    idea: '',
    callCap: 12,
    callsUsed: 2,
    roundCursor: 0,
    capital: '100',
    feeBudgetXor: '1',
    maxDrawdownPercent: '10',
    window: { startAt, trainingEndAt, holdoutStartAt: trainingEndAt + HOUR, endAt },
    assets: [
      { address: 'xor', symbol: 'XOR', decimals: 18 },
      { address: 'val', symbol: 'VAL', decimals: 18 },
    ],
    pairs: [
      { key: 'xor>val', assetInAddress: 'xor', assetOutAddress: 'val', status: 'ready' },
      { key: 'val>xor', assetInAddress: 'val', assetOutAddress: 'xor', status: 'skipped', reason: 'incompleteHistory' },
    ],
    candidates: [],
    finalists: [],
    selectedIds: [],
    failedCalls: 0,
    feedbackExploratory: false,
    holdoutReuse: false,
  };
}

function metrics(returnPercent: string, drawdownPercent: string, excessReturnPercent: string): DiscoveryMetrics {
  return {
    returnPercent,
    excessReturnPercent,
    benchmarkReturnPercent: '5',
    drawdownPercent,
    trades: 12,
    coverage: 1,
    startAt,
    endAt: trainingEndAt,
  };
}

function candidate(id: string, training: DiscoveryMetrics, holdout?: DiscoveryMetrics): DiscoveryCandidate {
  return {
    id,
    pairKey: 'xor>val',
    callNumber: Number(id.slice(-1)),
    status: 'training',
    strategy: {
      kind: 'threshold',
      amount: '1',
      intervalMs: HOUR,
      threshold: '2',
      direction: 'above',
      fastWindow: 3,
      slowWindow: 9,
      prompt: '',
    },
    settings: {} as DiscoveryCandidate['settings'],
    fees: {} as DiscoveryCandidate['fees'],
    historyFingerprint: 'fixture',
    training,
    ...(holdout ? { holdout, holdoutState: 'exposed' as const } : {}),
  };
}

describe('DiscoveryVisuals evidence visualization', () => {
  it('shows the real market count and research split before a run without zero-value charts', async () => {
    const wrapper = mount(DiscoveryVisuals, { props: { ...strategyProps, session: null, directedMarketCount: 6 } });
    const preview = wrapper.get('[data-testid="discovery-visuals-empty"]');
    expect(preview.text()).toContain('bots.discovery.ready');
    expect(preview.text()).toContain('bots.discovery.period');
    expect(preview.get('[data-testid="discovery-preview-markets"]').text()).toContain('6');
    expect(preview.get('.preview-window').attributes('aria-label')).toBe('bots.discovery.period');
    expect(preview.findAll('[role="listitem"]').map((item) => item.text())).toEqual([
      'bots.discovery.markets',
      'bots.discovery.training',
      'bots.discovery.holdout',
    ]);
    expect(wrapper.find('[data-testid="discovery-coverage"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="discovery-window"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="discovery-scatter"]').exists()).toBe(false);
    expect(wrapper.find('.coverage-ready').exists()).toBe(false);
    expect(wrapper.find('.coverage-skipped').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="discovery-training-point"]')).toHaveLength(0);
    expect(wrapper.findAll('[data-testid="discovery-holdout-point"]')).toHaveLength(0);
    await wrapper.setProps({ preflightExploratory: true });
    expect(preview.findAll('[role="listitem"]').at(-1)?.text()).toBe('bots.discovery.exploratory');
    wrapper.unmount();
  });

  it('shows frozen timing and a scanning state before pair or candidate evidence arrives', async () => {
    const evidence = session();
    evidence.status = 'scanning';
    evidence.phase = 'scanning';
    evidence.pairs = [];
    const wrapper = mount(DiscoveryVisuals, { props: { ...strategyProps, session: evidence } });
    expect(wrapper.get('[data-testid="discovery-coverage"]').attributes()).toMatchObject({
      'data-total': '0',
      'data-ready': '0',
      'data-skipped': '0',
    });
    expect(wrapper.get('.coverage-scanning').text()).toBe('bots.discovery.scanning');
    expect(wrapper.find('.coverage-key').exists()).toBe(false);
    expect(wrapper.get('[data-testid="discovery-window"]').text()).toContain('2026-06-25');
    expect(wrapper.get('[data-testid="discovery-scatter-waiting"]').text()).toContain('bots.discovery.scanning');
    expect(wrapper.get('[data-testid="discovery-scatter-waiting"]').text()).toContain('bots.discovery.noCandidates');
    expect(wrapper.get('.plot-wrap').attributes('style')).toContain('display: none');
    expect(wrapper.findAll('[data-testid="discovery-training-point"]')).toHaveLength(0);

    const withEvidence = session();
    withEvidence.candidates = [candidate('draft-1', metrics('8.5', '4', '3.5'))];
    await wrapper.setProps({ session: withEvidence });
    expect(wrapper.find('[data-testid="discovery-scatter-waiting"]').exists()).toBe(false);
    expect(wrapper.get('.plot-wrap').attributes('style')).not.toContain('display: none');
    expect(wrapper.findAll('[data-testid="discovery-training-point"]')).toHaveLength(1);
    wrapper.unmount();
  });

  it('measures the plot when a first result arrives after the compact preview', async () => {
    const nativeBounds = HTMLElement.prototype.getBoundingClientRect;
    const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if (this.classList.contains('plot-wrap')) return { width: 260, height: 210 } as DOMRect;
      return nativeBounds.call(this);
    });
    const wrapper = mount(DiscoveryVisuals, { props: { ...strategyProps, session: null } });
    try {
      const evidence = session();
      evidence.candidates = [candidate('draft-1', metrics('8.5', '4', '3.5'))];
      await wrapper.setProps({ session: evidence });
      await nextTick();
      const point = wrapper.get('[data-testid="discovery-training-point"]');
      expect(Number(point.attributes('data-display-x'))).toBeLessThan(260);
      expect(Number(point.attributes('data-display-y'))).toBeLessThan(210);
    } finally {
      wrapper.unmount();
      bounds.mockRestore();
    }
  });

  it('maps frozen pair statuses and the exact training/holdout window', () => {
    const wrapper = mount(DiscoveryVisuals, { props: { ...strategyProps, session: session() } });
    expect(wrapper.get('[data-testid="discovery-coverage"]').attributes()).toMatchObject({
      'data-total': '2',
      'data-ready': '1',
      'data-screened': '2',
      'data-skipped': '1',
      'data-pending': '0',
    });
    expect(wrapper.get('.coverage-value').text()).toContain('2 / 2 bots.discovery.screened');
    expect(wrapper.get('[data-testid="discovery-skip-groups"] [data-reason="incompleteHistory"]').text()).toContain(
      'bots.discovery.noHistory'
    );
    expect(wrapper.get('[data-testid="discovery-research-phases"] .is-current').text()).toContain(
      'bots.discovery.requests'
    );
    expect(wrapper.get('.coverage-ready').attributes('stroke-dasharray')).toMatch(/^210\./);
    expect(wrapper.get('.window-training').attributes('style')).toContain('84.444');
    expect(wrapper.get('.window-holdout').attributes('style')).toContain('15.555');
    expect(wrapper.get('[data-testid="discovery-window"]').text()).toContain('2026-06-25');
    expect(wrapper.get('[data-testid="discovery-window"]').text()).toContain('2026-09-23');
    wrapper.unmount();
  });

  it('keeps partial scan progress distinct from verified evidence and shows the remaining work', () => {
    const evidence = session();
    evidence.status = 'scanning';
    evidence.phase = 'scanning';
    evidence.pairs.push({ key: 'xor>psw', assetInAddress: 'xor', assetOutAddress: 'psw', status: 'pending' });
    const wrapper = mount(DiscoveryVisuals, { props: { ...strategyProps, session: evidence } });
    expect(wrapper.get('[data-testid="discovery-coverage"]').attributes()).toMatchObject({
      'data-total': '3',
      'data-screened': '2',
      'data-ready': '1',
      'data-pending': '1',
    });
    expect(wrapper.get('[data-testid="discovery-scan-estimate"]').text()).toBe('bots.discovery.scanRemaining');
    expect(wrapper.get('[data-testid="discovery-research-phases"] .is-current').text()).toContain(
      'bots.discovery.scanning'
    );
    wrapper.unmount();
  });

  it('marks the user drawdown limit on the scatter and explains the fee basis near the results', () => {
    const evidence = session();
    evidence.maxDrawdownPercent = '5';
    evidence.candidates = [candidate('draft-1', metrics('-8.37', '12.53', '6.39'))];
    const wrapper = mount(DiscoveryVisuals, { props: { ...strategyProps, session: evidence } });
    const limit = wrapper.get('[data-testid="discovery-drawdown-limit"]');
    expect(limit.attributes('data-value')).toBe('5');
    expect(Number(limit.attributes('x1'))).toBeLessThan(
      Number(wrapper.get('[data-testid="discovery-training-point"]').attributes('data-x'))
    );
    expect(wrapper.get('[data-testid="discovery-fee-caveat"]').text()).toBe('bots.discovery.sourceNote');
    wrapper.unmount();
  });

  it('shows actual training metrics and releases holdout points only after completion', async () => {
    const evidence = session();
    evidence.candidates = [
      candidate('draft-1', metrics('8.5', '4', '3.5'), metrics('-2.25', '7.5', '-1.2')),
      candidate('draft-2', metrics('-3', '8', '-5')),
    ];
    const wrapper = mount(DiscoveryVisuals, { props: { ...strategyProps, session: evidence } });
    const training = wrapper.findAll('[data-testid="discovery-training-point"]');
    expect(training).toHaveLength(2);
    expect(training[0].attributes()).toMatchObject({
      'data-pair-key': 'xor>val',
      'data-risk': '4',
      'data-return': '8.5',
      'data-excess': '3.5',
      'data-trades': '12',
    });
    expect(training[0].attributes('aria-label')).toContain('XOR → VAL (xor>val)');
    expect(training[0].attributes('aria-label')).toContain('bots.discovery.excess 3.5%');
    expect(training[0].attributes('aria-label')).toContain('bots.discovery.trades 12');
    expect(Number(training[0].attributes('data-y'))).toBeLessThan(Number(training[1].attributes('data-y')));
    expect(wrapper.findAll('[data-testid="discovery-holdout-point"]')).toHaveLength(0);

    const complete = structuredClone(evidence);
    complete.candidates[0].holdoutState = 'complete';
    await wrapper.setProps({ session: complete });
    const holdout = wrapper.get('[data-testid="discovery-holdout-point"]');
    expect(holdout.attributes('data-return')).toBe('-2.25');
    expect(holdout.attributes('aria-label')).toContain('bots.discovery.holdout');
    expect(holdout.attributes('aria-label')).toContain('bots.discovery.excess -1.2%');
    expect(wrapper.find('[data-testid="discovery-visuals-empty"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('keeps plot coordinates finite for negative and very large percentages', () => {
    const evidence = session();
    evidence.candidates = [candidate('draft-1', metrics('-' + '9'.repeat(307), '9'.repeat(307), '-1'))];
    const wrapper = mount(DiscoveryVisuals, { props: { ...strategyProps, session: evidence } });
    const point = wrapper.get('[data-testid="discovery-training-point"]');
    expect(Number.isFinite(Number(point.attributes('data-x')))).toBe(true);
    expect(Number.isFinite(Number(point.attributes('data-y')))).toBe(true);
    expect(Number(point.attributes('data-x'))).toBeGreaterThanOrEqual(32);
    expect(Number(point.attributes('data-x'))).toBeLessThanOrEqual(324);
    expect(Number(point.attributes('data-y'))).toBeGreaterThanOrEqual(12);
    expect(Number(point.attributes('data-y'))).toBeLessThanOrEqual(157);
    wrapper.unmount();
  });

  it('keeps exact signed, tiny metric strings in point labels and uses finite axis shorthand', () => {
    const evidence = session();
    evidence.candidates = [
      candidate(
        'draft-1',
        metrics('-0.0000000000000000001', '0.0000000000000000002', '-0.0000000000000000003'),
        metrics('0.0000000000000000004', '0.0000000000000000005', '0.0000000000000000006')
      ),
    ];
    evidence.candidates[0].holdoutState = 'complete';
    const wrapper = mount(DiscoveryVisuals, { props: { ...strategyProps, session: evidence } });
    const training = wrapper.get('[data-testid="discovery-training-point"]');
    const holdout = wrapper.get('[data-testid="discovery-holdout-point"]');
    for (const attribute of ['aria-label', 'title']) {
      expect(training.attributes(attribute)).toContain('bots.discovery.return -0.0000000000000000001%');
      expect(training.attributes(attribute)).toContain('bots.discovery.drawdown 0.0000000000000000002%');
      expect(training.attributes(attribute)).toContain('bots.discovery.excess -0.0000000000000000003%');
      expect(holdout.attributes(attribute)).toContain('bots.discovery.return 0.0000000000000000004%');
    }
    expect(training.attributes('data-return')).toBe('-0.0000000000000000001');
    expect(wrapper.findAll('.plot-bound').map((label) => label.text())).toEqual(['<0.0001%', '−<0.0001%', '10%']);
    wrapper.unmount();
  });

  it('uses native marker buttons to focus a candidate without changing live selection', async () => {
    const evidence = session();
    evidence.candidates = [
      candidate('draft-1', metrics('8.5', '4', '3.5'), metrics('-2.25', '7.5', '-1.2')),
      candidate('draft-2', metrics('-3', '8', '-5')),
    ];
    evidence.candidates[0].holdoutState = 'complete';
    const wrapper = mount(DiscoveryVisuals, {
      props: { ...strategyProps, session: evidence, focusedCandidateId: null },
    });
    const first = wrapper.findAll('[data-testid="discovery-training-point"]')[0];
    expect(first.element.tagName).toBe('BUTTON');
    expect(first.attributes('type')).toBe('button');
    expect(first.attributes('aria-label')).toContain('filter.show #1');
    expect(first.attributes('aria-label')).toContain('XOR → VAL (xor>val)');
    await first.trigger('click');
    expect(wrapper.emitted('focus-candidate')).toEqual([['draft-1']]);
    expect(evidence.selectedIds).toEqual([]);

    await wrapper.setProps({ focusedCandidateId: 'draft-1' });
    expect(wrapper.get('[data-candidate-id="draft-1"][data-testid="discovery-training-point"]').classes()).toContain(
      'is-focused'
    );
    expect(wrapper.get('[data-candidate-id="draft-1"][data-testid="discovery-holdout-point"]').classes()).toContain(
      'is-focused'
    );
    expect(
      wrapper.get('[data-candidate-id="draft-2"][data-testid="discovery-training-point"]').classes()
    ).not.toContain('is-focused');
    expect(wrapper.get('.plot-connector').classes()).toContain('is-focused');
    const spotlight = wrapper.get('[data-testid="discovery-candidate-spotlight"]');
    expect(spotlight.attributes('role')).toBe('region');
    expect(spotlight.attributes('aria-labelledby')).toBe('discovery-candidate-spotlight-heading');
    expect(spotlight.attributes('data-candidate-id')).toBe('draft-1');
    expect(spotlight.get('[data-testid="discovery-spotlight-strategy"]').text()).toContain('strategy threshold');
    expect(spotlight.get('[data-testid="discovery-spotlight-strategy"]').text()).toContain('crosses 2%');
    expect(spotlight.get('[data-period="training"]').text()).toContain('8.50%');
    expect(spotlight.get('[data-period="holdout"]').text()).toContain('-2.25%');
    await spotlight.get('[data-testid="discovery-spotlight-view"]').trigger('click');
    expect(wrapper.emitted('view-candidate')).toEqual([['draft-1']]);
    expect(evidence.selectedIds).toEqual([]);

    await wrapper.get('[data-testid="discovery-holdout-point"]').trigger('click');
    expect(wrapper.emitted('focus-candidate')).toEqual([['draft-1'], ['draft-1']]);
    await wrapper.setProps({ focusedCandidateId: null });
    expect(wrapper.find('.plot-point.is-focused').exists()).toBe(false);
    expect(wrapper.find('[data-testid="discovery-candidate-spotlight"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it.each(['Enter', ' '])('moves focus to the chart inspector after %s activates a marker', async (key) => {
    const evidence = session();
    evidence.candidates = [candidate('draft-1', metrics('8.5', '4', '3.5'))];
    const wrapper = mount(DiscoveryVisuals, {
      attachTo: document.body,
      props: { ...strategyProps, session: evidence, focusedCandidateId: null },
    });
    try {
      const marker = wrapper.get('[data-testid="discovery-training-point"]');
      (marker.element as HTMLButtonElement).focus();
      expect(document.activeElement).toBe(marker.element);
      await marker.trigger('keydown', { key });
      await marker.trigger('keyup', { key });
      marker.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
      await wrapper.setProps({ focusedCandidateId: 'draft-1' });
      await nextTick();
      expect(document.activeElement).toBe(wrapper.get('[data-testid="discovery-spotlight-view"]').element);

      // Activating a point that is already focused should still reach the inspector.
      (marker.element as HTMLButtonElement).focus();
      marker.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
      await nextTick();
      expect(document.activeElement).toBe(wrapper.get('[data-testid="discovery-spotlight-view"]').element);
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps pointer activation focused on the chart marker', async () => {
    const evidence = session();
    evidence.candidates = [candidate('draft-1', metrics('8.5', '4', '3.5'))];
    const wrapper = mount(DiscoveryVisuals, {
      attachTo: document.body,
      props: { ...strategyProps, session: evidence, focusedCandidateId: null },
    });
    try {
      const marker = wrapper.get('[data-testid="discovery-training-point"]');
      (marker.element as HTMLButtonElement).focus();
      marker.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
      await wrapper.setProps({ focusedCandidateId: 'draft-1' });
      await nextTick();
      expect(document.activeElement).toBe(marker.element);
      expect(wrapper.get('[data-testid="discovery-candidate-spotlight"]').exists()).toBe(true);
    } finally {
      wrapper.unmount();
    }
  });

  it('rounds spotlight display, retains exact metric titles, and never reveals an uncompleted holdout', async () => {
    const evidence = session();
    evidence.candidates = [
      candidate(
        'draft-1',
        metrics('-0.0000000000000000001', '2.25', '-0.0000000000000000002'),
        metrics('17.123456789012345678', '4.5', '11.123456789012345678')
      ),
    ];
    evidence.candidates[0].holdoutState = 'sealed';
    const wrapper = mount(DiscoveryVisuals, {
      props: { ...strategyProps, session: evidence, focusedCandidateId: 'draft-1' },
    });
    const spotlight = () => wrapper.get('[data-testid="discovery-candidate-spotlight"]');
    expect(spotlight().findAll('.spotlight-period')).toHaveLength(1);
    expect(
      spotlight()
        .get('[data-period="training"]')
        .findAll('dd')
        .map((item) => item.text())
    ).toEqual(['0.00%', '2.25%', '0.00%', '12']);
    expect(spotlight().get('[data-period="training"]').findAll('dd')[0].attributes('title')).toBe(
      '-0.0000000000000000001%'
    );
    expect(spotlight().text()).not.toContain('17.123456789012345678');

    const exposed = structuredClone(evidence);
    exposed.candidates[0].holdoutState = 'exposed';
    await wrapper.setProps({ session: exposed });
    expect(spotlight().findAll('.spotlight-period')).toHaveLength(1);

    const complete = structuredClone(exposed);
    complete.candidates[0].holdoutState = 'complete';
    await wrapper.setProps({ session: complete });
    expect(
      spotlight()
        .get('[data-period="holdout"]')
        .findAll('dd')
        .map((item) => item.text())
    ).toEqual(['17.12%', '4.50%', '11.12%', '12']);
    expect(spotlight().get('[data-period="holdout"]').findAll('dd')[0].attributes('title')).toBe(
      '17.123456789012345678%'
    );

    await wrapper.setProps({ focusedCandidateId: 'missing' });
    expect(wrapper.find('[data-testid="discovery-candidate-spotlight"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('fans matching training and holdout markers while retaining their true data coordinates', async () => {
    const evidence = session();
    evidence.candidates = [candidate('draft-1', metrics('8.5', '4', '3.5'), metrics('8.5', '4', '3.5'))];
    evidence.candidates[0].holdoutState = 'complete';
    const wrapper = mount(DiscoveryVisuals, { props: { ...strategyProps, session: evidence } });
    const training = wrapper.get('[data-testid="discovery-training-point"]');
    const holdout = wrapper.get('[data-testid="discovery-holdout-point"]');
    expect(training.attributes('data-x')).toBe(holdout.attributes('data-x'));
    expect(training.attributes('data-y')).toBe(holdout.attributes('data-y'));
    expect(training.attributes('data-overlap')).toBe('true');
    expect(holdout.attributes('data-overlap')).toBe('true');
    expect(
      Math.hypot(
        Number(training.attributes('data-display-x')) - Number(holdout.attributes('data-display-x')),
        Number(training.attributes('data-display-y')) - Number(holdout.attributes('data-display-y'))
      )
    ).toBeGreaterThanOrEqual(32);
    const tether = wrapper.get('.plot-point-tether');
    expect(tether.attributes('data-true-x')).toBe(training.attributes('data-x'));
    expect(tether.attributes('data-true-y')).toBe(training.attributes('data-y'));
    await training.trigger('click');
    await holdout.trigger('click');
    expect(wrapper.emitted('focus-candidate')).toEqual([['draft-1'], ['draft-1']]);
    wrapper.unmount();
  });

  it('keeps near-overlapping candidates individually clickable after a responsive resize', async () => {
    const evidence = session();
    evidence.candidates = [
      candidate('draft-1', metrics('8.5', '4', '3.5')),
      candidate('draft-2', metrics('8.51', '4.01', '3.5')),
      candidate('draft-3', metrics('8.5', '4', '3.5')),
    ];
    let width = 260;
    const nativeBounds = HTMLElement.prototype.getBoundingClientRect;
    const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if (this.classList.contains('plot-wrap')) return { width, height: 210 } as DOMRect;
      return nativeBounds.call(this);
    });
    const wrapper = mount(DiscoveryVisuals, { props: { ...strategyProps, session: evidence } });
    try {
      await nextTick();
      const points = () => wrapper.findAll('[data-testid="discovery-training-point"]');
      const assertAccess = (plotWidth: number) => {
        const coordinates = points().map((point) => ({
          x: Number(point.attributes('data-display-x')),
          y: Number(point.attributes('data-display-y')),
        }));
        for (const coordinate of coordinates) {
          expect(coordinate.x).toBeGreaterThanOrEqual(14);
          expect(coordinate.x).toBeLessThanOrEqual(plotWidth - 14);
          expect(coordinate.y).toBeGreaterThanOrEqual(14);
          expect(coordinate.y).toBeLessThanOrEqual(210 - 14);
        }
        for (let first = 0; first < coordinates.length; first += 1) {
          for (let second = first + 1; second < coordinates.length; second += 1) {
            expect(
              Math.hypot(coordinates[first].x - coordinates[second].x, coordinates[first].y - coordinates[second].y)
            ).toBeGreaterThanOrEqual(32);
          }
        }
      };
      expect(points()).toHaveLength(3);
      expect(points()[0].attributes('data-x')).toBe(points()[2].attributes('data-x'));
      expect(points()[0].attributes('data-y')).toBe(points()[2].attributes('data-y'));
      assertAccess(width);
      expect(wrapper.findAll('.plot-point-tether')).toHaveLength(2);
      for (const point of points()) await point.trigger('click');
      expect(wrapper.emitted('focus-candidate')).toEqual([['draft-1'], ['draft-2'], ['draft-3']]);

      width = 420;
      window.dispatchEvent(new Event('resize'));
      await nextTick();
      assertAccess(width);
    } finally {
      wrapper.unmount();
      bounds.mockRestore();
    }
  });

  it('keeps a full 12-candidate overlapping result set reachable on a narrow plot', async () => {
    const evidence = session();
    evidence.candidates = Array.from({ length: 12 }, (_, index) => {
      const result = candidate(`draft-${index + 1}`, metrics('8.5', '4', '3.5'), metrics('8.5', '4', '3.5'));
      result.callNumber = index + 1;
      result.holdoutState = 'complete';
      return result;
    });
    const nativeBounds = HTMLElement.prototype.getBoundingClientRect;
    const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if (this.classList.contains('plot-wrap')) return { width: 260, height: 210 } as DOMRect;
      return nativeBounds.call(this);
    });
    const wrapper = mount(DiscoveryVisuals, { props: { ...strategyProps, session: evidence } });
    try {
      await nextTick();
      const points = [
        ...wrapper.findAll('[data-testid="discovery-training-point"]'),
        ...wrapper.findAll('[data-testid="discovery-holdout-point"]'),
      ];
      expect(points).toHaveLength(24);
      const centers = points.map((point) => ({
        x: Number(point.attributes('data-display-x')),
        y: Number(point.attributes('data-display-y')),
      }));
      for (const center of centers) {
        expect(center.x).toBeGreaterThanOrEqual(14);
        expect(center.x).toBeLessThanOrEqual(246);
        expect(center.y).toBeGreaterThanOrEqual(14);
        expect(center.y).toBeLessThanOrEqual(196);
      }
      for (let first = 0; first < centers.length; first += 1) {
        for (let second = first + 1; second < centers.length; second += 1) {
          expect(
            Math.hypot(centers[first].x - centers[second].x, centers[first].y - centers[second].y)
          ).toBeGreaterThanOrEqual(32);
        }
      }
    } finally {
      wrapper.unmount();
      bounds.mockRestore();
    }
  });

  it('grows a narrow chart for the maximum 36 fully overlapping candidates', async () => {
    const evidence = session();
    evidence.candidates = Array.from({ length: 36 }, (_, index) => {
      const result = candidate(`draft-${index + 1}`, metrics('8.5', '4', '3.5'), metrics('8.5', '4', '3.5'));
      result.callNumber = index + 1;
      result.holdoutState = 'complete';
      return result;
    });
    const nativeBounds = HTMLElement.prototype.getBoundingClientRect;
    const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if (this.classList.contains('plot-wrap')) {
        const minimum = Number.parseFloat(
          this.querySelector('.scatter-plot')
            ?.getAttribute('style')
            ?.match(/min-height:\s*([\d.]+)px/)?.[1] ?? '0'
        );
        return { width: 260, height: Math.max(210, minimum) } as DOMRect;
      }
      return nativeBounds.call(this);
    });
    const wrapper = mount(DiscoveryVisuals, { props: { ...strategyProps, session: evidence } });
    try {
      await nextTick();
      window.dispatchEvent(new Event('resize'));
      await nextTick();
      const markers = [
        ...wrapper.findAll('[data-testid="discovery-training-point"]'),
        ...wrapper.findAll('[data-testid="discovery-holdout-point"]'),
      ];
      expect(markers).toHaveLength(72);
      const height = Number.parseFloat(
        wrapper
          .get('.scatter-plot')
          .attributes('style')
          ?.match(/min-height:\s*([\d.]+)px/)?.[1] ?? '0'
      );
      expect(height).toBeGreaterThan(210);
      const centers = markers.map((point) => ({
        x: Number(point.attributes('data-display-x')),
        y: Number(point.attributes('data-display-y')),
      }));
      for (const center of centers) {
        expect(center.x).toBeGreaterThanOrEqual(14);
        expect(center.x).toBeLessThanOrEqual(246);
        expect(center.y).toBeGreaterThanOrEqual(14);
        expect(center.y).toBeLessThanOrEqual(height - 14);
      }
      for (let first = 0; first < centers.length; first += 1) {
        for (let second = first + 1; second < centers.length; second += 1) {
          expect(
            Math.hypot(centers[first].x - centers[second].x, centers[first].y - centers[second].y)
          ).toBeGreaterThanOrEqual(32);
        }
      }
    } finally {
      wrapper.unmount();
      bounds.mockRestore();
    }
  });
});
