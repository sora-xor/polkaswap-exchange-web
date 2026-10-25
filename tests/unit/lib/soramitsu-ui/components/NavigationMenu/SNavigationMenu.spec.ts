import { mount } from '@vue/test-utils';
import { defineComponent, h, inject, nextTick, provide } from 'vue';
import { describe, expect, it, vi } from 'vitest';

const { TEST_NAVIGATION_MENU_API_KEY, TEST_NAVIGATION_SUBMENU_API_KEY } = vi.hoisted(() => ({
  TEST_NAVIGATION_MENU_API_KEY: Symbol.for('NavigationMenuAPI'),
  TEST_NAVIGATION_SUBMENU_API_KEY: Symbol.for('NavigationSubmenuAPI'),
}));

async function createNavigationMenuAliasMock() {
  const { defineComponent, h, inject } = await import('vue');
  const SNavigationMenuItemBodyStub = defineComponent({
    name: 'SNavigationMenuItemBodyAliasStub',
    inheritAttrs: false,
    props: {
      active: Boolean,
      highlighted: Boolean,
      minified: Boolean,
      submenuItem: Boolean,
      tag: {
        type: [String, Object],
        default: 'div',
      },
    },
    setup(props, { attrs, slots }) {
      return () =>
        h(
          props.tag as string,
          {
            ...attrs,
            class: [
              attrs.class,
              's-navigation-menu-item-body',
              {
                's-navigation-menu-item-body_active': props.active,
                's-navigation-menu-item-body_highlighted': props.highlighted,
                's-navigation-menu-item-body_submenu-item': props.submenuItem,
                'py-8px': props.submenuItem,
                'py-14px': !props.submenuItem,
              },
            ],
          },
          [
            !props.submenuItem
              ? h(
                  'span',
                  { class: 's-navigation-menu-item-body__prepend' },
                  slots.icon?.({ class: 's-navigation-menu-item-body__icon' })
                )
              : null,
            h(
              'span',
              {
                class: [
                  's-navigation-menu-item-body__content',
                  {
                    invisible: props.minified,
                  },
                ],
              },
              slots.default?.()
            ),
            h('span', { class: 'ml-auto', style: props.minified ? 'display: none;' : undefined }, slots.append?.()),
          ]
        );
    },
  });

  return {
    NAVIGATION_MENU_API_KEY: TEST_NAVIGATION_MENU_API_KEY,
    NAVIGATION_SUBMENU_API_KEY: TEST_NAVIGATION_SUBMENU_API_KEY,
    default: SNavigationMenuItemBodyStub,
    useNavigationMenuApi: () => {
      const sentinel = Symbol('missing-navigation-menu-api');
      const api = inject(TEST_NAVIGATION_MENU_API_KEY, sentinel);

      if (api === sentinel) {
        throw new Error(`Injection of "${String(TEST_NAVIGATION_MENU_API_KEY)}" failed`);
      }

      return api;
    },
    useNavigationSubmenuApi: () => inject(TEST_NAVIGATION_SUBMENU_API_KEY, undefined),
    usePassiveModel: <T>(model: { value: T }) => model,
  };
}

vi.mock('@soramitsu-ui/ui/composables/passive-model', createNavigationMenuAliasMock);
vi.mock('@soramitsu-ui/ui/components/NavigationMenu/api', createNavigationMenuAliasMock);
vi.mock('@soramitsu-ui/ui/components/NavigationMenu/SNavigationMenuItemBody.vue', createNavigationMenuAliasMock);

import SNavigationMenu from '@/lib/soramitsu-ui/components/NavigationMenu/SNavigationMenu.vue';
import SNavigationMenuItem from '@/lib/soramitsu-ui/components/NavigationMenu/SNavigationMenuItem.vue';

describe('SNavigationMenu', () => {
  it('provides active state, collapsed state, and selection through the navigation menu API', async () => {
    const ApiProbe = defineComponent({
      setup() {
        const api = inject<{
          active: string;
          collapsed: boolean;
          select: (value: string) => void;
        }>(TEST_NAVIGATION_MENU_API_KEY);

        return () =>
          h(
            'button',
            {
              'data-testid': 'api-probe',
              'data-active': api?.active,
              'data-collapsed': String(api?.collapsed),
              onClick: () => api?.select('pool'),
            },
            api?.active
          );
      },
    });

    const wrapper = mount(SNavigationMenu, {
      props: {
        modelValue: 'swap',
        collapsed: true,
      },
      slots: {
        header: '<div data-testid="menu-header">Header</div>',
        default: () => h(ApiProbe),
        footer: '<div data-testid="menu-footer">Footer</div>',
      },
    });

    const menu = wrapper.get('[data-testid="navigation-menu"]');
    const probe = wrapper.get('[data-testid="api-probe"]');

    expect(menu.classes()).toEqual(expect.arrayContaining(['s-navigation-menu', 's-navigation-menu_collapsed']));
    expect(wrapper.get('[data-testid="menu-header"]').text()).toBe('Header');
    expect(wrapper.get('[data-testid="menu-footer"]').text()).toBe('Footer');
    expect(probe.attributes('data-active')).toBe('swap');
    expect(probe.attributes('data-collapsed')).toBe('true');

    await probe.trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([['pool']]);
    expect(wrapper.get('[data-testid="api-probe"]').attributes('data-active')).toBe('pool');
  });

  it('marks the active item and emits updates when another item is selected', async () => {
    const wrapper = mount(SNavigationMenu, {
      props: {
        modelValue: 'swap',
      },
      slots: {
        default: () => [
          h(SNavigationMenuItem, { value: 'swap' }, () => 'Swap'),
          h(SNavigationMenuItem, { value: 'pool' }, () => 'Pool'),
        ],
      },
    });

    const [swapItem, poolItem] = wrapper.findAll('[data-testid="navigation-menu-item"]');

    expect(swapItem.attributes('aria-selected')).toBe('true');
    expect(swapItem.classes()).toContain('s-navigation-menu-item-body_active');
    expect(poolItem.attributes('aria-selected')).toBe('false');
    expect(poolItem.classes()).not.toContain('s-navigation-menu-item-body_active');

    await poolItem.trigger('click');
    await nextTick();

    const [updatedSwapItem, updatedPoolItem] = wrapper.findAll('[data-testid="navigation-menu-item"]');

    expect(wrapper.emitted('update:modelValue')).toEqual([['pool']]);
    expect(updatedSwapItem.attributes('aria-selected')).toBe('false');
    expect(updatedSwapItem.classes()).not.toContain('s-navigation-menu-item-body_active');
    expect(updatedPoolItem.attributes('aria-selected')).toBe('true');
    expect(updatedPoolItem.classes()).toContain('s-navigation-menu-item-body_active');
  });

  it('minifies item content when the menu is collapsed', () => {
    const wrapper = mount(SNavigationMenu, {
      props: {
        collapsed: true,
      },
      slots: {
        default: () =>
          h(
            SNavigationMenuItem,
            { value: 'settings' },
            {
              icon: ({ class: className }: { class: string }) =>
                h('span', { class: className, 'data-testid': 'settings-icon' }),
              default: () => 'Settings',
            }
          ),
      },
    });

    const item = wrapper.get('[data-testid="navigation-menu-item"]');

    expect(item.get('.s-navigation-menu-item-body__content').classes()).toContain('invisible');
    expect(wrapper.get('[data-testid="settings-icon"]').classes()).toContain('s-navigation-menu-item-body__icon');
  });

  it('registers items with a submenu provider and renders submenu item styling', () => {
    const register = vi.fn();
    const SubmenuProvider = defineComponent({
      setup() {
        provide(TEST_NAVIGATION_SUBMENU_API_KEY, { register });
        return () => h(SNavigationMenuItem, { value: 'history' }, () => 'History');
      },
    });

    const wrapper = mount(SNavigationMenu, {
      props: {
        modelValue: 'history',
      },
      slots: {
        default: () => h(SubmenuProvider),
      },
    });

    const registeredValue = register.mock.calls[0]?.[0] as { value: string } | undefined;
    const item = wrapper.get('[data-testid="navigation-menu-item"]');

    expect(register).toHaveBeenCalledTimes(1);
    expect(registeredValue?.value).toBe('history');
    expect(item.classes()).toContain('s-navigation-menu-item-body_submenu-item');
    expect(item.classes()).toContain('s-navigation-menu-item-body_active');
  });
});
