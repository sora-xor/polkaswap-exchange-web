import { PageNames, Topics } from '@/consts'

export default {
  mainMenu: {
    [PageNames.About]: 'About',
    [PageNames.Exchange]: 'Exchange',
    [PageNames.Stats]: 'Stats',
    [PageNames.Support]: 'Support'
  },
  about: {
    polkaswapText: 'Polkaswap — automated token exchange. Swap any token on SoraNet, add liquidity, create exchanges, earn through passive market making, build decentralized price feeds.',
    openExchange: 'Open exchange',
    mediumLink: 'Medium',
    githubLink: 'Github',
    fundedBy: 'Funded by',
    [Topics.SwapTokens]: {
      title: 'Swap any token on Ethereum',
      text: 'Use Polkaswap exchange or integrate into your project using the SDK'
    },
    [Topics.PassiveEarning]: {
      title: 'Earn through passive market making',
      text: 'Provide liquidity to earn 0.3% of all spread fees for adding market depth'
    },
    [Topics.AddLiquidity]: {
      title: 'Add liquidity for any project',
      text: 'Add liquidity or create an exchange for any ERC20 token'
    },
    [Topics.PriceFeeds]: {
      title: 'Build decentralized price feeds',
      text: 'Use Polkaswap exchange or integrate into your project using the SDK'
    }
  }
}
