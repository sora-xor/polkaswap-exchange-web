import type store from '@/store';

import type { VUEX_TYPES } from '@soramitsu/soraneo-wallet-web';
import type { VueDecorator } from 'vue-class-component';

type BaseModuleDecorator<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T14, T15, T16, T17, T18> = {
  router: VUEX_TYPES.BaseDecorator<T1>;
  web3: VUEX_TYPES.BaseDecorator<T2>;
  assets: VUEX_TYPES.BaseDecorator<T3>;
  settings: VUEX_TYPES.BaseDecorator<T4>;
  swap: VUEX_TYPES.BaseDecorator<T5>;
  referrals: VUEX_TYPES.BaseDecorator<T6>;
  pool: VUEX_TYPES.BaseDecorator<T7>;
  moonpay: VUEX_TYPES.BaseDecorator<T8>;
  bridge: VUEX_TYPES.BaseDecorator<T9>;
  addLiquidity: VUEX_TYPES.BaseDecorator<T10>;
  removeLiquidity: VUEX_TYPES.BaseDecorator<T11>;
  rewards: VUEX_TYPES.BaseDecorator<T12>;
  staking: VUEX_TYPES.BaseDecorator<T13>;
  demeterFarming: VUEX_TYPES.BaseDecorator<T14>;
  soraCard: VUEX_TYPES.BaseDecorator<T15>;
  orderBook: VUEX_TYPES.BaseDecorator<T16>;
  dashboard: VUEX_TYPES.BaseDecorator<T17>;
  vault: VUEX_TYPES.BaseDecorator<T18>;
};

export type StateDecorators = BaseModuleDecorator<
  typeof store.state.router,
  typeof store.state.web3,
  typeof store.state.assets,
  typeof store.state.settings,
  typeof store.state.swap,
  typeof store.state.referrals,
  typeof store.state.pool,
  typeof store.state.moonpay,
  typeof store.state.bridge,
  typeof store.state.addLiquidity,
  typeof store.state.removeLiquidity,
  typeof store.state.rewards,
  typeof store.state.staking,
  typeof store.state.demeterFarming,
  typeof store.state.soraCard,
  typeof store.state.orderBook,
  typeof store.state.dashboard,
  typeof store.state.vault
> &
  VUEX_TYPES.WalletStateDecorators;

export type GettersDecorators = BaseModuleDecorator<
  typeof store.getters.router,
  typeof store.getters.web3,
  typeof store.getters.assets,
  typeof store.getters.settings,
  typeof store.getters.swap,
  typeof store.getters.referrals,
  typeof store.getters.pool,
  typeof store.getters.moonpay,
  typeof store.getters.bridge,
  typeof store.getters.addLiquidity,
  typeof store.getters.removeLiquidity,
  typeof store.getters.rewards,
  typeof store.getters.staking,
  typeof store.getters.demeterFarming,
  typeof store.getters.soraCard,
  typeof store.getters.orderBook,
  typeof store.getters.dashboard,
  typeof store.getters.vault
> &
  VUEX_TYPES.WalletGettersDecorators & { libraryDesignSystem: VueDecorator; libraryTheme: VueDecorator };

export type CommitDecorators = BaseModuleDecorator<
  typeof store.commit.router,
  typeof store.commit.web3,
  typeof store.commit.assets,
  typeof store.commit.settings,
  typeof store.commit.swap,
  typeof store.commit.referrals,
  typeof store.commit.pool,
  typeof store.commit.moonpay,
  typeof store.commit.bridge,
  typeof store.commit.addLiquidity,
  typeof store.commit.removeLiquidity,
  typeof store.commit.rewards,
  typeof store.commit.staking,
  typeof store.commit.demeterFarming,
  typeof store.commit.soraCard,
  typeof store.commit.orderBook,
  typeof store.commit.dashboard,
  typeof store.commit.vault
> &
  VUEX_TYPES.WalletCommitDecorators;

export type DispatchDecorators = BaseModuleDecorator<
  typeof store.dispatch.router,
  typeof store.dispatch.web3,
  typeof store.dispatch.assets,
  typeof store.dispatch.settings,
  typeof store.dispatch.swap,
  typeof store.dispatch.referrals,
  typeof store.dispatch.pool,
  typeof store.dispatch.moonpay,
  typeof store.dispatch.bridge,
  typeof store.dispatch.addLiquidity,
  typeof store.dispatch.removeLiquidity,
  typeof store.dispatch.rewards,
  typeof store.dispatch.staking,
  typeof store.dispatch.demeterFarming,
  typeof store.dispatch.soraCard,
  typeof store.dispatch.orderBook,
  typeof store.dispatch.dashboard,
  typeof store.dispatch.vault
> &
  VUEX_TYPES.WalletDispatchDecorators;
