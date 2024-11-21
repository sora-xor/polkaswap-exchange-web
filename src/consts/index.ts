import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import invert from 'lodash/fp/invert';

import { DashboardPageNames } from '@/modules/dashboard/consts';
import { PoolPageNames } from '@/modules/pool/consts';
import { StakingPageNames } from '@/modules/staking/consts';
import { VaultPageNames } from '@/modules/vault/consts';

import pkg from '../../package.json';

import type { Alert } from '@soramitsu/soraneo-wallet-web/lib/types/common';

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
  ID = 'id',
  IT = 'it',
  NL = 'nl',
  PL = 'pl',
  SR = 'sr',
  VI = 'vi',
  ZH_CN = 'zh-CN',
}

export const Languages = [
  { key: Language.EN, value: 'English', name: 'English (UK)' },
  { key: Language.ZH_CN, value: 'Chinese Simplified', name: '简体中文' },
  { key: Language.CS, value: 'Czech', name: 'Čeština' },
  { key: Language.NL, value: 'Dutch', name: 'Nederlands' },
  { key: Language.FR, value: 'French', name: 'Français' },
  { key: Language.DE, value: 'German', name: 'Deutsch' },
  { key: Language.ID, value: 'Indonesian', name: 'bahasa Indonesia' },
  { key: Language.IT, value: 'Italian', name: 'Italiano' },
  { key: Language.PL, value: 'Polish', name: 'Polski' },
  { key: Language.RU, value: 'Russian', name: 'Русский' },
  { key: Language.SR, value: 'Serbian', name: 'Српски' },
  { key: Language.ES, value: 'Spanish', name: 'Español' },
  { key: Language.VI, value: 'Vietnamese', name: 'Tiếng Việt' },
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
  soraCardSupportChannel: 'https://t.me/soracardofficial',
};

export const ObjectInit = () => null;

export const ZeroStringValue = '0';

export const HundredNumber = 100;

export const DefaultSlippageTolerance = '0.5';

export const LOCAL_STORAGE_MAX_SIZE = 4 * 1024 * 1024;

export const LOCAL_STORAGE_LIMIT_PERCENTAGE = 95;

export const listOfRemoveForLocalStorage = [
  '.assetsAddresses',
  '.history',
  '.ethBridgeHistory',
  '.evmHistory',
  '.subHistory',
];

export enum MarketAlgorithms {
  SMART = 'SMART',
  TBC = 'TBC',
  XYK = 'XYK',
  XST = 'XST',
  ORB = 'Trade',
}

export const DefaultMarketAlgorithm = MarketAlgorithms.SMART;

export const LiquiditySourceForMarketAlgorithm = {
  [MarketAlgorithms.SMART]: LiquiditySourceTypes.Default,
  [MarketAlgorithms.TBC]: LiquiditySourceTypes.MulticollateralBondingCurvePool,
  [MarketAlgorithms.XYK]: LiquiditySourceTypes.XYKPool,
  [MarketAlgorithms.ORB]: LiquiditySourceTypes.OrderBook,
};

export const MarketAlgorithmForLiquiditySource = invert(LiquiditySourceForMarketAlgorithm);

export enum PageNames {
  Swap = 'Swap',
  Pool = 'Pool',
  Stats = 'Stats',
  Wallet = 'Wallet',
  AddLiquidity = 'AddLiquidity',
  Farming = 'Farming',
  Rewards = 'Rewards',
  ReferralProgram = 'ReferralProgram',
  PointSystemWrapper = 'PointSystemWrapper',
  RewardsTabs = 'RewardsTabs',
  ReferralBonding = 'ReferralBonding',
  ReferralUnbonding = 'ReferralUnbonding',
  BridgeContainer = 'BridgeContainer',
  Bridge = 'Bridge',
  BridgeTransaction = 'BridgeTransaction',
  BridgeTransactionsHistory = 'BridgeTransactionsHistory',
  Tokens = 'Tokens',
  DepositOptions = 'DepositOptions',
  DepositTxHistory = 'DepositTxHistory',
  CedeStore = 'CedeStore',
  StakingContainer = 'StakingContainer',
  // just for router name & different titles
  ExploreContainer = 'Explore/Container',
  ExploreTokens = 'Explore/Tokens',
  ExploreDemeter = 'Explore/Demeter',
  ExploreFarming = 'Explore/Farming',
  ExploreStaking = 'Explore/Staking',
  ExplorePools = 'Explore/Pools',
  ExploreBooks = 'Explore/Books',
  //
  OrderBook = 'OrderBook',
  LimitOrderBuy = 'OrderBook/LimitOrderBuy',
  LimitOrderSell = 'OrderBook/LimitOrderSell',
  SoraCard = 'SoraCard',
  AssetOwnerContainer = 'AssetOwnerContainer',
  VaultsContainer = 'VaultsContainer',
  Burn = 'Burn',
}

export enum Components {
  // App
  AppLogoButton = 'App/Header/AppLogoButton',
  AppMarketing = 'App/Header/AppMarketing',
  AppMobilePopup = 'App/MobilePopup',
  AppBrowserNotifsEnableDialog = 'App/BrowserNotification/EnableDialog',
  AppBrowserNotifsBlockedDialog = 'App/BrowserNotification/BlockedDialog',
  AppBrowserNotifsLocalStorageOverride = 'App/BrowserNotification/LocalStorageOverride',
  AppBrowserNotifsBlockedRotatePhone = 'App/BrowserNotification/BlockedRotatePhone',
  AppBrowserMstNotificationTrxs = 'App/BrowserNotification/MstNotificationTrxs',
  Alerts = 'App/Alerts/Alerts',
  AlertList = 'App/Alerts/AlertList',
  CreateAlert = 'App/Alerts/CreateAlert',
  AlertsSelectAsset = 'pages/Alerts/SelectAsset',
  SelectLanguageDialog = 'App/Settings/Language/SelectLanguageDialog',
  SelectCurrencyDialog = 'App/Settings/Currency/SelectCurrencyDialog',
  RotatePhoneDialog = 'App/Settings/Telegram/RotatePhoneDialog',
  AccelerationAccessDialog = 'App/Settings/Telegram/AccelerationAccessDialog',
  AppFooter = 'App/Footer/AppFooter',
  AppDisclaimer = 'App/Header/AppDisclaimer',
  SelectIndexer = 'App/Footer/Indexer/SelectIndexer',
  StatisticsDialog = 'App/Footer/StatisticsDialog',
  IndexerInfo = 'App/Footer/Indexer/IndexerInfo',
  // Node select
  SelectNodeDialog = 'App/Settings/Node/SelectNodeDialog',
  SelectNode = 'App/Settings/Node/SelectNode',
  NodeInfo = 'App/Settings/Node/NodeInfo',
  // SORA Card
  Dashboard = 'pages/SoraCard/Dashboard/Dashboard',
  BalanceIndicator = 'pages/SoraCard/common/BalanceIndicator',
  SoraCardIntroPage = 'pages/SoraCard/SoraCardIntroPage',
  SoraCardKYC = 'pages/SoraCard/SoraCardKYC',
  ConfirmationInfo = 'pages/SoraCard/ConfirmationInfo',
  TermsAndConditions = 'pages/SoraCard/steps/TermsAndConditions',
  ToSDialog = 'pages/SoraCard/steps/ToSDialog',
  SelectCountryDialog = 'pages/SoraCard/steps/SelectCountryDialog',
  Phone = 'pages/SoraCard/steps/Phone',
  Email = 'pages/SoraCard/steps/Email',
  Payment = 'pages/SoraCard/steps/Payment',
  Guidance = 'pages/SoraCard/steps/Guidance',
  KycView = 'pages/SoraCard/steps/KycView',
  // Paywings
  PaywingsDialog = 'SoraCard/Paywings/PaywingsDialog',
  // Bridge Page
  BridgeTransactionDetails = 'pages/Bridge/TransactionDetails',
  BridgeTransferNotification = 'pages/Bridge/TransferNotification',
  BridgeSelectAsset = 'pages/Bridge/SelectAsset',
  BridgeSelectNetwork = 'pages/Bridge/SelectNetwork',
  BridgeSelectSubAccount = 'pages/Bridge/SelectSubAccount',
  BridgeLimitCard = 'pages/Bridge/LimitCard',
  BridgeAccountPanel = 'pages/Bridge/AccountPanel',
  BridgeNodeIcon = 'pages/Bridge/NodeIcon',
  BridgeNetworkSelector = 'pages/Bridge/NetworkSelector',
  // Moonpay Page
  Moonpay = 'pages/Moonpay/Moonpay',
  MoonpayNotification = 'pages/Moonpay/Notification',
  MoonpayConfirmation = 'pages/Moonpay/Confirmation',
  MoonpayHistory = 'pages/Moonpay/MoonpayHistory',
  // Swap Page
  SwapFormWidget = 'pages/Swap/Widget/Form',
  SwapTransactionsWidget = 'pages/Swap/Widget/Transactions',
  SwapDistributionWidget = 'pages/Swap/Widget/Distribution',
  SwapTransactionDetailsWidget = 'pages/Swap/Widget/TransactionDetails',
  SwapConfirm = 'pages/Swap/Confirm',
  SwapStatusActionBadge = 'pages/Swap/StatusActionBadge',
  SwapTransactionDetails = 'pages/Swap/TransactionDetails',
  SwapSettings = 'pages/Swap/Settings/Settings',
  SwapLossWarningDialog = 'pages/Swap/LossWarningDialog',
  // Order Book
  BookWidget = 'pages/OrderBook/BookWidget',
  SetLimitOrderWidget = 'pages/OrderBook/SetLimitOrderWidget',
  HistoryOrderWidget = 'pages/OrderBook/HistoryOrderWidget',
  MarketTradesWidget = 'pages/OrderBook/MarketTradesWidget',
  BookChartsWidget = 'pages/OrderBook/BookChartsWidget',
  BuySell = 'pages/OrderBook/BuySell',
  PairListPopover = 'pages/OrderBook/Popovers/PairListPopover',
  AllOrders = 'pages/OrderBook/Tables/AllOrders',
  OpenOrders = 'pages/OrderBook/Tables/OpenOrders',
  CustomisePage = 'pages/OrderBook/Dialogs/CustomisePage',
  PlaceOrder = 'pages/OrderBook/Dialogs/PlaceOrder',
  CancelOrders = 'pages/OrderBook/Dialogs/CancelOrders',
  PlaceTransactionDetails = 'pages/OrderBook/TransactionDetails',
  ErrorButton = 'pages/OrderBook/common/ErrorButton',
  // Referrals Page
  ReferralsConfirmBonding = 'pages/Referrals/ConfirmBonding',
  ReferralsConfirmInviteUser = 'pages/Referrals/ConfirmInviteUser',
  // Rewards Page
  RewardsAmountHeader = 'pages/Rewards/AmountHeader',
  RewardsAmountTable = 'pages/Rewards/AmountTable',
  RewardsGradientBox = 'pages/Rewards/GradientBox',
  // Point System Page
  PointCard = 'pages/PointSystem/PointCard',
  TaskCard = 'pages/PointSystem/TaskCard',
  FirstTxCard = 'pages/PointSystem/FirstTxCard',
  TaskDialog = 'pages/PointSystem/TaskDialog',
  // Shared
  GenericPageHeader = 'shared/GenericPageHeader',
  LinksDropdown = 'shared/LinksDropdown',
  PairTokenLogo = 'shared/PairTokenLogo',
  PoolInfo = 'shared/PoolInfo',
  PriceChange = 'shared/PriceChange',
  StatusBadge = 'shared/StatusBadge',
  TransactionDetails = 'shared/TransactionDetails',
  TokensRow = 'shared/TokensRow',
  ValueStatusWrapper = 'shared/ValueStatusWrapper',
  ResponsiveTabs = 'shared/ResponsiveTabs',
  // Shared Widgets
  BaseWidget = 'shared/Widget/Base',
  WidgetsGrid = 'shared/Widget/Grid',
  // Shared Widgets Components
  CustomiseWidget = 'shared/Widget/Customise',
  IFrameWidget = 'shared/Widget/IFrame',
  PriceChartWidget = 'shared/Widget/PriceChart',
  TokenPriceChartWidget = 'shared/Widget/TokenPriceChart',
  SupplyChartWidget = 'shared/Widget/SupplyChart',
  // Shared Buttons
  SortButton = 'shared/Button/SortButton',
  SvgIconButton = 'shared/Button/SvgIconButton/SvgIconButton',
  // Shared Input
  TokenInput = 'shared/Input/TokenInput',
  TokenSelectButton = 'shared/Input/TokenSelectButton',
  // Shared Dialogs
  ConfirmBridgeTransactionDialog = 'shared/Dialog/ConfirmBridgeTransaction',
  NetworkFeeWarningDialog = 'shared/Dialog/NetworkFeeWarning',
  PaymentErrorDialog = 'shared/Dialog/PaymentError',
  SelectProviderDialog = 'shared/Dialog/SelectProvider',
  SelectSoraAccountDialog = 'shared/Dialog/SelectSoraAccount',
  // Shared Asset selection
  SelectAssetList = 'shared/SelectAsset/List',
  SelectToken = 'shared/SelectAsset/SelectToken',
  // Shared Settings
  SettingsTabs = 'shared/Settings/Tabs',
  SlippageTolerance = 'shared/Settings/SlippageTolerance',
  // Shared Stats
  StatsFilter = 'shared/Stats/StatsFilter',
  // Shared Chart
  ChartSkeleton = 'shared/Chart/ChartSkeleton',
  DataRowSkeleton = 'shared/Skeleton/DataRow',
}

export enum LimitOrderType {
  limit = 'limit',
  market = 'market',
}

export enum RewardsTabsItems {
  PointSystem = PageNames.PointSystemWrapper,
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
    icon: 'music-CD-24',
    title: PageNames.OrderBook,
    href: '/#/trade',
  },
  {
    icon: 'basic-circle-star-24',
    title: PageNames.Rewards,
    href: '/#/points',
  },
  {
    icon: 'basic-drop-24',
    title: PoolPageNames.Pool,
    href: '/#/pool',
  },
  {
    icon: 'basic-layers-24',
    title: PageNames.StakingContainer,
    href: '/#/staking',
    index: StakingPageNames.Staking,
  },
  {
    icon: 'grid-block-distribute-vertically-24',
    title: PageNames.Bridge,
    href: '/#/bridge',
  },
  {
    icon: 'finance-wallet-24',
    title: PageNames.Wallet,
    href: '/#/wallet',
  },
  {
    icon: 'call-phone-16',
    title: VaultPageNames.VaultsContainer,
    href: '/#/kensetsu',
    index: VaultPageNames.Vaults,
  },
];

const OtherPagesMenu: Array<SidebarMenuItemLink> = [
  {
    icon: 'various-items-24',
    title: PageNames.ExploreContainer,
    href: '/#/explore',
    index: PageNames.ExploreTokens,
  },
  {
    icon: 'various-planet-24',
    title: PageNames.Stats,
    href: '/#/stats',
  },
  // {
  //   icon: 'basic-flame-24',
  //   title: PageNames.Burn,
  //   href: '/#/burn',
  // },
  // {
  //   icon: 'music-eject-24',
  //   title: PageNames.SoraCard,
  //   href: '/#/card',
  // },
  {
    icon: 'various-rocket-24',
    title: PageNames.AssetOwnerContainer,
    href: '/#/dashboard/owner',
    index: DashboardPageNames.AssetOwner,
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

export const SidebarMenuGroups = [...MainMenu, ...OtherPagesMenu];

export const BridgeChildPages = [PageNames.BridgeTransaction, PageNames.BridgeTransactionsHistory];
export const PoolChildPages = [PageNames.AddLiquidity];
export const RewardsChildPages = [
  PageNames.PointSystemWrapper,
  PageNames.Rewards,
  PageNames.ReferralProgram,
  PageNames.ReferralBonding,
  PageNames.ReferralUnbonding,
];
export const ExploreChildPages = [
  PageNames.ExploreTokens, // By default
  PageNames.ExploreStaking,
  PageNames.ExplorePools,
  PageNames.ExploreFarming,
  PageNames.ExploreBooks,
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

export const TranslationConsts = {
  // extending consts
  ...WALLET_CONSTS.TranslationConsts,
  AppName: app.name,
  Ceres: 'Ceres',
  APR: 'APR', // Annual percentage rate
  APY: 'APY',
  TVL: 'TVL',
  EVM: 'EVM',
  Substrate: 'Substrate',
  Kusama: 'Kusama',
  ROI: 'ROI', // Return of investment
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
