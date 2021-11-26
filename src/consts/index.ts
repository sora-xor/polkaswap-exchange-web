import invert from 'lodash/fp/invert';
import { LiquiditySourceTypes } from '@sora-substrate/util';

import pkg from '../../package.json';

export const app = {
  version: pkg.version,
  name: 'Polkaswap',
  email: 'jihoon@tutanota.de',
  title: 'Polkaswap — The DEX for the Interoperable Future.',
};

export const WalletPermissions = {
  addAssets: false,
  createAssets: false,
  showAssetDetails: false,
  sendAssets: false, // enable 'send' button in assets list
  swapAssets: false, // enable 'swap' button in assets list
};

// navigator.language values, f.e. ('es', 'eu-ES')
export enum Language {
  EN = 'en',
}

export const Languages = [{ key: Language.EN, value: 'English', name: 'English (UK)' }];

export const Links = {
  about: {
    sora: 'https://sora.org/',
    polkadot: 'https://medium.com/polkadot-network/polkadot-js-extension-release-update-3b0d2d87edb8',
  },
  nodes: {
    tutorial: 'https://medium.com/sora-xor/how-to-run-a-sora-testnet-node-a4d42a9de1af',
  },
  marketMaker: 'https://medium.com/polkaswap/pswap-rewards-part-3-polkaswap-market-making-rebates-1856f62ccfaa',
  terms: 'https://wiki.sora.org/polkaswap/terms',
  privacy: 'https://wiki.sora.org/polkaswap/privacy',
};

export const ObjectInit = () => null;

export const ZeroStringValue = '0';

export const DefaultSlippageTolerance = '0.5';

export enum MarketAlgorithms {
  SMART = 'SMART',
  TBC = 'TBC',
  XYK = 'XYK',
}

export const DefaultMarketAlgorithm = MarketAlgorithms.SMART;

export const LiquiditySourceForMarketAlgorithm = {
  [MarketAlgorithms.SMART]: LiquiditySourceTypes.Default,
  [MarketAlgorithms.TBC]: LiquiditySourceTypes.MulticollateralBondingCurvePool,
  [MarketAlgorithms.XYK]: LiquiditySourceTypes.XYKPool,
};

export const MarketAlgorithmForLiquiditySource = invert(LiquiditySourceForMarketAlgorithm);

export enum PageNames {
  Swap = 'Swap',
  Wallet = 'Wallet',
}

export enum Components {
  GenericPageHeader = 'GenericPageHeader',
  AppHeader = 'App/Header/AppHeader',
  AccountButton = 'App/Header/AccountButton',
  AppLogoButton = 'App/Header/AppLogoButton',
  SwapInfo = 'SwapInfo',
  SelectToken = 'SelectToken',
  TokenLogo = 'TokenLogo',
  PairTokenLogo = 'PairTokenLogo',
  ConfirmSwap = 'ConfirmSwap',
  ConfirmRemoveLiquidity = 'ConfirmRemoveLiquidity',
  ConfirmTokenPairDialog = 'ConfirmTokenPairDialog',
  SelectNode = 'Settings/Node/SelectNode',
  NodeInfo = 'Settings/Node/NodeInfo',
  SelectNodeDialog = 'SelectNodeDialog',
  ExternalLink = 'ExternalLink',
  WalletDialog = 'WalletDialog',
  TokenSelectButton = 'Input/TokenSelectButton',
  TokenAddress = 'Input/TokenAddress',
  SelectLanguageDialog = 'SelectLanguageDialog',
  ValueStatusWrapper = 'ValueStatusWrapper',
  // NOIR
  Cart = 'Noir/Cart',
  CountInput = 'Noir/CountInput',
  RedeemDialog = 'Noir/RedeemDialog',
}

export enum LogoSize {
  MINI = 'mini',
  SMALL = 'small',
  MEDIUM = 'medium',
  BIG = 'big',
  LARGE = 'large',
}

// TODO: [NOIR_TOKEN]
export const NOIR_TOKEN_ADDRESS = '0x0200040000000000000000000000000000000000000000000000000000000000';
// TODO: [NOIR_ADDRESS]
export const NOIR_ADDRESS_ID = 'cnW1pm3hDysWLCD4xvQAKFmW9QPjMG5zmnRxBpc6hd3P7CWP3';
