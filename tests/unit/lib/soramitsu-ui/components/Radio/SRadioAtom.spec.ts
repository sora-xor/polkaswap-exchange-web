import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SRadioAtom from '@/lib/soramitsu-ui/components/Radio/SRadioAtom';

describe('SRadioAtom', () => {
  it('renders checked, disabled, and hover state classes with attrs', () => {
    const wrapper = mount(SRadioAtom, {
      props: {
        size: 'lg',
        checked: true,
        disabled: true,
        hover: true,
      },
      attrs: {
        id: 'route-radio',
      },
    });

    expect(wrapper.attributes('id')).toBe('route-radio');
    expect(wrapper.attributes('data-size')).toBe('lg');
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['s-radio-atom', 's-radio-atom_checked', 's-radio-atom_disabled', 's-radio-atom_hover'])
    );
  });

  it('omits state classes when the radio atom is idle', () => {
    const wrapper = mount(SRadioAtom, {
      props: {
        size: 'md',
      },
    });

    expect(wrapper.attributes('data-size')).toBe('md');
    expect(wrapper.classes()).toContain('s-radio-atom');
    expect(wrapper.classes()).not.toContain('s-radio-atom_checked');
    expect(wrapper.classes()).not.toContain('s-radio-atom_disabled');
    expect(wrapper.classes()).not.toContain('s-radio-atom_hover');
  });
});
