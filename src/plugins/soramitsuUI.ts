import buttonDirective from '@/directives/button';
import loadingDirective from '@/directives/loading';
import SCard from '@/lib/soramitsu-ui/components/Card/SCard.vue';
import SDesignSystemProvider from '@/lib/soramitsu-ui/components/DesignSystemProvider/SDesignSystemProvider.vue';
import SScrollbar from '@/lib/soramitsu-ui/components/Scrollbar/SScrollbar.vue';
import { createAsyncComponent } from '@/shared/ui/async';

import type { App, Component, Directive } from 'vue';

import '@soramitsu-ui/ui/styles';

type ComponentModule = { default: Component };
type ComponentLoader = () => Promise<ComponentModule>;

const soramitsuVueComponentModules = import.meta.glob<ComponentModule>([
  '../lib/soramitsu-ui/components/**/S*.vue',
  '!../lib/soramitsu-ui/components/JsonInput/**',
]);

const soramitsuScriptComponentModules: Record<string, ComponentLoader> = {
  SNotificationsProvider: () => import('@/lib/soramitsu-ui/components/Notifications/SNotificationsProvider'),
  SPopover: () => import('@/lib/soramitsu-ui/components/Popover/SPopover'),
  SPopoverPanel: () => import('@/lib/soramitsu-ui/components/Popover/SPopoverPanel'),
  STableColumn: () => import('@/lib/soramitsu-ui/components/Table/STableColumn'),
};

const getComponentNameFromPath = (path: string): string => {
  const filename = path.split('/').pop() ?? '';
  return filename.replace(/\.(vue|ts)$/, '');
};

const toKebabCase = (name: string): string => {
  return name
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
};

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

const registerDirective = (app: App, name: string, directive: Directive): void => {
  const existing = app.directive(name);

  if (existing === directive) return;

  const contextDirectives = (app as App & { _context?: { directives?: Record<string, Directive> } })._context
    ?.directives;

  if (existing && contextDirectives) {
    contextDirectives[name] = directive;
    return;
  }

  app.directive(name, directive);
};

const registerIfAbsent = (app: App, name: string, component: Component): void => {
  if (!app.component(name)) {
    app.component(name, component);
  }
};

const registerAsyncComponent = (app: App, name: string, loader: ComponentLoader): void => {
  const component = createAsyncComponent(loader);
  registerIfAbsent(app, name, component);
  registerIfAbsent(app, toKebabCase(name), component);
};

const registerAsyncCompat = (app: App, name: string, loader: ComponentLoader): void => {
  registerCompat(app, name, createAsyncComponent(loader));
};

const registerLazySoramitsuComponents = (app: App): void => {
  Object.entries(soramitsuVueComponentModules).forEach(([path, loader]) => {
    registerAsyncComponent(app, getComponentNameFromPath(path), loader);
  });

  Object.entries(soramitsuScriptComponentModules).forEach(([name, loader]) => {
    registerAsyncComponent(app, name, loader);
  });
};

export function install(app: App): void {
  registerLazySoramitsuComponents(app);
  registerCompat(app, 'SCard', SCard);
  registerCompat(app, 's-card', SCard);
  registerCompat(app, 'SDesignSystemProvider', SDesignSystemProvider);
  registerCompat(app, 's-design-system-provider', SDesignSystemProvider);
  registerCompat(app, 'SScrollbar', SScrollbar);
  registerCompat(app, 's-scrollbar', SScrollbar);
  registerDirective(app, 'loading', loadingDirective);
  registerDirective(app, 'button', buttonDirective);
  registerAsyncCompat(app, 'STabs', () => import('@/lib/soramitsu-ui/components/Tabs/STabsPanel.vue'));
  registerAsyncCompat(app, 's-tabs', () => import('@/lib/soramitsu-ui/components/Tabs/STabsPanel.vue'));
}
