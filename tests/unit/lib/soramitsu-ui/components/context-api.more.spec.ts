import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import {
  DATE_PICKER_API_KEY,
  useDatePickerApi,
  type DatePickerApi,
} from '@/lib/soramitsu-ui/components/DatePicker/api';
import {
  NAVIGATION_MENU_API_KEY,
  NAVIGATION_SUBMENU_API_KEY,
  useNavigationMenuApi,
  useNavigationSubmenuApi,
  type NavigationMenuApi,
  type NavigationSubmenuApi,
} from '@/lib/soramitsu-ui/components/NavigationMenu/api';
import { TABLE_API_KEY, useTableApi, type TableApi } from '@/lib/soramitsu-ui/components/Table/api';
import {
  TABS_PANEL_API_KEY,
  TABS_PANEL_BACKGROUND_TYPES,
  useTabsPanelApi,
  type TabsPanelApi,
} from '@/lib/soramitsu-ui/components/Tabs/api';

describe('additional soramitsu-ui context APIs', () => {
  it('reads force-injected date-picker, tabs, navigation, and table APIs', () => {
    const datePicker: DatePickerApi = {
      type: 'date',
      time: false,
      disabled: false,
      dateFilter: vi.fn(() => true),
    };
    const tabs: TabsPanelApi = {
      active: 'swap',
      selectTab: vi.fn(),
      background: 'secondary',
    };
    const navigation: NavigationMenuApi = {
      active: 'wallet',
      collapsed: false,
      select: vi.fn(),
    };
    const submenu: NavigationSubmenuApi = {
      register: vi.fn(),
    };
    const table: TableApi = {
      register: vi.fn(),
    };
    const seen: Record<string, unknown> = {};

    const Host = defineComponent({
      setup() {
        seen.datePicker = useDatePickerApi();
        seen.tabs = useTabsPanelApi();
        seen.navigation = useNavigationMenuApi();
        seen.submenu = useNavigationSubmenuApi();
        seen.table = useTableApi();
        return () => h('span', `${useTabsPanelApi().active}:${useNavigationMenuApi().active}`);
      },
    });

    const wrapper = mount(Host, {
      global: {
        provide: {
          [DATE_PICKER_API_KEY as symbol]: datePicker,
          [TABS_PANEL_API_KEY as symbol]: tabs,
          [NAVIGATION_MENU_API_KEY as symbol]: navigation,
          [NAVIGATION_SUBMENU_API_KEY as symbol]: submenu,
          [TABLE_API_KEY as symbol]: table,
        },
      },
    });

    expect(seen.datePicker).toBe(datePicker);
    expect(seen.tabs).toBe(tabs);
    expect(seen.navigation).toBe(navigation);
    expect(seen.submenu).toBe(submenu);
    expect(seen.table).toBe(table);
    expect(wrapper.text()).toBe('swap:wallet');

    datePicker.dateFilter(new Date('2024-01-01T00:00:00Z'), 'date');
    tabs.selectTab('pool');
    navigation.select('dashboard');
    submenu.register(ref('child'));
    table.register({ id: 'amount', type: 'default', prop: 'amount' } as never);

    expect(datePicker.dateFilter).toHaveBeenCalledWith(new Date('2024-01-01T00:00:00Z'), 'date');
    expect(tabs.selectTab).toHaveBeenCalledWith('pool');
    expect(navigation.select).toHaveBeenCalledWith('dashboard');
    expect(submenu.register).toHaveBeenCalled();
    expect(table.register).toHaveBeenCalledWith({ id: 'amount', type: 'default', prop: 'amount' });
  });

  it('returns undefined for optional navigation submenu API without a provider', () => {
    let submenu: unknown = 'not-read';
    const Host = defineComponent({
      setup() {
        submenu = useNavigationSubmenuApi();
        return () => null;
      },
    });

    mount(Host);

    expect(submenu).toBeUndefined();
  });

  it('documents tabs panel background variants', () => {
    expect(TABS_PANEL_BACKGROUND_TYPES).toEqual(['primary', 'secondary', 'none']);
  });
});
