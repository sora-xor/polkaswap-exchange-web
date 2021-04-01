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
  changeAccountText: 'Change account',
  connectedText: 'Connected',
  connectWalletTextTooltip: 'Connect to @:soraText Network with polkadot{.js}',
  walletProviderConnectionError: '{provider} is not found. Please install it!',
  bridgeText: 'Bridge',
  comingSoonText: 'Coming Soon',
  poweredBy: 'Powered by',
  confirmText: 'Confirm',
  confirmTransactionText: 'Confirm transaction in {direction}',
  retryText: 'Retry',
  networkFeeText: 'Network Fee',
  networkFeeTooltipText: 'Network fee is used to ensure @:soraText system\'s growth and stable performance.',
  marketAlgorithmText: 'Market Algorithm',
  insufficientBalanceText: 'Insufficient {tokenSymbol} balance',
  assetNames: {
    [KnownSymbols.XOR]: 'SORA',
    [KnownSymbols.VAL]: 'SORA Validator Token',
    [KnownSymbols.PSWAP]: 'Polkaswap'
  },
  pageTitle: {
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
  aboutNetworkDialog: {
    title: 'About',
    learnMore: 'Learn more',
    network: {
      title: 'What is @:soraText?',
      description: 'Polkaswap is built on top of the @:soraText Network, and the @:soraText token (XOR) is used for gas/fees and liquidity provision on Polkaswap. @:soraText Network allows for reduced fees, faster transactions and simpler consensus finalization and is focused on delivering interoperability across other blockchain ecosystems like @:(ethereumText).'
    },
    polkadot: {
      title: 'What is polkadot{.js}?',
      description: 'Polkadot{.js} extension is a browser extension available for Firefox and Chrome dedicated to managing accounts for Substrate-based chains, including @:soraText, Polkadot and Kusama. You can add, import, and export accounts and sign transactions or extrinsics that you have initiated from websites you have authorized.'
    }
  },
  buttons: {
    max: 'MAX',
    chooseToken: 'Choose token',
    chooseTokens: 'Choose tokens',
    enterAmount: 'Enter amount'
  },
  transfers: {
    from: 'From',
    to: 'To'
  },
  operations: {
    [TransactionStatus.Finalized]: {
      [Operation.Transfer]: 'Sent {amount} {symbol} to {address}',
      [Operation.Swap]: 'Swapped {amount} {symbol} for {amount2} {symbol2}',
      [Operation.AddLiquidity]: 'Supplied {amount} {symbol} and {amount2} {symbol2}',
      [Operation.RemoveLiquidity]: 'Removed {amount} {symbol} and {amount2} {symbol2}',
      [Operation.CreatePair]: 'Supplied {amount} {symbol} and {amount2} {symbol2}',
      [Operation.RegisterAsset]: 'Registered {symbol} asset',
      [Operation.ClaimRewards]: 'Reward claimed successfully {rewards}'
    },
    [TransactionStatus.Error]: {
      [Operation.Transfer]: 'Failed to send {amount} {symbol} to {address}',
      [Operation.Swap]: 'Failed to swap {amount} {symbol} for {amount2} {symbol2}',
      [Operation.AddLiquidity]: 'Failed to supply {amount} {symbol} and {amount2} {symbol2}',
      [Operation.RemoveLiquidity]: 'Failed to remove {amount} {symbol} and {amount2} {symbol2}',
      [Operation.CreatePair]: 'Failed to supply {amount} {symbol} and {amount2} {symbol2}',
      [Operation.RegisterAsset]: 'Failed to register {symbol} asset',
      [Operation.ClaimRewards]: 'Failed to claim rewards {rewards}'
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
    polkaswapText: 'Polkaswap - decentralised token exchange for Polkadot ecosystem. Swap any token on @:soraText, add liquidity, create exchanges, earn through passive market making, build decentralized price feeds.',
    openExchange: 'Open exchange',
    mediumLink: 'Medium',
    githubLink: 'Github',
    [Topics.SwapTokens]: {
      title: 'Swap tokens on @:soraText network and other bridged networks',
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
    balance: 'Balance',
    insufficientBalance: '@:insufficientBalanceText',
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
    networkFee: '@:networkFeeText',
    networkFeeTooltip: '@:networkFeeTooltipText',
    insufficientAmount: 'Insufficient {tokenSymbol} amount',
    insufficientLiquidity: 'Insufficient liquidity for this trade',
    confirmSwap: 'Confirm swap',
    swapOutputMessage: 'Output is estimated. You will receive <span class="min-received-label">at least</span> {transactionValue} or the transaction will revert.'
  },
  pool: {
    connectWallet: '@:connectWalletText',
    connectToWallet: 'Connect to a wallet to add and view your liquidity.',
    liquidityNotFound: 'No liquidity found.',
    addLiquidity: 'Add liquidity',
    removeLiquidity: 'Remove liquidity',
    createPair: 'Create a pair',
    pooledToken: '{tokenSymbol} Pooled',
    pairTokens: '{pair} Pool Tokens',
    poolShare: 'Your pool share',
    unknownAsset: 'Unknown asset',
    description: 'When you add liquidity, you are given pool tokens representing your position. These tokens automatically earn fees proportional to your share of the pool, and can be redeemed at any time.'
  },
  bridge: {
    title: 'Hashi Bridge',
    info: 'Convert your tokens from the @:soraText network to the @:ethereumText network, and vice versa.',
    balance: 'Balance',
    connectWallet: '@:connectWalletText',
    connected: '@:connectedText',
    changeAccount: '@:changeAccountText',
    changeNetwork: '@:changeNetworkText',
    next: 'Next',
    connectWallets: 'Connect wallets to view respective transaction history.',
    soraNetworkFee: '@:soraText Network Fee',
    ethereumNetworkFee: '@:ethereumText Network Fee',
    tooltipValue: '@:comingSoonText',
    total: 'Total',
    viewHistory: 'View transactions history',
    transactionSubmitted: 'Transaction submitted',
    transactionMessage: '{assetA} for {assetB}',
    notRegisteredAsset: 'Asset {assetSymbol} is not registered'
  },
  selectRegisteredAsset: {
    title: 'Select a token',
    search: {
      title: 'Tokens',
      placeholder: 'Search Token Name, Symbol, or Address',
      networkLabelSora: '@:soraText network tokens',
      networkLabelEthereum: '@:ethereumText network mirror tokens',
      mirrorPrefix: 'Mirror ',
      emptyListMessage: 'No results'
    },
    customAsset: {
      title: 'Custom',
      customInfo: 'Important! Custom tokens must be registered in @:(soraText).',
      registerToken: 'Register token',
      addressPlaceholder: 'Asset ID',
      symbolPlaceholder: 'Token symbol',
      empty: 'No tokens found',
      alreadyAttached: 'Token was already attached'
    }
  },
  confirmBridgeTransactionDialog: {
    confirmTransaction: 'Confirm transaction',
    insufficientBalance: '@:insufficientBalanceText',
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
      failed: '{step} transactions failed. @:(retryText).',
      confirm: 'Confirm 2nd of 2 transactions...',
      complete: 'Complete',
      convertionComplete: 'Conversion complete'
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
    retry: '@:retryText',
    metamask: '@:metamask',
    confirm: '@:confirmTransactionText',
    newTransaction: 'Create new transaction',
    changeNetwork: '@:changeNetworkText',
    connectWallet: '@:connectWalletText'
  },
  // TODO: Add moment.js (it has translation and formatting)
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  bridgeHistory: {
    title: 'History',
    showHistory: 'Show history',
    clearHistory: 'Clear history',
    empty: 'Your transactions will appear here.',
    filterPlaceholder: 'Filter by address, asset'
  },
  selectToken: {
    title: 'Select a token',
    searchPlaceholder: 'Search Token Name, Symbol, or Address',
    emptyListMessage: 'No results',
    copy: 'Copy Asset ID',
    successCopy: '{symbol} Asset ID is copied to the clipboard'
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
    title: 'Transaction settings',
    marketAlgorithm: '@.upper:marketAlgorithmText',
    marketAlgorithmTooltip: {
      main: ' - option to choose between Primary Market (TBC), Secondary Market (XYK) or a combined smart algorithm for guaranteed best price for any given transaction.'
    },
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
  },
  rewards: {
    title: 'Claim Rewards',
    changeAccount: '@:changeAccountText',
    connected: '@:connectedText',
    networkFee: '@:networkFeeText',
    networkFeeTooltip: '@:networkFeeTooltipText',
    andText: 'and',
    claiming: {
      pending: 'Claiming...',
      success: 'Claimed successfully'
    },
    transactions: {
      confimation: 'Confirm {order} of {total} transactions...',
      success: 'Your will receive your rewards shortly',
      failed: '{order} of {total} transactions failed. @:retryText'
    },
    hint: {
      connectAccounts: 'To claim your PSWAP and VAL rewards you need to connect both your @:soraText and @:ethereumText accounts.',
      connectAnotherAccount: 'Connect another @:ethereumText account to check for available PSWAP and VAL rewards.',
      howToClaimRewards: 'To claim your PSWAP and VAL rewards you need to sign 2 transactions in your @:soraText and @:ethereumText accounts respectively. Rewards will be deposited to your @:soraText account.'
    },
    action: {
      connectWallet: '@:connectWalletText',
      connectExternalWallet: 'Connect @:ethereumText account',
      signAndClaim: 'Sign and claim',
      pendingInternal: '@:soraText transaction pending...',
      pendingExternal: '@:ethereumText transaction pending...',
      retry: '@:retryText',
      checkRewards: 'Check',
      insufficientBalance: '@:insufficientBalanceText'
    },
    notification: {
      empty: 'No available claims for this account'
    }
  }
}
