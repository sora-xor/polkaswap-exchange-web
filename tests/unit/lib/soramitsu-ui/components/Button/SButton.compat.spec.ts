import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { SButton } from '@/lib/soramitsu-ui/components/Button';

describe('SButton compatibility', () => {
  it('exposes legacy classes for legacy tertiary/mini usage', () => {
    const wrapper = mount(SButton, {
      props: {
        type: 'tertiary',
        size: 'mini',
        borderRadius: 'mini',
        alternative: true,
      },
      attrs: {
        tooltip: 'Details',
      },
      slots: {
        default: () => 'Token',
      },
    });

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        'el-button',
        'neumorphic',
        'el-tooltip',
        'el-button--tertiary',
        'el-button--mini',
        's-tertiary',
        's-mini',
        's-button_type_secondary',
        's-button_size_xs',
        's-button_size_mini',
        's-border-radius-mini',
        's-alternative',
      ])
    );
    expect(wrapper.attributes('style')).toContain('var(--s-border-radius-mini)');
  });

  it('keeps content rendering for legacy link buttons', () => {
    const wrapper = mount(SButton, {
      props: {
        type: 'link',
        size: 'large',
      },
      slots: {
        default: () => 'Open',
      },
    });

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['s-link', 'el-button--link', 's-button_type_secondary']));
    expect(wrapper.text()).toContain('Open');
  });

  it('supports legacy action + primary modifier classes', () => {
    const wrapper = mount(SButton, {
      props: {
        type: 'action',
        primary: true,
        icon: 'basic-settings-24',
      },
    });

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['s-action', 's-primary', 'el-button--primary']));
  });
});
