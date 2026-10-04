import { FPNumber } from '@sora-substrate/sdk';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import RewardsBreakdown from '@/features/rewards/components/rewards/RewardsBreakdown.vue';
import { buildBreakdown, buildRewardSources } from '@/features/rewards/utils/analytics';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/soraneo-wallet/src/components/FormattedAmount.vue', () => ({
  __esModule: true,
  default: defineComponent({
    name: 'FormattedAmountStub',
    props: { value: String, assetSymbol: String, isFiatValue: Boolean },
    setup(props) {
      return () =>
        h('formatted-amount', { 'data-fiat': props.isFiatValue ? 'true' : 'false', 'data-asset': props.assetSymbol }, [
          props.value as string,
        ]);
    },
  }),
}));

const PSWAP = { address: '0xpswap', symbol: 'PSWAP', decimals: 18 } as never;
const VAL = { address: '0xval', symbol: 'VAL', decimals: 18 } as never;
const codec = (value: number | string): string => new FPNumber(value).toCodecString();

const createBreakdown = (prices: Record<string, string> = { '0xpswap': codec(1), '0xval': codec(1) }, internal = 75) =>
  buildBreakdown(
    buildRewardSources({
      internal: { type: ['Provision', 'LiquidityProvision'], asset: PSWAP, amount: codec(internal) } as never,
      vested: null,
      vestedAsset: PSWAP,
      crowdloan: {},
      external: [{ type: ['External', 'XorErc20'], asset: VAL, amount: codec(25) } as never],
      selectedInternal: true,
      selectedVested: false,
      selectedCrowdloanTags: [],
      selectedExternal: false,
    }),
    prices
  );

const mountCard = (props: Record<string, unknown> = {}) =>
  mount(RewardsBreakdown, { props: { breakdown: createBreakdown(), connected: true, ...props } });

describe('RewardsBreakdown.vue', () => {
  it('draws one segment per priced source, sized by share and colored by source', () => {
    const wrapper = mountCard();
    const segments = wrapper.findAll('.rw-stack__segment');

    expect(segments).toHaveLength(2);
    expect(segments[0].attributes('style')).toContain('flex-grow: 0.75');
    expect(segments[0].attributes('style')).toContain('--rw-color: var(--rw-src-liquidity)');
    expect(segments[1].attributes('style')).toContain('flex-grow: 0.25');
    expect(segments[1].attributes('style')).toContain('--rw-color: var(--rw-src-external)');
  });

  it('lists every source in a legend with its name, value and share', () => {
    const wrapper = mountCard();
    const rows = wrapper.findAll('.rw-legend__row');

    // The unticked external source carries its "skipped" flag in the name cell.
    expect(rows.map((row) => row.find('.rw-legend__name').text())).toEqual([
      'rewards.analytics.sources.liquidity',
      'rewards.analytics.sources.external rewards.analytics.skipped',
    ]);
    expect(rows.map((row) => row.find('.rw-legend__share').text())).toEqual(['75%', '25%']);
    expect(rows[0].find('formatted-amount').attributes('data-fiat')).toBe('true');
  });

  it('describes the bar for assistive technology', () => {
    const wrapper = mountCard();

    expect(wrapper.find('.rw-stack').attributes('aria-label')).toBe(
      'rewards.analytics.sources.liquidity 75%, rewards.analytics.sources.external 25%'
    );
  });

  it('flags sources that are not part of the claim and dims their segment', () => {
    const wrapper = mountCard();
    const rows = wrapper.findAll('.rw-legend__row');
    const segments = wrapper.findAll('.rw-stack__segment');

    // Liquidity is ticked, external is not.
    expect(rows[0].find('.rw-legend__flag').exists()).toBe(false);
    expect(rows[1].find('.rw-legend__flag').text()).toBe('rewards.analytics.skipped');
    expect(segments[0].classes()).not.toContain('is-skipped');
    expect(segments[1].classes()).toContain('is-skipped');
  });

  it('shows the same readout for hover and focus, and clears it again', async () => {
    const wrapper = mountCard();
    const rows = wrapper.findAll('.rw-legend__row');

    expect(wrapper.find('.rw-tip').exists()).toBe(false);

    await rows[1].trigger('pointerenter');
    expect(wrapper.find('.rw-stack').classes()).toContain('rw-stack--focus');
    expect(wrapper.find('.rw-tip').text()).toContain('rewards.analytics.sources.external');
    expect(wrapper.find('.rw-tip').text()).toContain('25%');
    expect(wrapper.findAll('.rw-stack__segment')[1].classes()).toContain('is-active');

    await rows[1].trigger('pointerleave');
    expect(wrapper.find('.rw-tip').exists()).toBe(false);

    await wrapper.findAll('.rw-stack__segment')[0].trigger('pointerenter');
    expect(wrapper.find('.rw-tip').text()).toContain('rewards.analytics.sources.liquidity');

    await wrapper.find('.rw-stack').trigger('pointerleave');
    expect(wrapper.find('.rw-tip').exists()).toBe(false);

    await rows[0].trigger('focus');
    expect(rows[0].classes()).toContain('is-active');
    await rows[0].trigger('blur');
    expect(rows[0].classes()).not.toContain('is-active');
  });

  it('switches to a table with the same numbers', async () => {
    const wrapper = mountCard();
    const toggle = wrapper.find('.rw-card__toggle');

    expect(toggle.attributes('aria-pressed')).toBe('false');
    expect(wrapper.find('table').exists()).toBe(false);

    await toggle.trigger('click');

    expect(toggle.attributes('aria-pressed')).toBe('true');
    expect(wrapper.find('.rw-stack').exists()).toBe(false);
    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows[0].find('th').text()).toBe('rewards.analytics.sources.liquidity');
    expect(rows[0].findAll('td')[2].text()).toBe('75%');
  });

  it('keeps unpriced sources in the legend only and explains why', () => {
    const wrapper = mountCard({ breakdown: createBreakdown({ '0xpswap': codec(1) }) });

    expect(wrapper.findAll('.rw-stack__segment')).toHaveLength(1);
    const rows = wrapper.findAll('.rw-legend__row');
    expect(rows).toHaveLength(2);
    expect(rows[1].find('.rw-legend__share').text()).toBe('–');
    // The unpriced source shows token amounts instead of a fiat value.
    expect(rows[1].find('formatted-amount').attributes('data-fiat')).toBe('false');
    expect(wrapper.find('.rw-card__note').text()).toBe('rewards.analytics.sources.unpriced');
  });

  it('does not call an unpriced source 0% for assistive technology, and frames an empty bar', () => {
    const wrapper = mountCard({ breakdown: createBreakdown({}) });

    // Nothing can be priced: no segment is drawn, the bar keeps its frame, and shares read as dashes.
    expect(wrapper.findAll('.rw-stack__segment')).toHaveLength(0);
    expect(wrapper.find('.rw-stack').classes()).toContain('rw-stack--ghost');
    expect(wrapper.find('.rw-stack').attributes('aria-label')).toBe(
      'rewards.analytics.sources.liquidity –, rewards.analytics.sources.external –'
    );
  });

  it('shows an empty frame with a hint when nothing is connected or earned', () => {
    const disconnected = mountCard({ connected: false });

    expect(disconnected.find('.rw-stack--ghost').exists()).toBe(true);
    expect(disconnected.find('.rw-card__ghost').text()).toBe('rewards.analytics.connectToSee');
    expect(disconnected.find('.rw-card__toggle').exists()).toBe(false);

    const empty = mountCard({ breakdown: buildBreakdown([], {}) });

    expect(empty.find('.rw-card__ghost').text()).toBe('rewards.analytics.sources.empty');
    expect(empty.find('.rw-card__toggle').exists()).toBe(false);
  });

  it('staggers its entrance with the position it was given', () => {
    const wrapper = mountCard({ index: 2 });

    expect(wrapper.find('section').attributes('style')).toContain('--rw-i: 2');
  });
});
