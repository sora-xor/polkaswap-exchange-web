import { FPNumber } from '@sora-substrate/sdk';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, defineComponent, h, ref } from 'vue';

const PSWAP = { address: '0xpswap', symbol: 'PSWAP', decimals: 18 } as never;
const VAL = { address: '0xval', symbol: 'VAL', decimals: 18 } as never;
const codec = (value: number | string): string => new FPNumber(value).toCodecString();

const shared = vi.hoisted(() => ({
  state: {} as Record<string, any>,
  wallet: {} as Record<string, any>,
  settings: { language: 'en' } as Record<string, any>,
  select: vi.fn(),
  reload: vi.fn(),
  assetsPassed: undefined as unknown,
  endpointPassed: undefined as unknown,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/stores/wallet', () => ({ useWalletStore: () => shared.wallet }));
vi.mock('@/stores/settings', () => ({ useSettingsStore: () => shared.settings }));

vi.mock('@/features/rewards/composables/useRewardsMarket', () => ({
  useRewardsMarket: (assets: unknown, endpoint: unknown) => {
    shared.assetsPassed = assets;
    shared.endpointPassed = endpoint;

    return shared.state;
  },
}));

vi.mock('@/lib/soraneo-wallet/src/components/TokenLogo.vue', () => ({
  __esModule: true,
  default: defineComponent({
    name: 'TokenLogoStub',
    props: ['token', 'size'],
    setup(props) {
      return () => h('i', { class: 'token-logo-stub', 'data-symbol': (props.token as { symbol: string }).symbol });
    },
  }),
}));

import RewardsMarket from '@/features/rewards/components/rewards/RewardsMarket.vue';

const stats = (day: number, week: number, price = 0.004) => ({
  priceUSD: new FPNumber(price),
  priceChangeDay: new FPNumber(day),
  priceChangeWeek: new FPNumber(week),
});

const DAY = 24 * 60 * 60 * 1000;
const series = [
  { time: 0, price: 0.003 },
  { time: DAY, price: 0.004 },
];

const setState = (overrides: Record<string, unknown> = {}) => {
  const tokens = ref([PSWAP, VAL]);
  const selectedAddress = ref('0xpswap');

  shared.state = {
    tokens,
    selected: computed(() => tokens.value.find((token: any) => token.address === selectedAddress.value) ?? null),
    status: ref('ready'),
    stats: ref(stats(1.76, -21)),
    points: ref(series),
    select: shared.select,
    reload: shared.reload,
    ...overrides,
  };
};

const mountCard = (props: Record<string, unknown> = {}) =>
  mount(RewardsMarket, {
    props: { assets: [PSWAP, VAL], ...props },
    global: {
      stubs: {
        RewardsPriceChart: defineComponent({
          name: 'RewardsPriceChart',
          props: ['points', 'symbol', 'label', 'locale', 'loading', 'tableView', 'dateHeading', 'priceHeading'],
          setup: () => () => h('div', { class: 'chart-stub' }),
        }),
      },
    },
  });

beforeEach(() => {
  shared.select.mockClear();
  shared.reload.mockClear();
  shared.wallet = {
    fiatPriceObject: { '0xpswap': codec(0.0037) },
    exchangeRate: 1,
    currencySymbol: '$',
    indexerType: 'polkaswap',
    indexers: { polkaswap: { endpoint: 'https://indexer.test/graphql' } },
  };
  shared.settings = { language: 'en' };
  setState();
});

describe('RewardsMarket.vue', () => {
  it('hands the reward tokens and the active indexer to the market loader', () => {
    mountCard();

    expect((shared.assetsPassed as { value: unknown[] }).value).toEqual([PSWAP, VAL]);
    expect((shared.endpointPassed as { value: string }).value).toBe('https://indexer.test/graphql');
  });

  it('lets the user switch between the reward tokens', async () => {
    const wrapper = mountCard();
    const buttons = wrapper.findAll('.rw-market__token');

    expect(buttons.map((button) => button.text())).toEqual(['PSWAP', 'VAL']);
    expect(buttons.map((button) => button.attributes('aria-pressed'))).toEqual(['true', 'false']);
    expect(buttons[0].classes()).toContain('is-active');

    await buttons[1].trigger('click');

    expect(shared.select).toHaveBeenCalledWith('0xval');
  });

  it('has no switcher when there is one token', () => {
    setState({ tokens: ref([PSWAP]) });

    expect(mountCard().find('.rw-market__tokens').exists()).toBe(false);
  });

  it('shows the live wallet price in the user currency', () => {
    shared.wallet.exchangeRate = 2;
    shared.wallet.currencySymbol = '€';

    const wrapper = mountCard();

    expect(wrapper.find('.rw-market__figure').text()).toBe('€0.0074');
    expect(wrapper.find('.rw-market__symbol').text()).toBe('PSWAP');
  });

  it('falls back to the indexer price when the wallet has none', () => {
    shared.wallet.fiatPriceObject = {};

    expect(mountCard().find('.rw-market__figure').text()).toBe('$0.004');
  });

  it('shows a placeholder instead of a price while the data is on its way', () => {
    shared.wallet.fiatPriceObject = {};
    setState({ stats: ref(null), status: ref('loading') });

    const wrapper = mountCard();

    expect(wrapper.find('.rw-market__figure').exists()).toBe(false);
    expect(wrapper.find('.rw-market__figure-skeleton').exists()).toBe(true);
    expect(wrapper.find('.rw-market__deltas').exists()).toBe(false);
  });

  it('shows a dash, not a shimmer that never ends, when no price can be found', () => {
    shared.wallet.fiatPriceObject = {};

    for (const status of ['ready', 'error']) {
      setState({ stats: ref(null), status: ref(status), points: ref([]) });

      const wrapper = mountCard();

      expect(wrapper.find('.rw-market__figure-skeleton').exists()).toBe(false);
      expect(wrapper.find('.rw-market__figure').text()).toBe('–');
      expect(wrapper.find('.rw-market__deltas').exists()).toBe(false);
    }
  });

  it('shows 24 hour and 7 day changes with an arrow, a sign and a direction class', () => {
    const wrapper = mountCard();
    const deltas = wrapper.findAll('.rw-delta');

    expect(deltas.map((delta) => delta.find('.rw-delta__value').text())).toEqual(['+1.76%', '−21%']);
    expect(deltas.map((delta) => delta.find('.rw-delta__label').text())).toEqual([
      'rewards.analytics.market.day',
      'rewards.analytics.market.week',
    ]);
    expect(deltas.map((delta) => delta.classes())).toEqual([
      expect.arrayContaining(['rw-delta--up']),
      expect.arrayContaining(['rw-delta--down']),
    ]);
    expect(deltas[0].find('path').attributes('d')).toBe('M5 1.5 9 8H1z');
    expect(deltas[1].find('path').attributes('d')).toBe('M5 8.5 1 2h8z');
  });

  it('treats a move that rounds to zero as flat', () => {
    setState({ stats: ref(stats(0.001, 0)) });

    const deltas = mountCard().findAll('.rw-delta');

    expect(deltas.map((delta) => delta.classes())).toEqual([
      expect.arrayContaining(['rw-delta--flat']),
      expect.arrayContaining(['rw-delta--flat']),
    ]);
    expect(deltas.map((delta) => delta.find('.rw-delta__value').text())).toEqual(['0%', '0%']);
  });

  it('rounds price changes the same way in both directions', () => {
    // FPNumber rounds toward minus infinity: without care -0.004 would read -0.01 while +0.004 reads 0.
    setState({ stats: ref(stats(-0.004, 0.004)) });

    const tiny = mountCard().findAll('.rw-delta');

    expect(tiny.map((delta) => delta.classes())).toEqual([
      expect.arrayContaining(['rw-delta--flat']),
      expect.arrayContaining(['rw-delta--flat']),
    ]);
    expect(tiny.map((delta) => delta.find('.rw-delta__value').text())).toEqual(['0%', '0%']);

    setState({ stats: ref(stats(-1.004, 1.004)) });

    const small = mountCard().findAll('.rw-delta__value');

    expect(small.map((value) => value.text())).toEqual(['−1%', '+1%']);
  });

  it('draws the chart in the display currency and names it for assistive technology', () => {
    shared.wallet.exchangeRate = 2;

    const chart = mountCard().findComponent({ name: 'RewardsPriceChart' });

    expect(chart.props('points')).toEqual([
      { time: 0, price: 0.006 },
      { time: DAY, price: 0.008 },
    ]);
    expect(chart.props('symbol')).toBe('$');
    expect(chart.props('locale')).toBe('en');
    expect(chart.props('label')).toBe('PSWAP – rewards.analytics.market.period');
    expect(chart.props('loading')).toBe(false);
    expect(chart.props('dateHeading')).toBe('transaction.startTime');
  });

  it('dims the chart while it refreshes', () => {
    setState({ status: ref('loading') });

    expect(mountCard().findComponent({ name: 'RewardsPriceChart' }).props('loading')).toBe(true);
  });

  it('follows the app language for dates, falling back to the browser', () => {
    shared.settings.language = 'zh-CN';
    expect(mountCard().findComponent({ name: 'RewardsPriceChart' }).props('locale')).toBe('zh-CN');

    shared.settings.language = 'akk';
    expect(mountCard().findComponent({ name: 'RewardsPriceChart' }).props('locale')).toBeUndefined();
  });

  it('switches the chart to its table twin', async () => {
    const wrapper = mountCard();
    const toggle = wrapper.find('.rw-card__toggle');

    expect(toggle.attributes('aria-pressed')).toBe('false');

    await toggle.trigger('click');

    expect(toggle.attributes('aria-pressed')).toBe('true');
    expect(wrapper.findComponent({ name: 'RewardsPriceChart' }).props('tableView')).toBe(true);
  });

  it('shows a placeholder while the first load is running', () => {
    setState({ status: ref('loading'), points: ref([]), stats: ref(null) });

    const wrapper = mountCard();

    expect(wrapper.find('.rw-market__chart-skeleton').exists()).toBe(true);
    expect(wrapper.find('.chart-stub').exists()).toBe(false);
    expect(wrapper.find('.rw-card__toggle').exists()).toBe(false);
  });

  it('says so and offers a retry when nothing could be loaded', async () => {
    setState({ status: ref('error'), points: ref([]), stats: ref(null) });

    const wrapper = mountCard();

    expect(wrapper.find('.rw-market__error').attributes('role')).toBe('status');
    expect(wrapper.find('.rw-card__ghost').text()).toBe('rewards.analytics.market.unavailable');

    await wrapper.find('.rw-market__error button').trigger('click');

    expect(shared.reload).toHaveBeenCalledTimes(1);
  });

  it('shows nothing about a token when there is none to show', () => {
    setState({ tokens: ref([]), selected: ref(null) });

    const wrapper = mountCard({ assets: [] });

    expect(wrapper.find('.rw-market__stats').exists()).toBe(false);
    expect(wrapper.find('.chart-stub').exists()).toBe(false);
  });
});
