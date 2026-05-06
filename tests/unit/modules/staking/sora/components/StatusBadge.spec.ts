import { mount } from '@vue/test-utils';
import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@/components/shared/StatusBadge.vue', () => ({
  __esModule: true,
  default: {
    name: 'StatusBadgeSharedStub',
    props: ['active', 'stopped', 'apr', 'rewardAsset'],
    template: '<div class="status-badge-shared-stub"></div>',
  },
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

vi.mock('@/composables/useTranslation', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import StatusBadge from '@/modules/staking/sora/components/StatusBadge.vue';

describe('StatusBadge.vue', () => {
  beforeEach(() => {
    stakingInitializedRef.value = true;
    maxApyRef.value = 0;
    rewardAssetRef.value = { symbol: 'VAL' };
  });

  it('renders calculating text when APY is zero', () => {
    const wrapper = mount(StatusBadge);
    const stub = wrapper.findComponent({ name: 'StatusBadgeSharedStub' });

    expect(stub.exists()).toBe(true);
    expect(stub.props('apr')).toBe('calculatingText');
  });

  it('formats APY when value available', () => {
    maxApyRef.value = 12.3456;
    const wrapper = mount(StatusBadge);
    const stub = wrapper.findComponent({ name: 'StatusBadgeSharedStub' });

    expect(stub.props('apr')).toBe('12.35');
  });
});
