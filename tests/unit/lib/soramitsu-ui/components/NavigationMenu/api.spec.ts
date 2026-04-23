import { mount } from '@vue/test-utils';
import { defineComponent, h, provide, readonly, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import {
  NAVIGATION_MENU_API_KEY,
  NAVIGATION_SUBMENU_API_KEY,
  useNavigationMenuApi,
  useNavigationSubmenuApi,
  type NavigationMenuApi,
  type NavigationSubmenuApi,
} from '@/lib/soramitsu-ui/components/NavigationMenu/api';

describe('NavigationMenu API', () => {
  it('returns provided navigation menu and submenu contexts', () => {
    const select = vi.fn();
    const menuApi = readonly({
      active: ref('liquidity'),
      collapsed: ref(false),
      select,
    }) as unknown as NavigationMenuApi;
    const submenuApi: NavigationSubmenuApi = {
      register: vi.fn(),
    };
    const seen: {
      menu?: ReturnType<typeof useNavigationMenuApi>;
      submenu?: ReturnType<typeof useNavigationSubmenuApi>;
    } = {};

    const Child = defineComponent({
      setup() {
        seen.menu = useNavigationMenuApi();
        seen.submenu = useNavigationSubmenuApi();
        return () => h('span', String(seen.menu?.active));
      },
    });
    const Parent = defineComponent({
      setup() {
        provide(NAVIGATION_MENU_API_KEY, menuApi);
        provide(NAVIGATION_SUBMENU_API_KEY, submenuApi);
        return () => h(Child);
      },
    });

    const wrapper = mount(Parent);

    expect(seen.menu).toBe(menuApi);
    expect(seen.submenu).toBe(submenuApi);
    expect(wrapper.text()).toBe('liquidity');
  });

  it('treats submenu context as optional and requires menu context', () => {
    const OptionalSubmenuProbe = defineComponent({
      setup() {
        const submenu = useNavigationSubmenuApi();
        return () => h('span', String(submenu));
      },
    });

    expect(mount(OptionalSubmenuProbe).text()).toBe('undefined');

    const MissingMenuProbe = defineComponent({
      setup() {
        useNavigationMenuApi();
        return () => null;
      },
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      expect(() => mount(MissingMenuProbe)).toThrow('Injection of "Symbol(NavigationMenuAPI)" failed');
    } finally {
      warnSpy.mockRestore();
    }
  });
});
