import Wallet from '@soramitsu/soraneo-wallet-web';

import store from '@/store';

import type { App } from 'vue';

import '@soramitsu/soraneo-wallet-web/lib/soraneo-wallet-web.css';

export function install(app: App): void {
  app.use(Wallet, { store: store.original });
}
