import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SidebarItemContent from '@/components/App/Menu/SidebarItemContent.vue';
import sidebarItemContentSource from '@/components/App/Menu/SidebarItemContent.vue?raw';

describe('SidebarItemContent', () => {
  const mountComponent = (props: Record<string, string>) =>
    mount(SidebarItemContent, {
      props,
      global: {
        stubs: {
          's-icon': {
            props: ['name'],
            template: '<i class="s-icon-stub" :data-name="name"></i>',
          },
          SIcon: {
            props: ['name'],
            template: '<i class="s-icon-stub" :data-name="name"></i>',
          },
        },
      },
    });

  it('renders a branded SVG mask when iconSrc is provided', () => {
    const wrapper = mountComponent({
      icon: 'various-lightbulb-24',
      iconSrc: '/assets/pm_logo.svg',
      title: 'Polkamarkt',
    });

    expect(wrapper.find('.sidebar-item-content__logo').attributes()).toMatchObject({
      'aria-hidden': 'true',
      title: 'Polkamarkt',
    });
    expect(wrapper.find('.sidebar-item-content__logo').attributes('style')).toContain(
      '--sidebar-item-logo: url(/assets/pm_logo.svg);'
    );
    expect(wrapper.find('.s-icon-stub').exists()).toBe(false);
  });

  it('renders branded SVG masks as a single design-system color in every state', () => {
    expect(sidebarItemContentSource).toContain('mask: var(--sidebar-item-logo) center / contain no-repeat;');
    expect(sidebarItemContentSource).toContain('background-color: var(--s-color-base-content-tertiary);');
    expect(sidebarItemContentSource).toContain('.el-menu-item.is-active &');
    expect(sidebarItemContentSource).toContain('background-color: var(--s-color-theme-accent);');
    expect(sidebarItemContentSource).not.toContain('filter: grayscale');
  });

  it('falls back to the icon font when no iconSrc is provided', () => {
    const wrapper = mountComponent({
      icon: 'arrows-swap-90-24',
      title: 'Swap',
    });

    expect(wrapper.find('.s-icon-stub').attributes('data-name')).toBe('arrows-swap-90-24');
    expect(wrapper.find('.sidebar-item-content__logo').exists()).toBe(false);
  });
});
