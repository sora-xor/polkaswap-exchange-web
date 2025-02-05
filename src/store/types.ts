import type store from '@/store';

import type { VUEX_TYPES } from '@soramitsu/soraneo-wallet-web';
import type { VueDecorator } from 'vue-class-component';

type BaseModuleDecorator<T1, T2, T3, T4, T5, T6> = {
  router: VUEX_TYPES.BaseDecorator<T1>;
  web3: VUEX_TYPES.BaseDecorator<T2>;
  assets: VUEX_TYPES.BaseDecorator<T3>;
  settings: VUEX_TYPES.BaseDecorator<T4>;
  swap: VUEX_TYPES.BaseDecorator<T5>;
  bridge: VUEX_TYPES.BaseDecorator<T6>;
};

export type StateDecorators = BaseModuleDecorator<
  typeof store.state.router,
  typeof store.state.web3,
  typeof store.state.assets,
  typeof store.state.settings,
  typeof store.state.swap,
  typeof store.state.bridge
> &
  VUEX_TYPES.WalletStateDecorators;

export type GettersDecorators = BaseModuleDecorator<
  typeof store.getters.router,
  typeof store.getters.web3,
  typeof store.getters.assets,
  typeof store.getters.settings,
  typeof store.getters.swap,
  typeof store.getters.bridge
> &
  VUEX_TYPES.WalletGettersDecorators & { libraryDesignSystem: VueDecorator; libraryTheme: VueDecorator };

export type CommitDecorators = BaseModuleDecorator<
  typeof store.commit.router,
  typeof store.commit.web3,
  typeof store.commit.assets,
  typeof store.commit.settings,
  typeof store.commit.swap,
  typeof store.commit.bridge
> &
  VUEX_TYPES.WalletCommitDecorators;

export type DispatchDecorators = BaseModuleDecorator<
  typeof store.dispatch.router,
  typeof store.dispatch.web3,
  typeof store.dispatch.assets,
  typeof store.dispatch.settings,
  typeof store.dispatch.swap,
  typeof store.dispatch.bridge
> &
  VUEX_TYPES.WalletDispatchDecorators;
