import type { VueDecorator } from 'vue-class-component';
import type { VUEX_TYPES } from '@soramitsu/soraneo-wallet-web';

import type store from '@/store';

type BaseModuleDecorator<T1, T2, T3, T4> = {
  assets: VUEX_TYPES.BaseDecorator<T1>;
  settings: VUEX_TYPES.BaseDecorator<T2>;
  swap: VUEX_TYPES.BaseDecorator<T3>;
  noir: VUEX_TYPES.BaseDecorator<T4>;
};

export type StateDecorators = BaseModuleDecorator<
  typeof store.state.assets,
  typeof store.state.settings,
  typeof store.state.swap,
  typeof store.state.noir
> &
  VUEX_TYPES.WalletStateDecorators;

export type GettersDecorators = BaseModuleDecorator<
  typeof store.getters.assets,
  typeof store.getters.settings,
  typeof store.getters.swap,
  typeof store.getters.noir
> &
  VUEX_TYPES.WalletGettersDecorators & { libraryDesignSystem: VueDecorator; libraryTheme: VueDecorator };

export type CommitDecorators = BaseModuleDecorator<
  typeof store.commit.assets,
  typeof store.commit.settings,
  typeof store.commit.swap,
  typeof store.commit.noir
> &
  VUEX_TYPES.WalletCommitDecorators;

export type DispatchDecorators = BaseModuleDecorator<
  typeof store.dispatch.assets,
  typeof store.dispatch.settings,
  typeof store.dispatch.swap,
  typeof store.dispatch.noir
> &
  VUEX_TYPES.WalletDispatchDecorators;
