import buttonDirective from '@/directives/button';
import loadingDirective from '@/directives/loading';
import SCard from '@/lib/soramitsu-ui/components/Card/SCard.vue';
import SDesignSystemProvider from '@/lib/soramitsu-ui/components/DesignSystemProvider/SDesignSystemProvider.vue';
import SScrollbar from '@/lib/soramitsu-ui/components/Scrollbar/SScrollbar.vue';
import SDivider from '@/components/shared/compat/SDivider.vue';
import SSlider from '@/components/shared/compat/SSlider.vue';
import { createAsyncComponent, preloadAsyncComponents } from '@/shared/ui/async';

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

/** Lazy wrappers each app registered, with their names, so they can be resolved before mount. */
const registeredLazyComponents = new WeakMap<App, Map<Component, Set<string>>>();

const trackLazyComponent = (app: App, component: Component, names: string[]): void => {
  let components = registeredLazyComponents.get(app);
  if (!components) {
    components = new Map();
    registeredLazyComponents.set(app, components);
  }
  const registeredNames = components.get(component) ?? new Set<string>();
  names.forEach((name) => registeredNames.add(name));
  components.set(component, registeredNames);
};

const registerIfAbsent = (app: App, name: string, component: Component): boolean => {
  if (!app.component(name)) {
    app.component(name, component);
    return true;
  }
  return false;
};

const registerAsyncComponent = (app: App, name: string, loader: ComponentLoader): void => {
  const component = createAsyncComponent(loader);
  const names = [name, toKebabCase(name)].filter((registeredName) => registerIfAbsent(app, registeredName, component));
  if (names.length) {
    trackLazyComponent(app, component, names);
  }
};

const registerAsyncCompat = (app: App, name: string, loader: ComponentLoader): void => {
  const component = createAsyncComponent(loader);
  registerCompat(app, name, component);
  trackLazyComponent(app, component, [name]);
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
  registerCompat(app, 'SDivider', SDivider);
  registerCompat(app, 's-divider', SDivider);
  registerCompat(app, 'SSlider', SSlider);
  registerCompat(app, 's-slider', SSlider);
  registerDirective(app, 'loading', loadingDirective);
  registerDirective(app, 'button', buttonDirective);
  registerAsyncCompat(app, 'STabs', () => import('@/lib/soramitsu-ui/components/Tabs/STabsPanel.vue'));
  registerAsyncCompat(app, 's-tabs', () => import('@/lib/soramitsu-ui/components/Tabs/STabsPanel.vue'));
}

/**
 * Resolves the lazily registered UI components before the app mounts.
 *
 * The app shell already imports the whole component library statically (through
 * the wallet notification provider), so this downloads nothing extra. It only
 * lets buttons, inputs and menus render in the first paint instead of popping
 * in one task later and shifting the layout. Registration itself stays lazy.
 * Wrappers that were later replaced by a compat registration are skipped.
 */
export function preloadLazySoramitsuComponents(app: App): Promise<void> {
  const tracked = registeredLazyComponents.get(app) ?? new Map<Component, Set<string>>();
  const registered = [...tracked]
    .filter(([component, names]) => [...names].some((name) => app.component(name) === component))
    .map(([component]) => component);

  return preloadAsyncComponents(registered);
}
