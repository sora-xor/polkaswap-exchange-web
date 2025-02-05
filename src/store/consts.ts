import { vuex } from '@soramitsu/soraneo-wallet-web';

const { WalletModules } = vuex;

export enum Module {
  Router = 'router',
  Web3 = 'web3',
  Assets = 'assets',
  Settings = 'settings',
  Swap = 'swap',
  Bridge = 'bridge',
}

export const Modules = [...Object.values(Module), ...WalletModules];
