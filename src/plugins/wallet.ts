import { components } from '@/lib/soraneo-wallet/src/components/registry';
import installWalletPlugins from '@/lib/soraneo-wallet/src/plugins';
import { registerGlobalPinia, resolveGlobalPinia } from './pinia';
import type { Pinia } from 'pinia';
import type { App, Component } from 'vue';

type WalletInstallContext = {
  pinia?: unknown;
};

const isPiniaInstance = (value: unknown): value is Pinia => {
  return Boolean(value) && typeof value === 'object' && '_s' in (value as Record<string, unknown>);
};

const toKebabCase = (name: string): string => {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
};

const registerIfAbsent = (app: App, name: string, component: Component): void => {
  if (!app.component(name)) {
    app.component(name, component);
  }
};

const registerWalletComponents = (app: App, components?: Record<string, Component>): void => {
  if (!components) return;

  Object.entries(components).forEach(([name, component]) => {
    registerIfAbsent(app, name, component);
    registerIfAbsent(app, toKebabCase(name), component);
  });
};

export function install(app: App, context: WalletInstallContext = {}): void {
  const pinia = isPiniaInstance(context.pinia) ? context.pinia : resolveGlobalPinia();
  registerGlobalPinia(pinia);

  installWalletPlugins(app);
  registerWalletComponents(app, components);
}
