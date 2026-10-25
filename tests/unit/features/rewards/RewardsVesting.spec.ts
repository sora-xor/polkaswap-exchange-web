import { FPNumber } from '@sora-substrate/sdk';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import RewardsVesting from '@/features/rewards/components/rewards/RewardsVesting.vue';
import { buildRewardSources, buildVesting, type RewardsSnapshot } from '@/features/rewards/utils/analytics';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/soraneo-wallet/src/components/FormattedAmount.vue', () => ({
  __esModule: true,
  default: defineComponent({
    name: 'FormattedAmountStub',
    props: { value: String, assetSymbol: String },
    setup(props) {
      return () => h('formatted-amount', { 'data-asset': props.assetSymbol }, [props.value as string]);
    },
  }),
}));

const PSWAP = { address: '0xpswap', symbol: 'PSWAP', decimals: 18 } as never;
const VAL = { address: '0xval', symbol: 'VAL', decimals: 18 } as never;
const codec = (value: number | string): string => new FPNumber(value).toCodecString();
const prices = { '0xpswap': codec(1), '0xval': codec(1) };

const snapshot = (overrides: Partial<RewardsSnapshot> = {}): RewardsSnapshot => ({
  internal: null,
  vested: { limit: codec(25), total: codec(100), rewards: [] },
  vestedAsset: PSWAP,
  crowdloan: { Tag: [{ type: ['Crowdloan', 'Tag'], asset: VAL, amount: codec(10), total: codec(10) } as never] },
  external: [],
  selectedInternal: false,
  selectedVested: true,
  selectedCrowdloanTags: ['Tag'],
  selectedExternal: false,
  ...overrides,
});

const mountCard = (props: Record<string, unknown> = {}, overrides: Partial<RewardsSnapshot> = {}) =>
  mount(RewardsVesting, {
    props: {
      vesting: buildVesting(buildRewardSources(snapshot(overrides)), prices),
      connected: true,
      ...props,
    },
  });

describe('RewardsVesting.vue', () => {
  it('shows one same-ramp meter per vesting source with its unlocked share', () => {
    const wrapper = mountCard();
    const meters = wrapper.findAll('.rw-meter');

    expect(meters).toHaveLength(2);
    expect(meters.map((meter) => meter.attributes('role'))).toEqual(['meter', 'meter']);
    expect(meters.map((meter) => meter.attributes('aria-valuenow'))).toEqual(['25', '100']);
    expect(meters.map((meter) => meter.attributes('aria-label'))).toEqual([
      'rewards.analytics.sources.strategic',
      'rewards.analytics.sources.crowdloan',
    ]);
    expect(meters[0].attributes('style')).toContain('--rw-color: var(--rw-src-strategic)');
    expect(meters[0].attributes('style')).toContain('--fill: 0.25');
    expect(meters[1].attributes('style')).toContain('--rw-color: var(--rw-src-crowdloan)');
    expect(wrapper.findAll('.rw-vesting__share').map((share) => share.text())).toEqual(['25%', '100%']);
  });

  it('leads with the overall unlocked share when there is more than one source', () => {
    const wrapper = mountCard();

    // (25 + 10) of (100 + 10) is about a third.
    expect(wrapper.find('.rw-vesting__percent').text()).toBe('32%');
    expect(wrapper.find('.rw-vesting__caption').text()).toBe('rewards.stats.unlocked');
  });

  it('lists what can be claimed and what is still locked under each meter', () => {
    const wrapper = mountCard();
    const rows = wrapper.findAll('.rw-vesting__row');
    const strategic = rows[0].findAll('.rw-vesting__amounts > div');

    expect(strategic).toHaveLength(2);
    expect(strategic[0].find('dt').text()).toBe('rewards.claimableAmountDoneVesting');
    expect(strategic[0].find('formatted-amount').text()).toBe('25');
    expect(strategic[1].find('dt').text()).toBe('assets.balance.locked');
    expect(strategic[1].find('formatted-amount').text()).toBe('75');
    // The crowdloan has nothing locked, so it has no "locked" line.
    expect(rows[1].findAll('.rw-vesting__amounts > div')).toHaveLength(1);
  });

  it('says so when everything is unlocked', () => {
    const wrapper = mountCard(
      {},
      {
        vested: { limit: codec(100), total: codec(100), rewards: [] },
      }
    );

    expect(wrapper.find('.rw-vesting__caption').text()).toBe('rewards.analytics.vesting.fullyUnlocked');
    expect(wrapper.find('.rw-vesting__percent').text()).toBe('100%');
  });

  it('puts the share on the row itself when there is a single source', () => {
    const wrapper = mountCard({}, { crowdloan: {} });

    expect(wrapper.find('.rw-vesting__summary').exists()).toBe(false);
    expect(wrapper.find('.rw-vesting__share').text().replace(/\s+/g, ' ')).toBe('rewards.stats.unlocked 25%');
  });

  it('does not invent a share when the tokens of a source cannot be put on one scale', () => {
    // One crowdloan pays two tokens and only PSWAP has a price.
    const crowdloan = {
      Tag: [
        { type: ['Crowdloan', 'Tag'], asset: PSWAP, amount: codec(5), total: codec(10) } as never,
        { type: ['Crowdloan', 'Tag'], asset: VAL, amount: codec(2), total: codec(8) } as never,
      ],
    };
    const wrapper = mountCard({
      vesting: buildVesting(buildRewardSources(snapshot({ vested: null, crowdloan })), { '0xpswap': codec(1) }),
    });

    // A meter needs a value, so without one the bar is hidden from assistive technology and the text says "–".
    const meter = wrapper.find('.rw-meter');

    expect(meter.attributes('role')).toBeUndefined();
    expect(meter.attributes('aria-valuenow')).toBeUndefined();
    expect(meter.attributes('aria-hidden')).toBe('true');
    expect(wrapper.find('.rw-vesting__share').text().replace(/\s+/g, ' ')).toBe('rewards.stats.unlocked –');
  });

  it('calls a source fully unlocked even when one of its tokens has no price', () => {
    // Nothing is locked, so no price is needed to know everything can be claimed.
    const crowdloan = {
      Tag: [
        { type: ['Crowdloan', 'Tag'], asset: PSWAP, amount: codec(5), total: codec(5) } as never,
        { type: ['Crowdloan', 'Tag'], asset: VAL, amount: codec(2), total: codec(2) } as never,
      ],
    };
    const wrapper = mountCard({
      vesting: buildVesting(buildRewardSources(snapshot({ vested: null, crowdloan })), { '0xpswap': codec(1) }),
    });

    expect(wrapper.find('.rw-meter').attributes('role')).toBe('meter');
    expect(wrapper.find('.rw-meter').attributes('aria-valuenow')).toBe('100');
    expect(wrapper.find('.rw-vesting__share').text().replace(/\s+/g, ' ')).toBe('rewards.stats.unlocked 100%');
  });

  it('never reads 100 before everything is unlocked', () => {
    const wrapper = mountCard(
      {},
      { vested: { limit: codec(996), total: codec(1000), rewards: [] } as never, crowdloan: {} }
    );

    expect(wrapper.find('.rw-meter').attributes('aria-valuenow')).toBe('99');
    expect(wrapper.find('.rw-vesting__share').text()).toContain('99%');
  });

  it('keeps the overall share empty while some vesting token has no price', () => {
    const wrapper = mountCard({
      vesting: buildVesting(buildRewardSources(snapshot()), { '0xpswap': codec(1) }),
    });

    expect(wrapper.find('.rw-vesting__percent').text()).toBe('–');
    expect(wrapper.findAll('.rw-vesting__share').map((share) => share.text())).toEqual(['25%', '100%']);
  });

  it('shows an empty frame with a hint when disconnected or without vesting rewards', () => {
    const disconnected = mountCard({ connected: false });

    expect(disconnected.find('.rw-meter--ghost').attributes('aria-hidden')).toBe('true');
    expect(disconnected.find('.rw-card__ghost').text()).toBe('rewards.analytics.connectToSee');

    const empty = mountCard({}, { vested: null, crowdloan: {} });

    expect(empty.find('.rw-card__ghost').text()).toBe('rewards.analytics.vesting.empty');
    expect(empty.find('.rw-vesting__rows').exists()).toBe(false);
  });

  it('staggers its entrance with the position it was given', () => {
    expect(mountCard({ index: 3 }).find('section').attributes('style')).toContain('--rw-i: 3');
  });
});
