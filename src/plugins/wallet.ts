import { loadWalletModule } from '@/utils/walletModule';
import { resolveGlobalPinia } from './pinia';
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

export async function install(app: App, context: WalletInstallContext = {}): Promise<void> {
  const walletModule = await loadWalletModule();
  const pinia = isPiniaInstance(context.pinia) ? context.pinia : resolveGlobalPinia();
  const { store: _legacyStore, ...restContext } = context as WalletInstallContext & { store?: unknown };
  const pluginOptions = { ...restContext, pinia };

  app.use(walletModule.default, pluginOptions);
  registerWalletComponents(app, walletModule.components);
}
