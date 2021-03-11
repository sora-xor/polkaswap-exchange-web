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
  RemoveLiquidity = 'RemoveLiquidity'
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
  PageNames.Exchange,
  PageNames.About
  // PageNames.Stats,
  // PageNames.Support
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
