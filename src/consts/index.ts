import pkg from '../../package.json'

export const app = {
  version: pkg.version,
  name: 'Polkaswap',
  email: 'polkaswap@soramitsu.co.jp'
}

export const ZeroStringValue = '0'

export enum PageNames {
  About = 'About',
  Exchange = 'Exchange',
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
  Settings = 'Settings',
  BrandedTooltip = 'BrandedTooltip',
  HelpDialog = 'HelpDialog',
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
    icon: 'change-positions',
    title: PageNames.Swap
  },
  {
    icon: '',
    title: PageNames.Pool
  },
  {
    icon: '',
    title: PageNames.Bridge
  },
  {
    icon: '',
    title: PageNames.Farming,
    disabled: true
  }
]

const AccountMenu: Array<SidebarMenuItem> = [
  {
    icon: '',
    title: PageNames.Wallet
  },
  {
    icon: '',
    title: PageNames.Rewards
  }
]

const OtherPagesMenu: Array<SidebarMenuItem> = [
  {
    icon: '',
    title: PageNames.About
  }
]

export const SocialNetworkLinks: Array<SidebarMenuItemLink> = [
  {
    icon: '',
    title: 'twitter',
    href: 'https://twitter.com/sora_xor'
  },
  {
    icon: '',
    title: 'telegram',
    href: 'https://t.me/sora_xor'
  }
]

export const FaucetLink: SidebarMenuItemLink = {
  icon: '',
  title: 'faucet'
}

export const SidebarMenuGroups = [
  MainMenu,
  AccountMenu,
  OtherPagesMenu
]

export const ExchangeTabs = [
  PageNames.Swap,
  PageNames.Pool
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
  { title: Topics.SwapTokens, icon: 'swap' },
  { title: Topics.PassiveEarning, icon: 'earn' },
  { title: Topics.AddLiquidity, icon: 'liquidity' },
  { title: Topics.PriceFeeds, icon: 'build' }
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
  receievByEthereumAssetAddress: 0, // TODO: estimate it later
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
    PSWAP: gasLimit.approve + gasLimit.sendERC20ToSidechain
  },
  // SORA -> ETH
  {
    XOR: gasLimit.mintTokensByPeers,
    VAL: gasLimit.mintTokensByPeers,
    PSWAP: gasLimit.receiveBySidechainAssetId // TODO: check it later
  }
]

export const MaxUint256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
