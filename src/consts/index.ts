export enum PageNames {
  About = 'About',
  Exchange = 'Exchange',
  Swap = 'Swap',
  Pool = 'Pool',
  Stats = 'Stats',
  Support = 'Support',
  Wallet = 'Wallet',
  CreatePair = 'CreatePair'
}

export enum Components {
  SwapInfo = 'SwapInfo',
  SelectToken = 'SelectToken',
  TokenLogo = 'TokenLogo',
  DialogBase = 'DialogBase',
  ConfirmSwap = 'ConfirmSwap',
  TransactionSubmit = 'TransactionSubmit',
  ConfirmCreatePair = 'ConfirmCreatePair',
  CreatePairSubmit = 'CreatePairSubmit'
}

export const MainMenu = [
  PageNames.About,
  PageNames.Exchange,
  PageNames.Stats,
  PageNames.Support
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
  SMALL = 'small',
  MEDIUM = 'medium',
}
