import { plugin as soramitsuUIPlugin } from '@soramitsu-ui/ui';
import ElPopoverCompat from '@/components/compat/ElPopoverCompat';
import SCollapseCompat from '@/components/compat/SCollapseCompat.vue';
import SCollapseItemCompat from '@/components/compat/SCollapseItemCompat.vue';
import SDropdownCompat from '@/components/compat/SDropdownCompat.vue';
import SDropdownItemCompat from '@/components/compat/SDropdownItemCompat.vue';
import SFloatInputCompat from '@/components/compat/SFloatInputCompat.vue';
import SMenuCompat from '@/lib/soramitsu-ui/components/Menu/SMenu.vue';
import SMenuItemCompat from '@/lib/soramitsu-ui/components/Menu/SMenuItem.vue';
import SMenuItemGroupCompat from '@/lib/soramitsu-ui/components/Menu/SMenuItemGroup.vue';

import type { App, Component } from 'vue';

import '@soramitsu-ui/ui/styles';

const registerCompat = (app: App, name: string, component: Component): void => {
  const existing = app.component(name);
  if (existing === component) return;

  const contextComponents = (app as App & { _context?: { components?: Record<string, Component> } })._context
    ?.components;

  // Vue warns on duplicate global registration. When intentionally overriding
  // a legacy component with a compat replacement, update app context directly.
  if (existing && contextComponents) {
    contextComponents[name] = component;
    return;
  }

  app.component(name, component);
};

export function install(app: App): void {
  app.use(soramitsuUIPlugin());
  registerCompat(app, 'ElPopover', ElPopoverCompat);

  registerCompat(app, 'el-popover', ElPopoverCompat);
  registerCompat(app, 'SCollapse', SCollapseCompat);

  registerCompat(app, 's-collapse', SCollapseCompat);
  registerCompat(app, 'SCollapseItem', SCollapseItemCompat);

  registerCompat(app, 's-collapse-item', SCollapseItemCompat);
  registerCompat(app, 'SDropdown', SDropdownCompat);

  registerCompat(app, 's-dropdown', SDropdownCompat);
  registerCompat(app, 'SDropdownItem', SDropdownItemCompat);

  registerCompat(app, 's-dropdown-item', SDropdownItemCompat);
  registerCompat(app, 'SFloatInput', SFloatInputCompat);

  registerCompat(app, 's-float-input', SFloatInputCompat);
  registerCompat(app, 'SMenu', SMenuCompat);

  registerCompat(app, 's-menu', SMenuCompat);
  registerCompat(app, 'SMenuItem', SMenuItemCompat);

  registerCompat(app, 's-menu-item', SMenuItemCompat);
  registerCompat(app, 'SMenuItemGroup', SMenuItemGroupCompat);

  registerCompat(app, 's-menu-item-group', SMenuItemGroupCompat);
}
