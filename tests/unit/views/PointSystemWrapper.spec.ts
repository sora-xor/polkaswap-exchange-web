import { shallowMount } from '@vue/test-utils';
import { defineComponent, reactive } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const featureFlagsState = reactive({
  pointSystemV2: false,
});

let PointSystemWrapper: any;

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => featureFlagsState,
}));

vi.mock('@/features/rewards/pages/PointSystemPage.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: defineComponent({
    name: 'PointSystemStub',
    template: '<div class="point-system-stub" />',
  }),
}));

vi.mock('@/features/rewards/pages/PointSystemV2Page.vue', () => ({
  __esModule: true,
  __isTeleport: false,
  default: defineComponent({
    name: 'PointSystemV2Stub',
    template: '<div class="point-system-v2-stub" />',
  }),
}));

describe('PointSystemWrapper', () => {
  beforeEach(async () => {
    if (!PointSystemWrapper) {
      const module = await import('@/features/rewards/pages/PointSystemWrapperPage.vue');
      PointSystemWrapper = module.default;
    }

    featureFlagsState.pointSystemV2 = false;
  });

  it('renders the legacy point system by default', async () => {
    const wrapper = shallowMount(PointSystemWrapper);

    expect(wrapper.vm.componentToRender).toBe(wrapper.vm.legacyLoader);
  });

  it('switches to the new point system when the feature flag is enabled', async () => {
    const wrapper = shallowMount(PointSystemWrapper);

    featureFlagsState.pointSystemV2 = true;

    await wrapper.vm.$nextTick();

    expect(wrapper.vm.componentToRender).toBe(wrapper.vm.v2Loader);
  });
});
