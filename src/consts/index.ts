export enum PageNames {
  About = 'About',
  Exchange = 'Exchange',
  Stats = 'Stats',
  Support = 'Support',
  CreatePair = 'CreatePair'
}

export const MainMenu = [
  PageNames.About,
  PageNames.Exchange,
  PageNames.Stats,
  PageNames.Support
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
