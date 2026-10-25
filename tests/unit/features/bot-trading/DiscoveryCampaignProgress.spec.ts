import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import DiscoveryCampaignProgress from '@/features/bot-trading/components/DiscoveryCampaignProgress.vue';
import { DISCOVERY_GOAL_ACTIVE_MS, type DiscoveryCampaign } from '@/features/bot-trading/campaign';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

/** A finalized mark with exact integer output-token values. */
function progress(
  overrides: Partial<DiscoveryCampaign['progress'][string]> = {}
): DiscoveryCampaign['progress'][string] {
  return {
    botId: 'bot-one',
    maxDrawdownPercent: '5',
    openedOutputCodec: '100',
    latestOutputCodec: '100',
    benchmarkOutputCodec: '100',
    peakOutputCodec: '100',
    activeMs: 0,
    successfulSwaps: 0,
    outcome: 'active',
    ...overrides,
  };
}

describe('DiscoveryCampaignProgress', () => {
  it('shows zero evidence without implying elapsed time or finalized swaps', () => {
    const wrapper = mount(DiscoveryCampaignProgress, { props: { progress: progress() } });
    expect(wrapper.findAll('[role="progressbar"]')).toHaveLength(3);
    expect(wrapper.get('[data-testid="campaign-progress-time"] .lane-fill').attributes('style')).toContain('width: 0%');
    expect(wrapper.get('[data-testid="campaign-progress-swaps"] .lane-fill').attributes('style')).toContain(
      'width: 0%'
    );
    expect(wrapper.get('[data-testid="campaign-progress-drawdown"] .lane-fill').attributes('style')).toContain(
      'width: 0%'
    );
    expect(wrapper.get('[data-testid="campaign-drawdown-value"]').text()).toContain('0% / 5%');
    expect(
      wrapper.get('[data-testid="campaign-progress-time"] [role="progressbar"]').attributes('aria-valuetext')
    ).toBe(`0 ms / ${DISCOVERY_GOAL_ACTIVE_MS} ms`);
    wrapper.unmount();
  });

  it('uses bounded widths but preserves actual totals above the time and trade goals', () => {
    const actual = progress({ activeMs: DISCOVERY_GOAL_ACTIVE_MS + 86_400_000, successfulSwaps: 13 });
    const wrapper = mount(DiscoveryCampaignProgress, { props: { progress: actual } });
    const time = wrapper.get('[data-testid="campaign-progress-time"]');
    const swaps = wrapper.get('[data-testid="campaign-progress-swaps"]');
    expect(time.text()).toContain('15.00 / 14');
    expect(swaps.text()).toContain('13 / 10');
    expect(time.get('.lane-fill').attributes('style')).toContain('width: 100%');
    expect(swaps.get('.lane-fill').attributes('style')).toContain('width: 100%');
    expect(time.get('[role="progressbar"]').attributes('aria-valuenow')).toBe(String(DISCOVERY_GOAL_ACTIVE_MS));
    expect(time.get('[role="progressbar"]').attributes('aria-valuetext')).toContain(String(actual.activeMs));
    expect(swaps.get('[role="progressbar"]').attributes('aria-valuetext')).toContain('13 / 10');
    wrapper.unmount();
  });

  it('shows sub-hundredth active time without rounding nonzero activity to zero', () => {
    const wrapper = mount(DiscoveryCampaignProgress, { props: { progress: progress({ activeMs: 1_000 }) } });
    expect(wrapper.get('[data-testid="campaign-progress-time"]').text()).toContain('<0.01 / 14');
    expect(
      wrapper.get('[data-testid="campaign-progress-time"] [role="progressbar"]').attributes('aria-valuetext')
    ).toContain('1000 ms');
    wrapper.unmount();
  });

  it('calculates drawdown and the user limit from exact codec values', async () => {
    const wrapper = mount(DiscoveryCampaignProgress, {
      props: {
        progress: progress({ peakOutputCodec: '100000000000000000000', latestOutputCodec: '97500000000000000000' }),
      },
    });
    const lane = wrapper.get('[data-testid="campaign-progress-drawdown"]');
    expect(lane.get('[data-testid="campaign-drawdown-value"]').text()).toContain('2.5% / 5%');
    expect(lane.get('.lane-fill').attributes('style')).toContain('width: 50%');
    expect(lane.classes()).not.toContain('breached');

    await wrapper.setProps({
      progress: progress({ peakOutputCodec: '1000', latestOutputCodec: '945', maxDrawdownPercent: '5' }),
    });
    expect(lane.get('[data-testid="campaign-drawdown-value"]').text()).toContain('5.5% / 5%');
    expect(lane.get('.lane-fill').attributes('style')).toContain('width: 100%');
    expect(lane.classes()).toContain('breached');
    expect(lane.get('[role="progressbar"]').attributes('aria-valuetext')).toContain('5.5% / 5%');
    wrapper.unmount();
  });

  it('marks repeating or tiny ratios as approximate while never converting token values to Number', () => {
    const repeating = mount(DiscoveryCampaignProgress, {
      props: { progress: progress({ peakOutputCodec: '12', latestOutputCodec: '10' }) },
    });
    expect(repeating.get('[data-testid="campaign-drawdown-value"]').text()).toContain('≈16.6666% / 5%');
    expect(repeating.get('[data-testid="campaign-progress-drawdown"] .lane-fill').attributes('style')).toContain(
      'width: 100%'
    );
    repeating.unmount();

    const tiny = mount(DiscoveryCampaignProgress, {
      props: { progress: progress({ peakOutputCodec: '1' + '0'.repeat(100), latestOutputCodec: '9'.repeat(100) }) },
    });
    expect(tiny.get('[data-testid="campaign-drawdown-value"]').text()).toContain('<0.0001% / 5%');
    expect(tiny.get('[data-testid="campaign-progress-drawdown"] .lane-fill').attributes('style')).toContain(
      'width: 0%'
    );
    tiny.unmount();
  });

  it('does not display an invalid negative drawdown as a gain', () => {
    const wrapper = mount(DiscoveryCampaignProgress, {
      props: { progress: progress({ peakOutputCodec: '100', latestOutputCodec: '101' }) },
    });
    expect(wrapper.get('[data-testid="campaign-drawdown-value"]').text()).toContain('— / 5%');
    expect(wrapper.get('[data-testid="campaign-progress-drawdown"] .lane-fill').attributes('style')).toContain(
      'width: 0%'
    );
    wrapper.unmount();
  });

  it('does not claim a loss when there is no valid positive peak', () => {
    const wrapper = mount(DiscoveryCampaignProgress, {
      props: { progress: progress({ peakOutputCodec: '0', latestOutputCodec: '0' }) },
    });
    expect(wrapper.get('[data-testid="campaign-drawdown-value"]').text()).toContain('— / 5%');
    expect(wrapper.get('[data-testid="campaign-progress-drawdown"]').classes()).not.toContain('breached');
    wrapper.unmount();
  });

  it('shows zero-limit drawdown as available until the first marked decline', async () => {
    const wrapper = mount(DiscoveryCampaignProgress, {
      props: { progress: progress({ maxDrawdownPercent: '0' }) },
    });
    const lane = wrapper.get('[data-testid="campaign-progress-drawdown"]');
    expect(lane.classes()).not.toContain('breached');
    expect(lane.get('.lane-fill').attributes('style')).toContain('width: 0%');
    await wrapper.setProps({
      progress: progress({ maxDrawdownPercent: '0', latestOutputCodec: '99' }),
    });
    expect(lane.classes()).toContain('breached');
    expect(lane.get('.lane-fill').attributes('style')).toContain('width: 100%');
    expect(lane.text()).toContain('1% / 0%');
    wrapper.unmount();
  });
});
