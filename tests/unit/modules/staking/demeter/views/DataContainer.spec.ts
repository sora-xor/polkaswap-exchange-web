import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const subscriptionsDataLoading = ref(true);

const shared = vi.hoisted(() => ({
  demeterFarmingStore: {
    subscribeOnPools: vi.fn(),
    subscribeOnTokens: vi.fn(),
    subscribeOnAccountPools: vi.fn(),
    unsubscribeUpdates: vi.fn(),
  },
  stakingStore: {
    getValidatorsInfo: vi.fn(),
    getStakingInfo: vi.fn(),
  },
}));

vi.mock('@/composables/useSubscriptions', () => ({
  __esModule: true,
  useSubscriptions: () => ({
    subscriptionsDataLoading,
  }),
}));

vi.mock('@/stores/demeterFarming', () => ({
  useDemeterFarmingStore: () => shared.demeterFarmingStore,
}));

vi.mock('@/stores/staking', () => ({
  useStakingStore: () => shared.stakingStore,
}));

import DataContainer from '@/modules/staking/demeter/views/DataContainer.vue';

const RouterViewStub = defineComponent({
  name: 'RouterViewStub',
  props: {
    parentLoading: { type: Boolean, default: false },
  },
  emits: ['refresh'],
  setup(props, { attrs, emit }) {
    return () =>
      h('button', {
        class: 'router-view-stub',
        'data-parent-loading': String(props.parentLoading),
        'data-forwarded': String(attrs['data-forwarded'] ?? ''),
        onClick: () => emit('refresh'),
      });
  },
});

describe('demeter DataContainer.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    Object.values(shared.demeterFarmingStore).forEach((spy) => spy.mockReset());
    Object.values(shared.stakingStore).forEach((spy) => spy.mockReset());
  });

  it('forwards computed loading state and listeners to nested route view', async () => {
    const onRefresh = vi.fn();
    const wrapper = mount(DataContainer, {
      attrs: {
        onRefresh,
        'data-forwarded': 'yes',
      },
      global: {
        stubs: {
          RouterView: RouterViewStub,
        },
      },
    });

    const routeView = wrapper.get('.router-view-stub');
    expect(routeView.attributes('data-parent-loading')).toBe('true');
    expect(routeView.attributes('data-forwarded')).toBe('yes');

    await routeView.trigger('click');
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
