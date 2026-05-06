import { mount } from '@vue/test-utils';
import { h } from 'vue';
import { describe, expect, it } from 'vitest';

import SNavigationMenuItemBody from '@/lib/soramitsu-ui/components/NavigationMenu/SNavigationMenuItemBody.vue';

describe('SNavigationMenuItemBody', () => {
  it('renders the requested root tag, active classes, minified content, and append slot visibility', () => {
    const wrapper = mount(SNavigationMenuItemBody, {
      props: {
        tag: 'button',
        active: true,
        highlighted: true,
        minified: true,
      },
      slots: {
        icon: ({ class: className }: { class: string }) => h('span', { class: className, 'data-testid': 'icon' }),
        default: () => 'Governance',
        append: ({ class: className }: { class: string }) => h('span', { class: className, 'data-testid': 'append' }),
      },
    });

    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        's-navigation-menu-item-body',
        's-navigation-menu-item-body_active',
        's-navigation-menu-item-body_highlighted',
        'py-14px',
      ])
    );
    expect(wrapper.get('[data-testid="icon"]').classes()).toContain('s-navigation-menu-item-body__icon');
    expect(wrapper.get('.s-navigation-menu-item-body__content').classes()).toContain('invisible');
    expect(wrapper.get('.ml-auto').attributes('style')).toContain('display: none');
    expect(wrapper.get('[data-testid="append"]').classes()).toContain('s-navigation-menu-item-body__append');
  });

  it('uses submenu spacing and hides the icon slot for submenu items', () => {
    const wrapper = mount(SNavigationMenuItemBody, {
      props: {
        submenuItem: true,
      },
      slots: {
        icon: () => h('span', { 'data-testid': 'submenu-icon' }),
        default: () => 'Bridge history',
      },
    });

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['s-navigation-menu-item-body_submenu-item', 'py-8px']));
    expect(wrapper.classes()).not.toContain('py-14px');
    expect(wrapper.find('[data-testid="submenu-icon"]').exists()).toBe(false);
    expect(wrapper.get('.s-navigation-menu-item-body__content').classes()).not.toContain('invisible');
  });
});
