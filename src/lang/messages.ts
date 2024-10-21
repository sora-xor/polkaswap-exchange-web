import { RewardingEvents } from '@sora-substrate/sdk/build/rewards/consts';
import { en as walletEn } from '@soramitsu/soraneo-wallet-web';
import Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';

import { MoonpayNotifications } from '../components/pages/Moonpay/consts';
import { PageNames, RewardsTabsItems } from '../consts';
import { DashboardPageNames } from '../modules/dashboard/consts';
import { PoolPageNames } from '../modules/pool/consts';
import { StakingPageNames } from '../modules/staking/consts';
import { ValidatorsFilterType, ValidatorsListMode } from '../modules/staking/sora/consts';
import { VaultPageNames } from '../modules/vault/consts';
import { AlertFrequencyTabs, AlertTypeTabs } from '../types/tabs';

export default {
  // Wallet project keys
  ...walletEn,
  // {AppName} project keys
  appName: '{AppName}',
  hashiBridgeText: '{Hashi} bridge',
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
    [PoolPageNames.Pool]: 'Pool',
    [PageNames.Bridge]: '@:bridgeText',
    [PageNames.Stats]: 'Statistics',
    [PageNames.Wallet]: 'Wallet',
    [PageNames.AddLiquidity]: 'Add Liquidity',
    [PageNames.Rewards]: 'Rewards',
    [PageNames.ExploreTokens]: 'Tokens',
    [PageNames.ExplorePools]: 'Pools',
    [PageNames.ExploreStaking]: 'Staking',
    [PageNames.ExploreFarming]: 'Farming',
    [PageNames.ExploreBooks]: '@:pageTitle.OrderBook',
    [PageNames.OrderBook]: 'Trade',
    [StakingPageNames.Staking]: 'Staking',
    [DashboardPageNames.AssetOwner]: 'Asset owner',
    [DashboardPageNames.AssetOwnerDetails]: '@:pageTitle.AssetOwner',
    [VaultPageNames.Vaults]: '{Kensetsu}',
    [VaultPageNames.VaultDetails]: 'Position Details',
  },
  mainMenu: {
    [PageNames.Swap]: 'Swap',
    [PoolPageNames.Pool]: 'Pool',
    [PageNames.Bridge]: '@:bridgeText',
    [PageNames.Farming]: 'Farming',
    [PageNames.Wallet]: 'Account',
    [PageNames.Rewards]: 'Rewards',
    About: 'About',
    Burn: '@:pageTitle.Burn',
    [PageNames.Stats]: 'Statistics',
    [PageNames.OrderBook]: 'Trade',
    [PageNames.ExploreContainer]: 'Explore',
    [PageNames.StakingContainer]: 'Staking',
    [PageNames.SoraCard]: '{Sora} Card',
    [PageNames.AssetOwnerContainer]: '@:pageTitle.AssetOwner',
    [VaultPageNames.VaultsContainer]: '@:pageTitle.Vaults',
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
  fiatPayment: {
    historyBtn: 'My purchases',
    historyTitle: 'Transaction History',
    moonpayTitle: 'Buy ETH via MoonPay',
    moonpayDesc: 'Purchase ETH tokens on {Ethereum} and transfer them to {Sora} network via the bridge',
    cedeStoreTitle: 'Transfer from {value}',
    cedeStoreDesc: 'Transfer any tokens from {value1} to {value2} via {value3}',
    cedeStoreBtn: 'Transfer from {value1} via {value2}',
    errorMessage: "Apologies for the inconvenience. We're working diligently to resolve this. Please, try again later.",
  },
  headerMenu: {
    showBalances: 'Show Balances',
    hideBalances: 'Hide Balances',
    settings: 'Settings',
    switchTheme: '{theme} mode',
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
    [PoolPageNames.Pool]: 'Pool',
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
  rewards: {
    [RewardsTabsItems.PointSystem]: 'Points',
    [RewardsTabsItems.Rewards]: 'Rewards',
    [RewardsTabsItems.ReferralProgram]: 'Referrals',
    andText: 'and',
    forText: 'for',
    totalVested: 'Total rewards',
    claimableAmountDoneVesting: 'Claimable rewards',
    claiming: {
      pending: 'Claiming...',
      success: 'Claimed successfully',
    },
    transactions: {
      confimation: 'Confirm {order} of {total} transactions...',
      success: 'You will receive your rewards shortly',
      failed: '{order} of {total} transactions failed. @:retryText',
    },
    signing: {
      extension: '{PolkadotJs} browser extension',
      accounts: 'your {Sora} and {Ethereum} accounts respectively',
    },
    hint: {
      connectExternalAccount: 'Connect an {Ethereum} account to check for available PSWAP and VAL rewards.',
      connectAccounts:
        'To claim your PSWAP and VAL rewards you need to connect both your {Sora} and {Ethereum} accounts.',
      connectAnotherAccount: 'Connect another {Ethereum} account to check for available PSWAP and VAL rewards.',
      howToClaimRewards:
        'To claim your {symbols} rewards you need to sign {count} {transactions} in {destination}. Rewards will be deposited to your {Sora} account.',
    },
    action: {
      connectExternalWallet: 'Connect {Ethereum} account',
      signAndClaim: 'Sign and claim',
      pendingInternal: '{Sora} transaction pending...',
      pendingExternal: '{Ethereum} transaction pending...',
      checkRewards: 'Check',
    },
    notification: {
      empty: 'No available claims for this account',
    },
    events: {
      [RewardingEvents.XorErc20]: 'XOR ERC-20',
      [RewardingEvents.SoraFarmHarvest]: '{Sora}.farm harvest',
      [RewardingEvents.NftAirdrop]: 'NFT Airdrop',
      [RewardingEvents.LiquidityProvision]: 'Fees gained from liquidity provision',
      [RewardingEvents.BuyOnBondingCurve]: 'buying from the TBC',
      [RewardingEvents.MarketMakerVolume]: 'Market Making',
      [RewardingEvents.LiquidityProvisionFarming]: 'Farming',
    },
    groups: {
      strategic: 'Strategic Rewards',
      external: 'Rewards for the connected {Ethereum} account',
      crowdloan: 'Crowdloan rewards',
    },
  },
  moonpay: {
    notifications: {
      [MoonpayNotifications.Success]: {
        title: 'Tokens purchased',
        text: 'Token purchase is finished. The {Hashi} bridge transaction will start automatically as soon as the tokens have been received in the connected {Ethereum} account. It is safe to close this window and continue using {AppName}. There will be a notification about the bridge transaction when ready.',
      },
      [MoonpayNotifications.SupportError]: {
        title: 'Token not supported',
        text: 'Unfortunately the token purchased via @:moonpayText is not yet supported by the {Hashi} bridge in {AppName}. Normally only the supported tokens should be available for purchase via MoonPay in {AppName}, hence something must have gone wrong somewhere. Please don’t hesitate to let the community know about this case in the <a class="link" href="https://t.me/polkaswap" target="_blank" rel="nofollow noopener" title="{AppName}">{AppName} Telegram group</a>.',
      },
      [MoonpayNotifications.FeeError]: {
        title: 'Not enough ETH for the bridge tx',
        text: 'Unfortunately the {Hashi} bridge transaction has failed due to there not being enough ETH to pay for the {Ethereum} network transation fees. Please add more ETH and try again.',
      },
      [MoonpayNotifications.TransactionError]: {
        title: 'Transaction has failed',
        text: 'Unfortunately it appears that the @:moonpayText transaction has failed. Please try again. For @:moonpayText support go to <a class="link" href="https://support.moonpay.com" target="_blank" rel="nofollow noopener" title="@:moonpayText">https://support.moonpay.com</a>',
      },
      [MoonpayNotifications.AmountError]: {
        title: 'Insufficient balance',
        text: 'Unfortunately the {Hashi} bridge transaction has failed due to there not being enough tokens for transaction. Please check your {Ethereum} account balance and try again.',
      },
      [MoonpayNotifications.AccountAddressError]: {
        title: 'Wrong {Ethereum} account',
        text: 'Unfortunately, the {Hashi} bridge transaction failed due to the recipient address of the tokens in the @:moonpayText order does not match your current {Ethereum} account address. Please switch {Ethereum} account in extension and try again.',
      },
    },
    buttons: {
      buy: 'Buy Tokens',
      history: 'Purchase History',
      transfer: 'Start bridge',
      view: 'View bridge transaction',
    },
    tooltips: {
      transfer: 'Tokens successfully purchased!\nClick to start the bridge transaction',
    },
    history: {
      title: 'Purchase history',
      empty: '@:noDataText',
    },
    confirmations: {
      txReady: 'Transaction Ready For Bridge',
    },
  },
  points: {
    title: 'Your Points Progress',
    loginText: 'Connect your account to see your points',
    bridgeVolume: 'Bridge volume',
    feesSpent: 'Fees spent',
    xorBurned: '{XOR} burned',
    yourReferrals: 'Your referrals',
    accountsText: '{amount} accounts',
    yourRewards: 'Your rewards',
    openTelegram: 'Open {Telegram}',
    toEarnPoints: 'To earn points',
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
  referralProgram: {
    title: 'Referral Program',
    connectAccount: 'To invite users you need to connect your {Sora} account.',
    bondedXOR: 'XOR Bonded',
    referralsNumber: '{number} referrals',
    startInviting: 'Bond XOR to refer others',
    insufficientBondedAmount: 'To invite more referrals, bond at least {inviteUserFee} XOR',
    insufficientBondedBalance: 'Insufficient bonded balance',
    action: {
      bondMore: 'Bond More',
      bond: 'Bond',
      unbond: 'Unbond',
      copyLink: 'Copy link',
      shareLink: 'Share',
    },
    receivedRewards: 'Received rewards',
    invitationLink: 'Invitation link',
    inviteViaTelegram: 'Invite via {Telegram}',
    welcomeMessage:
      '\nJoin me on {AppName}!\n\nDiscover the stylish {DEX} that lets you swap over dozens tokens with cross-chain swaps, order book, and plenty of rewards!\n\n🎁 Invite friends and earn 10% of their trading fees\n\nSee you there!',
    bondTitle: 'Bond XOR',
    unbondTitle: 'Unbond XOR',
    confirm: {
      bond: 'Confirm bond',
      unbond: 'Confirm unbond',
      inviteTitle: 'You have been invited to {AppName}',
      inviteDescription:
        'For every transaction, 10% of the fee will go to your referrer, without any extra cost to you.',
      signInvitation: 'Approve',
      freeOfCharge: 'This action is free of charge',
      hasReferrerTitle: 'You’ve already set your referrer',
      hasReferrerDescription: 'Unfortunately, you can only set one',
      ok: 'OK',
    },
    referrer: {
      approve: 'Approve',
      approved: 'Approved',
      description: 'You can get referred to {AppName},<br/>type in the link or code of the referrer',
      info: 'When you’ll pay a fee for transaction,<br/>10% will go to your referrer',
      label: 'Invitation link or code',
      placeholder: 'Enter invitation link or code',
      referredBy: 'You’ve been referred by {referrer}',
      referredLablel: 'Referred address',
      title: 'Add your referrer',
      titleReferrer: 'Your referrer',
    },
  },
  mobilePopup: {
    header: 'Download {Sora} Wallet with {polkaswapHighlight} features',
    sideMenu: 'Get {Sora} Wallet',
    info: 'Swap tokens from different networks - {Sora}, {Ethereum}, {Polkadot}, {Kusama}. Provide liquidity pool and earn % from exchange fees.',
  },
  demeterFarming: {
    staking: {
      active: 'Staking active',
      inactive: 'Stake to earn additional rewards',
      stopped: 'Staking stopped',
    },
    info: {
      earned: '{symbol} earned',
      fee: 'Fee',
      feeTooltip: 'Deposit fee is applied to your amount to stake',
      owned: '{symbol} @:balanceText',
      poolShare: 'Your pool share staked',
      poolShareWillBe: 'Your pool share staked will be',
      rewardToken: 'Reward token',
      stake: 'Your {symbol} staked',
      stakeWillBe: 'Your {symbol} stake will be',
      totalLiquidityLocked: 'Total liquidity locked',
    },
    actions: {
      add: 'Stake more',
      claim: 'Claim rewards',
      remove: 'Remove stake',
      start: 'Start staking',
    },
    amountAdd: 'Amount to stake',
    amountRemove: 'Amount to remove',
    poweredBy: 'Powered by Demeter Farming',
    calculator: 'Calculator',
    results: 'Results',
    rewards: '{symbol} rewards',
  },
  soraStaking: {
    selectedValidators: '{count} ({Max} {max})',
    dropdownMenu: {
      controllerAccount: 'Controller account',
    },
    actions: {
      claim: 'Claim rewards',
      remove: 'Remove stake',
      more: 'Stake more',
      confirm: 'Confirm Staking',
      withdraw: 'Withdraw',
    },
    overview: {
      title: '{Sora} Staking',
      description:
        'Stake {XOR} tokens on {Sora} Network as a nominator to validate transactions and earn {VAL} token rewards.',
    },
    validators: {
      save: 'Save changes',
      selected: '{selected}/{total} selected',
      recommended: 'Recommended validators',
      next: 'Next',
      change: 'Change validators',
      select: 'Select validators',
      alreadyNominated: 'Selected validators already nominated',
      tooManyValidators: 'Too many validators selected ({Max} {max})',
    },
    validatorsList: {
      search: 'Search...',
      name: 'Name',
      commission: 'Commission',
      commissionTooltip:
        "Commission refers to the fee charged by validators for their services in the staking process. This fee, expressed as a percentage, is deducted from the staking rewards earned by nominators before distribution. It's important to note that validators can adjust their commission rates at any time",
      return: 'Return',
      noNominatedValidators: "You don't have any nominated validators",
      noValidators: 'There are no validators satisfying the specified filter',
    },
    info: {
      unstaking: 'Unstaking',
      stakingBalance: 'Staking balance',
      rewarded: 'Rewarded',
      totalLiquidityStaked: 'Total liquidity staked',
      rewardToken: 'Reward token',
      unstakingPeriod: 'Unstaking period',
      minimumStake: 'Minimum stake',
      nominators: 'Nominators',
      validators: 'Validators',
      selectedValidators: 'Selected validators',
    },
    newStake: {
      title: 'Start staking',
    },
    withdraw: {
      countdownLeft: 'left',
      withdrawable: 'Withdrawable',
      beingWithdrawn: 'Being withdrawn',
      seeAll: 'See all',
      nextWithdrawal: 'Next withdrawal',
    },
    validatorsFilterDialog: {
      title: 'Filters',
      save: 'Save filter',
      reset: 'Reset all',
      filters: {
        [ValidatorsFilterType.HAS_IDENTITY]: {
          name: 'On-chain identity',
          description: 'At least one identity contact connected to the account',
        },
        [ValidatorsFilterType.NOT_SLASHED]: {
          name: 'Not slashed',
          description:
            'Not experienced any penalties or reductions in their staked funds due to misconduct or protocol violations.',
        },
        [ValidatorsFilterType.NOT_OVERSUBSCRIBED]: {
          name: 'Not oversubscribed',
          description: 'Account within allocation limit, avoids oversubscription penalties on {Polkadot} staking.',
        },
        [ValidatorsFilterType.TWO_VALIDATORS_PER_IDENTITY]: {
          name: 'Limit of 2 validators per identity',
          description:
            'A maximum of two validators per identity to promote decentralization and prevent concentration of power.',
        },
      },
    },
    validatorsDialog: {
      title: {
        edit: 'Edit My Validators',
      },
      tabs: {
        [ValidatorsListMode.USER]: 'Yours',
        [ValidatorsListMode.ALL]: 'All',
      },
    },
    validatorsAttentionDialog: {
      title: 'Attention',
      description: [
        'Algorithmic validator suggestions do not constitute financial consultation or advice. Staking is a high-risk activity, and algorithmic validator suggestions do not necessarily mitigate this risk.',
        'A validator suggested by the algorithm could still be slashed. A validator suggested by the algorithm could also change their parameters (e.g.,commission rates, etc.) at any time after having been suggested and/or selected.',
        'You could lose tokens or rewards for these or other reasons. Only stake tokens and use validator suggestions at your own discretion, after conducting due diligence and carefully considering the risks involved.',
      ],
      confirm: 'Yes, I understand the risk',
    },
    claimRewardsDialog: {
      title: 'Claim rewards',
      checkRewards: 'Check rewards per era and validator',
      rewardsDestination: 'Rewards destination address',
    },
    pendingRewardsDialog: {
      title: 'Pending rewards',
      noPendingRewards: 'There are no pending rewards',
      noSelectedRewards: 'Select rewards',
      payout: 'Payout',
      information:
        'Validators payout the rewards every 2-5 days. However, you can payout them by yourself, especially if rewards are close to expiring, but you will pay the fee.',
    },
    stakeDialog: {
      toStake: 'To stake',
      toRemove: 'To remove',
    },
    withdrawDialog: {
      title: 'Withdraw unstaked funds',
      showAllWithdraws: 'Show all withdraws',
    },
    allWithdrawsDialog: {
      title: 'Unstaking activity',
      information:
        'Once you unstake tokens, there is a mandatory 7-day unstaking period. After this period, your tokens will not be automatically returned to your wallet. You must complete the process by manually withdrawing your tokens.',
    },
    selectValidatorsMode: {
      title: 'Stake with validators suggested by the algorithm',
      description: '{Sora} network algorithm has selected a list of recommended validators based on the criteria:',
      criteria: [
        'Most profitable',
        'Not oversubscribed',
        'Having onchain identity',
        'Not slashed',
        'Limit of 2 validators per identity',
      ],
      confirm: {
        suggested: 'Stake with suggested',
        manual: 'I`ll pick the validators myself',
      },
    },
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
  orderBook: {
    Buy: 'Buy {asset}',
    Sell: 'Sell {asset}',
    orderBook: 'Orderbook',
    marketTrades: 'Market trades',
    market: 'Market',
    limit: 'Limit',
    total: 'Total',
    amount: 'amount',
    time: 'time',
    month: 'month',
    change: 'change',
    cantPlaceOrder: "Can't place order",
    enterAmount: 'Enter amount',
    setPrice: 'Set price',
    dayVolume: '1D Volume',
    stop: 'Book stopped',
    tokenPair: 'Token pair',
    book: {
      noAsks: 'No opened asks',
      noBids: 'No opened bids',
    },
    history: {
      tradeHistory: 'Trade history',
      orderHistory: 'Order history',
      openOrders: 'Open orders {value}',
      connect: 'Connect an account to start trading',
      cancel: 'Cancel order {value}',
      cancelAll: 'Cancel all',
    },
    orderTable: {
      time: 'time',
      pair: 'pair',
      side: 'side',
      filled: 'filled',
      lifetime: 'lifetime',
      noOrders: 'No orders. Create your first one!',
    },
    orderStatus: {
      active: 'Active',
      canceled: 'Canceled',
      expired: 'Expired',
      filled: 'Filled',
    },
    dialog: {
      placeMarket: 'Place market order',
      placeLimit: 'Place limit order',
      askCancel: 'Are you sure you want to cancel all of your open orders?',
      cancelAll: 'Yes, cancel all',
      buy: 'Buy {amount} {symbol}',
      sell: 'Sell {amount} {symbol}',
      at: 'at {price} {symbol}',
    },
    tradingPair: {
      choosePair: 'Choose trading pair',
      volume: 'Volume',
      dailyChange: 'Daily change',
      status: 'Status',
      total: '{amount} {symbol} at {amount2} {symbol2}',
    },
    bookStatus: {
      active: 'Active',
      placeable: 'Placeable',
      cancelable: 'Cancelable',
      inactive: 'Inactive',
    },
    tooltip: {
      limitOrder:
        "A 'Limit' order lets you specify the exact price at which you want to buy or sell an asset. A 'Limit Buy' order will only be executed at the specified price or lower, while a 'Limit Sell' order will execute only at the specified price or higher. This control ensures you don't pay more or sell for less than you're comfortable with.",
      marketOrder:
        "A 'Market Order' is an order to immediately buy or sell at the best available current price. It doesn't require setting a price, ensuring a fast execution but with the trade-off of less control over the price received or paid. This type of order is used when certainty of execution is a priority over price control.",
      pairsList:
        'A real-time list showing current buy and sell orders for a cryptocurrency. It helps you understand the demand, potential price direction, and trade volume on the {Sora} Network and {AppName} DEX',
      bookWidget:
        'A live, constantly updating record of buy (bid) and sell (ask) orders for a specific asset, organized by price level. The order book displays the depth of the market, including the quantities of assets being offered at various prices. Traders utilize this detailed view to gauge market sentiment, identify potential resistance and support levels, and anticipate price movements based on existing demand and supply',
      marketWidget:
        'This widget shows a real-time stream of executed trades in the market, providing information on transaction volumes, recent activity, and current market trends. By observing the timing, price, and size of actual trades, traders can gain insights into market dynamics and sentiment, helping them to spot trading opportunities and make informed decisions',
      txDetails: {
        orderType:
          "'Buy' order will only be executed at the specified price or lower, while a 'Sell' order will execute only at the specified price or higher. This control ensures you don't pay more or sell for less than you're comfortable with.",
        expiryDate:
          "The 'Expiry Date' is the deadline for your order to be executed. If the market doesn't reach your specified price before this date, the order is automatically cancelled. You're not bound to a perpetual wait if market conditions don't align with your trading preferences.",
        amount:
          "The 'Amount' refers to the total number of assets you want to buy or sell in your order. It's important to specify, as it determines the size of your transaction, impacting the total cost for buy orders or revenue for sell orders.",
        limit:
          "The 'Limit Price' is the precise price you set for a limit order. The trade will only execute when the asset's market price meets your limit price, ensuring you don't purchase above or sell below this specified value.",
        locked: "The 'Locked' shows the amount of asset to be held while order is ongoing.",
      },
      bookStatus: {
        active: 'Full trading functionality enabled. You can place new orders or cancel existing ones.',
        placeable:
          'Limited functionality. You can place new orders and cancel existing ones, but some features may be unavailable.',
        cancelable: 'You can only cancel existing orders. New order placement is currently disabled.',
        inactive: 'All trading activities are currently halted. No orders can be placed or canceled at this time.',
      },
    },
    txDetails: {
      orderType: 'order type',
      limitPrice: 'limit price',
      expiryDate: 'expiry date',
    },
    error: {
      multipleOf: {
        reason: 'Entered price is too specific',
        reading: 'To process your order, please input a price that is a multiple of {value}',
      },
      beyondPrecision: {
        reason: 'Entered price is too precise to calculate',
        reading:
          'Precision exceeded: The amount/price entered has too many decimal places. Please input a value with fewer decimal places',
      },
      marketNotAvailable: {
        reason: 'Not enough orders available to fullfill this order',
        reading:
          'Market order limitation: There are not enough orders available to fulfill this market order. Please adjust your order size or wait for more orders to be placed',
      },
      exceedsSpread: {
        reason: 'Price exceeded spread',
        reading: "Price exceeded: a market's bid or ask price exceeded its ask/bid price",
      },
      outOfBounds: {
        reason: 'Amount fails to comply with blockchain range',
        reading:
          "Blockchain range exceeded: Your entered amount falls outside the blockchain's allowed range. Min: {min}; Max: {max}",
      },
      spotLimit: {
        reason: 'Trading side has been filled',
        reading:
          'Price range cap: Each order book side is limited to 1024 unique price points. Please select a price within the existing range or wait for space to become available',
      },
      accountLimit: {
        reason: 'Too many orders is ongoing',
        reading:
          'Limit reached: Each account is confined to 1024 limit orders. Please wait until some of your orders fulfill',
      },
      singlePriceLimit: {
        reason: 'Too many orders is ongoing for this price',
        reading: 'Limit reached: Each position is confined to 1024 limit orders. Please wait until some orders fulfill',
      },
    },
  },
  kensetsu: {
    addCollateral: 'Add collateral',
    addCollateralDescription:
      'Deposit more assets into your position to increase your borrowing limit or to improve your loan-to-value ratio. This can also help prevent liquidation.',
    depositCollateral: 'Deposit collateral',
    totalCollateral: 'Total collateral',
    totalCollateralDescription:
      'The total value of all assets currently deposited in your position. This value affects your borrowing capacity and risk of liquidation.',
    debtAvailable: 'Debt available',
    debtAvailableDescription:
      'The amount of funds you can still draw from your position without exceeding your borrowing limit, based on your current collateral.',
    ltv: 'Loan to value ({LTV})',
    ltvDescription:
      'The ratio of the amount drawn to the value of the collateral in your position, expressed as a percentage. A higher {LTV} increases potential returns but also risk, including the chance of liquidation.',
    ltvMaxTooltip:
      'The maximum amount of a borrowing position that can be provided in relation to the appraised value of the asset being used as collateral.',
    borrowMore: 'Borrow more',
    borrowMoreDescription:
      'Draw additional funds from your position up to the maximum available amount. Ensure your collateral value supports the increased debt to avoid liquidation risks.',
    available: 'Available',
    outstandingDebt: 'Outstanding debt',
    outstandingDebtDescription:
      'The total amount you currently owe from the funds drawn from your position, including accrued interest. This needs to be repaid to close your position or maintain healthy loan-to-value ratios.',
    createVault: 'Open a borrow position',
    createVaultDescription:
      'Initiate a new transaction by depositing collateral into your position and drawing funds. This creates a debt obligation that you must manage.',
    createVaultAction: 'Borrow',
    borrowDebt: 'Borrow debt',
    minDepositCollateral: 'Min. deposit collateral',
    minDepositCollateralDescription:
      'The minimum amount of assets required to open a position. This initial deposit secures the funds you wish to borrow.',
    maxAvailableToBorrow: 'Max. available to borrow',
    maxAvailableToBorrowDescription:
      'The maximum amount you can draw from your position, determined by the value of your collateral. This limit adjusts as the value of the collateral changes.',
    borrowTax: 'Borrow tax',
    borrowTaxDescription: 'The {value} tax applied to the borrowed amount',
    interest: 'Interest',
    interestDescription:
      'An annual fee charged on the amount drawn from your position, calculated as a percentage. This fee compensates for risks and market fluctuations.',
    repayDebt: 'Repay debt',
    repayDebtDescription:
      'Return borrowed funds to reduce your outstanding debt. This can decrease interest costs and lower the risk of liquidation.',
    closeVault: 'Close my position',
    closeVaultDescription:
      'Close the selected position by repaying all outstanding debt and withdrawing all collateral',
    yourCollateral: 'Your collateral',
    yourCollateralDescription:
      "The assets you've deposited into your position to secure the funds drawn. These assets may be liquidated by the lender if you fail to maintain the required loan-to-value ratio.",
    yourDebt: 'Your debt',
    yourDebtDescription:
      'The total amount currently outstanding in your position, including the drawn amount and any accrued interest. This balance increases over time if interest accumulates.',
    yourDebtTokenBalance: 'Your {tokenSymbol} balance',
    requiredAmountWithSlippage: 'Required amount including slippage',
    requiredAmountWithSlippageDescription:
      'For a smooth position closure, buy slightly more {tokenSymbol} than the {amount} required due to possible slippage. You need an extra to cover the shortfall. Swap your assets into {tokenSymbol} to meet this need.',
    openSwap: 'Open swap',
    introTitle: 'Open borrow positions & Earn with {Kensetsu}',
    introDescription:
      'Experience safe and effortless borrowing and lending. Open borrowing positions with {Kensetsu} platform.',
    disclaimerDescription:
      'Borrowing digital assets through {AppName} carries significant risk and is entirely at your own risk. The value of digital assets is highly volatile, and any changes in the market prices of the assets you have borrowed or used as collateral can lead to substantial financial losses.',
    availableToBorrow: 'Available to borrow',
    availableToBorrowDescription:
      'The remaining amount you are eligible to draw under the current conditions of your position, based on your deposited collateral and any existing debt.',
    collateralDetails: 'Collateral details',
    debtDetails: 'Debt details',
    positionInfo: 'Position information',
    liquidationPenalty: 'Liquidation penalty',
    liquidationPenaltyDescription:
      'A fee applied if the value of your collateral falls below a certain threshold, prompting the sale of assets to cover the debt. This penalty increases your total debt.',
    positionSafe: 'Position safe',
    liquidationClose: 'Liquidation close',
    highLiquidationRisk: 'High liquidation risk',
    positionHistory: 'Position history',
    liquidated: 'Liquidated',
    liquidatedMessage: 'Liquidated {amount} {symbol}',
    status: {
      Opened: 'Active',
      Closed: 'Closed',
      Liquidated: 'Liquidated',
    },
    readMore: 'Read more',
    reopen: 'Re-open',
    totalCollateralReturned: 'Total collateral returned',
    totalCollateralReturnedDescription:
      'The total value of assets returned to you after closing your position, including total remaining collateral.',
    overallTotalCollateral: 'Total collateral',
    overallTotalCollateralDescription:
      'The total value of assets deposited by borrowers to secure their borrowing positions on the {Kensetsu} platform.',
    overallTotalDebt: 'Total debt',
    overallTotalDebtDescription:
      'The total amount of debt currently outstanding across all borrowing positions on the {Kensetsu} platform.',
    overallBadDebt: 'Bad debt',
    overallBadDebtDescription:
      'The portion of debt that is unlikely to be recovered due to borrower default or insufficient collateral.',
    overallAvailable: 'Total available',
    overallAvailableDescription: 'The total amount of funds available for borrowing on the {Kensetsu} platform.',
    error: {
      enterCollateral: 'Enter collateral',
      enterBorrow: 'Enter borrow amount',
      borrowMoreThanAvailable: 'Available debt exceeded',
      insufficientCollateral: 'Insufficient collateral',
      enterRepayDebt: 'Enter repay debt',
      repayMoreThanDebt: 'Debt overpaid',
      incorrectCollateral: 'Token pair is not supported',
    },
  },
  assetOwner: {
    letsStartBtn: 'LET’S START',
    selectExisting: 'Select existing',
    createSbt: 'Create {type}',
    orSelectExisting: 'Or select existing',
    createRegulatedAsset: 'Create new regulated asset',
    addRegulatedAsset: 'Add another regulated asset',
    attachedRegulatedAssets: 'Attached regulated assets',
    ownerSbtTitle: 'Your {type}',
    regulatedAssetsConnected: 'Regulated assets connected',
    regulatedPools: 'Regulated pools',
    sbtManagers: '{type} Managers',
    you: 'You',
    accountWithAccess: 'Account with SBT access',
    issueSbtAccess: 'Issue {type} access',
    startIssue: 'Start issuing access for the SBT to accounts',
    permissionedAssets: 'Permissioned assets',
    addRegulatedAssets: 'Add regulated assets',
    sbtCreation: {
      addAssets: 'Add Assets to SBT',
      addDescription: 'Enter SBT Details',
      addMeta: 'Enter SBT Details',
      preview: 'SBT Preview',
    },
    guide: {
      createToken: 'Create your token',
      createTokenDesc:
        'Easily launch your unique token—available in multiple formats like NFTs and SBTs—using the robust, secure infrastructure of the SORA Network',
      title: 'How to create an {type}:',
      stepOneTitle: 'Select or Create Regulated Assets',
      stepOneDesc:
        'Choose or create assets that you have personally created and regulate. These are assets under your control and management.',
      stepTwoTitle: 'Enter SBT Details',
      stepTwoDesc: "Provide essential information such as the SBT's name and ticker symbol, as well as the icon.",
      stepThreeTitle: 'Review and sign the transaction',
      stepThreeDesc: 'Review and sign the final creation transaction to complete the SBT setup.',
      disclaimerSbt:
        'Keep this page open during the entire process. Closing or navigating away will require you to restart from the beginning. Complete steps quickly to avoid timeout.',
    },
    dialog: {
      createAsset: 'Create a new asset',
      createAssetDesc: 'Set up a new permissioned asset for the {type}',
      addExisting: 'Add an existing asset',
      addExistingDesc: 'Add an already created asset for the SBT',
      enterAddress: 'Enter address for issuance',
      selectAccessEnd: 'Select when access will end',
      selectDate: 'Select date',
      issueAccess: 'Issue access',
      pickDate: 'Pick a day',
    },
  },
  rotatePhoneNotification: {
    enableAcceleration: 'Enable acceleration access in your settings.',
    gyroscropePhone:
      " Our technology uses your phone's built-in gyroscope to instantly hide your balance when you tilt your device.",
    info: 'For extra privacy, tilt your device face down to instantly hide your asset balances. This feature uses your phone’s built-in sensors.',
    title: 'Turn your device upside down to hide balances',
  },
};
