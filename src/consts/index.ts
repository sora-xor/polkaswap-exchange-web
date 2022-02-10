import invert from 'lodash/fp/invert';
import { KnownAssets, KnownSymbols, XOR } from '@sora-substrate/util/build/assets/consts';
import { LiquiditySourceTypes } from '@sora-substrate/util/build/swap/consts';

import pkg from '../../package.json';
import { KnownBridgeAsset } from '../utils/ethers-util';

export const app = {
  version: pkg.version,
  name: 'Polkaswap',
  email: 'jihoon@tutanota.de',
  title: 'Polkaswap — The DEX for the Interoperable Future.',
};

export const WalletPermissions = {
  sendAssets: true, // enable 'send' button in assets list
  swapAssets: true, // enable 'swap' button in assets list
};

/**
 * `navigator.language` values, f.e. ('es', 'eu-ES')
 */
export enum Language {
  EN = 'en',
  RU = 'ru',
  CS = 'cs',
  DE = 'de',
  ES = 'es',
  FR = 'fr',
  HY = 'hy',
  ID = 'id',
  IT = 'it',
  NL = 'nl',
  NO = 'no',
  PL = 'pl',
  YO = 'yo',
}

export const Languages = [
  { key: Language.EN, value: 'English', name: 'English (UK)' },
  { key: Language.HY, value: 'Armenian', name: 'հայերեն' },
  { key: Language.CS, value: 'Czech', name: 'Čeština' },
  { key: Language.NL, value: 'Dutch', name: 'Nederlands' },
  { key: Language.FR, value: 'French', name: 'Français' },
  { key: Language.DE, value: 'German', name: 'Deutsch' },
  { key: Language.ID, value: 'Indonesian', name: 'bahasa Indonesia' },
  { key: Language.IT, value: 'Italian', name: 'Italiano' },
  { key: Language.NO, value: 'Norwegian', name: 'Norsk' },
  { key: Language.PL, value: 'Polish', name: 'Polski' },
  { key: Language.RU, value: 'Russian', name: 'Русский' },
  { key: Language.ES, value: 'Spanish', name: 'Español' },
  { key: Language.YO, value: 'Yoruba', name: 'Yoruba' },
];

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

export const MetamaskCancellationCode = 4001;

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
  About = 'About',
  Swap = 'Swap',
  Pool = 'Pool',
  Stats = 'Stats',
  Support = 'Support',
  Wallet = 'Wallet',
  PoolContainer = 'PoolContainer',
  CreatePair = 'CreatePair',
  AddLiquidity = 'AddLiquidity',
  RemoveLiquidity = 'RemoveLiquidity',
  Farming = 'Farming',
  Rewards = 'Rewards',
  Referral = 'Referral',
  RewardsTabs = 'RewardsTabs',
  ReferralProgram = 'ReferralProgram',
  ReferralBonding = 'ReferralBonding',
  ReferralUnbonding = 'ReferralUnbonding',
  PageNotFound = 'PageNotFound',
  BridgeContainer = 'BridgeContainer',
  Bridge = 'Bridge',
  BridgeTransaction = 'BridgeTransaction',
  BridgeTransactionsHistory = 'BridgeTransactionsHistory',
  Tokens = 'Tokens',
  MoonpayHistory = 'MoonpayHistory',
}

export enum Components {
  GenericPageHeader = 'GenericPageHeader',
  AppHeader = 'App/Header/AppHeader',
  AccountButton = 'App/Header/AccountButton',
  AppLogoButton = 'App/Header/AppLogoButton',
  MarketMakerCountdown = 'App/Header/MarketMakerCountdown/MarketMakerCountdown',
  AppMenu = 'App/Menu/AppMenu',
  AppInfoPopper = 'App/Menu/AppInfoPopper',
  SwapInfo = 'SwapInfo',
  SelectToken = 'SelectToken',
  TokenLogo = 'TokenLogo',
  PairTokenLogo = 'PairTokenLogo',
  ConfirmSwap = 'ConfirmSwap',
  ConfirmRemoveLiquidity = 'ConfirmRemoveLiquidity',
  ConfirmTokenPairDialog = 'ConfirmTokenPairDialog',
  SettingsDialog = 'SettingsDialog',
  SettingsHeader = 'Settings/Header',
  SettingsTabs = 'Settings/Tabs',
  SlippageTolerance = 'Settings/SlippageTolerance',
  MarketAlgorithm = 'Settings/MarketAlgorithm',
  SelectNode = 'Settings/Node/SelectNode',
  NodeInfo = 'Settings/Node/NodeInfo',
  SelectNodeDialog = 'SelectNodeDialog',
  StatusActionBadge = 'StatusActionBadge',
  ExternalLink = 'ExternalLink',
  // HelpDialog = 'HelpDialog',
  AboutNetworkDialog = 'AboutNetworkDialog',
  SidebarItemContent = 'SidebarItemContent',
  SelectNetwork = 'SelectNetwork',
  SelectRegisteredAsset = 'SelectRegisteredAsset',
  ConfirmBridgeTransactionDialog = 'ConfirmBridgeTransactionDialog',
  NetworkFeeWarningDialog = 'NetworkFeeWarningDialog',
  BridgeTransaction = 'BridgeTransaction',
  BridgeTransactionsHistory = 'BridgeTransactionsHistory',
  GradientBox = 'Rewards/GradientBox',
  TokensRow = 'Rewards/TokensRow',
  RewardsAmountHeader = 'Rewards/AmountHeader',
  RewardsAmountTable = 'Rewards/AmountTable',
  ReferralsConfirmBonding = 'Referrals/ConfirmBonding',
  ReferralsConfirmInviteUser = 'Referrals/ConfirmInviteUser',
  TokenSelectButton = 'Input/TokenSelectButton',
  TokenAddress = 'Input/TokenAddress',
  SelectLanguageDialog = 'SelectLanguageDialog',
  ValueStatusWrapper = 'ValueStatusWrapper',
  Moonpay = 'Moonpay/Moonpay',
  MoonpayWidget = 'Moonpay/MoonpayWidget',
  MoonpayNotification = 'Moonpay/MoonpayNotification',
  MoonpayConfirmation = 'Moonpay/MoonpayConfirmation',
  MoonpayHistoryButton = 'Moonpay/MoonpayHistoryButton',
  TransactionDetails = 'TransactionDetails/TransactionDetails',
  SwapTransactionDetails = 'TransactionDetails/SwapTransactionDetails',
  AddLiquidityTransactionDetails = 'TransactionDetails/AddLiquidityTransactionDetails',
  RemoveLiquidityTransactionDetails = 'TransactionDetails/RemoveLiquidityTransactionDetails',
  BridgeTransactionDetails = 'TransactionDetails/BridgeTransactionDetails',
  CreatePairTransactionDetails = 'TransactionDetails/CreatePairTransactionDetails',
}

export enum RewardsTabsItems {
  Rewards = PageNames.Rewards,
  ReferralProgram = PageNames.ReferralProgram,
}

interface SidebarMenuItem {
  icon: string;
  title: string;
  disabled?: boolean;
}

interface SidebarMenuItemLink extends SidebarMenuItem {
  href?: string;
}

const MainMenu: Array<SidebarMenuItem> = [
  {
    icon: 'arrows-swap-90-24',
    title: PageNames.Swap,
  },
  {
    icon: 'basic-drop-24',
    title: PageNames.Pool,
  },
  {
    icon: 'grid-block-distribute-vertically-24',
    title: PageNames.Bridge,
  },
  // {
  //   icon: 'various-pocket-24',
  //   title: PageNames.Auctions,
  // },
];

const AccountMenu: Array<SidebarMenuItem> = [
  {
    icon: 'finance-wallet-24',
    title: PageNames.Wallet,
  },
  {
    icon: 'basic-circle-star-24',
    title: PageNames.Rewards,
  },
];

const OtherPagesMenu: Array<SidebarMenuItem> = [
  {
    icon: 'various-bone-24',
    title: PageNames.Tokens,
  },
  {
    icon: 'file-file-text-24',
    title: PageNames.About,
  },
];

export const SocialNetworkLinks: Array<SidebarMenuItemLink> = [
  {
    icon: 'symbols-24',
    title: 'wiki',
    href: 'https://wiki.sora.org/',
  },
  {
    icon: 'symbols-telegram-24',
    title: 'telegram',
    href: 'https://t.me/polkaswap',
  },
  {
    icon: 'symbols-twitter-24',
    title: 'twitter',
    href: 'https://twitter.com/polkaswap',
  },
  // TODO: Update this icon name to appropriate one after font fix
  {
    icon: 'symbols-hash-24',
    title: 'reddit',
    href: 'https://www.reddit.com/r/Polkaswap',
  },
  // TODO: Update this icon name to appropriate one after font fix
  {
    icon: 'symbols-peace-24',
    title: 'medium',
    href: 'https://medium.com/polkaswap',
  },
  {
    icon: 'symbols-github-24',
    title: 'github',
    href: 'https://github.com/sora-xor',
  },
];

export const FaucetLink: SidebarMenuItemLink = {
  icon: 'software-terminal-24',
  title: 'faucet',
};

export const SidebarMenuGroups = [MainMenu, AccountMenu, OtherPagesMenu];

export const BridgeChildPages = [PageNames.BridgeTransaction, PageNames.BridgeTransactionsHistory];
export const PoolChildPages = [PageNames.AddLiquidity, PageNames.RemoveLiquidity, PageNames.CreatePair];

export enum Topics {
  SwapTokens = 'SwapTokens',
  PassiveEarning = 'PassiveEarning',
  AddLiquidity = 'AddLiquidity',
  PriceFeeds = 'PriceFeeds',
}

export const AboutTopics = [
  { title: Topics.SwapTokens, icon: 'arrows-swap-24' },
  { title: Topics.PassiveEarning, icon: 'basic-bar-chart-24' },
  { title: Topics.AddLiquidity, icon: 'basic-drop-24' },
  { title: Topics.PriceFeeds, icon: 'software-terminal-24' },
];

export enum LogoSize {
  MINI = 'mini',
  SMALL = 'small',
  MEDIUM = 'medium',
  BIG = 'big',
  LARGE = 'large',
}

export enum EvmSymbol {
  ETH = 'ETH',
  VT = 'VT',
}

const gasLimit = {
  approve: 70000,
  sendERC20ToSidechain: 86000,
  sendEthToSidechain: 50000,
  mintTokensByPeers: 255000,
  receiveByEthereumAssetAddress: 250000,
  receiveBySidechainAssetId: 255000,
};
/**
 * It's in gwei.
 * Zero index means ETH -> SORA
 * First index means SORA -> ETH
 */
export const EthereumGasLimits = [
  // ETH -> SORA
  {
    [XOR.address]: gasLimit.approve + gasLimit.sendERC20ToSidechain,
    [KnownAssets.get(KnownSymbols.VAL).address]: gasLimit.approve + gasLimit.sendERC20ToSidechain,
    [KnownAssets.get(KnownSymbols.PSWAP).address]: gasLimit.approve + gasLimit.sendERC20ToSidechain,
    [KnownAssets.get(KnownSymbols.ETH).address]: gasLimit.sendEthToSidechain,
    [KnownBridgeAsset.Other]: gasLimit.approve + gasLimit.sendERC20ToSidechain,
  },
  // SORA -> ETH
  {
    [XOR.address]: gasLimit.mintTokensByPeers,
    [KnownAssets.get(KnownSymbols.VAL).address]: gasLimit.mintTokensByPeers,
    [KnownAssets.get(KnownSymbols.PSWAP).address]: gasLimit.receiveBySidechainAssetId,
    [KnownAssets.get(KnownSymbols.ETH).address]: gasLimit.receiveByEthereumAssetAddress,
    [KnownBridgeAsset.Other]: gasLimit.receiveByEthereumAssetAddress,
  },
];

export const MaxUint256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
export const EthAddress = '0x0000000000000000000000000000000000000000';
