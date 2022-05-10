import invert from 'lodash/fp/invert';
import { LiquiditySourceTypes } from '@sora-substrate/util';

export const WalletPermissions = {
  addAssets: false,
  createAssets: false,
  showAssetDetails: false,
  sendAssets: false, // enable 'send' button in assets list
  swapAssets: false, // enable 'swap' button in assets list
};

/**
 * `navigator.language` values, f.e. ('es', 'eu-ES')
 */
export enum Language {
  EN = 'en',
}

export const Languages = [{ key: Language.EN, value: 'English', name: 'English (UK)' }];

export const Links = {
  nodes: {
    tutorial: 'https://medium.com/sora-xor/how-to-run-a-sora-testnet-node-a4d42a9de1af',
  },
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
  TokenLogo = 'TokenLogo',
  PairTokenLogo = 'PairTokenLogo',
  ConfirmTokenPairDialog = 'ConfirmTokenPairDialog',
  SelectNode = 'Settings/Node/SelectNode',
  NodeInfo = 'Settings/Node/NodeInfo',
  SelectNodeDialog = 'SelectNodeDialog',
  WalletDialog = 'WalletDialog',
  TokenSelectButton = 'Input/TokenSelectButton',
  TokenAddress = 'Input/TokenAddress',
  SelectLanguageDialog = 'SelectLanguageDialog',
  // NOIR
  Cart = 'Noir/Cart',
  CountInput = 'Noir/CountInput',
  BigCounter = 'Noir/BigCounter',
  EditionDialog = 'Noir/EditionDialog',
  RedeemDialog = 'Noir/RedeemDialog',
  CongratulationsDialog = 'Noir/CongratulationsDialog',
}

export enum LogoSize {
  MINI = 'mini',
  SMALL = 'small',
  MEDIUM = 'medium',
  BIG = 'big',
  LARGE = 'large',
}

// [NOIR_TOKEN]
export const NOIR_TOKEN_ADDRESS = '0x0200040000000000000000000000000000000000000000000000000000000000';
// [NOIR_ADDRESS]
export const NOIR_ADDRESS_ID = 'cnW1pm3hDysWLCD4xvQAKFmW9QPjMG5zmnRxBpc6hd3P7CWP3';
// [NOIR_FORM]
export const NOIR_FORM = '1FAIpQLSccTvcUlGvMImfvvFYDJAILf7psltIUPiY2jgJxz4ofqSH7kw';
export const NOIR_FORM_NAME = '380941571';
export const NOIR_FORM_ADDRESS = '999267626';
export const NOIR_FORM_EMAIL = '842734045';
export const NOIR_FORM_PHONE = '2129526364';
export const NOIR_ACCOUNT_ADDRESS = '1339270595';
