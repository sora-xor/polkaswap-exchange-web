import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SBadge from '@/lib/soramitsu-ui/components/Badge/SBadge.vue';

describe('SBadge', () => {
  it('renders the default marker badge with text content', () => {
    const wrapper = mount(SBadge, {
      slots: {
        default: 'Active',
      },
    });

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['s-badge', 'px-10px', 'primary-text-color']));
    expect(wrapper.classes()).not.toContain('s-badge_border');
    expect(wrapper.find('.marker').classes()).toContain('s-badge_color_active');
    expect(wrapper.find('.spinner').exists()).toBe(false);
    expect(wrapper.find('.title').text()).toBe('Active');
  });

  it('supports colored bordered marker-only badges without padding', () => {
    const wrapper = mount(SBadge, {
      props: {
        type: 'warning',
        colorBackground: true,
        withBorder: true,
        onlyMarker: true,
        tabular: true,
      },
      slots: {
        default: 'Hidden label',
      },
    });

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['s-badge', 's-badge_border', 's-badge_color_warning', 'text-white'])
    );
    expect(wrapper.classes()).not.toContain('px-10px');
    expect(wrapper.find('.marker').classes()).toContain('bg-white');
    expect(wrapper.find('.title').exists()).toBe(false);
  });

  it('renders a spinner for pending badges instead of a marker', () => {
    const wrapper = mount(SBadge, {
      props: {
        type: 'pending',
      },
      slots: {
        default: 'Pending',
      },
    });

    expect(wrapper.find('.marker').exists()).toBe(false);
    expect(wrapper.find('svg.s-spinner').exists()).toBe(true);
    expect(wrapper.find('.title').text()).toBe('Pending');
  });
});
