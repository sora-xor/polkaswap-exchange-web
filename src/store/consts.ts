import { vuex } from '@soramitsu/soraneo-wallet-web';

const { WalletModules } = vuex;

export enum Module {
  Assets = 'assets',
  Settings = 'settings',
  Swap = 'swap',
  Noir = 'noir',
}

export const Modules = [...Object.values(Module), ...WalletModules];
