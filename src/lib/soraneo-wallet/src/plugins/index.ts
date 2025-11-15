import { install as installMaska } from './maska';
import { install as installSoramitsuUI } from './soramitsuUI';
import { install as installVirtualScroller } from './virtualScroller';
import './days-js-duration';

import type { App } from 'vue';

export default function installWalletPlugins(app: App): void {
  installMaska(app);
  installVirtualScroller(app);
  installSoramitsuUI(app);
}
