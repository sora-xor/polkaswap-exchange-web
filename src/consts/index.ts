import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import invert from 'lodash/fp/invert';

import { DemeterPageNames } from '@/modules/demeterFarming/consts';

import pkg from '../../package.json';

import type { Alert } from '@soramitsu/soraneo-wallet-web/lib/types/common';

export const app = {
  version: pkg.version,
  name: 'Polkaswap',
  email: 'jihoon@tutanota.de',
  title: 'Polkaswap — The DEX for the Interoperable Future.',
};

export const MAX_ALERTS_NUMBER = 5;

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
  HR = 'hr',
  HU = 'hu',
  HY = 'hy',
  ID = 'id',
  IT = 'it',
  NL = 'nl',
  NO = 'no',
  PL = 'pl',
  SK = 'sk',
  SR = 'sr',
  SV = 'sv',
  VI = 'vi',
  YO = 'yo',
  ZH_CN = 'zh-CN',
}

export const Languages = [
  { key: Language.EN, value: 'English', name: 'English (UK)' },
  { key: Language.HY, value: 'Armenian', name: 'հայերեն' },
  { key: Language.ZH_CN, value: 'Chinese Simplified', name: '简体中文' },
  { key: Language.HR, value: 'Croatian', name: 'Hrvatski' },
  { key: Language.CS, value: 'Czech', name: 'Čeština' },
  { key: Language.NL, value: 'Dutch', name: 'Nederlands' },
  { key: Language.FR, value: 'French', name: 'Français' },
  { key: Language.DE, value: 'German', name: 'Deutsch' },
  { key: Language.HU, value: 'Hungarian', name: 'Magyar' },
  { key: Language.ID, value: 'Indonesian', name: 'bahasa Indonesia' },
  { key: Language.IT, value: 'Italian', name: 'Italiano' },
  { key: Language.NO, value: 'Norwegian', name: 'Norsk' },
  { key: Language.PL, value: 'Polish', name: 'Polski' },
  { key: Language.RU, value: 'Russian', name: 'Русский' },
  { key: Language.SR, value: 'Serbian', name: 'Српски' },
  { key: Language.SK, value: 'Slovak', name: 'Slovenský' },
  { key: Language.ES, value: 'Spanish', name: 'Español' },
  { key: Language.SV, value: 'Swedish', name: 'Svenska' },
  { key: Language.VI, value: 'Vietnamese', name: 'Tiếng Việt' },
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
  faq: 'https://wiki.sora.org/polkaswap/polkaswap-faq',
  terms: 'https://wiki.sora.org/polkaswap/terms',
  privacy: 'https://wiki.sora.org/polkaswap/privacy',
  releaseNotes: pkg.repository.url.replace('.git', '/releases/latest'),
  demeterFarmingPlatform: 'https://farming.deotoken.io/',
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
  Wallet = 'Wallet',
  PoolContainer = 'PoolContainer',
  AddLiquidity = 'AddLiquidity',
  RemoveLiquidity = 'RemoveLiquidity',
  Farming = 'Farming',
  Rewards = 'Rewards',
  ReferralProgram = 'ReferralProgram',
  RewardsTabs = 'RewardsTabs',
  ReferralBonding = 'ReferralBonding',
  ReferralUnbonding = 'ReferralUnbonding',
  BridgeContainer = 'BridgeContainer',
  Bridge = 'Bridge',
  BridgeTransaction = 'BridgeTransaction',
  BridgeTransactionsHistory = 'BridgeTransactionsHistory',
  Tokens = 'Tokens',
  MoonpayHistory = 'MoonpayHistory',
  StakingContainer = 'StakingContainer',
  // just for router name & different titles
  ExploreContainer = 'Explore/Container',
  ExploreTokens = 'Explore/Tokens',
  ExploreDemeter = 'Explore/Demeter',
  ExploreFarming = 'Explore/Farming',
  ExploreStaking = 'Explore/Staking',
  ExplorePools = 'Explore/Pools',
  SoraCard = 'SoraCard',
}

export enum Components {
  // App
  AppLogoButton = 'App/Header/AppLogoButton',
  AppMobilePopup = 'App/MobilePopup',
  AppBrowserNotifsEnableDialog = 'App/BrowserNotification/BrowserNotifsEnableDialog',
  AppBrowserNotifsBlockedDialog = 'App/BrowserNotification/BrowserNotifsBlockedDialog',
  Alerts = 'App/Alerts/Alerts',
  AlertList = 'App/Alerts/AlertList',
  CreateAlert = 'App/Alerts/CreateAlert',
  AlertsSelectAsset = 'pages/Alerts/SelectAsset',
  SelectLanguageDialog = 'App/Settings/Language/SelectLanguageDialog',
  AppFooter = 'App/Footer/AppFooter',
  AppDisclaimer = 'App/Header/AppDisclaimer',
  StatisticsDialog = 'App/Footer/StatisticsDialog',
  SelectNodeDialog = 'App/Footer/SelectNodeDialog',
  SelectNode = 'App/Footer/Node/SelectNode',
  NodeInfo = 'App/Footer/Node/NodeInfo',
  // SORA Card
  SoraCard = 'SoraCard',
  SoraCardIntroPage = 'SoraCard/SoraCardIntroPage',
  SoraCardKYC = 'SoraCard/SoraCardKYC',
  ConfirmationInfo = 'SoraCard/ConfirmationInfo',
  TermsAndConditions = 'SoraCard/steps/TermsAndConditions',
  ToSDialog = 'SoraCard/steps/ToSDialog',
  RoadMap = 'SoraCard/steps/RoadMap',
  Phone = 'SoraCard/steps/Phone',
  Email = 'SoraCard/steps/Email',
  KycView = 'SoraCard/steps/KycView',
  // Paywings
  X1Dialog = 'X1/X1Dialog',
  PaywingsDialog = 'SoraCard/Paywings/PaywingsDialog',
  // Add Liquidity Page
  AddLiquidityConfirm = 'pages/AddLiquidity/Confirm',
  AddLiquidityTransactionDetails = 'pages/AddLiquidity/TransactionDetails',
  // Remove Liquidity Page
  RemoveLiquidityConfirm = 'pages/RemoveLiquidity/Confirm',
  RemoveLiquidityTransactionDetails = 'pages/RemoveLiquidity/TransactionDetails',
  // Bridge Page
  BridgeTransactionDetails = 'pages/Bridge/TransactionDetails',
  BridgeTransferNotification = 'pages/Bridge/TransferNotification',
  BridgeSelectAsset = 'pages/Bridge/SelectAsset',
  BridgeSelectNetwork = 'pages/Bridge/SelectNetwork',
  BridgeSelectAccount = 'pages/Bridge/SelectAccount',
  BridgeLinksDropdown = 'pages/Bridge/LinksDropdown',
  // Moonpay Page
  Moonpay = 'pages/Moonpay/Moonpay',
  MoonpayNotification = 'pages/Moonpay/Notification',
  MoonpayConfirmation = 'pages/Moonpay/Confirmation',
  MoonpayHistoryButton = 'pages/Moonpay/HistoryButton',
  // Swap Page
  SwapConfirm = 'pages/Swap/Confirm',
  SwapChart = 'pages/Swap/Chart',
  SwapStatusActionBadge = 'pages/Swap/StatusActionBadge',
  SwapTransactionDetails = 'pages/Swap/TransactionDetails',
  SwapSettings = 'pages/Swap/Settings/Settings',
  SwapLossWarningDialog = 'pages/Swap/LossWarningDialog',
  // Referrals Page
  ReferralsConfirmBonding = 'pages/Referrals/ConfirmBonding',
  ReferralsConfirmInviteUser = 'pages/Referrals/ConfirmInviteUser',
  // Rewards Page
  RewardsAmountHeader = 'pages/Rewards/AmountHeader',
  RewardsAmountTable = 'pages/Rewards/AmountTable',
  RewardsGradientBox = 'pages/Rewards/GradientBox',
  // Wallet Page
  WalletAboutNetworkDialog = 'pages/Wallet/AboutNetworkDialog',
  // Shared
  GenericPageHeader = 'shared/GenericPageHeader',
  ExternalLink = 'shared/ExternalLink',
  TokensRow = 'shared/TokensRow',
  PairTokenLogo = 'shared/PairTokenLogo',
  PriceChange = 'shared/PriceChange',
  ValueStatusWrapper = 'shared/ValueStatusWrapper',
  TransactionDetails = 'shared/TransactionDetails',
  PoolInfo = 'shared/PoolInfo',
  Widget = 'shared/Widget',
  // Shared Buttons
  SortButton = 'shared/Button/SortButton',
  SvgIconButton = 'shared/Button/SvgIconButton/SvgIconButton',
  // Shared Input
  TokenInput = 'shared/Input/TokenInput',
  TokenSelectButton = 'shared/Input/TokenSelectButton',
  TokenSelectDropdown = 'shared/Input/TokenSelectDropdown',
  // Shared Dialogs
  ConfirmBridgeTransactionDialog = 'shared/Dialog/ConfirmBridgeTransaction',
  NetworkFeeWarningDialog = 'shared/Dialog/NetworkFeeWarning',
  // Shared Asset selection
  SelectAssetList = 'shared/SelectAsset/List',
  SelectToken = 'shared/SelectAsset/SelectToken',
  // Shared Settings
  SettingsTabs = 'shared/Settings/Tabs',
  SlippageTolerance = 'shared/Settings/SlippageTolerance',
  // Shared Stats
  StatsCard = 'shared/Stats/StatsCard',
  StatsFilter = 'shared/Stats/StatsFilter',
  // Shared Chart
  ChartSkeleton = 'shared/Chart/ChartSkeleton',
}

export enum RewardsTabsItems {
  Rewards = PageNames.Rewards,
  ReferralProgram = PageNames.ReferralProgram,
}

export interface EditableAlertObject {
  alert: Alert;
  position: number;
}

export interface NumberedAlert extends Alert {
  position: number;
}

export interface SidebarMenuItem {
  icon?: string;
  title: string;
  disabled?: boolean;
  /**
   * When page has a redirection it's better to set the final route to avoid errors from router.
   *
   * So, when the final route is different from title `index` should be used for menu
   */
  index?: string;
}

export interface SidebarMenuItemLink extends SidebarMenuItem {
  /** It's required for href if it's used */
  href?: string;
}

const MainMenu: Array<SidebarMenuItemLink> = [
  {
    icon: 'arrows-swap-90-24',
    title: PageNames.Swap,
    href: '/#/swap',
  },
  {
    icon: 'basic-drop-24',
    title: PageNames.Pool,
    href: '/#/pool',
  },
  {
    icon: 'basic-layers-24',
    title: PageNames.StakingContainer,
    href: '/#/staking',
    index: DemeterPageNames.Staking,
  },
  {
    icon: 'grid-block-distribute-vertically-24',
    title: PageNames.Bridge,
    href: '/#/bridge',
  },
];

const AccountMenu: Array<SidebarMenuItemLink> = [
  {
    icon: 'finance-wallet-24',
    title: PageNames.Wallet,
    href: '/#/wallet',
  },
  {
    icon: 'basic-circle-star-24',
    title: PageNames.Rewards,
    href: '/#/rewards',
  },
];

const OtherPagesMenu: Array<SidebarMenuItemLink> = [
  {
    icon: 'various-items-24',
    title: PageNames.ExploreContainer,
    href: '/#/explore',
    index: PageNames.ExploreFarming,
  },
  {
    icon: 'various-planet-24',
    title: PageNames.Stats,
    href: '/#/stats',
  },
  {
    icon: 'sora-card',
    title: PageNames.SoraCard,
    href: '/#/card',
  },
  {
    icon: 'file-file-text-24',
    title: PageNames.About,
    href: '/#/about',
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
  // TODO: [FONT] Update these icon names to appropriate one after font fix
  {
    icon: 'symbols-hash-24',
    title: 'reddit',
    href: 'https://www.reddit.com/r/Polkaswap',
  },
  {
    icon: 'symbols-peace-24',
    title: 'medium',
    href: 'https://medium.com/polkaswap',
  },
  // ____________________________________
  {
    icon: 'symbols-github-24',
    title: 'github',
    href: 'https://github.com/sora-xor',
  },
];

export const StoreLinks = {
  AppStore: 'https://apps.apple.com/us/app/sora-dae/id1457566711',
  GooglePlay: 'https://play.google.com/store/apps/details?id=jp.co.soramitsu.sora',
};

export const TosExternalLinks = {
  Terms: `https://soracard.com/terms/en/polkaswap/`,
  Privacy: `https://soracard.com/privacy/en/polkaswap/`,
  getLinks: function (darkMode = 'light') {
    return darkMode === 'dark'
      ? {
          Terms: this.Terms.concat('?dark'),
          Privacy: this.Privacy.concat('?dark'),
        }
      : {
          Terms: this.Terms,
          Privacy: this.Privacy,
        };
  },
};

export const FaucetLink: SidebarMenuItemLink = {
  icon: 'software-terminal-24',
  title: 'faucet',
};

export const SidebarMenuGroups = [...MainMenu, ...AccountMenu, ...OtherPagesMenu];

export const BridgeChildPages = [PageNames.BridgeTransaction, PageNames.BridgeTransactionsHistory];
export const PoolChildPages = [PageNames.AddLiquidity, PageNames.RemoveLiquidity];
export const RewardsChildPages = [
  PageNames.Rewards,
  PageNames.ReferralProgram,
  PageNames.ReferralBonding,
  PageNames.ReferralUnbonding,
];

export const StakingChildPages = [DemeterPageNames.Staking];
export const ExploreChildPages = [
  PageNames.ExploreFarming, // By default
  PageNames.ExploreStaking,
  PageNames.ExplorePools,
  PageNames.ExploreTokens,
];

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

export const MaxUint256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
export const EthAddress = '0x0000000000000000000000000000000000000000';
