import { PageNames, Topics } from '@/consts'

export default {
  pageTitle: {
    [PageNames.About]: 'About',
    [PageNames.Exchange]: 'Exchange',
    [PageNames.Swap]: 'Swap',
    [PageNames.Pool]: 'Pool',
    [PageNames.Stats]: 'Stats',
    [PageNames.Support]: 'Support',
    [PageNames.Wallet]: 'Wallet',
    [PageNames.CreatePair]: 'Create Pair'
  },
  mainMenu: {
    [PageNames.About]: 'About',
    [PageNames.Exchange]: 'Exchange',
    [PageNames.Stats]: 'Stats',
    [PageNames.Support]: 'Support',
    [PageNames.CreatePair]: 'Create Pair'
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
  },
  exchange: {
    [PageNames.Swap]: 'Swap',
    [PageNames.Pool]: 'Pool',
    from: 'From',
    to: 'To',
    balance: 'Balance',
    max: 'MAX',
    price: 'Price',
    transactionSubmitted: 'Transaction submitted',
    ok: 'OK'
  },
  swap: {
    chooseToken: 'Choose token',
    chooseTokens: 'Choose tokens',
    connectWallet: 'Connect wallet',
    estimated: 'estimated',
    slippageTolerance: 'Slippage Tolerance',
    minReceived: 'Minimum Received',
    minReceivedTooltip: 'Your transaction will revert if there is a large, unfavorable price movement before it is confirmed.',
    priceImpact: 'Price Impact',
    priceImpactTooltip: 'The difference between the market price and estimated price due to trade size.',
    liquidityProviderFee: 'Liquidity Provider Fee',
    liquidityProviderFeeTooltip: 'A portion of each trade ({liquidityProviderFee}%) goes to liquidity providers as a protocol incentive.',
    enterAmount: 'Enter an amount',
    insufficientBalance: 'Insufficient {tokenSymbol} balance',
    confirmSwap: 'Confirm Swap',
    swapOutputMessage: 'Output is estimated. You will receive at least {transactionValue} or the transaction will revert.',
    transactionMessage: '{tokenFromValue} for {tokenToValue}'
  },
  pool: {
    yourLiquidity: 'Your liquidity',
    yourLiquidityTooltip: 'When you add liquidity, you are awarded with token pair specific Pool Tokens that represent your pool share.',
    connectToWallet: 'Connect to a wallet to view your liquidity.',
    liquidityNotFound: 'No liquidity found.',
    addLiquidity: 'Add Liquidity',
    removeLiquidity: 'Remove liquidity',
    createPair: 'Create a pair',
    pooledToken: '{tokenSymbol} Pooled:',
    pairTokens: '{pair} Pool Tokens:',
    poolShare: 'Your pool share'
  },
  selectToken: {
    title: 'Select a token',
    searchPlaceholder: 'Search Token Name, Symbol, or Address',
    emptyListMessage: 'Nothing found'
  },
  createPair: {
    title: 'Create a pair',
    deposit: 'Deposit',
    balance: 'Balance',
    pricePool: 'Prices and pool share',
    shareOfPool: 'Share of pool',
    firstPerSecond: '{first} per {second}',
    firstSecondPoolTokens: '{first}-{second} Pool tokens:',
    connect: 'Connect wallet',
    enterAmount: 'Enter an amount',
    supply: 'Supply',
    confirmSupply: 'Confirm supply',
    yourPosition: 'Your position',
    youWillReceive: 'You will receive',
    remove: 'remove',
    ok: 'OK',
    description: 'When you add liquidity, you are awarded with token pair specific PSWAP tokens that represent your pool share.'
  },
  confirmSupply: {
    title: 'You will receive',
    outputDescription: 'Output is estimated. If the price changes more than 0.5% your transaction will revert.',
    poolTokensBurned: '{first}-{second} Pool Tokens Burned:',
    price: 'Price:',
    confirm: 'Confirm'
  },
  addLiquidity: {
    title: 'Add liquidity'
  },
  removeLiquidity: {
    title: 'Remove liquidity',
    balance: 'Balance',
    amount: 'Amount',
    input: 'Input',
    output: 'Output',
    price: 'Price:',
    remove: 'Remove',
    enterAmount: 'Enter an amount',
    description: 'Removing pool tokens converts your position back into underlying tokens at the current rate, proportional to your share of the pool. Accrued fees are included in the amounts you receive.',
    outputMessage: 'Output is estimated. If the price changes more than 0.5% your transaction will revert.',
    confirmTitle: 'You will receive',
    confirm: 'Confirm'
  },
  settings: {
    title: 'Settings',
    slippageTolerance: 'SLIPPAGE TOLERANCE',
    slippageToleranceHint: 'Your transaction will revert if the price changes unfavorably by more than this percentage.',
    custom: 'CUSTOM',
    transactionDeadline: 'TRANSACTION DEADLINE',
    transactionDeadlineHint: 'TODO',
    nodeAddress: 'NODE ADDRESS',
    nodeAddressHint: 'TODO',
    ip: 'IP',
    port: 'PORT',
    min: 'MIN'
  }
}
