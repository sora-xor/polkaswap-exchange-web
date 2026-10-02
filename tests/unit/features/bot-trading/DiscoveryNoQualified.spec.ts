import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import DiscoveryNoQualified from '@/features/bot-trading/components/DiscoveryNoQualified.vue';
import type { DiscoveryCandidate, DiscoveryMetrics, DiscoverySession } from '@/features/bot-trading/discovery';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string, params?: { count: number }) => (params ? `${key} ${params.count}` : key) }),
}));

function metrics(
  returnPercent: string,
  excessReturnPercent: string | null,
  trades: number,
  drawdownPercent: string,
  coverage = 1
): DiscoveryMetrics {
  return {
    returnPercent,
    excessReturnPercent,
    benchmarkReturnPercent: '-12',
    trades,
    drawdownPercent,
    coverage,
    startAt: 1,
    endAt: 2,
  };
}

function candidate(id: string, overrides: Partial<DiscoveryCandidate> = {}): DiscoveryCandidate {
  return {
    id,
    pairKey: `xor>${id}`,
    callNumber: 1,
    status: 'rejected',
    reason: 'trainingGate',
    strategy: {} as DiscoveryCandidate['strategy'],
    settings: {} as DiscoveryCandidate['settings'],
    fees: {} as DiscoveryCandidate['fees'],
    historyFingerprint: 'history',
    training: metrics('-8.37', '6.39', 12, '12.53'),
    ...overrides,
  };
}

function session(overrides: Partial<DiscoverySession> = {}): DiscoverySession {
  return {
    phase: 'complete',
    candidates: [],
    finalists: [],
    pairs: [
      { key: 'xor>val', assetInAddress: 'xor', assetOutAddress: 'val', status: 'skipped', reason: 'denomination' },
    ],
    maxDrawdownPercent: '5',
    feedbackExploratory: false,
    holdoutReuse: false,
    ...overrides,
  } as DiscoverySession;
}

const pairTitle = (key: string) => key.replace('>', ' → ').toUpperCase();

describe('DiscoveryNoQualified', () => {
  it('renders only a completed run without finalists and names the untouched holdout accurately', async () => {
    const wrapper = mount(DiscoveryNoQualified, { props: { session: session({ phase: 'scanning' }), pairTitle } });
    expect(wrapper.find('[data-testid="discovery-no-qualified"]').exists()).toBe(false);
    await wrapper.setProps({ session: session() });
    expect(wrapper.get('h3').text()).toBe('bots.discovery.noQualified');
    expect(wrapper.get('[data-testid="discovery-no-qualified-holdout"]').text()).toBe(
      'bots.discovery.holdoutUntouchedOutcome'
    );
    expect(wrapper.text()).toContain('bots.discovery.noProposals');
    expect(wrapper.findAll('[data-testid="discovery-outcome-rejection"]')).toHaveLength(0);
    await wrapper.get('[data-testid="discovery-outcome-new-search"]').trigger('click');
    await wrapper.get('[data-testid="discovery-outcome-inspect-skips"]').trigger('click');
    expect(wrapper.emitted('new-run')).toHaveLength(1);
    expect(wrapper.emitted('inspect-skips')).toHaveLength(1);
    await wrapper.setProps({ session: session({ finalists: [{} as DiscoverySession['finalists'][number]] }) });
    expect(wrapper.find('[data-testid="discovery-no-qualified"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('shows every failed training check with observed values and does not call beating holding a profit', () => {
    const wrapper = mount(DiscoveryNoQualified, {
      props: { session: session({ candidates: [candidate('val')] }), pairTitle },
    });
    const failure = wrapper.get('[data-testid="discovery-outcome-rejection"]');
    expect(failure.text()).toContain('XOR → VAL');
    expect(failure.text()).toContain('bots.discovery.reason.netReturn');
    expect(failure.text()).toContain('-8.37% ≤ 0%');
    expect(failure.text()).toContain('bots.discovery.reason.drawdown');
    expect(failure.text()).toContain('12.53% > 5%');
    expect(failure.text()).not.toContain('bots.discovery.reason.holding');
    expect(failure.text()).not.toContain('bots.discovery.reason.tradeMinimum');
    expect(wrapper.get('[data-testid="discovery-no-qualified-holdout"]').text()).toBe(
      'bots.discovery.holdoutUntouchedOutcome'
    );
    wrapper.unmount();
  });

  it('reports holdout exposure and evaluates holdout checks against its five-swap threshold', async () => {
    const rejected = candidate('pswap', {
      reason: 'holdoutGate',
      holdoutState: 'complete',
      training: metrics('5', '3', 12, '3'),
      holdout: metrics('1', '-2.5', 4, '2', 0.95),
    });
    const wrapper = mount(DiscoveryNoQualified, { props: { session: session({ candidates: [rejected] }), pairTitle } });
    const failure = wrapper.get('[data-testid="discovery-outcome-rejection"]');
    expect(wrapper.get('[data-testid="discovery-no-qualified-holdout"]').text()).toBe(
      'bots.discovery.holdoutCheckedOutcome'
    );
    expect(failure.text()).toContain('bots.discovery.holdout');
    expect(failure.text()).toContain('bots.discovery.reason.coverage');
    expect(failure.text()).toContain('95% / 100%');
    expect(failure.text()).toContain('bots.discovery.reason.holding');
    expect(failure.text()).toContain('-2.50% ≤ 0%');
    expect(failure.text()).toContain('4 / 5');
    expect(failure.text()).not.toContain('bots.discovery.reason.netReturn');

    await wrapper.setProps({ session: session({ candidates: [candidate('pswap', { holdoutState: 'exposed' })] }) });
    expect(wrapper.get('[data-testid="discovery-no-qualified-holdout"]').text()).toBe(
      'bots.discovery.holdoutInterruptedOutcome'
    );
    wrapper.unmount();
  });

  it('keeps every rejection inspectable while limiting the initial detail list', () => {
    const candidates = ['a', 'b', 'c', 'd', 'e'].map((id) => candidate(id));
    const wrapper = mount(DiscoveryNoQualified, {
      props: { session: session({ candidates, pairs: [] }), pairTitle },
    });
    expect(wrapper.findAll('.outcome-evidence > .failure-list > li')).toHaveLength(3);
    expect(wrapper.get('.more-failures summary').text()).toContain('+2');
    expect(wrapper.findAll('[data-testid="discovery-outcome-rejection"]')).toHaveLength(5);
    expect(wrapper.find('[data-testid="discovery-outcome-inspect-skips"]').exists()).toBe(false);
    wrapper.unmount();
  });
});
