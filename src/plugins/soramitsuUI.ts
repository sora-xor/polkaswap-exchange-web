import { plugin as soramitsuUIPlugin } from '@soramitsu-ui/ui';
import SIconCompat from '@/lib/soramitsu-ui/components/Icon/SIcon.vue';
import SMenuCompat from '@/lib/soramitsu-ui/components/Menu/SMenu.vue';
import SMenuItemCompat from '@/lib/soramitsu-ui/components/Menu/SMenuItem.vue';
import SMenuItemGroupCompat from '@/lib/soramitsu-ui/components/Menu/SMenuItemGroup.vue';
import STabCompat from '@/lib/soramitsu-ui/components/Tabs/STab.vue';
import STabsCompat from '@/lib/soramitsu-ui/components/Tabs/STabsPanel.vue';

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
  registerCompat(app, 'SIcon', SIconCompat);

  registerCompat(app, 's-icon', SIconCompat);
  registerCompat(app, 'SMenu', SMenuCompat);

  registerCompat(app, 's-menu', SMenuCompat);
  registerCompat(app, 'SMenuItem', SMenuItemCompat);

  registerCompat(app, 's-menu-item', SMenuItemCompat);
  registerCompat(app, 'SMenuItemGroup', SMenuItemGroupCompat);

  registerCompat(app, 's-menu-item-group', SMenuItemGroupCompat);
  registerCompat(app, 'STabs', STabsCompat);

  registerCompat(app, 's-tabs', STabsCompat);
  registerCompat(app, 'STabsPanel', STabsCompat);

  registerCompat(app, 's-tabs-panel', STabsCompat);
  registerCompat(app, 'STab', STabCompat);

  registerCompat(app, 's-tab', STabCompat);
}
