import { defineModule } from 'direct-vuex';

import account from './account';
import router from './router';
import settings from './settings';
import subscriptions from './subscriptions';
import transactions from './transactions';

const wallet = defineModule({
  namespaced: true,
  modules: {
    account,
    router,
    settings,
    subscriptions,
    transactions,
  },
});

export enum WalletModule {
  Account = 'account',
  Router = 'router',
  Settings = 'settings',
  Subscriptions = 'subscriptions',
  Transactions = 'transactions',
}

export const WalletModules = Object.values(WalletModule).map((submodule) => `wallet/${submodule}`);

export default wallet;
