import { installCountryFlagEmoji } from './countryFlagEmoji';
import { installDayjsDuration } from './days-js-duration';
import { install as installSoramitsuUI } from './soramitsuUI';
import { install as installWallet } from './wallet';

import type { Pinia } from 'pinia';
import type { App } from 'vue';

export type PluginInstallContext = {
  pinia?: Pinia;
};

export default function installPlugins(app: App, context: PluginInstallContext = {}): void {
  installDayjsDuration();
  installCountryFlagEmoji();
  installSoramitsuUI(app);
  installWallet(app, context);
}
