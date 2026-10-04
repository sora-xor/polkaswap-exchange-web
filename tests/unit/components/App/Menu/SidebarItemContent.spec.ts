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
            props: ['name', 'tooltipText'],
            template: '<i class="s-icon-stub" :data-name="name" :data-tooltip="tooltipText"></i>',
          },
          SIcon: {
            props: ['name', 'tooltipText'],
            template: '<i class="s-icon-stub" :data-name="name" :data-tooltip="tooltipText"></i>',
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

  it('shows a live pill, a caption and an icon dot, without changing the label slot after the icon', () => {
    const wrapper = mountComponent({
      icon: 'basic-flame-24',
      title: 'Burn',
      badge: 'Live',
      caption: '49.70 TS / XOR',
    });

    expect(wrapper.classes()).toContain('sidebar-item-content--live');
    expect(wrapper.get('.sidebar-item-content__badge').text()).toBe('Live');
    expect(wrapper.get('.sidebar-item-content__caption').text()).toBe('49.70 TS / XOR');
    expect(wrapper.get('.sidebar-item-content__live-dot').attributes('aria-hidden')).toBe('true');
    expect(wrapper.get('.sidebar-item-content__title').text()).toContain('Burn');
    // The existing hide/show rules for the label target the element right after the icon.
    expect(wrapper.get('.icon-container').element.nextElementSibling?.className).toBe('sidebar-item-content__label');
    expect(wrapper.get('.s-icon-stub').attributes('data-tooltip')).toBe('Burn · Live · 49.70 TS / XOR');
  });

  it('adds nothing for an item without a status', () => {
    const wrapper = mountComponent({ icon: 'arrows-swap-90-24', title: 'Swap' });

    expect(wrapper.classes()).not.toContain('sidebar-item-content--live');
    expect(wrapper.find('.sidebar-item-content__badge').exists()).toBe(false);
    expect(wrapper.find('.sidebar-item-content__caption').exists()).toBe(false);
    expect(wrapper.find('.sidebar-item-content__live-dot').exists()).toBe(false);
    expect(wrapper.get('.s-icon-stub').attributes('data-tooltip')).toBe('Swap');
  });

  it('keeps the pill readable in both themes, never moves the row, and respects reduced motion', () => {
    expect(sidebarItemContentSource).toMatch(
      /\.sidebar-item-content__badge\s*\{[\s\S]*?background: var\(--s-color-action-text\);[\s\S]*?color: var\(--s-color-base-on-accent\);/
    );
    // Caption and pill only use transform/opacity animations and a fixed single line, so the row keeps its height.
    expect(sidebarItemContentSource).toContain('white-space: nowrap;');
    expect(sidebarItemContentSource).toContain('@keyframes sidebar-live-blink');
    expect(sidebarItemContentSource).toContain('@keyframes sidebar-live-ping');
    expect(sidebarItemContentSource).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?sidebar-item-content__badge::before,[\s\S]*?sidebar-item-content__live-dot::after\s*\{\s*animation: none;/
    );
    // The dot appears exactly where the label is hidden: from the rail breakpoint up to the tablet breakpoint.
    expect(sidebarItemContentSource).toMatch(
      /\.sidebar-item-content__live-dot\s*\{\s*display: none;[\s\S]*?@include large-mobile\s*\{\s*display: block;\s*\}\s*@include tablet\s*\{\s*display: none;/
    );
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
