import wallet from './store/wallet';
import { attachDecorator, createDecoratorsObject, VuexOperation } from './store/util';

const walletModuleNames = ['account', 'router', 'settings', 'subscriptions', 'transactions'] as const;

const walletModuleRef = wallet;

const walletModules: Record<string, unknown> = {};
walletModules.wallet = walletModuleRef;

const WalletModules = walletModuleNames.map((submodule) => `wallet/${submodule}`);

export const vuex = {
  walletModules,
  WalletModules,
  VuexOperation,
  attachDecorator,
  createDecoratorsObject,
};

export default vuex;
