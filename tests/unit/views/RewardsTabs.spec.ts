import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import rewardsTabsSource from '@/features/rewards/pages/RewardsTabsPage.vue?raw';

const pushMock = vi.fn();
const routeMock = { name: 'Rewards' };
const settingsStoreMock = {
  windowWidth: 1280,
};

vi.mock('vue-router', () => ({
  __esModule: true,
  useRoute: () => routeMock,
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/stores/settings', () => ({
  __esModule: true,
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/composables/useTranslation', () => ({
  __esModule: true,
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const RewardsTabsView = (await import('@/features/rewards/pages/RewardsTabsPage.vue')).default;

const mountView = (props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}) =>
  mount(RewardsTabsView, {
    props: {
      parentLoading: false,
      ...props,
    },
    attrs,
    global: {
      stubs: {
        's-tabs': {
          props: ['value'],
          emits: ['update:modelValue'],
          template:
            '<button class="tabs-stub" :data-value="value" @click="$emit(\'update:modelValue\', \'ReferralProgram\')"><slot /></button>',
        },
        's-tab': {
          template: '<div class="tab-stub"></div>',
        },
        'router-view': {
          props: ['parentLoading'],
          template: '<div class="router-view-stub" :data-parent-loading="String(parentLoading)"></div>',
        },
      },
    },
  });

describe('RewardsTabs.vue', () => {
  beforeEach(() => {
    pushMock.mockClear();
    routeMock.name = 'Rewards';
    settingsStoreMock.windowWidth = 1280;
  });

  it('binds the current route tab and forwards parentLoading to the nested view', async () => {
    const wrapper = mountView({ parentLoading: true });
    await flushPromises();

    expect(wrapper.get('.tabs-stub').attributes('data-value')).toBe('Rewards');
    expect(wrapper.get('.router-view-stub').attributes('data-parent-loading')).toBe('true');
  });

  it('navigates when the selected tab changes', async () => {
    const wrapper = mountView();

    await wrapper.get('.tabs-stub').trigger('click');

    expect(pushMock).toHaveBeenCalledWith({ name: 'ReferralProgram' });
  });

  it('keeps the rewards tab strip at the live-site height', () => {
    expect(rewardsTabsSource).toContain('$rewards-tabs-height: 72px;');
    expect(rewardsTabsSource).toContain('height: 71px;');
  });
});
