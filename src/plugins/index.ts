import { installCountryFlagEmoji } from './countryFlagEmoji';
import { installDayjsDuration } from './days-js-duration';
import { install as installECharts } from './echarts';
import { install as installSoramitsuUI } from './soramitsuUI';
import { install as installWallet } from './wallet';

import type { Pinia } from 'pinia';
import type { App } from 'vue';

export type PluginInstallContext = {
  pinia?: Pinia;
};

export default async function installPlugins(app: App, context: PluginInstallContext = {}): Promise<void> {
  installDayjsDuration();
  installCountryFlagEmoji();
  installECharts(app);
  installSoramitsuUI(app);
  await installWallet(app, context);
}
