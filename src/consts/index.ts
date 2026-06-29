import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import {
  FontSizeRate as WalletFontSizeRateEnum,
  FontWeightRate as WalletFontWeightRateEnum,
  HiddenValue as WalletHiddenValue,
  IndexerType as WalletIndexerEnum,
  LogoSize as WalletLogoSizeEnum,
} from '@/lib/soraneo-wallet/src/consts';
import invert from 'lodash/fp/invert';

import { PageNames } from './navigation';
import polkamarktLogoUrl from '@/assets/img/polkamarkt/pm_logo.svg?url';
import { DashboardPageNames } from '@/modules/dashboard/consts';
import { PoolPageNames } from '@/modules/pool/consts';
import { StakingPageNames } from '@/modules/staking/consts';
import { VaultPageNames } from '@/modules/vault/consts';

import pkg from '../../package.json';

export { app, TranslationConsts } from './app';
export { Language, Languages } from './language';
export { BridgeChildPages, PageNames, RouteNames } from './navigation';
export { LOCAL_STORAGE_LIMIT_PERCENTAGE, LOCAL_STORAGE_MAX_SIZE, listOfRemoveForLocalStorage } from './storage';
export { WalletPermissions } from './wallet';

export {
  AddAssetTabs,
  AppWallet,
  AccountActionTypes,
  PassphraseTimeout,
  PassphraseTimeoutDuration,
  DefaultPassphraseTimeout,
  WalletFilteringOptions,
  type WalletAssetFilters,
  type NetworkFeeWarningOptions,
  PaginationButton,
  SoraNetwork,
  TokenTabs,
  HashType,
  ExplorerType,
  type ExplorerLink,
  MAX_ALERTS_NUMBER,
  syntheticAssetRegexp,
  kensetsuAssetRegexp,
} from '@/lib/soraneo-wallet/src/consts';

import type { Alert } from '@/lib/soraneo-wallet/src/types/common';

export const IndexerType = WalletIndexerEnum;
export const LogoSize = WalletLogoSizeEnum;
export const FontSizeRate = WalletFontSizeRateEnum;
export const FontWeightRate = WalletFontWeightRateEnum;
export const HiddenValue = WalletHiddenValue;

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

export const HundredNumber = 100;

export const DefaultSlippageTolerance = '0.5';

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

export enum Theme {
  Light = 'light',
  Dark = 'dark',
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
  /** Optional asset URL for menu items that use branded SVG artwork instead of an icon font glyph. */
  iconSrc?: string;
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

/** Sidebar icon names must stay aligned with the live polkaswap.io menu. */
export const SidebarIcon = {
  Swap: 'arrows-swap-90-24',
  Trade: 'music-CD-24',
  Polkamarkt: 'various-lightbulb-24',
  Rewards: 'basic-circle-star-24',
  Pool: 'basic-drop-24',
  Staking: 'basic-layers-24',
  Bridge: 'grid-block-distribute-vertically-24',
  Account: 'finance-wallet-24',
  Burn: 'basic-flame-24',
  Kensetsu: 'call-phone-16',
  Explore: 'various-items-24',
  Statistics: 'various-planet-24',
  AssetOwner: 'various-rocket-24',
  About: 'finance-PSWAP-24',
  Info: 'info-16',
} as const;

export const PolkamarktLogo = polkamarktLogoUrl;

const MainMenu: Array<SidebarMenuItemLink> = [
  {
    icon: SidebarIcon.Swap,
    title: PageNames.Swap,
    href: '#/swap',
  },
  {
    icon: SidebarIcon.Trade,
    title: PageNames.OrderBook,
    href: '#/trade',
  },
  {
    icon: SidebarIcon.Polkamarkt,
    iconSrc: PolkamarktLogo,
    title: PageNames.Polkamarkt,
    href: '#/polkamarkt',
  },
  {
    icon: SidebarIcon.Rewards,
    title: PageNames.Rewards,
    href: '#/points',
  },
  {
    icon: SidebarIcon.Pool,
    title: PoolPageNames.Pool,
    href: '#/pool',
  },
  {
    icon: SidebarIcon.Staking,
    title: PageNames.StakingContainer,
    href: '#/staking',
    index: StakingPageNames.Staking,
  },
  {
    icon: SidebarIcon.Bridge,
    title: PageNames.Bridge,
    href: '#/bridge',
  },
  {
    icon: SidebarIcon.Account,
    title: PageNames.Wallet,
    href: '#/wallet',
  },
  {
    icon: SidebarIcon.Burn,
    title: PageNames.Burn,
    href: '#/burn',
  },
  {
    icon: SidebarIcon.Kensetsu,
    title: VaultPageNames.VaultsContainer,
    href: '#/kensetsu',
    index: VaultPageNames.Vaults,
  },
];

const OtherPagesMenu: Array<SidebarMenuItemLink> = [
  {
    icon: SidebarIcon.Explore,
    title: PageNames.ExploreContainer,
    href: '#/explore',
    index: PageNames.ExploreTokens,
  },
  {
    icon: SidebarIcon.Statistics,
    title: PageNames.Stats,
    href: '#/stats',
  },
  {
    icon: SidebarIcon.AssetOwner,
    title: PageNames.AssetOwnerContainer,
    href: '#/dashboard/owner',
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

export const FaucetLink: SidebarMenuItemLink = {
  icon: 'software-terminal-24',
  title: 'faucet',
};

export const SidebarMenuGroups = [...MainMenu, ...OtherPagesMenu];

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
