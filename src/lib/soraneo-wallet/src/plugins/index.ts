import { install as installMaska } from './maska';
import { install as installSoramitsuUI } from './soramitsuUI';
import { install as installVirtualScroller } from './virtualScroller';
import './days-js-duration';

import type { App } from 'vue';

const hasSoramitsuUiPlugin = (app: App): boolean => {
  return Boolean(app.component('SButton')) && Boolean(app.component('SDesignSystemProvider'));
};

export default function installWalletPlugins(app: App): void {
  installMaska(app);
  installVirtualScroller(app);
  if (!hasSoramitsuUiPlugin(app)) {
    installSoramitsuUI(app);
  }
}
