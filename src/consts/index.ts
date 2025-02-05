import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import invert from 'lodash/fp/invert';

import pkg from '../../package.json';

import type { Alert } from '@soramitsu/soraneo-wallet-web/lib/types/common';

export const app = {
  version: pkg.version,
  name: 'Analog Bridge',
  email: 'jihoon@tutanota.de',
  title: 'Analog Bridge - Transfer your tokens to Time Chain',
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
}

export enum Components {
  // App
  AppLogoButton = 'App/Header/AppLogoButton',
  AppMobilePopup = 'App/MobilePopup',
  AppBrowserNotifsEnableDialog = 'App/BrowserNotification/EnableDialog',
  AppBrowserNotifsBlockedDialog = 'App/BrowserNotification/BlockedDialog',
  AppBrowserNotifsBlockedRotatePhone = 'App/BrowserNotification/BlockedRotatePhone',
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
  // Swap Page
  SwapStatusActionBadge = 'pages/Swap/StatusActionBadge',
  // Shared
  GenericPageHeader = 'shared/GenericPageHeader',
  LinksDropdown = 'shared/LinksDropdown',
  PairTokenLogo = 'shared/PairTokenLogo',
  PoolInfo = 'shared/PoolInfo',
  PriceChange = 'shared/PriceChange',
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
    icon: 'grid-block-distribute-vertically-24',
    title: PageNames.Bridge,
    href: '/#/bridge',
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

export const FaucetLink: SidebarMenuItemLink = {
  icon: 'software-terminal-24',
  title: 'faucet',
};

export const SidebarMenuGroups = [...MainMenu];

export const BridgeChildPages = [PageNames.BridgeTransaction, PageNames.BridgeTransactionsHistory];

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
  Sora: 'Time Chain',
} as const;
