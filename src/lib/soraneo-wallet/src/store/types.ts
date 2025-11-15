import type store from './index';
import type { VueDecorator } from 'vue-class-component';

export type BaseDecorator<T> = Record<keyof T, VueDecorator>;

type BaseWalletModuleDecorator<T1, T2, T3, T4, T5> = {
  wallet: {
    account: T1;
    router: T2;
    settings: T3;
    subscriptions: T4;
    transactions: T5;
  };
};

type AccountStateDecorators = BaseDecorator<typeof store.state.wallet.account>;
type RouterStateDecorators = BaseDecorator<typeof store.state.wallet.router>;
type SettingsStateDecorators = BaseDecorator<typeof store.state.wallet.settings>;
type SubscriptionsStateDecorators = BaseDecorator<typeof store.state.wallet.subscriptions>;
type TransactionsStateDecorators = BaseDecorator<typeof store.state.wallet.transactions>;
export type WalletStateDecorators = BaseWalletModuleDecorator<
  AccountStateDecorators,
  RouterStateDecorators,
  SettingsStateDecorators,
  SubscriptionsStateDecorators,
  TransactionsStateDecorators
>;

type AccountGettersDecorators = BaseDecorator<typeof store.getters.wallet.account>;
type RouterGettersDecorators = BaseDecorator<typeof store.getters.wallet.router>;
type SettingsGettersDecorators = BaseDecorator<typeof store.getters.wallet.settings>;
type SubscriptionsGettersDecorators = BaseDecorator<typeof store.getters.wallet.subscriptions>;
type TransactionsGettersDecorators = BaseDecorator<typeof store.getters.wallet.transactions>;
export type WalletGettersDecorators = BaseWalletModuleDecorator<
  AccountGettersDecorators,
  RouterGettersDecorators,
  SettingsGettersDecorators,
  SubscriptionsGettersDecorators,
  TransactionsGettersDecorators
>;

type AccountCommitDecorators = BaseDecorator<typeof store.commit.wallet.account>;
type RouterCommitDecorators = BaseDecorator<typeof store.commit.wallet.router>;
type SettingsCommitDecorators = BaseDecorator<typeof store.commit.wallet.settings>;
type SubscriptionsCommitDecorators = BaseDecorator<typeof store.commit.wallet.subscriptions>;
type TransactionsCommitDecorators = BaseDecorator<typeof store.commit.wallet.transactions>;
export type WalletCommitDecorators = BaseWalletModuleDecorator<
  AccountCommitDecorators,
  RouterCommitDecorators,
  SettingsCommitDecorators,
  SubscriptionsCommitDecorators,
  TransactionsCommitDecorators
>;

type AccountDispatchDecorators = BaseDecorator<typeof store.dispatch.wallet.account>;
type RouterDispatchDecorators = BaseDecorator<typeof store.dispatch.wallet.router>;
type SettingsDispatchDecorators = BaseDecorator<typeof store.dispatch.wallet.settings>;
type SubscriptionsDispatchDecorators = BaseDecorator<typeof store.dispatch.wallet.subscriptions>;
type TransactionsDispatchDecorators = BaseDecorator<typeof store.dispatch.wallet.transactions>;
export type WalletDispatchDecorators = BaseWalletModuleDecorator<
  AccountDispatchDecorators,
  RouterDispatchDecorators,
  SettingsDispatchDecorators,
  SubscriptionsDispatchDecorators,
  TransactionsDispatchDecorators
>;
