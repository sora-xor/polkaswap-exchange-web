import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { settingsStoreMock } = vi.hoisted(() => ({
  settingsStoreMock: {
    adsArray: [] as Array<{ title: string; img: string; link: string }>,
  },
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import AppMarketing from '@/components/App/Header/AppMarketing.vue';

const mountComponent = () =>
  mount(AppMarketing, {
    global: {
      stubs: {
        's-icon': {
          props: ['name', 'size'],
          template: '<i class="s-icon-stub" :data-name="name" :data-size="size"></i>',
        },
      },
      directives: {
        button: vi.fn(),
      },
    },
  });

describe('AppMarketing', () => {
  beforeEach(() => {
    settingsStoreMock.adsArray = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not render when there are no marketing cards', () => {
    const wrapper = mountComponent();

    expect(wrapper.find('.marketing').exists()).toBe(false);
  });

  it('renders marketing card and resolves link target based on href type', async () => {
    settingsStoreMock.adsArray = [{ title: 'NOW IN TELEGRAM', img: '/x.png', link: '/#/swap/XOR/DAI' }];

    const wrapper = mountComponent();
    await wrapper.vm.$nextTick();

    const card = wrapper.find('.marketing-card');
    expect(card.exists()).toBe(true);
    expect(card.attributes('dir')).toBe('ltr');
    expect(card.attributes('target')).toBe('_self');
    expect(card.attributes('href')).toBe('#/swap/XOR/DAI');
    expect(wrapper.text()).toContain('NOW IN TELEGRAM');
    expect(wrapper.find('.marketing-prev').exists()).toBe(false);
    expect(wrapper.find('.marketing-next').exists()).toBe(false);
  });

  it('leaves announcements still until the user browses them and wraps both directions', async () => {
    settingsStoreMock.adsArray = [
      { title: 'A', img: '/a.png', link: 'https://example.com/a' },
      { title: 'B', img: '/b.png', link: '#/bridge' },
    ];
    const wrapper = mountComponent();
    await vi.advanceTimersByTimeAsync(180_000);
    expect(wrapper.find('.marketing-card').text()).toBe('A');
    await wrapper.find('.marketing-next').trigger('click');
    expect(wrapper.find('.marketing-card').attributes('href')).toBe('#/bridge');
    expect(wrapper.find('.marketing-card').attributes('target')).toBe('_self');
    await wrapper.find('.marketing-next').trigger('click');
    expect(wrapper.find('.marketing-card').text()).toBe('A');
    await wrapper.find('.marketing-prev').trigger('click');
    expect(wrapper.find('.marketing-card').text()).toBe('B');
    expect(wrapper.find('.marketing-prev').attributes('aria-label')).toBeTruthy();
  });

  it('shows navigation controls when multiple ads are available', async () => {
    settingsStoreMock.adsArray = [
      { title: 'A', img: '/a.png', link: 'https://example.com/a' },
      { title: 'B', img: '/b.png', link: 'https://example.com/b' },
    ];

    const wrapper = mountComponent();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.marketing-prev').exists()).toBe(true);
    expect(wrapper.find('.marketing-next').exists()).toBe(true);
  });
});
