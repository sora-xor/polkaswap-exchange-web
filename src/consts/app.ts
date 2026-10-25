import pkg from '../../package.json';

export const app = {
  version: pkg.version,
  name: 'Polkaswap',
  email: 'jihoon@tutanota.de',
  title: 'Polkaswap — The DEX for the Interoperable Future.',
};

/**
 * Non-translated interpolation constants used by app and wallet copy.
 * Kept self-contained so i18n startup does not import the wallet SDK bundle.
 */
export const TranslationConsts = {
  Polkaswap: 'Polkaswap',
  Ethereum: 'Ethereum',
  Etherscan: 'Etherscan',
  Hashi: 'HASHI',
  PolkadotJs: 'Polkadot{.js}',
  Sora: 'SORA',
  TBC: 'TBC',
  XYK: 'XYK',
  NFT: 'NFT',
  CEX: 'CEX',
  Polkadot: 'Polkadot',
  SORAScan: 'SORAScan',
  SoraMetrics: 'SoraMetrics',
  Subscan: 'Subscan',
  CedeStore: 'cede.store',
  QR: 'QR',
  IPFS: 'IPFS',
  soraNetwork: {
    Dev: 'SORA Devnet',
    Test: 'SORA Testnet (private)',
    Stage: 'SORA Testnet',
    Prod: 'SORA Mainnet',
  },
  JSON: 'JSON',
  ADAR: 'ADAR',
  Google: 'Google',
  AppName: app.name,
  Ceres: 'Ceres',
  APR: 'APR',
  APY: 'APY',
  TVL: 'TVL',
  EVM: 'EVM',
  Substrate: 'Substrate',
  Kusama: 'Kusama',
  ROI: 'ROI',
  mbps: 'mbps',
  online: 'Online',
  offline: 'Offline',
  XCM: 'XCM',
  Max: 'Max.',
  XOR: 'XOR',
  VAL: 'VAL',
  Kensetsu: 'Kensetsu',
  LTV: 'LTV',
  Telegram: 'Telegram',
  DEX: 'DEX',
} as const;
