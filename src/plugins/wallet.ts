import store from '@/store';

import { loadWalletModule } from '@/utils/walletModule';
import type { App, Component } from 'vue';

type WalletInstallContext = {
  store?: unknown;
  pinia?: unknown;
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

  const defaultStore = (store as any)?.commit?.wallet ? (store as any) : ((store as any)?.original ?? store);
  const resolvedStore = context.store ?? defaultStore;
  const pluginOptions = { ...context, store: resolvedStore };

  app.use(walletModule.default, pluginOptions);
  registerWalletComponents(app, walletModule.components);
}
