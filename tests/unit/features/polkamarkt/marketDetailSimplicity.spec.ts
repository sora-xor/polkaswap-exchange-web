import { mount, shallowMount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import MarketDetail from '@/features/polkamarkt/components/MarketDetail.vue';
import PricingCurvePositionChart from '@/features/polkamarkt/components/PricingCurvePositionChart.vue';
import type { PolkamarktMarket } from '@/features/polkamarkt/types';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const market: PolkamarktMarket = {
  id: 'simple-detail',
  title: 'Will inflation exceed 3.7%? YES if the first release exceeds 3.7%; otherwise NO.',
  description: 'Use the official headline value. Cancel if the release is not published before the deadline.',
  category: 'Macro',
  liquidity: 1000,
  volume: 250,
  probability: 63,
  status: 'Open',
};

describe('Polkamarkt detail simplicity', () => {
  it('shows the short question and preserves the complete rules in a native disclosure before the chart', () => {
    const wrapper = shallowMount(MarketDetail, { props: { market } });
    const rules = wrapper.get('[data-testid="market-rules"]');

    expect(wrapper.get('h1').text()).toBe('Will inflation exceed 3.7%?');
    expect(rules.element.tagName).toBe('DETAILS');
    expect(rules.get('summary').text()).toBe('polkamarkt.details.rules');
    expect(rules.attributes('open')).toBeUndefined();
    expect(rules.findAll('p').map((paragraph) => paragraph.text())).toEqual([market.title, market.description]);
    expect(wrapper.html().indexOf('data-testid="market-rules"')).toBeLessThan(
      wrapper.html().indexOf('<market-outcome-chart-stub')
    );
  });

  it('keeps volume, liquidity and the close block beside the status without duplicating curve quotes', () => {
    const wrapper = shallowMount(MarketDetail, {
      props: { market: { ...market, closeBlock: 99 }, currentBlock: 100 },
    });
    const metrics = wrapper.get('dl.market-detail__metrics');

    expect(metrics.text()).not.toContain('polkamarkt.metrics.yesQuote');
    expect(metrics.text()).not.toContain('polkamarkt.metrics.noQuote');
    expect(metrics.text()).toContain('$250');
    expect(metrics.text()).toContain('$1,000');
    expect(metrics.text()).toContain('99');
    expect(wrapper.get('.market-detail__context').text()).toContain('polkamarkt.status.closed');
  });

  it('does not repeat a description that already matches the full rules', () => {
    const wrapper = shallowMount(MarketDetail, { props: { market: { ...market, description: market.title } } });

    expect(wrapper.get('[data-testid="market-rules"]').findAll('p')).toHaveLength(1);
  });

  it('always shows the DPM pricing curve immediately after the rules and before metrics and history', () => {
    const wrapper = shallowMount(MarketDetail, {
      props: { market: { ...market, mechanism: 'DynamicPariMutuel' } },
    });
    const curve = wrapper.getComponent(PricingCurvePositionChart);

    expect(curve.element.closest('details')).toBeNull();
    expect(curve.isVisible()).toBe(true);
    expect(wrapper.get('[data-testid="market-rules"]').element.nextElementSibling).toBe(curve.element);
    expect(curve.element.nextElementSibling).toBe(wrapper.get('.market-detail__metrics').element);
    expect(wrapper.get('.market-detail__metrics').element.nextElementSibling?.tagName).toBe(
      'MARKET-OUTCOME-CHART-STUB'
    );
  });

  it.each([false, true])('keeps the curve, current marker and financial metrics visible with compact=%s', (compact) => {
    const wrapper = mount(PricingCurvePositionChart, {
      props: {
        compact,
        market: {
          ...market,
          mechanism: 'DynamicPariMutuel',
          virtualDepth: 100,
          dpmCollateral: 100,
          realYesShares: 26,
          realNoShares: 74,
        },
      },
    });

    expect(wrapper.findAll('h3')).toHaveLength(1);
    expect(wrapper.get('h3').text()).toBe('polkamarkt.curve.title');
    expect(wrapper.get('svg').isVisible()).toBe(true);
    expect(wrapper.get('.pricing-curve__line--yes').attributes('d')).toMatch(/^M /);
    expect(wrapper.get('.pricing-curve__line--no').attributes('d')).toMatch(/^M /);
    expect(wrapper.findAll('.pricing-curve__state-dot')).toHaveLength(2);
    expect(wrapper.findAll('.pricing-curve__metric')).toHaveLength(4);
    expect(wrapper.get('.pricing-curve__metrics').text()).toContain('KUSD');
    expect(wrapper.find('details').exists()).toBe(false);
  });
});
