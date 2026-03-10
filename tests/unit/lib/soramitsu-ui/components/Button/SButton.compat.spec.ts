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

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['s-action', 's-primary', 'el-button--plain']));
    expect(wrapper.classes()).not.toContain('el-button--primary');
    expect(wrapper.classes()).not.toContain('sora-tpg-h6');
  });

  it('renders default slot content for action buttons as icon fallback', () => {
    const wrapper = mount(SButton, {
      props: {
        type: 'action',
      },
      slots: {
        default: '<i class="s-icon-basic-close-24"></i>',
      },
    });

    expect(wrapper.find('.s-button__icon .s-icon-basic-close-24').exists()).toBe(true);
    expect(wrapper.find('.s-button__text').text()).toBe('');
  });

  it('does not render an empty icon container for text-only buttons', () => {
    const wrapper = mount(SButton, {
      props: {
        type: 'primary',
        size: 'medium',
      },
      slots: {
        default: () => 'Connect account',
      },
    });

    expect(wrapper.find('.s-button__icon').exists()).toBe(false);
    expect(wrapper.find('.s-button__text').text()).toContain('Connect account');
  });
});
