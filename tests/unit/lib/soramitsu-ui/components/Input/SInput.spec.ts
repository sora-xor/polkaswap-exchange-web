import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { SInput } from '@/lib/soramitsu-ui/components/Input';

describe('SInput attrs forwarding', () => {
  it('keeps consumer classes and style on the root element', () => {
    const wrapper = mount(SInput, {
      attrs: {
        class: 'search-input neumorphic',
        style: 'max-width: 290px;',
      },
      props: {
        modelValue: '',
        placeholder: 'Search',
      },
    });

    const root = wrapper.find('.s-input');
    const input = wrapper.find('input.el-input__inner');

    expect(root.exists()).toBe(true);
    expect(input.exists()).toBe(true);

    expect(root.classes()).toEqual(expect.arrayContaining(['search-input', 'neumorphic']));
    expect((root.element as HTMLElement).style.maxWidth).toBe('290px');
    expect(input.classes()).not.toContain('search-input');
  });

  it('prefers the explicit readonly prop over a leaked readonly attr', () => {
    const wrapper = mount(SInput, {
      props: {
        modelValue: '',
        readonly: false,
        placeholder: 'Search',
      },
      attrs: {
        readonly: true,
      },
    });

    const input = wrapper.find('input.el-input__inner');

    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).readOnly).toBe(false);
    expect(input.attributes('readonly')).toBeUndefined();
  });
});
