import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@soramitsu-ui/ui/components/icons', () => ({
  IconChevronBottom16: defineComponent({
    name: 'IconChevronBottom16Stub',
    inheritAttrs: false,
    setup: (_props, { attrs }) => () => h('svg', { ...attrs, 'data-testid': 'chevron-16' }),
  }),
  IconArrowsChevronBottom24: defineComponent({
    name: 'IconArrowsChevronBottom24Stub',
    inheritAttrs: false,
    setup: (_props, { attrs }) => () => h('svg', { ...attrs, 'data-testid': 'chevron-24' }),
  }),
}));

import SSelectChevron from '@/lib/soramitsu-ui/components/Select/SSelectChevron';

describe('SSelectChevron', () => {
  it('renders the 16px chevron by default with normalized dimensions', () => {
    const wrapper = mount(SSelectChevron);
    const icon = wrapper.find('[data-testid="chevron-16"]');

    expect(icon.exists()).toBe(true);
    expect(wrapper.find('[data-testid="chevron-24"]').exists()).toBe(false);
    expect(icon.classes()).toContain('s-select-chevron');
    expect(icon.classes()).not.toContain('s-select-chevron_rotate');
    expect(icon.attributes('width')).toBe('1em');
    expect(icon.attributes('height')).toBe('1em');
  });

  it('renders the 24px chevron and rotate class when requested', () => {
    const wrapper = mount(SSelectChevron, {
      props: {
        variant: 24,
        rotate: true,
      },
    });
    const icon = wrapper.find('[data-testid="chevron-24"]');

    expect(icon.exists()).toBe(true);
    expect(wrapper.find('[data-testid="chevron-16"]').exists()).toBe(false);
    expect(icon.classes()).toEqual(expect.arrayContaining(['s-select-chevron', 's-select-chevron_rotate']));
    expect(icon.attributes('width')).toBe('1em');
    expect(icon.attributes('height')).toBe('1em');
  });
});
