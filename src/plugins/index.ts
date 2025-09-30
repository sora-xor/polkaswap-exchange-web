import { installCountryFlagEmoji } from './countryFlagEmoji';
import { installDayjsDuration } from './days-js-duration';
import { install as installECharts } from './echarts';
import { install as installSoramitsuUI } from './soramitsuUI';
import { install as installWallet } from './wallet';

import type { App } from 'vue';

export default function installPlugins(app: App): void {
  installDayjsDuration();
  installCountryFlagEmoji();
  installECharts(app);
  installSoramitsuUI(app);
  installWallet(app);
}
