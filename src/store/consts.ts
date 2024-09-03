import { vuex } from '@soramitsu/soraneo-wallet-web';

const { WalletModules } = vuex;

export enum Module {
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
  RemoveLiquidity = 'removeLiquidity',
  Rewards = 'rewards',
  Staking = 'staking',
  DemeterFarming = 'demeterFarming',
  SoraCard = 'soraCard',
  OrderBook = 'orderBook',
  Dashboard = 'dashboard',
  Vault = 'vault',
}

export const Modules = [...Object.values(Module), ...WalletModules];
