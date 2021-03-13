import pkg from '../../package.json'

export const AppVersion = pkg.version

export const AppName = 'Polkaswap'

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
  Bridge = 'Bridge',
  Farming = 'Farming',
  Rewards = 'Rewards',
  PageNotFound = 'PageNotFound'
}

// TODO: Add InfoLine component to the list of components
// InfoLine = 'InfoLine',
export enum Components {
  SwapInfo = 'SwapInfo',
  InfoCard = 'InfoCard',
  SelectToken = 'SelectToken',
  ResultDialog = 'ResultDialog',
  GenericHeader = 'GenericHeader',
  TokenLogo = 'TokenLogo',
  PairTokenLogo = 'PairTokenLogo',
  ConfirmSwap = 'ConfirmSwap',
  ConfirmRemoveLiquidity = 'ConfirmRemoveLiquidity',
  ConfirmTokenPairDialog = 'ConfirmTokenPairDialog',
  Settings = 'Settings',
  BrandedTooltip = 'BrandedTooltip',
  HelpDialog = 'HelpDialog',
  SidebarItemContent = 'SidebarItemContent'
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
  title: 'faucet',
  href: ''
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
}
