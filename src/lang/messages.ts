import { en as walletEn } from '@soramitsu/soraneo-wallet-web';
import Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';

import { PageNames } from '../consts';
import { AlertFrequencyTabs, AlertTypeTabs } from '../types/tabs';

export default {
  // Wallet project keys
  ...walletEn,
  // {AppName} project keys
  appName: '{AppName}',
  moonpayText: 'MoonPay',
  changeNetworkText: 'Change network in wallet',
  accountText: 'account | accounts',
  newAccountsText: 'New accounts',
  transactionText: 'transaction | transactions',
  transactionSubmittedText: 'Transaction was submitted',
  unknownErrorText: 'ERROR Something went wrong...',
  unknownAssetText: 'Unknown asset',
  connectWalletText: 'Connect account',
  disconnectWalletText: 'Disconnect',
  editText: 'Edit',
  resetText: 'Reset',
  priceText: 'Price',
  priceChartText: 'Price chart',
  changeAccountText: 'Change account',
  connectedText: 'Connected',
  connectedAccount: 'Connected account',
  selectNodeConnected: 'Connected to: {chain}',
  connectWalletTextTooltip: 'Connect to {Sora} Network with {PolkadotJs}',
  selectNodeText: 'Select Network Node',
  bridgeText: 'Bridge',
  acceptText: 'Accept & Hide',
  continueText: 'Continue',
  acceptOnScrollText: 'Scroll to accept',
  comingSoonText: 'Coming Soon',
  releaseNotesText: 'Release notes',
  memorandum: '{AppName} Memorandum and Terms of Services',
  FAQ: '{AppName} FAQ',
  disclaimerTitle: 'Disclaimer',
  disclaimer:
    '{disclaimerPrefix} This website is maintained by the {Sora} community. Before continuing to use this website, please review the {polkaswapFaqLink} and documentation, which includes a detailed explanation on how {AppName} works, as well as the {memorandumLink}, and {privacyLink}. These documents are crucial to a secure and positive user experience. By using {AppName}, you acknowledge that you have read and understand these documents. You also acknowledge the following: 1) your sole responsibility for compliance with all laws that may apply to your particular use of {AppName} in your legal jurisdiction; 2) your understanding that the current version of {AppName} is an alpha version: it has not been fully tested, and some functions may not perform as designed; and 3) your understanding and voluntary acceptance of the risks involved in using {AppName}, including, but not limited to, the risk of losing tokens. Please do not continue without reading the {polkaswapFaqLink}, {memorandumLink}, {privacyLink}!',
  fiatDisclaimer:
    'Please note that the fiat values associated with cryptocurrencies on our website are provided by external services (Subquery, Subsquid, Ceres API)  are approximate. Given the inherent complexity of these calculations, absolute precision at all times cannot be guaranteed.',
  poweredBy: 'Powered by',
  confirmText: 'Confirm',
  confirmTransactionText: 'Confirm transaction',
  customisePageText: 'Customize page',
  signAndClaimText: 'Sign and claim',
  retryText: 'Retry',
  locationText: 'Location',
  networkFeeText: 'Network Fee',
  networkFeeTooltipText: "Network fee is used to ensure {Sora} system's growth and stable performance.",
  ethNetworkFeeTooltipText:
    'Please note that the {network} network fees displayed on {AppName} are only rough estimations, you can see the correct fee amount in your connected {network} wallet prior to confirming the transaction.',
  marketText: 'Market',
  marketAlgorithmText: 'Market algorithm',
  balanceText: 'Balance',
  insufficientBalanceText: 'Insufficient {tokenSymbol} balance',
  firstPerSecond: '{first} per {second}',
  pairIsNotCreated: "Token pair isn't created",
  nameText: 'Name',
  addressText: 'Address',
  forText: 'for',
  learnMoreText: 'Learn more',
  blockNumberText: 'Block number',
  transactionDetailsText: 'Transaction Details',
  noDataText: 'No data',
  noir: 'Noir',
  [Theme.LIGHT]: 'Light',
  [Theme.DARK]: 'Dark',
  pageTitle: {
    [PageNames.Swap]: 'Swap',
    [PageNames.Bridge]: '@:bridgeText',
  },
  mainMenu: {
    [PageNames.Swap]: 'Swap',
    [PageNames.Bridge]: '@:bridgeText',
  },
  alerts: {
    [AlertTypeTabs.Drop]: 'Drops below',
    [AlertTypeTabs.Raise]: 'Rises above',
    [AlertFrequencyTabs.Once]: 'Once',
    [AlertFrequencyTabs.Always]: 'Always',
    edit: 'Edit alert',
    delete: 'Delete alert',
    onDropDesc: '{token} drops below {price}',
    onRaiseDesc: '{token} rises above {price}',
    alertsTitle: 'Alerts',
    alertsCreateTitle: 'Set up price alert',
    alertsTooltip:
      'Price alerts are notifications that can be set by you to receive updates when the price of a particular token reaches certain point you set',
    createBtn: 'Create new price alert',
    finishBtn: 'Finish alert setup',
    enableSwitch: 'Enable asset deposit notifications',
    currentPrice: 'current price',
    alertTypeTitle: 'Alert type',
    typeTooltip:
      "Choose either 'drops below' or 'rises above' option to specify alert condition for tracking important price movements. These options allow you receive timely notifications when the value of your asset either falls below or rises above your designated threshold",
    alertFrequencyTitle: 'Alert frequency',
    frequencyTooltip:
      "Select between 'once' and 'always' to determine how often you receive notifications for the chosen alert type. 'Once' will send a single notification when the condition is met, while 'always' will continue to notify you each time the price threshold is crossed",
    noSupportMsg: "Notifications aren't supported by your browser",
  },
  headerMenu: {
    showBalances: 'Show Balances',
    hideBalances: 'Hide Balances',
    settings: 'Settings',
    switchTheme: '{theme} mode',
    systemPreferencesTheme: 'System preferences',
    selectCurrency: 'Select Currency',
    showDisclaimer: 'Show Disclaimer',
    hideDisclaimer: 'Hide Disclaimer',
    turnPhoneHideBalances: 'Turn phone & hide',
    titleBalance: 'Balances',
    titleCurrency: 'Fiat currency',
    titleMisc: 'Misc',
    titleTheme: 'Color theme',
  },
  social: {
    wiki: '{Sora} Wiki',
    twitter: 'Twitter',
    telegram: 'Telegram',
    medium: 'Medium',
    reddit: 'Reddit',
    github: 'GitHub',
  },
  footer: {
    internet: {
      action: 'Refresh {AppName}',
      desc: {
        disabled: 'Disconnected',
        stable: 'Optimal speed',
        unstable: 'Slow connection',
      },
      dialogDesc: '{AppName} requires internet connection for stable experience',
      dialogTitle: 'Connect to internet source',
      label: 'Your internet speed',
      title: {
        disabled: 'Internet disabled',
        stable: 'Internet stable',
        unstable: 'Internet unstable',
      },
    },
    node: {
      title: {
        connected: 'Node connected',
        disconnected: 'Node disconnected',
        loading: 'Node re-connecting',
      },
    },
    statistics: {
      action: 'Select services',
      desc: {
        available: 'All services are stable',
        loading: 'All services are loading',
        unavailable: 'All services are disconnected',
      },
      dialog: {
        indexer: 'Indexer',
        title: '{Sora} Network service selection',
        useCeres: 'Use {Ceres} for fiat values',
      },
      label: 'Statistics services',
      title: {
        available: 'Statistics available',
        loading: 'Statistics loading',
        unavailable: 'Statistics unavailable',
      },
    },
  },
  footerMenu: {
    faucet: 'Faucet',
    info: 'Info & Community',
    github: 'GitHub',
    sorawiki: '{Sora} Wiki',
    privacy: 'Privacy Policy',
  },
  helpDialog: {
    title: 'Help',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    appVersion: '{AppName} version',
    contactUs: 'Contact us',
  },
  currencyDialog: {
    currency: 'Currency',
    searchPlaceholder: 'Search by currency name or symbol',
  },
  node: {
    errors: {
      connection: 'An error occurred while connecting to the node\n{address}\n',
      network: 'The node\n{address}\n is from the another network\n',
      existing: 'This node is already added: {title}\n',
    },
    warnings: {
      disconnect: 'Connection to the node has been lost. Reconnecting...',
    },
    messages: {
      connected: 'Connection established with node\n{address}\n',
      selectNode: 'Please select node to connect from the node list',
    },
  },
  selectNodeDialog: {
    title: 'Network node selection',
    addNode: 'Add custom node',
    updateNode: 'Update node',
    customNode: 'Custom node',
    howToSetupOwnNode: 'Setup your node',
    select: 'Select',
    connected: 'Connected',
    nodeTitle: '{chain} hosted by {name}',
    messages: {
      emptyName: 'Please input the name of the node',
      emptyAddress: 'Please input the address of the node',
      incorrectProtocol: 'Address should starts from ws:// or wss://',
      incorrectAddress: 'Incorrect address',
    },
  },
  selectLanguageDialog: {
    title: 'Language',
  },
  buttons: {
    max: 'MAX',
    chooseToken: 'Choose token',
    chooseAToken: 'Choose a token',
    chooseTokens: 'Choose tokens',
    enterAmount: 'Enter amount',
  },
  transfers: {
    from: 'From',
    to: 'To',
  },
  exchange: {
    [PageNames.Swap]: 'Swap',
    lossWarning:
      "You are going to lose {value}% on your trade. We've detected a liquidity provision issue. This may lead to significant losses during token swaps. Please ensure there is adequate liquidity for your desired swap pair.",
  },
  swap: {
    slippageTolerance: 'Slippage Tolerance',
    minReceived: 'Minimum Received',
    maxSold: 'Maximum Sold',
    minReceivedTooltip:
      'Your transaction will revert if there is a large, unfavorable price movement before it is confirmed.',
    priceImpact: 'Price Impact',
    priceImpactTooltip: 'The difference between the market price and estimated price due to trade size.',
    liquidityProviderFee: 'Liquidity Provider Fee',
    liquidityProviderFeeTooltip:
      'A portion of each trade ({liquidityProviderFee}%) goes to liquidity providers as a protocol incentive.',
    insufficientAmount: 'Insufficient {tokenSymbol} amount',
    insufficientLiquidity: 'Insufficient liquidity',
    confirmSwap: 'Confirm swap',
    swapOutputMessage:
      'Output is estimated. You will receive at least {transactionValue} or the transaction will revert.',
    rewardsForSwap: 'PSWAP Strategic Rewards',
    route: 'Route',
    errorFetching: 'Error fetching the data',
  },
  pool: {
    connectToWallet: 'Connect an account to view your liquidity.',
    liquidityNotFound: 'No liquidity found.',
    addLiquidity: 'Add liquidity',
    removeLiquidity: 'Remove liquidity',
    createPair: 'Create a pair',
    pooledToken: '{tokenSymbol} Pooled',
    pairTokens: '{pair} Pool Tokens',
    poolShare: 'Your pool share',
    description:
      'When you add liquidity, you are given pool tokens representing your position. These tokens automatically earn fees proportional to your share of the pool, and can be redeemed at any time.',
    strategicBonusApy: 'Strategic Bonus APY',
  },
  bridge: {
    title: 'Bridge',
    info: 'Convert tokens between the {Sora} and {Ethereum} networks.',
    next: 'Next',
    connectWallets: 'Connect wallets to view respective transaction history.',
    soraNetworkFee: '{Sora} Network Fee',
    notRegisteredAsset: 'Asset {assetSymbol} is not registered',
    selectNetwork: 'Select network',
    networkInfo: 'Bridge {Sora} Network with:',
    limitMessage:
      "Currently, there's a {type} {amount} {symbol} for bridging to ensure the stability and security of the {Sora} Network. We appreciate your understanding.",
    externalTransferFee: '{network} {XCM} fee',
    externalTransferFeeTooltip:
      'When you send a bridge transaction to the {network} network, a minor fee is taken from the amount you are transferring',
    externalMinDeposit: '{network} min. deposit',
    externalMinDepositTooltip:
      'Minimum balance {symbol} that must be on your {network} account after the bridge transfer',
  },
  bridgeTransferNotification: {
    addToken: 'Add {symbol} to wallet',
    title: 'Bridge transaction successful',
  },
  selectRegisteredAsset: {
    title: 'Select a token',
    search: {
      placeholder: 'Filter by Asset ID, Name or Ticker Symbol',
      networkLabelSora: '{Sora} network tokens',
      networkLabelEthereum: '{network} network mirror tokens',
    },
  },
  bridgeTransaction: {
    title: 'Bridge Transaction',
    for: ' for ',
    statuses: {
      pending: 'Pending',
      failed: 'Transaction failed',
      done: 'Complete',
      waitingForConfirmation: 'Waiting for confirmation...',
    },
    blocksLeft: '{count} blocks left...',
    transactionHash: 'Transaction hash',
    networkInfo: {
      status: 'Status',
      date: 'Date',
      amount: 'Amount',
      transactionFee: 'Transaction Fee',
    },
    pending: '{network} transaction pending...',
    newTransaction: 'Create new transaction',
    allowToken: 'Allow {AppName} to use your {tokenSymbol}',
    approveToken:
      'Please note that it is only needed to approve the token once. If your extension has multiple token approval requests, make sure to only confirm the last one while rejecting the rest.',
  },
  bridgeHistory: {
    title: 'History',
    showHistory: 'Show history',
    clearHistory: 'Clear history',
    empty: 'Your transactions will appear here.',
    filterPlaceholder: 'Filter by Asset ID or Ticker Symbol',
    restoreHistory: 'Restore history',
    statusAction: 'Action Needed',
  },
  selectToken: {
    title: 'Select a token',
    searchPlaceholder: 'Filter by Asset ID, Name or Ticker Symbol',
    emptyListMessage: 'No results',
    assets: {
      title: 'Assets',
    },
    custom: {
      title: 'Custom',
      search: 'Input Asset ID',
      text: 'CUSTOM TOKENS',
      alreadyAttached: 'This token was already attached',
      notFound: 'Token not found',
    },
  },
  createPair: {
    deposit: 'Deposit',
    pricePool: 'Prices and fees',
    shareOfPool: 'Share of pool',
    firstSecondPoolTokens: '{first}-{second} Pool',
    supply: 'Supply',
    yourPosition: 'Your position',
    firstLiquidityProvider: 'You are the first liquidity provider',
    firstLiquidityProviderInfo:
      'The ratio of tokens you add will set the price of this pool.<br/>Once you are happy with the rate click supply to review.',
  },
  confirmSupply: {
    title: 'Your pool share will be',
    outputDescription:
      'Output is estimated. If the price changes more than {slippageTolerance}% your transaction will revert.',
  },
  addLiquidity: {
    title: 'Add liquidity',
  },
  removeLiquidity: {
    title: 'Remove liquidity',
    liquidity: 'liquidity',
    amount: 'Amount',
    input: 'Input',
    output: 'Output',
    remove: 'Remove',
    description:
      'Removing pool tokens converts your position back into underlying tokens at the current rate, proportional to your share of the pool. Accrued fees are included in the amounts you receive.',
    outputMessage:
      'Output is estimated. If the price changes more than {slippageTolerance}% your transaction will revert.',
    confirmTitle: 'You will receive',
    shareOfPool: 'Share of pool after transaction',
    locked: '{percent} of your pool is in {lock}',
  },
  tokens: {
    assetId: 'Asset ID',
  },
  explore: {
    showOnly: 'Show only {entities}',
    myPositions: 'my positions',
    synthetics: 'synthetic tokens',
  },
  dexSettings: {
    title: 'Settings',
    marketAlgorithm: '@.upper:marketAlgorithmText',
    marketAlgorithms: {
      SMART:
        '{smartAlgorithm} liquidity routing ensures the best price for any transaction by combining only the best price options from all available markets. When available, Token Bonding Curve ({tbcAlgorithm}) will be used for liquidity as long as the asset price is more affordable than from other sources, upon which the {xycAlgorithm} pool is utilized.',
      TBC: '{tbcAlgorithm} — buying only from the Token Bonding Curve (Primary Market). There is a possibility that the price can become unfavorable compared to the {xycAlgorithm} pool (Secondary Market), but the value received from the vested rewards might turn out to be much more favorable over time.',
      XYK: '{xycAlgorithm} — buying only from the XYK Pool (Secondary Market). Traditional XYK pool swap.',
    },
    marketAlgorithmTooltip: {
      main: ' - option to choose between Primary Market (TBC), Secondary Market (XYK) or a combined smart algorithm for guaranteed best price for any given transaction.',
    },
    slippageTolerance: 'SLIPPAGE TOLERANCE',
    slippageToleranceHint:
      'Your transaction will revert if the price changes unfavorably by more than this percentage.',
    slippageToleranceValidation: {
      warning: 'Your transaction may fail',
      frontrun: 'Your transaction may be frontrun',
      error: 'Enter a valid slippage percentage',
    },
  },
  provider: {
    messages: {
      checkExtension: '{name} extension is busy, please check it',
      extensionLogin: 'Please login to your {name} extension',
      installExtension:
        '{name} extension is not found. Please install it!\n\nAlready installed extension? Please reload the page',
      reloadPage: 'Reload page',
      notAvailable: '{name} is not available.',
    },
  },
  mobilePopup: {
    header: 'Download {Sora} Wallet with {polkaswapHighlight} features',
    sideMenu: 'Get {Sora} Wallet',
    info: 'Swap tokens from different networks - {Sora}, {Ethereum}, {Polkadot}, {Kusama}. Provide liquidity pool and earn % from exchange fees.',
  },
  browserNotificationDialog: {
    title: 'Set Notifications',
    info: 'We will send you only relevant updates about your wallet, for example: asset balance changes',
    button: 'Enable notifications',
    agree: 'Yes, I understand',
    notificationBlocked:
      "To receive the notifications about {AppName}, please, allow the notifications in your browser's native settings",
    pointer: 'Press “Allow” to turn notifications on',
    rotatetitle: 'Please, rotate your device',
    rotateMessage: 'The experience is only available in portrait mode',
  },
  assetDeposit: 'Asset balance has been deposited',
  ofText: '{first} of {second}',
  accountAddressText: 'Account address',
  tooltips: {
    roi: '{ROI} stands for Return on Investment. It is calculated by dividing the profit earned on an investment by the cost of that investment in a percentage equivalent.',
    tvl: '{TVL} stands for Total Value Locked. It represents tokens locked in the pools in the dollar equivalent.',
    volume:
      'Volume refers to the total amount of assets that have been traded or exchanged on the network over a specific period of time. The volume is an important metric for measuring the liquidity and overall activity of the network.',
    fees: 'Fees on the {Sora} blockchain refer to the charges that are incurred for executing transactions on the network. These fees are paid in XOR, the native cryptocurrency of the {Sora} Network. The fee amount is determined by the complexity and size of the transaction being executed',
    supply:
      'Token supply refers to the total number of tokens that have been created and are in circulation on the network. The token supply can fluctuate based on the amount of tokens being staked, burned, or transferred on the network.',
    transactions:
      'Transactions refer to the process of sending or receiving digital assets on the network, including liquidity operations, as well as swaps.',
    accounts:
      "Accounts are digital addresses that hold user's assets on the network. Each account is associated with a unique public address and a private key that allows the user to access and manage their assets.",
    bridgeTransactions:
      '{from} to {to} bridge refers to the process of transferring assets between the {from} and {to} networks using a bridge. The bridge allows for the interoperability of the two networks, enabling users to seamlessly move assets between them.',
    velocity:
      'Token velocity is the number of times token changes accounts during period (month) on average. It indicates the level of trading activity and liquidity.',
  },
  networkStatisticsText: 'Network statistics',
  browserNotificationLocalStorageOverride: {
    agree: 'Yes, I understand',
    info: 'Your local storage is overloaded, to continue work with {AppName} need to clean it',
    title: 'Clear local {AppName} storage',
  },
  browserPermission: {
    title: 'Allow camera access in browser settings',
    desc: "To ensure the authenticity of documents and validate user identity for KYC verification, access to your device's camera is required.",
    disclaimer: 'Camera access is required for real-time document capture to prevent fraud.',
    btnGoToSettings: 'Go to settings',
    btnAllow: 'Allow access',
  },
  minAmountText: 'min. amount',
  maxAmountText: 'max. amount',
  exceededAmountText: '{amount} exceeded',
  connectEthereumWalletText: 'Connect {Ethereum} wallet',
  collapseText: 'Collapse',
  calculatingText: 'Calculating',
  expandText: 'Expand',
  rotatePhoneNotification: {
    enableAcceleration: 'Enable acceleration access in your settings.',
    gyroscropePhone:
      " Our technology uses your phone's built-in gyroscope to instantly hide your balance when you tilt your device.",
    info: 'For extra privacy, tilt your device face down to instantly hide your asset balances. This feature uses your phone’s built-in sensors.',
    title: 'Turn your device upside down to hide balances',
  },
};
