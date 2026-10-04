import { FPNumber } from '@sora-substrate/sdk';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import TonswapRewardCurve from '@/features/misc/components/burn/TonswapRewardCurve.vue';
import curveSource from '@/features/misc/components/burn/TonswapRewardCurve.vue?raw';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params?.percent !== undefined ? `${params.percent}% of cap` : params?.cap ? `${key}: ${params.cap}` : key,
  }),
}));

describe('Tonswap marginal reward curve', () => {
  it.each([
    ['0', '50', '20', '30'],
    ['876678.5', '27.5', '180', '78'],
    ['1753356', '5.000025', null, null],
  ])('shows the actual marginal rate after %s XOR and locates it on the curve', (burned, rate, x, y) => {
    const wrapper = mount(TonswapRewardCurve, { props: { burned: new FPNumber(burned) } });
    expect(wrapper.get('.tonswap-curve__current strong').text()).toBe(`${rate} TS / XOR`);
    const point = wrapper.get('.tonswap-curve__point');
    if (x !== null && y !== null) {
      expect(point.attributes('cx')).toBe(x);
      expect(point.attributes('cy')).toBe(y);
    } else {
      expect(Number(point.attributes('cx'))).toBeLessThan(340);
      expect(Number(point.attributes('cx'))).toBeGreaterThan(339.99);
      expect(Number(point.attributes('cy'))).toBeLessThan(126);
    }
    expect(wrapper.get('.tonswap-curve__description').text()).toBe('burnPage.tonswap.curve.description');
  });

  it.each(['1753357', '99999999999999999999999'])(
    'clamps %s XOR at the exhausted cap without advertising an available reward',
    (burned) => {
      const wrapper = mount(TonswapRewardCurve, { props: { burned: new FPNumber(burned) } });
      expect(wrapper.find('.tonswap-curve__current').exists()).toBe(false);
      expect(wrapper.get('.tonswap-curve__description').text()).toBe('burnPage.tonswap.capReached');
      expect(wrapper.get('.tonswap-curve__point').attributes('cx')).toBe('340');
      expect(wrapper.get('.tonswap-curve__point').attributes('cy')).toBe('126');
      expect(wrapper.get('.tonswap-curve__burned').text()).toBe('1,753,357 XOR');
      expect(wrapper.get('.tonswap-curve__cap').text()).toBe('1,753,357 XOR');
      expect(wrapper.get('.tonswap-curve__progress').text()).toBe('100% of cap');
      expect(wrapper.get('desc').text()).toContain('100% of cap');
      expect(wrapper.get('desc').text()).toContain('burnPage.tonswap.capReached');
    }
  );

  it('groups the actual six XOR burned with its label separately from the schedule endpoints and cap', () => {
    const wrapper = mount(TonswapRewardCurve, { props: { burned: new FPNumber('6') } });
    const burned = wrapper.get('.tonswap-curve__burned-total');
    expect(burned.get('dt').text()).toBe('burnPage.tonswap.curve.burned');
    expect(burned.get('dd strong').text()).toBe('6 XOR');
    expect(burned.get('dd .tonswap-curve__progress').text()).toBe('0.0003% of cap');
    const cap = wrapper.get('.tonswap-curve__cap-total');
    expect(cap.get('dt').text()).toBe('burnPage.tonswap.cap');
    expect(cap.get('dd').text()).toBe('1,753,357 XOR');
    expect(wrapper.findAll('.tonswap-curve__tick').map((tick) => tick.text())).toEqual([
      'burnPage.tonswap.curve.start',
      'burnPage.tonswap.curve.end',
    ]);
    expect(wrapper.get('svg').text()).not.toMatch(/(?:^|\s)0(?:\s|$)/);
  });

  it.each([null, new FPNumber('-1'), new FPNumber('NaN')])(
    'shows only the schedule for unavailable or invalid data %s',
    (burned) => {
      const wrapper = mount(TonswapRewardCurve, { props: { burned } });
      expect(wrapper.find('.tonswap-curve__position').exists()).toBe(false);
      expect(wrapper.find('.tonswap-curve__current').exists()).toBe(false);
      expect(wrapper.find('.tonswap-curve__burned').exists()).toBe(false);
      expect(wrapper.find('.tonswap-curve__progress').exists()).toBe(false);
      expect(wrapper.text()).toContain('50 TS / XOR');
      expect(wrapper.text()).toContain('5 TS / XOR');
      expect(wrapper.get('desc').text()).toBe('burnPage.tonswap.curve.chartLabel: 1,753,357');
    }
  );

  it('shows small finalized updates through exact cap percentages without exaggerating the chart scale', async () => {
    const wrapper = mount(TonswapRewardCurve, { props: { burned: new FPNumber('0') } });
    expect(wrapper.get('.tonswap-curve__progress').text()).toBe('0% of cap');
    for (const [burned, percent] of [
      ['6', '0.0003'],
      ['1006', '0.0573'],
      ['9420.4', '0.5372'],
    ]) {
      await wrapper.setProps({ burned: new FPNumber(burned) });
      expect(wrapper.get('.tonswap-curve__progress').text()).toBe(`${percent}% of cap`);
      expect(wrapper.get('desc').text()).toContain(`${percent}% of cap`);
      expect(Number(wrapper.get('.tonswap-curve__point').attributes('cx'))).toBeGreaterThan(20);
      expect(Number(wrapper.get('.tonswap-curve__point').attributes('cx'))).toBeLessThan(22);
    }
  });

  it('updates from a loading schedule to the finalized position and preserves atom precision', async () => {
    const wrapper = mount(TonswapRewardCurve, { props: { burned: null } });
    await wrapper.setProps({ burned: new FPNumber('0.000000000000000001') });
    expect(wrapper.get('.tonswap-curve__current strong').text()).toBe('49.999999 TS / XOR');
    expect(wrapper.get('.tonswap-curve__point').exists()).toBe(true);
    await wrapper.setProps({ burned: new FPNumber('876678.5') });
    expect(wrapper.get('.tonswap-curve__point').attributes('cx')).toBe('180');
    expect(wrapper.get('.tonswap-curve__current strong').text()).toBe('27.5 TS / XOR');
  });

  it('can leave the rate and totals to the page while still drawing, locating and describing the position', () => {
    const wrapper = mount(TonswapRewardCurve, { props: { burned: new FPNumber('876678.5'), showSummary: false } });

    expect(wrapper.find('.tonswap-curve__current').exists()).toBe(false);
    expect(wrapper.find('.tonswap-curve__totals').exists()).toBe(false);
    expect(wrapper.get('.tonswap-curve__point').attributes('cx')).toBe('180');
    // Screen readers still get the progress and the rate from the chart description.
    expect(wrapper.get('desc').text()).toContain('876,678.5 / 1,753,357');
    expect(wrapper.get('desc').text()).toContain('27.5 TS / XOR');
    expect(wrapper.get('h3').text()).toBe('burnPage.tonswap.curve.title');
  });

  it('keeps the summary by default so other pages are unchanged', () => {
    const wrapper = mount(TonswapRewardCurve, { props: { burned: new FPNumber('876678.5') } });

    expect(wrapper.find('.tonswap-curve__current').exists()).toBe(true);
    expect(wrapper.find('.tonswap-curve__totals').exists()).toBe(true);
  });

  it('draws the chart left to right in every language', () => {
    expect(curveSource).toMatch(/&__chart\s*\{[\s\S]*?direction: ltr;/);
  });

  it('provides an accessible schedule, progress and exact formatted current rate without duplicate IDs', () => {
    const wrapper = mount({
      components: { TonswapRewardCurve },
      setup: () => ({ burned: new FPNumber('876678.5') }),
      template: '<div><TonswapRewardCurve :burned="burned"/><TonswapRewardCurve :burned="null"/></div>',
    });
    const charts = wrapper.findAll('svg[role="img"]');
    const first = charts[0];
    expect(first.get('desc').text()).toContain('burnPage.tonswap.curve.chartLabel: 1,753,357');
    expect(first.get('desc').text()).toContain('876,678.5 / 1,753,357');
    expect(first.get('desc').text()).toContain('27.5 TS / XOR');
    expect(first.attributes('aria-labelledby')).toBe(first.get('title').attributes('id'));
    expect(first.attributes('aria-describedby')).toBe(first.get('desc').attributes('id'));
    expect(charts[0].attributes('aria-describedby')).not.toBe(charts[1].attributes('aria-describedby'));
    const gradients = wrapper.findAll('linearGradient');
    expect(gradients[0].attributes('id')).not.toBe(gradients[1].attributes('id'));
    for (const section of wrapper.findAll('section')) {
      expect(section.attributes('aria-labelledby')).toBe(section.get('h3').attributes('id'));
    }
  });
});
