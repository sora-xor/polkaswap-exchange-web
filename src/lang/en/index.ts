import { KnownSymbols, Operation, TransactionStatus } from '@sora-substrate/util'

import { PageNames, Topics, NetworkTypes } from '@/consts'
import { EthNetwork } from '@/utils/web3-util'

export default {
  appName: 'Polkaswap',
  soraText: 'SORA',
  ethereumText: 'Ethereum',
  changeNetworkText: 'Change network in Metamask',
  transactionSubmittedText: 'Transaction was submitted',
  unknownErrorText: 'ERROR Something went wrong...',
  connectWalletText: 'Connect account',
  connectWalletTextTooltip: 'Connect to SORA Network with polkadot{.js}',
  bridgeText: 'Bridge',
  comingSoonText: 'Coming Soon',
  poweredBy: 'Powered by',
  confirmText: 'Confirm',
  confirmTransactionText: 'Confirm transaction in {direction}',
  assetNames: {
    [KnownSymbols.XOR]: 'Sora',
    [KnownSymbols.VAL]: 'Sora Validator Token',
    [KnownSymbols.PSWAP]: 'Polkaswap'
  },
  pageTitle: {
    [PageNames.Exchange]: 'Exchange',
    [PageNames.Swap]: 'Swap',
    [PageNames.Pool]: 'Pool',
    [PageNames.Bridge]: '@:bridgeText',
    [PageNames.About]: 'About',
    [PageNames.Stats]: 'Stats',
    [PageNames.Support]: 'Support',
    [PageNames.Wallet]: 'Wallet',
    [PageNames.CreatePair]: 'Create Pair',
    [PageNames.AddLiquidity]: 'Add Liquidity',
    [PageNames.AddLiquidityId]: 'Add Liquidity',
    [PageNames.RemoveLiquidity]: 'Remove Liquidity',
    [PageNames.PageNotFound]: 'Page Not Found'
  },
  mainMenu: {
    [PageNames.Swap]: 'Swap',
    [PageNames.Pool]: 'Pool',
    [PageNames.Bridge]: '@:bridgeText',
    [PageNames.Farming]: 'Farming',
    [PageNames.Wallet]: 'Account',
    [PageNames.Rewards]: 'Rewards',
    [PageNames.Exchange]: 'Exchange',
    [PageNames.About]: 'About',
    [PageNames.Stats]: 'Stats',
    [PageNames.Support]: 'Support',
    [PageNames.CreatePair]: 'Create Pair'
  },
  social: {
    twitter: 'Twitter',
    telegram: 'Telegram'
  },
  footerMenu: {
    faucet: 'Faucet',
    help: 'Help'
  },
  helpDialog: {
    title: 'Help',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    termsOfServiceLink: 'https://sora.org',
    privacyPolicyLink: 'https://soramitsu.co.jp',
    appVersion: '@:appName version',
    contactUs: 'Contact us'
  },
  operations: {
    [TransactionStatus.Finalized]: {
      [Operation.Transfer]: 'Sent {amount} {symbol} to {address}',
      [Operation.Swap]: 'Swapped {amount} {symbol} for {amount2} {symbol2}',
      [Operation.AddLiquidity]: 'Supplied {amount} {symbol} and {amount2} {symbol2}',
      [Operation.RemoveLiquidity]: 'Removed {amount} {symbol} and {amount2} {symbol2}',
      [Operation.CreatePair]: 'Supplied {amount} {symbol} and {amount2} {symbol2}'
    },
    [TransactionStatus.Error]: {
      [Operation.Transfer]: 'Failed to send {amount} {symbol} to {address}',
      [Operation.Swap]: 'Failed to swap {amount} {symbol} for {amount2} {symbol2}',
      [Operation.AddLiquidity]: 'Failed to supply {amount} {symbol} and {amount2} {symbol2}',
      [Operation.RemoveLiquidity]: 'Failed to remove {amount} {symbol} and {amount2} {symbol2}',
      [Operation.CreatePair]: 'Failed to supply {amount} {symbol} and {amount2} {symbol2}'
    }
  },
  pageNotFound: {
    title: 'Page not found',
    body: '404'
  },
  metamask: 'Metamask',
  sora: {
    [NetworkTypes.Devnet]: 'SORA Devnet',
    [NetworkTypes.Testnet]: 'SORA Testnet',
    [NetworkTypes.Mainnet]: 'SORA Mainnet'
  },
  ethereum: {
    [EthNetwork.Mainnet]: 'Ethereum Mainnet',
    [EthNetwork.Ropsten]: 'Ethereum Ropsten',
    [EthNetwork.Rinkeby]: 'Ethereum Rinkeby',
    [EthNetwork.Kovan]: 'Ethereum Kovan',
    [EthNetwork.Goerli]: 'Ethereum Goerli'
  },
  providers: {
    metamask: '@:metamask'
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
    chooseToken: 'Choose token',
    chooseTokens: 'Choose tokens',
    enterAmount: 'Enter amount',
    insufficientBalance: 'Insufficient {tokenSymbol} balance',
    price: 'Price',
    transactionSubmitted: 'Transaction submitted',
    transactionMessage: '{firstToken} and {secondToken}',
    confirm: 'Confirm',
    ok: 'OK'
  },
  swap: {
    connectWallet: '@:connectWalletText',
    estimated: 'estimated',
    slippageTolerance: 'Slippage Tolerance',
    minReceived: 'Minimum Received',
    maxSold: 'Maximum Sold',
    minReceivedTooltip: 'Your transaction will revert if there is a large, unfavorable price movement before it is confirmed.',
    priceImpact: 'Price Impact',
    priceImpactTooltip: 'The difference between the market price and estimated price due to trade size.',
    liquidityProviderFee: 'Liquidity Provider Fee',
    liquidityProviderFeeTooltip: 'A portion of each trade ({liquidityProviderFee}%) goes to liquidity providers as a protocol incentive.',
    networkFee: 'Network Fee',
    networkFeeTooltip: 'Network fee is used to ensure SORA system\'s growth and stable performance.',
    insufficientAmount: 'Insufficient {tokenSymbol} amount',
    insufficientLiquidity: 'Insufficient liquidity for this trade',
    confirmSwap: 'Confirm swap',
    swapOutputMessage: 'Output is estimated. You will receive <span class="min-received-label">at least</span> {transactionValue} or the transaction will revert.'
  },
  pool: {
    connectWallet: '@:connectWalletText',
    yourLiquidity: 'Your liquidity',
    connectToWallet: 'Connect to a wallet to add and view your liquidity.',
    liquidityNotFound: 'No liquidity found.',
    addLiquidity: 'Add liquidity',
    removeLiquidity: 'Remove liquidity',
    createPair: 'Create a pair',
    pooledToken: '{tokenSymbol} Pooled',
    pairTokens: '{pair} Pool Tokens',
    poolShare: 'Your pool share',
    comingSoon: '@:comingSoon',
    unknownAsset: 'Unknown asset',
    description: 'When you add liquidity, you are given pool tokens representing your position. These tokens automaticaly earn fees proportional to your share of the pool, and can be redeemed at any time.'
  },
  bridge: {
    title: 'Hashi Bridge',
    info: 'Convert your tokens from SORA Network to Ethereum Network and viceversa.',
    from: 'From',
    to: 'To',
    balance: 'Balance',
    chooseToken: 'Choose token',
    max: 'MAX',
    connectWallet: 'Connect wallet',
    connected: 'Connected',
    changeWallet: 'Change wallet',
    changeNetwork: '@:changeNetworkText',
    next: 'Next',
    enterAnAmount: 'Enter an amount',
    connectWallets: 'Connect wallets to view respective transaction history.',
    soraNetworkFee: 'Sora Network Fee',
    ethereumNetworkFee: 'Ethereum Network Fee',
    tooltipValue: '@:comingSoonText',
    total: 'Total',
    viewHistory: 'View transactions history',
    transactionSubmitted: 'Transaction submitted',
    transactionMessage: '{assetA} for {assetB}',
    notRegisteredAsset: 'Asset {assetSymbol} is not registered',
    walletProviderConnectionError: '{provider} is not found. Please install it!'
  },
  selectRegisteredAsset: {
    title: 'Select a token',
    search: {
      title: 'Tokens',
      placeholder: 'Search Token Name, Symbol, or Address',
      networkLabelSora: 'SORA network tokens',
      networkLabelEthereum: 'Ethereum network mirror tokens',
      mirrorPrefix: 'Mirror ',
      emptyListMessage: 'No results'
    },
    customAsset: {
      title: 'Custom',
      customInfo: 'Important! Custom tokens must be registered in SORA.',
      registerToken: 'Register token',
      addressPlaceholder: 'Asset ID',
      symbolPlaceholder: 'Token symbol',
      empty: 'No tokens found',
      alreadyAttached: 'Token was already attached'
    }
  },
  confirmBridgeTransactionDialog: {
    confirmTransaction: 'Confirm transaction',
    insufficientBalance: 'Insufficient {assetSymbol} balance',
    changeNetwork: '@:changeNetworkText',
    metamask: '@:metamask',
    sora: '@:soraText',
    confirm: '@:confirmTransactionText',
    buttonConfirm: '@:confirmText'
  },
  bridgeTransaction: {
    viewHistory: 'View transaction in transactions history',
    details: '{from} for {to}',
    steps: {
      step: '{step} of 2',
      step1: '1st',
      step2: '2nd'
    },
    status: {
      pending: '{step} transactions pending...',
      failed: '{step} transactions failed. Retry.',
      confirm: 'Confirm 2nd of 2 transactions...',
      complete: 'Complete',
      convertionComplete: 'Convertion complete'
    },
    statuses: {
      waiting: 'Waiting',
      ready: 'Ready',
      pending: 'Pending',
      frozen: 'Frozen',
      failed: 'Transaction failed',
      done: 'Complete',
      waitingForConfirmation: 'Waiting for confirmation...'
    },
    viewInEtherscan: 'View in Etherscan',
    networkTitle: '{network} transaction',
    transactionHash: 'Transaction hash',
    networkInfo: {
      status: 'Status',
      date: 'Date',
      amount: 'Amount',
      transactionFee: 'Transaction Fee',
      total: 'Total'
    },
    successCopy: 'Transaction hash is copied to the clipboard',
    ethereum: '@:ethereumText',
    sora: '@:soraText',
    pending: '<span class="network-title">{network}</span> transaction pending...',
    retry: 'Retry',
    metamask: '@:metamask',
    confirm: '@:confirmTransactionText',
    newTransaction: 'Create new transaction',
    changeNetwork: '@:changeNetworkText'
  },
  // TODO: Add moment.js (it has translation and formatting)
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  bridgeHistory: {
    title: 'History',
    clearHistory: 'Clear history',
    emptyHistory: 'Transactions\' history is empty.',
    filterPlaceholder: 'Filter by address, asset'
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
    supply: 'Supply',
    yourPosition: 'Your position',
    yourPositionEstimated: 'Your position (estimated)',
    youWillReceive: 'You will receive',
    remove: 'remove',
    add: 'ADD',
    ok: 'OK',
    networkFee: 'Network fee',
    alreadyCreated: 'Token pair is already created',
    firstLiquidityProvider: 'You are the first liquidity provider',
    firstLiquidityProviderInfo: 'The ratio of tokens you add will set the price of this pool.<br/>Once you are happy with the rate click supply to review.'
  },
  confirmSupply: {
    title: 'You will receive',
    outputDescription: 'Output is estimated. If the price changes more than {slippageTolerance}% your transaction will revert.',
    poolTokensBurned: '{first}-{second} Pool Tokens Burned',
    price: 'Price'
  },
  addLiquidity: {
    title: 'Add liquidity',
    pairIsNotCreated: 'Token pair isn\'t created'
  },
  removeLiquidity: {
    title: 'Remove liquidity',
    liquidity: 'liquidity',
    balance: 'Balance',
    amount: 'Amount',
    input: 'Input',
    output: 'Output',
    price: 'Price',
    remove: 'Remove',
    description: 'Removing pool tokens converts your position back into underlying tokens at the current rate, proportional to your share of the pool. Accrued fees are included in the amounts you receive.',
    outputMessage: 'Output is estimated. If the price changes more than {slippageTolerance}% your transaction will revert.',
    confirmTitle: 'You will receive'
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
