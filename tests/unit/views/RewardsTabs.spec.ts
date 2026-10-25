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
          props: ['label', 'name'],
          template: '<div class="tab-stub" :data-name="name">{{ label }}</div>',
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

  it('renders only the supported rewards tabs', () => {
    const wrapper = mountView();
    const tabs = wrapper.findAll('.tab-stub');

    expect(tabs).toHaveLength(3);
    expect(tabs.map((tab) => tab.attributes('data-name'))).toEqual([
      'PointSystemWrapper',
      'Rewards',
      'ReferralProgram',
    ]);
    expect(tabs.map((tab) => tab.text())).toEqual([
      'rewards.PointSystemWrapper',
      'rewards.Rewards',
      'rewards.ReferralProgram',
    ]);
  });

  it('widens the container into a dashboard on the Rewards tab only', () => {
    routeMock.name = 'Rewards';
    expect(mountView().get('.rewards-tabs').classes()).toContain('container--rewards');

    routeMock.name = 'PointSystemWrapper';
    expect(mountView().get('.rewards-tabs').classes()).not.toContain('container--rewards');

    routeMock.name = 'ReferralProgram';
    expect(mountView().get('.rewards-tabs').classes()).not.toContain('container--rewards');
  });

  it('keeps the dashboard clear of the sidebar and respects reduced motion', () => {
    expect(rewardsTabsSource).toContain('max-width: min(1120px, calc(100vw - 2 * var(--sidebar-width) - 48px));');
    expect(rewardsTabsSource).toMatch(/prefers-reduced-motion: reduce[\s\S]*container--rewards[\s\S]*transition: none/);
  });

  it('keeps the rewards tab strip at the live-site height', () => {
    expect(rewardsTabsSource).toContain('$rewards-tabs-height: 56px;');
    expect(rewardsTabsSource).toContain('height: $rewards-tabs-height;');
  });

  it('draws the dashboard tab pill itself instead of inheriting the strip styles of the design system', () => {
    const pill = rewardsTabsSource.slice(rewardsTabsSource.indexOf('&.container--rewards'));

    // The track follows the outline of the pill on all four corners, and no tab keeps its own soft shadow.
    expect(pill).toMatch(/\.el-tabs__nav-wrap,\s+\.el-tabs__nav \{\s+border-radius: 999px;/);
    expect(pill).toMatch(/&:focus-visible,\s+&\.is-active \{\s+box-shadow: none;/);
    // The highlight is inset from the outline, so it is never cut by the rounded ends.
    expect(pill).toMatch(/&::before \{[^}]*inset: 4px;[^}]*border-radius: 999px;/);
    // The app-wide focus ring sits outside the tab and would be clipped, so it moves onto the highlight.
    expect(pill).toMatch(
      /&:focus-visible \{\s+outline: none !important;\s+&::before \{\s+outline: 2px solid var\(--s-color-focus-ring\);/
    );
    // Inside the 1px border the pill is 50px tall, so the rounded ends are not cropped.
    expect(pill).toContain('$pill-inner: 50px;');
  });

  it('keeps rewards tab labels from crowding at constrained widths', () => {
    expect(rewardsTabsSource).toContain('box-sizing: border-box;');
    expect(rewardsTabsSource).toContain('flex: 1 1 0;');
    expect(rewardsTabsSource).toContain('width: calc(100% / 3);');
    expect(rewardsTabsSource).toContain('font-size: 16px;');
  });
});
