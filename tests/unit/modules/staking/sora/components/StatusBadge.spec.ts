import { mount } from '@vue/test-utils';
import { computed, defineComponent, h, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const StatusBadgeSharedStub = defineComponent({
  name: 'StatusBadgeSharedStub',
  props: ['active', 'stopped', 'apr', 'rewardAsset'],
  setup(props) {
    return () => h('div', { class: 'status-badge-shared-stub', 'data-apr': props.apr, 'data-active': props.active });
  },
});

vi.mock('@/consts', async () => {
  const actual = await vi.importActual<typeof import('@/consts')>('@/consts');

  return {
    __esModule: true,
    ...actual,
    Components: {
      ...(actual.Components ?? {}),
      StatusBadge: 'StatusBadgeShared',
    },
  };
});

vi.mock('@/utils', () => ({
  __esModule: true,
  asZeroValue: (value: number) => value === 0,
  formatDecimalPlaces: (value: number) => value.toFixed(2),
}));

const stakingInitializedRef = ref(true);
const maxApyRef = ref(0);
const rewardAssetRef = ref({ symbol: 'VAL' });

vi.mock('@/modules/staking/sora/composables/useSoraStaking', () => ({
  __esModule: true,
  useSoraStaking: () => ({
    stakingInitialized: computed(() => stakingInitializedRef.value),
    maxApy: computed(() => maxApyRef.value),
    rewardAsset: computed(() => rewardAssetRef.value),
  }),
}));

vi.mock('@/router', () => ({
  __esModule: true,
  lazyComponent: () => StatusBadgeSharedStub,
}));

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n');
  return {
    __esModule: true,
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  };
});

import StatusBadge from '@/modules/staking/sora/components/StatusBadge.vue';

describe('StatusBadge.vue', () => {
  beforeEach(() => {
    stakingInitializedRef.value = true;
    maxApyRef.value = 0;
    rewardAssetRef.value = { symbol: 'VAL' };
  });

  it('renders calculating text when APY is zero', () => {
    const wrapper = mount(StatusBadge);
    const stub = wrapper.findComponent(StatusBadgeSharedStub);

    expect(stub.exists()).toBe(true);
    expect(stub.props('apr')).toBe('calculatingText');
  });

  it('formats APY when value available', () => {
    maxApyRef.value = 12.3456;
    const wrapper = mount(StatusBadge);
    const stub = wrapper.findComponent(StatusBadgeSharedStub);

    expect(stub.props('apr')).toBe('12.35');
  });
});
