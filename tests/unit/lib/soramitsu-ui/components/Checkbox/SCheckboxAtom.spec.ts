import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/soramitsu-ui/components/icons/generated', () => ({
  IconCheck: defineComponent({
    name: 'IconCheckStub',
    setup: () => () => h('svg', { 'data-testid': 'checkbox-check-icon' }),
  }),
  IconMinus: defineComponent({
    name: 'IconMinusStub',
    setup: () => () => h('svg', { 'data-testid': 'checkbox-minus-icon' }),
  }),
}));

import SCheckboxAtom from '@/lib/soramitsu-ui/components/Checkbox/SCheckboxAtom';

describe('SCheckboxAtom', () => {
  it('renders size, checked state, and interaction classes', () => {
    const wrapper = mount(SCheckboxAtom, {
      props: {
        size: 'md',
        checked: true,
        hover: true,
        disabled: true,
      },
      attrs: {
        id: 'terms-checkbox',
      },
    });

    expect(wrapper.attributes('id')).toBe('terms-checkbox');
    expect(wrapper.attributes('data-size')).toBe('md');
    expect(wrapper.attributes('data-checked')).toBe('true');
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['s-checkbox-atom', 's-checkbox-atom_disabled', 's-checkbox-atom_hover'])
    );
    expect(wrapper.find('[data-testid="checkbox-check-icon"]').exists()).toBe(true);
  });

  it('renders the mixed-state icon for indeterminate checkboxes', () => {
    const wrapper = mount(SCheckboxAtom, {
      props: {
        size: 'lg',
        checked: 'mixed',
      },
    });

    expect(wrapper.attributes('data-size')).toBe('lg');
    expect(wrapper.attributes('data-checked')).toBe('mixed');
    expect(wrapper.find('[data-testid="checkbox-minus-icon"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="checkbox-check-icon"]').exists()).toBe(false);
  });

  it('renders an empty icon and false checked state when unchecked', () => {
    const wrapper = mount(SCheckboxAtom, {
      props: {
        size: 'xl',
        checked: false,
      },
    });

    expect(wrapper.attributes('data-size')).toBe('xl');
    expect(wrapper.attributes('data-checked')).toBe('false');
    expect(wrapper.classes()).not.toContain('s-checkbox-atom_disabled');
    expect(wrapper.classes()).not.toContain('s-checkbox-atom_hover');
    expect(wrapper.find('[data-testid="checkbox-check-icon"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="checkbox-minus-icon"]').exists()).toBe(false);
    expect(wrapper.find('svg').exists()).toBe(true);
  });
});
