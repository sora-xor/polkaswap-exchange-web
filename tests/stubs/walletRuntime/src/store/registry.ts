export enum WalletModule {
  Account = 'account',
  Router = 'router',
  Settings = 'settings',
  Subscriptions = 'subscriptions',
  Transactions = 'transactions',
}

export const WalletModules = Object.values(WalletModule).map((submodule) => `wallet/${submodule}`);
