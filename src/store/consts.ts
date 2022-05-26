import { vuex } from '@soramitsu/soraneo-wallet-web';

const { WalletModules } = vuex;

export enum Module {
  Prices = 'prices',
  Router = 'router',
  Web3 = 'web3',
  Assets = 'assets',
  Settings = 'settings',
  Swap = 'swap',
  Referrals = 'referrals',
  Pool = 'pool',
  Moonpay = 'moonpay',
  Bridge = 'bridge',
  AddLiquidity = 'addLiquidity',
  CreatePair = 'createPair',
  RemoveLiquidity = 'removeLiquidity',
  Rewards = 'rewards',
  DemeterFarming = 'demeterFarming',
}

export const Modules = [...Object.values(Module), ...WalletModules];
