import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import NetworkStats from '@/components/pages/Stats/NetworkStats.vue';

const fetchDataMock = vi.hoisted(() => vi.fn(async () => []));
const nodeIsConnectedState = vi.hoisted(() => ({ value: false }));

const baseWidgetStub = defineComponent({
  template: '<div><slot name="filters"></slot><slot /></div>',
});
const statsFilterStub = defineComponent({
  props: ['disabled'],
  template: '<div class="stats-filter-stub" :data-disabled="String(disabled)"></div>',
});
const priceChangeStub = defineComponent({
  props: ['value'],
  template: '<div class="price-change-stub">{{ value }}</div>',
});

vi.mock('@/router', () => ({
  lazyComponent: (name: string) =>
    name.includes('StatsFilter') ? statsFilterStub : name.includes('PriceChange') ? priceChangeStub : baseWidgetStub,
}));

vi.mock('@wallet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@wallet')>();

  return {
    ...actual,
    WALLET_CONSTS: {
      FontSizeRate: { MEDIUM: 'medium' },
      FontWeightRate: { MEDIUM: 'medium' },
    },
    components: {
      ...actual.components,
      FormattedAmount: defineComponent({
        template: '<div class="formatted-amount-stub">{{ value }}</div>',
        props: ['value'],
      }),
    },
  };
});

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    tc: (key: string) => key,
    TranslationConsts: {
      Sora: 'SORA',
      Ethereum: 'Ethereum',
    },
  }),
}));

vi.mock('@/composables/useLoading', () => ({
  useLoading: () => ({
    loading: { value: false },
    withLoading: async (handler: () => Promise<void>) => await handler(),
    withParentLoading: async (handler: () => Promise<void>) => await handler(),
  }),
}));

vi.mock('@/indexer/queries/network/stats', () => ({
  fetchData: fetchDataMock,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    get nodeIsConnected() {
      return nodeIsConnectedState.value;
    },
  }),
}));

vi.mock('@/consts/snapshots', () => ({
  SECONDS_IN_TYPE: {
    day: 24 * 60 * 60,
  },
  NETWORK_STATS_FILTERS: [
    {
      label: '1D',
      type: 'day',
      count: 1,
    },
  ],
}));

describe('NetworkStats', () => {
  it('keeps filters disabled while stats data is unresolved and node is disconnected', async () => {
    nodeIsConnectedState.value = false;
    fetchDataMock.mockResolvedValueOnce([]);
    fetchDataMock.mockResolvedValueOnce([]);

    const wrapper = mount(NetworkStats, {
      global: {
        stubs: {
          's-card': true,
          's-tooltip': true,
          's-icon': true,
        },
        directives: {
          loading: {
            mounted() {},
            updated() {},
          },
        },
      },
    });

    await nextTick();
    await nextTick();

    const filter = wrapper.find('.stats-filter-stub');
    expect(filter.exists()).toBe(true);
    expect(filter.attributes('data-disabled')).toBe('true');
    expect(wrapper.find('.app-loading-overlay').exists()).toBe(true);
    expect(wrapper.find('.app-loading-overlay__spinner').exists()).toBe(true);
  });
});
