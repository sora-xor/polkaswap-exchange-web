import { PageNames, Topics } from '@/consts'
import { KnownSymbols } from '@sora-substrate/util'

export default {
  assetNames: {
    [KnownSymbols.XOR]: 'Sora',
    [KnownSymbols.DOT]: 'Polkadot',
    [KnownSymbols.KSM]: 'Kusama',
    [KnownSymbols.USD]: 'USD',
    [KnownSymbols.VAL]: 'Sora Validator Token',
    [KnownSymbols.PSWAP]: 'Polkaswap'
  },
  pageTitle: {
    [PageNames.Exchange]: 'Exchange',
    [PageNames.Swap]: 'Swap',
    [PageNames.Pool]: 'Pool',
    [PageNames.About]: 'About',
    [PageNames.Stats]: 'Stats',
    [PageNames.Support]: 'Support',
    [PageNames.Wallet]: 'Wallet',
    [PageNames.CreatePair]: 'Create Pair',
    [PageNames.AddLiquidity]: 'Add Liquidity',
    [PageNames.AddLiquidityId]: 'Add Liquidity',
    [PageNames.RemoveLiquidity]: 'Remove Liquidity'
  },
  mainMenu: {
    [PageNames.Exchange]: 'Exchange',
    [PageNames.About]: 'About',
    [PageNames.Stats]: 'Stats',
    [PageNames.Support]: 'Support',
    [PageNames.CreatePair]: 'Create Pair'
  },
  about: {
    polkaswapText: 'Polkaswap - decentralised token exchange for Polkadot ecosystem. Swap any token on SORA, add liquidity, create exchanges, earn through passive market making, build decentralized price feeds.',
    openExchange: 'Open exchange',
    mediumLink: 'Medium',
    githubLink: 'Github',
    [Topics.SwapTokens]: {
      title: 'Swap tokens on SORA network and other bridged networks',
      text: 'Use Polkaswap exchange or integrate into your project using the SDK'
    },
    [Topics.PassiveEarning]: {
      title: 'Earn through passive market making',
      text: 'Provide liquidity to earn 0.3% of all spread fees for adding market depth'
    },
    [Topics.AddLiquidity]: {
      title: 'Add liquidity for any project',
      text: 'Add liquidity or create new pairs'
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
    maxSold: 'Maximum Sold',
    minReceivedTooltip: 'Your transaction will revert if there is a large, unfavorable price movement before it is confirmed.',
    priceImpact: 'Price Impact',
    priceImpactTooltip: 'The difference between the market price and estimated price due to trade size.',
    liquidityProviderFee: 'Liquidity Provider Fee',
    liquidityProviderFeeTooltip: 'A portion of each trade ({liquidityProviderFee}%) goes to liquidity providers as a protocol incentive.',
    enterAmount: 'Enter an amount',
    insufficientBalance: 'Insufficient {tokenSymbol} balance',
    insufficientAmount: 'Insufficient {tokenSymbol} amount',
    confirmSwap: 'Confirm swap',
    swapOutputMessage: 'Output is estimated. You will receive at least {transactionValue} or the transaction will revert.',
    transactionMessage: '{tokenFromValue} for {tokenToValue}'
  },
  pool: {
    yourLiquidity: 'Your liquidity',
    connectToWallet: 'Connect to a wallet to view your liquidity.',
    liquidityNotFound: 'No liquidity found.',
    addLiquidity: 'Add liquidity',
    removeLiquidity: 'Remove liquidity',
    createPair: 'Create a pair',
    pooledToken: '{tokenSymbol} Pooled:',
    pairTokens: '{pair} Pool Tokens:',
    poolShare: 'Your pool share',
    description: 'When you add liquidity, you are given pool tokens representing your position. These tokens automaticaly earn fees proportional to your share of the pool, and can be redeemed at any time.'
  },
  selectToken: {
    title: 'Select a token',
    searchPlaceholder: 'Search Token Name, Symbol, or Address',
    emptyListMessage: 'No results'
  },
  createPair: {
    title: 'Create a pair',
    deposit: 'Deposit',
    balance: 'Balance',
    pricePool: 'Prices and pool share',
    shareOfPool: 'Share of pool',
    firstPerSecond: '{first} per {second}',
    firstSecondPoolTokens: '{first}-{second} Pool tokens',
    connect: 'Connect wallet',
    enterAmount: 'Enter an amount',
    supply: 'Supply',
    confirmSupply: 'Confirm supply',
    yourPosition: 'Your position',
    youWillReceive: 'You will receive',
    remove: 'remove',
    add: 'ADD',
    ok: 'OK',
    transactionMessage: '{firstToken} and {secondToken}',
    firstLiquidityProvider: 'You are the first liquidity provider',
    firstLiquidityProviderInfo: 'The ratio of tokens you add will set the price of this pool.<br/>Once you are happy with the rate click supply to review.'
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
  dexSettings: {
    title: 'Settings',
    slippageTolerance: 'SLIPPAGE TOLERANCE',
    slippageToleranceHint: 'Your transaction will revert if the price changes unfavorably by more than this percentage.',
    slippageToleranceValidation: {
      warning: 'Your transaction may fail',
      frontrun: 'Your transaction may be frontrun',
      error: 'Enter a valid slippage percentage'
    },
    custom: 'CUSTOM',
    transactionDeadline: 'TRANSACTION DEADLINE',
    transactionDeadlineHint: 'Transaction will be cancelled if it is pending for more than this long.',
    nodeAddress: 'NODE ADDRESS',
    ip: 'IP',
    port: 'PORT',
    min: 'MIN'
  },
  resultDialog: {
    title: 'Transaction submitted',
    ok: 'OK'
  }
}
