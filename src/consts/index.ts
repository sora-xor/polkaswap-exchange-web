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
  Rewards = 'Rewards'
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
  BrandedTooltip = 'BrandedTooltip'
}

// TODO: [Release 2] Some items are hidden because we don't have Stats and Support pages right now
export const MainMenu = [
  {
    icon: 'change-positions',
    title: PageNames.Swap
  },
  {
    icon: 'water',
    title: PageNames.Pool
  },
  {
    icon: '',
    title: PageNames.Bridge
  },
  {
    icon: '',
    title: PageNames.Farming
  },
  {
    icon: '',
    title: PageNames.Wallet
  },
  {
    icon: '',
    title: PageNames.Rewards
  },
  {
    icon: '',
    title: PageNames.About
  }
]

const SocialNetworkLinks = [
  {
    icon: '',
    title: 'Twitter',
    href: ''
  },
  {
    icon: '',
    title: 'Telegram',
    href: ''
  }
]

const SupportLinks = [
  {
    icon: '',
    title: 'Faucet',
    href: ''
  },
  {
    icon: '',
    title: 'Help',
    href: ''
  }
]

export const FooterMenuGroups = [SocialNetworkLinks, SupportLinks]

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
