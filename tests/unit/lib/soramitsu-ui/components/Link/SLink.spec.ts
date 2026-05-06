import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@soramitsu-ui/ui/composables/prop-type-filter', async () => {
  const { computed } = await import('vue');

  return {
    usePropTypeFilter:
      <T extends Record<string, unknown>>(props: T) =>
      <K extends keyof T>(key: K, values: readonly unknown[], fallback: T[K]) =>
        computed(() => (values.includes(props[key]) ? props[key] : fallback)),
  };
});

vi.mock('@/lib/soramitsu-ui/components/icons', () => ({
  IconBasicExternalLink24: defineComponent({
    name: 'IconBasicExternalLink24Stub',
    setup:
      (_props, { attrs }) =>
      () =>
        h('svg', { ...attrs, 'data-testid': 'external-link-icon' }),
  }),
}));

import SLink from '@/lib/soramitsu-ui/components/Link/SLink.vue';

describe('SLink', () => {
  it('renders an anchor with default underline, icon position, and icon', () => {
    const wrapper = mount(SLink, {
      slots: {
        default: 'Docs',
      },
    });

    expect(wrapper.element.tagName).toBe('A');
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['s-link', 's-link_type_solid', 's-link_icon-position_right', 'sora-tpg-p3'])
    );
    expect(wrapper.find('span').text()).toBe('Docs');
    expect(wrapper.find('[data-testid="icon"]').exists()).toBe(true);
  });

  it('supports custom tags and custom icon slot content', () => {
    const wrapper = mount(SLink, {
      props: {
        tag: 'button',
        underline: 'dotted',
        iconPosition: 'left',
      },
      slots: {
        default: 'Open',
        icon: '<i class="custom-link-icon" />',
      },
    });

    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['s-link_type_dotted', 's-link_icon-position_left']));
    expect(wrapper.find('.custom-link-icon').exists()).toBe(true);
    expect(wrapper.find('[data-testid="icon"]').exists()).toBe(false);
  });

  it('falls back invalid underline and icon-position props and can omit icons', () => {
    const wrapper = mount(SLink, {
      props: {
        underline: 'invalid',
        iconPosition: 'wrong',
        icon: false,
      },
    });

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['s-link_type_solid', 's-link_icon-position_right']));
    expect(wrapper.find('[data-testid="icon"]').exists()).toBe(false);
  });
});
