import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import MarketOutcomeChart from '@/features/polkamarkt/components/MarketOutcomeChart.vue';
import MarketShareWidget from '@/features/polkamarkt/components/MarketShareWidget.vue';
import type { PolkamarktMarket } from '@/features/polkamarkt/types';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const market: PolkamarktMarket = {
  id: '42',
  chainId: 42,
  title: 'Will Bitcoin reach $100,000?',
  category: 'Crypto',
  description: 'Use the published closing price.',
  liquidity: 100,
  volume: 10,
  probability: 59.86,
};

describe('Polkamarkt current probability presentation', () => {
  it.each([
    [59.86, '60%', '40%'],
    [41.83, '42%', '58%'],
    [50.5, '51%', '49%'],
    [0.8, '<1%', '>99%'],
  ] as const)('shows current %s odds instead of an older indexed snapshot', (probability, yes, no) => {
    const wrapper = mount(MarketOutcomeChart, {
      props: {
        market: { ...market, probability },
        points: [{ id: 'old', timestamp: 1, probability: 87 }],
      },
    });
    expect(wrapper.get('[data-testid="market-history-label-yes"]').text()).toBe(`YES ${yes}`);
    expect(wrapper.get('[data-testid="market-history-label-no"]').text()).toBe(`NO ${no}`);
    expect(wrapper.get('.market-outcome-chart__summary').text()).toContain(yes);
    expect(wrapper.get('.market-outcome-chart__summary').text()).toContain(no);
    const yesPoints = wrapper.findAll('circle').slice(0, 2);
    expect(yesPoints).toHaveLength(2);
    // The final curve point must use the live probability, not the stale 87% snapshot.
    const chartHeight = 220;
    const padding = 24;
    expect(Number(yesPoints[1].attributes('cy'))).toBeCloseTo(
      padding + ((100 - probability) / 100) * (chartHeight - padding * 2)
    );
  });

  it('uses the latest snapshot when a current quote is unavailable', () => {
    const wrapper = mount(MarketOutcomeChart, {
      props: { market: { ...market, probability: undefined }, points: [{ id: 'latest', probability: 41.83 }] },
    });
    expect(wrapper.get('[data-testid="market-history-label-yes"]').text()).toBe('YES 42%');
    expect(wrapper.get('[data-testid="market-history-label-no"]').text()).toBe('NO 58%');
  });

  it('keeps share widget odds consistent with sub-percent market cards', () => {
    const wrapper = mount(MarketShareWidget, { props: { market: { ...market, probability: 0.8 } } });
    expect(wrapper.text()).toContain('<1%');
    expect(wrapper.text()).toContain('>99%');
  });
});
