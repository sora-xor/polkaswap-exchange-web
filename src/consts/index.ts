import pkg from '../../package.json'
import { KnownBridgeAsset } from '@/utils/web3-util'

export const app = {
  version: pkg.version,
  name: 'Polkaswap',
  email: 'polkaswap@soramitsu.co.jp'
}

export const Links = {
  about: {
    sora: 'https://sora.org/',
    polkadot: 'https://medium.com/polkadot-network/polkadot-js-extension-release-update-3b0d2d87edb8'
  }
}

export const ZeroStringValue = '0'

export const MetamaskCancellationCode = 4001

export const DefaultSlippageTolerance = 0.5

export enum MarketAlgorithms {
  SMART = 'SMART',
  TBC = 'TBC',
  XYK = 'XYK'
}

export const DefaultMarketAlgorithm = MarketAlgorithms.SMART

export enum PageNames {
  About = 'About',
  Swap = 'Swap',
  Pool = 'Pool',
  Stats = 'Stats',
  Support = 'Support',
  Wallet = 'Wallet',
  CreatePair = 'CreatePair',
  AddLiquidity = 'AddLiquidity',
  AddLiquidityId = 'AddLiquidityId',
  RemoveLiquidity = 'RemoveLiquidity',
  Farming = 'Farming',
  Rewards = 'Rewards',
  PageNotFound = 'PageNotFound',
  Bridge = 'Bridge',
  BridgeTransaction = 'BridgeTransaction',
  BridgeTransactionsHistory = 'BridgeTransactionsHistory'
}

export enum Components {
  GenericPageHeader = 'GenericPageHeader',
  SwapInfo = 'SwapInfo',
  InfoLine = 'InfoLine', // TODO: Check its usage
  InfoCard = 'InfoCard',
  SelectToken = 'SelectToken',
  ResultDialog = 'ResultDialog',
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
  BrandedTooltip = 'BrandedTooltip',
  HelpDialog = 'HelpDialog',
  AboutNetworkDialog = 'AboutNetworkDialog',
  SidebarItemContent = 'SidebarItemContent',
  SelectRegisteredAsset = 'SelectRegisteredAsset',
  ConfirmBridgeTransactionDialog = 'ConfirmBridgeTransactionDialog',
  BridgeTransaction = 'BridgeTransaction',
  BridgeTransactionsHistory = 'BridgeTransactionsHistory',
  ToggleTextButton = 'ToggleTextButton',
  GradientBox = 'Rewards/GradientBox',
  TokensRow = 'Rewards/TokensRow',
  RewardsAmountHeader = 'Rewards/AmountHeader',
  RewardsAmountTable = 'Rewards/AmountTable'
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
    title: PageNames.Swap
  },
  {
    icon: 'basic-drop-24',
    title: PageNames.Pool
  },
  {
    icon: 'grid-block-distribute-vertically-24',
    title: PageNames.Bridge
  }
  // PSS-570: Hide Farming until icon will be ready
  // {
  //   icon: '',
  //   title: PageNames.Farming,
  //   disabled: true
  // }
]

const AccountMenu: Array<SidebarMenuItem> = [
  {
    icon: 'finance-wallet-24',
    title: PageNames.Wallet
  },
  {
    icon: 'basic-circle-star-24',
    title: PageNames.Rewards
  }
]

const OtherPagesMenu: Array<SidebarMenuItem> = [
  {
    icon: 'file-file-text-24',
    title: PageNames.About
  }
]

export const SocialNetworkLinks: Array<SidebarMenuItemLink> = [
  {
    icon: 'symbols-twitter-24',
    title: 'twitter',
    href: 'https://twitter.com/polkaswap'
  },
  {
    icon: 'symbols-telegram-24',
    title: 'telegram',
    href: 'https://t.me/polkaswap'
  }
]

export const FaucetLink: SidebarMenuItemLink = {
  icon: 'software-terminal-24',
  title: 'faucet'
}

export const SidebarMenuGroups = [
  MainMenu,
  AccountMenu,
  OtherPagesMenu
]

export const BridgeChildPages = [
  PageNames.BridgeTransaction,
  PageNames.BridgeTransactionsHistory
]

export enum Topics {
  SwapTokens = 'SwapTokens',
  PassiveEarning = 'PassiveEarning',
  AddLiquidity = 'AddLiquidity',
  PriceFeeds = 'PriceFeeds'
}

export const AboutTopics = [
  { title: Topics.SwapTokens, icon: 'arrows-swap-24' },
  { title: Topics.PassiveEarning, icon: 'basic-bar-chart-24' },
  { title: Topics.AddLiquidity, icon: 'basic-drop-24' },
  { title: Topics.PriceFeeds, icon: 'software-terminal-24' }
]

export enum LogoSize {
  MINI = 'mini',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

export enum InfoTooltipPosition {
  LEFT = 'left',
  RIGHT = 'right'
}

export enum NetworkTypes {
  Devnet = 'Devnet',
  Testnet = 'Testnet',
  Mainnet = 'Mainnet'
}

export const EthSymbol = 'ETH'

const gasLimit = {
  approve: 66000 * 2,
  sendERC20ToSidechain: 81000 * 2,
  mintTokensByPeers: 191285 * 2,
  receiveByEthereumAssetAddress: 253979 * 2,
  receiveBySidechainAssetId: 252659 * 2
}
/**
 * It's in gwei.
 * Zero index means ETH -> SORA
 * First index means SORA -> ETH
 */
export const EthereumGasLimits = [
  // ETH -> SORA
  {
    XOR: gasLimit.approve + gasLimit.sendERC20ToSidechain,
    VAL: gasLimit.approve + gasLimit.sendERC20ToSidechain,
    PSWAP: gasLimit.approve + gasLimit.sendERC20ToSidechain,
    [KnownBridgeAsset.Other]: gasLimit.approve + gasLimit.sendERC20ToSidechain
  },
  // SORA -> ETH
  {
    XOR: gasLimit.mintTokensByPeers,
    VAL: gasLimit.mintTokensByPeers,
    PSWAP: gasLimit.receiveBySidechainAssetId,
    [KnownBridgeAsset.Other]: gasLimit.receiveByEthereumAssetAddress
  }
]

export const MaxUint256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
