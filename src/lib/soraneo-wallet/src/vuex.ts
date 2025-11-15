import wallet from './store/wallet';
import { attachDecorator, createDecoratorsObject, VuexOperation } from './store/util';

const walletModuleNames = ['account', 'router', 'settings', 'subscriptions', 'transactions'] as const;

const walletModules: Record<string, unknown> = {};

Object.defineProperty(walletModules, 'wallet', {
  enumerable: true,
  get: () => wallet,
});

const WalletModules = walletModuleNames.map((submodule) => `wallet/${submodule}`);

export const vuex = {
  walletModules,
  WalletModules,
  VuexOperation,
  attachDecorator,
  createDecoratorsObject,
};

export default vuex;
