import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import NetworkStats from '@/components/pages/Stats/NetworkStats.vue';
import networkStatsSource from '@/components/pages/Stats/NetworkStats.vue?raw';

const fetchDataMock = vi.hoisted(() => vi.fn(async () => []));
const nodeIsConnectedState = vi.hoisted(() => ({ value: false }));

vi.mock('@/components/shared/Widget/Base.vue', () => ({
  default: {
    template: '<div><slot name="filters"></slot><slot /></div>',
  },
}));

vi.mock('@/components/shared/Stats/StatsFilter.vue', () => ({
  default: {
    props: ['disabled'],
    template: '<div class="stats-filter-stub" :data-disabled="String(disabled)"></div>',
  },
}));

vi.mock('@/components/shared/PriceChange.vue', () => ({
  default: {
    props: ['value'],
    template: '<div class="price-change-stub">{{ value }}</div>',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/components/FormattedAmount.vue', () => ({
  default: defineComponent({
    template:
      '<div class="formatted-amount-stub" :data-value="value" :data-integer-only="String(integerOnly)">{{ value }}</div>',
    props: ['value', 'integerOnly'],
  }),
}));

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
    expect(wrapper.find('.app-loading-overlay').classes()).toContain('el-loading-mask');
    expect(wrapper.find('.app-loading-overlay__spinner').exists()).toBe(true);
    expect(wrapper.find('.app-loading-overlay__spinner').classes()).toContain('el-loading-spinner');
  });

  it('binds integer-only rendering for whole-number counters', () => {
    expect(networkStatsSource).toContain(':integer-only="!value.amount.includes(FPNumber.DELIMITERS_CONFIG.decimal)"');
    expect(networkStatsSource).not.toContain('lazyComponent(');
    expect(networkStatsSource).not.toContain('Components.');
    expect(networkStatsSource).not.toContain("from '@/router'");
    expect(networkStatsSource).toContain("from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue'");
    expect(networkStatsSource).toContain("import BaseWidget from '@/components/shared/Widget/Base.vue';");
    expect(networkStatsSource).toContain("import StatsFilter from '@/components/shared/Stats/StatsFilter.vue';");
    expect(networkStatsSource).toContain("import PriceChange from '@/components/shared/PriceChange.vue';");
  });
});
