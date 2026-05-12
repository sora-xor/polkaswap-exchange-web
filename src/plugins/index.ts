import { installCountryFlagEmoji } from './countryFlagEmoji';

import type { Pinia } from 'pinia';
import type { App } from 'vue';

export type PluginInstallContext = {
  pinia?: Pinia;
};

/**
 * Installs tiny global patches that are safe to keep in the HTML entry.
 */
export function installStartupPlugins(): void {
  installCountryFlagEmoji();
}

/**
 * Loads heavier component and wallet plugins outside the HTML entry bundle.
 */
export async function installRuntimePlugins(app: App, context: PluginInstallContext = {}): Promise<void> {
  const [{ install: installSoramitsuUI }, { install: installWallet }, { installDayjsDuration }] = await Promise.all([
    import('./soramitsuUI'),
    import('./wallet'),
    import('./days-js-duration'),
  ]);

  installDayjsDuration();
  installSoramitsuUI(app);
  installWallet(app, context);
}

export default async function installPlugins(app: App, context: PluginInstallContext = {}): Promise<void> {
  installStartupPlugins();
  await installRuntimePlugins(app, context);
}
