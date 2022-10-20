import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';
import { en as walletEn, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Operation, TransactionStatus } from '@sora-substrate/util';
import { RewardingEvents } from '@sora-substrate/util/build/rewards/consts';

import { PageNames, RewardsTabsItems } from '../consts';
import { EvmNetworkId } from '@/consts/evm';
import { MoonpayNotifications } from '@/components/Moonpay/consts';

export default {
  // Wallet project keys
  ...walletEn,
  // Polkaswap project keys
  appName: 'Polkaswap',
  soraText: 'SORA',
  ethereumText: 'Ethereum',
  hashiBridgeText: 'HASHI bridge',
  moonpayText: 'MoonPay',
  changeNetworkText: 'Change network in Metamask',
  transactionText: 'transaction | transactions',
  transactionSubmittedText: 'Transaction was submitted',
  unknownErrorText: 'ERROR Something went wrong...',
  unknownAssetText: 'Unknown asset',
  connectWalletText: 'Connect account',
  changeAccountText: 'Change account',
  connectedText: 'Connected',
  connectedAccount: 'Connected account',
  selectNodeConnected: 'Connected to: {chain}',
  connectWalletTextTooltip: 'Connect to @:soraText Network with polkadot{.js}',
  selectNodeText: 'Select node',
  bridgeText: 'Bridge',
  comingSoonText: 'Coming Soon',
  releaseNotesText: 'Release notes',
  memorandum: 'Polkaswap Memorandum and Terms of Services',
  memorandumLink:
    '<a href="@:helpDialog.termsOfServiceLink" target="_blank" rel="nofollow noopener" class="link" title="@:memorandum">@:memorandum</a>',
  privacyLink:
    '<a href="@:helpDialog.privacyPolicyLink" target="_blank" rel="nofollow noopener" class="link" title="@:helpDialog.privacyPolicy">@:helpDialog.privacyPolicy</a>',
  FAQ: 'Polkaswap FAQ',
  polkaswapFaqLink:
    '<a class="link" href="https://wiki.sora.org/polkaswap/polkaswap-faq" target="_blank" rel="nofollow noopener" title="@:FAQ">@:FAQ</a>',
  disclaimer:
    '<span class="app-disclaimer__title">Disclaimer</span>: This website is maintained by the @:soraText community. Before continuing to use this website, please review the @:polkaswapFaqLink and documentation, which includes a detailed explanation on how Polkaswap works, as well as the @:memorandumLink, and @:(privacyLink). These documents are crucial to a secure and positive user experience. By using Polkaswap, you acknowledge that you have read and understand these documents. You also acknowledge the following: 1) your sole responsibility for compliance with all laws that may apply to your particular use of Polkaswap in your legal jurisdiction; 2) your understanding that the current version of Polkaswap is an alpha version: it has not been fully tested, and some functions may not perform as designed; and 3) your understanding and voluntary acceptance of the risks involved in using Polkaswap, including, but not limited to, the risk of losing tokens. Please do not continue without reading the @:polkaswapFaqLink, @:memorandumLink, @:privacyLink!',
  poweredBy: 'Powered by',
  confirmText: 'Confirm',
  confirmTransactionText: 'Confirm transaction in {direction}',
  signAndClaimText: 'Sign and claim',
  retryText: 'Retry',
  networkFeeText: 'Network Fee',
  networkFeeTooltipText: "Network fee is used to ensure @:soraText system's growth and stable performance.",
  ethNetworkFeeTooltipText:
    'Please note that the Ethereum network fees displayed on Polkaswap are only rough estimations, you can see the correct fee amount in your connected Ethereum wallet prior to confirming the transaction.',
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
  [Theme.LIGHT]: 'Light',
  [Theme.DARK]: 'Dark',
  pageTitle: {
    [PageNames.Swap]: 'Swap',
    [PageNames.Pool]: 'Pool',
    [PageNames.Bridge]: '@:bridgeText',
    [PageNames.About]: 'About',
    [PageNames.Stats]: 'Stats',
    [PageNames.Support]: 'Support',
    [PageNames.Wallet]: 'Wallet',
    [PageNames.Rewards]: 'Rewards',
    [PageNames.Tokens]: 'Tokens',
    [PageNames.AddLiquidity]: 'Add Liquidity',
    [PageNames.RemoveLiquidity]: 'Remove Liquidity',
    [PageNames.PageNotFound]: 'Page Not Found',
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
    [PageNames.Tokens]: 'Tokens',
    [PageNames.StakingContainer]: 'Staking',
  },
  headerMenu: {
    showBalances: 'Show Balances',
    hideBalances: 'Hide Balances',
    settings: 'Settings',
    switchTheme: 'Switch to {theme} Mode',
    switchLanguage: 'Choose Language',
    selectNode: '@:selectNodeText',
  },
  social: {
    wiki: '@:soraText Wiki',
    twitter: 'Twitter',
    telegram: 'Telegram',
    medium: 'Medium',
    reddit: 'Reddit',
    github: 'GitHub',
  },
  footerMenu: {
    faucet: 'Faucet',
    info: 'Info & Community',
    github: 'GitHub',
    sorawiki: '@:soraText Wiki',
  },
  helpDialog: {
    title: 'Help',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    termsOfServiceLink: 'https://wiki.sora.org/polkaswap/terms',
    privacyPolicyLink: 'https://wiki.sora.org/polkaswap/privacy',
    appVersion: '@:appName version',
    contactUs: 'Contact us',
  },
  aboutNetworkDialog: {
    title: 'About',
    learnMore: '@:learnMoreText',
    network: {
      title: 'What is @:soraText?',
      description:
        'Polkaswap is built on top of the @:soraText Network, and the @:soraText token (XOR) is used for gas/fees and liquidity provision on Polkaswap. @:soraText Network allows for reduced fees, faster transactions and simpler consensus finalization and is focused on delivering interoperability across other blockchain ecosystems like @:(ethereumText).',
    },
    polkadot: {
      title: 'What is polkadot{.js}?',
      description:
        'Polkadot{.js} extension is a browser extension available for Firefox and Chrome dedicated to managing accounts for Substrate-based chains, including @:soraText, Polkadot and Kusama. You can add, import, and export accounts and sign transactions or extrinsics that you have initiated from websites you have authorized.',
    },
  },
  node: {
    errors: {
      connection: 'An error occurred while connecting to the node\n{address}\n',
      network: 'The node\n{address}\n is from the another network\n',
      existing: "This node is already added: '{title}'\n",
    },
    warnings: {
      disconnect: 'Сonnection to the node has been lost. Reconnecting...',
    },
    messages: {
      connected: 'Connection estabilished with node\n{address}\n',
      selectNode: 'Please select node to connect from the node list',
    },
  },
  selectNodeDialog: {
    title: '@:soraText Network node selection',
    addNode: 'Add custom node',
    updateNode: 'Update node',
    customNode: 'Custom node',
    howToSetupOwnNode: 'How to setup your own @:soraText node',
    select: 'Select',
    connected: 'Connected',
    selectNodeForEnvironment: 'Select a node for {environment} environment:',
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
  operations: {
    [Operation.Swap]: 'Swap',
    [Operation.Transfer]: 'Transfer',
    [Operation.AddLiquidity]: 'Add Liquidity',
    [Operation.RemoveLiquidity]: 'Remove Liquidity',
    [Operation.CreatePair]: 'Create Pair',
    [Operation.RegisterAsset]: 'Register Asset',
    [Operation.ClaimRewards]: 'Claim Rewards',
    [Operation.ReferralReserveXor]: 'Bond XOR',
    [Operation.ReferralUnreserveXor]: 'Unbond XOR',
    [Operation.ReferralSetInvitedUser]: 'Set Referral',
    [Operation.DemeterFarmingDepositLiquidity]: 'Add Liquidity Stake',
    [Operation.DemeterFarmingWithdrawLiquidity]: 'Remove Liquidity Stake',
    [Operation.DemeterFarmingStakeToken]: 'Add Stake',
    [Operation.DemeterFarmingUnstakeToken]: 'Remove Stake',
    [Operation.DemeterFarmingGetRewards]: 'Claim Rewards',
    [Operation.EthBridgeIncoming]: '@:hashiBridgeText',
    [Operation.EthBridgeOutgoing]: '@:hashiBridgeText',
    andText: 'and',
    [TransactionStatus.Finalized]: {
      [Operation.Transfer]: '{action} {amount} {symbol} {direction} {address}',
      [Operation.Swap]: 'Swapped {amount} {symbol} for {amount2} {symbol2}',
      [Operation.AddLiquidity]: 'Supplied {amount} {symbol} and {amount2} {symbol2}',
      [Operation.RemoveLiquidity]: 'Removed {amount} {symbol} and {amount2} {symbol2}',
      [Operation.CreatePair]: 'Supplied {amount} {symbol} and {amount2} {symbol2}',
      [Operation.RegisterAsset]: 'Registered {symbol} asset',
      [Operation.ClaimRewards]: 'Reward claimed successfully {rewards}',
      [Operation.ReferralReserveXor]: 'Bonded XOR successfully',
      [Operation.ReferralUnreserveXor]: 'Unbonded XOR successfully',
      [Operation.ReferralSetInvitedUser]: 'Set Referral',
      [Operation.DemeterFarmingDepositLiquidity]: 'Supplied {symbol} and {symbol2} {amount} LP tokens',
      [Operation.DemeterFarmingWithdrawLiquidity]: 'Removed {symbol} and {symbol2} {amount} LP tokens',
      [Operation.DemeterFarmingStakeToken]: 'Added {amount} {symbol}',
      [Operation.DemeterFarmingUnstakeToken]: 'Removed {amount} {symbol}',
      [Operation.DemeterFarmingGetRewards]: '{amount} {symbol} claimed successfully',
      [Operation.EthBridgeIncoming]: 'Transfered {amount} {symbol} from @:ethereumText to @:soraText',
      [Operation.EthBridgeOutgoing]: 'Transfered {amount} {symbol} from @:soraText to @:ethereumText',
    },
    [TransactionStatus.Error]: {
      [Operation.Transfer]: 'Failed to send {amount} {symbol} to {address}',
      [Operation.Swap]: 'Failed to swap {amount} {symbol} for {amount2} {symbol2}',
      [Operation.AddLiquidity]: 'Failed to supply {amount} {symbol} and {amount2} {symbol2}',
      [Operation.RemoveLiquidity]: 'Failed to remove {amount} {symbol} and {amount2} {symbol2}',
      [Operation.CreatePair]: 'Failed to supply {amount} {symbol} and {amount2} {symbol2}',
      [Operation.RegisterAsset]: 'Failed to register {symbol} asset',
      [Operation.ClaimRewards]: 'Failed to claim rewards {rewards}',
      [Operation.ReferralReserveXor]: 'Failed to bond XOR',
      [Operation.ReferralUnreserveXor]: 'Failed to unbonded XOR',
      [Operation.ReferralSetInvitedUser]: 'Failed to set referral',
      [Operation.DemeterFarmingDepositLiquidity]: 'Failed to supply {amount} {symbol} and {symbol2} LP tokens',
      [Operation.DemeterFarmingWithdrawLiquidity]: 'Failed to remove {amount} {symbol} and {symbol2} LP tokens',
      [Operation.DemeterFarmingStakeToken]: 'Failed to add {amount} {symbol}',
      [Operation.DemeterFarmingUnstakeToken]: 'Failed to remove {amount} {symbol}',
      [Operation.DemeterFarmingGetRewards]: 'Failed to claim {symbol}',
      [Operation.EthBridgeIncoming]: 'Failed to transfer {amount} {symbol} from @:ethereumText to @:soraText',
      [Operation.EthBridgeOutgoing]: 'Failed to transfer {amount} {symbol} from @:soraText to @:ethereumText',
    },
  },
  pageNotFound: {
    title: 'Page not found',
    body: '404',
  },
  metamask: 'MetaMask',
  sora: {
    [WALLET_CONSTS.SoraNetwork.Dev]: '@:soraText Devnet',
    [WALLET_CONSTS.SoraNetwork.Test]: '@:soraText Testnet',
    [WALLET_CONSTS.SoraNetwork.Stage]: '@:soraText Testnet',
    [WALLET_CONSTS.SoraNetwork.Prod]: '@:soraText Mainnet',
  },
  evm: {
    [EvmNetworkId.EthereumMainnet]: '@:ethereumText Mainnet',
    [EvmNetworkId.EthereumRopsten]: '@:ethereumText Ropsten Testnet',
    [EvmNetworkId.EthereumRinkeby]: '@:ethereumText Rinkeby Testnet',
    [EvmNetworkId.EthereumGoerli]: '@:ethereumText Goerli Testnet',
    [EvmNetworkId.EthereumKovan]: '@:ethereumText Kovan Testnet',
    [EvmNetworkId.EthereumClassicTestnetMordor]: '@:ethereumText Classic Mordor Testnet',
    [EvmNetworkId.KlaytnTestnetBaobab]: 'Klaytn Baobab Testnet',
    [EvmNetworkId.KlaytnMainnet]: 'Klaytn Mainnet Cypress',
  },
  providers: {
    metamask: '@:metamask',
  },
  about: {
    title: 'The DEX for the Interoperable Future.',
    description:
      'Cross-chain exchange of assets, simple creation and listing of new assets, and the easiest swaps ever. The interoperable future of Polkadot is here and we are at the forefront!',
    trading: {
      title: 'Faster Trading',
      first:
        'Polkaswap is a non-custodial, cross-chain AMM DEX protocol for swapping tokens based on Polkadot and Kusama relay chains, Polkadot and Kusama parachains, and blockchains directly connected via bridges.',
      second: 'Polkaswap removes trusted intermediaries and provides the opportunity for faster trading',
      third: 'Polkaswap is a community project and devs collaborate on the open source code using the',
    },
    liquidity: {
      title: 'Boundless Liquidity',
      first:
        'Polkaswap combines multiple liquidity sources under a common liquidity aggregation algorithm, operating completely on-chain, in a trustless and decentralized way.',
      second:
        'When traders call the swap function, the liquidity aggregation algorithm will fill orders using the best offers across all liquidity sources. Liquidity sources can be other DEXs, order books, or other API-driven sources.',
      third:
        'Because Polkaswap is an open-source project, anyone can add more liquidity sources by making contributions to the Polkaswap codebase.',
    },
    swap: {
      title: 'Swap Any Token',
      first:
        'Go beyond the limits of current DEXs by adding tokens from the Polkadot ecosystem as well as other blockchains.',
      second: 'Create, list and trade your own tokens on the SORA network.',
      third:
        'Our core infrastructure uses Parity Substrate, which is more scalable than Ethereum, and does not use expensive mining for consensus.',
    },
    pswap: {
      title: 'PSWAP Tokens',
      first:
        'PSWAP was created by community governance by voting on its release. It is a utility and governance token used to reward liquidity providers on Polkaswap. Unlike most other reward tokens, PSWAP is burned with transactions and decreases in supply over time.',
      second:
        'The {percent}% fee for every swap on the Polkaswap DEX is used to buy back PSWAP tokens, which are then burned. At first, 90% of burned PSWAP tokens are reminted to allocate to liquidity providers, but with time this percentage will decrease to 35% after 4 years.',
    },
    links: {
      first: {
        title: 'Become a SORA Validator',
        desc: 'Secure the future of the SORA network and decentralized apps like Polkaswap, and earn rewards along the way by becoming a SORA validator.',
      },
      second: {
        title: 'Connect a Chain to SORA',
        desc: 'Grow the decentralized world economy by connecting more chains to SORA and Polkaswap using the HASHI bridge protocol.',
      },
    },
    network:
      'Polkaswap is built on the SORA Network, focusing on interoperability to connect the rest of the crypto ecosystem to Polkadot.',
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
    ok: 'OK',
  },
  swap: {
    connectWallet: '@:connectWalletText',
    estimated: 'estimated',
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
    networkFee: '@:networkFeeText',
    pairIsNotCreated: '@:pairIsNotCreated',
    networkFeeTooltip: '@:networkFeeTooltipText',
    firstPerSecond: '@:firstPerSecond',
    insufficientAmount: 'Insufficient {tokenSymbol} amount',
    insufficientLiquidity: 'Insufficient liquidity',
    confirmSwap: 'Confirm swap',
    swapOutputMessage:
      'Output is estimated. You will receive at least {transactionValue} or the transaction will revert.',
    rewardsForSwap: 'PSWAP Strategic Rewards',
    swapInputMessage: 'Input is estimated. You will sell maximum {transactionValue} or the transaction will revert.',
    route: 'Route',
    errorFetching: 'Error fetching the data',
  },
  pool: {
    connectWallet: '@:connectWalletText',
    connectToWallet: 'Connect an account to view your liquidity.',
    liquidityNotFound: 'No liquidity found.',
    addLiquidity: 'Add liquidity',
    removeLiquidity: 'Remove liquidity',
    createPair: 'Create a pair',
    pooledToken: '{tokenSymbol} Pooled',
    pairTokens: '{pair} Pool Tokens',
    poolShare: 'Your pool share',
    unknownAsset: '@:unknownAssetText',
    description:
      'When you add liquidity, you are given pool tokens representing your position. These tokens automatically earn fees proportional to your share of the pool, and can be redeemed at any time.',
    strategicBonusApy: 'Strategic Bonus APY',
  },
  bridge: {
    title: 'HASHI Bridge',
    info: 'Convert tokens between the @:soraText and @:ethereumText networks.',
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
    notRegisteredAsset: 'Asset {assetSymbol} is not registered',
    selectNetwork: 'Select network',
    networkInfo: 'Bridge @:soraText Network with:',
    ethereum: '@:ethereumText',
    energy: '@:evm.EWC',
  },
  selectRegisteredAsset: {
    title: 'Select a token',
    search: {
      title: 'Tokens',
      placeholder: 'Filter by Asset ID, Name or Ticker Symbol',
      networkLabelSora: '@:soraText network tokens',
      networkLabelEthereum: '@:ethereumText network mirror tokens',
      emptyListMessage: 'No results',
    },
    customAsset: {
      title: 'Custom',
      customInfo: 'Important! Custom tokens must be registered in @:(soraText).',
      registerToken: 'Register token',
      addressPlaceholder: 'Asset ID',
      symbolPlaceholder: 'Token symbol',
      empty: 'No tokens found',
      alreadyAttached: 'Token was already attached',
    },
  },
  confirmBridgeTransactionDialog: {
    confirmTransaction: 'Confirm transaction',
    insufficientBalance: '@:insufficientBalanceText',
    changeNetwork: '@:changeNetworkText',
    metamask: '@:metamask',
    sora: '@:soraText',
    confirm: '@:confirmTransactionText',
    buttonConfirm: '@:confirmText',
  },
  bridgeTransaction: {
    title: 'Bridge Transaction',
    details: '{from} for {to}',
    expectedMetaMaskAddress: 'Expected address in MetaMask:',
    for: ' for ',
    steps: {
      step: '{step} of 2',
      step1: '1st',
      step2: '2nd',
    },
    status: {
      pending: '{step} transactions pending...',
      failed: '{step} transactions failed. @:(retryText).',
      confirm: 'Confirm 2nd of 2 transactions...',
      complete: 'Complete',
      convertionComplete: 'Conversion complete',
    },
    statuses: {
      waiting: 'Waiting',
      ready: 'Ready',
      pending: 'Pending',
      frozen: 'Frozen',
      failed: 'Transaction failed',
      done: 'Complete',
      waitingForConfirmation: 'Waiting for confirmation...',
    },
    blocksLeft: '{count} blocks left...',
    viewInEtherscan: 'View in Etherscan',
    networkTitle: '{network} transaction',
    transactionHash: 'Transaction hash',
    networkInfo: {
      status: 'Status',
      date: 'Date',
      amount: 'Amount',
      transactionFee: 'Transaction Fee',
      total: 'Total',
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
    connectWallet: '@:connectWalletText',
    changeAccount: '@:changeAccountText in @:metamask',
    expectedAddress: 'Expected address in @:metamask',
    allowToken: 'Allow @:appName to use your {tokenSymbol}',
    approveToken:
      'Please note that it is only needed to approve the token once. If your extension has multiple token approval requests, make sure to only confirm the last one while rejecting the rest.',
    accountAddress: '{network} @:accountAddressText',
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
    copy: 'Copy Asset ID',
    successCopy: '{symbol} Asset ID is copied to the clipboard',
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
    title: 'Create a pair',
    deposit: 'Deposit',
    balance: 'Balance',
    pricePool: 'Prices and fees',
    shareOfPool: 'Share of pool',
    firstPerSecond: '@:firstPerSecond',
    firstSecondPoolTokens: '{first}-{second} Pool',
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
    firstLiquidityProviderInfo:
      'The ratio of tokens you add will set the price of this pool.<br/>Once you are happy with the rate click supply to review.',
  },
  confirmSupply: {
    title: 'Your pool share will be',
    outputDescription:
      'Output is estimated. If the price changes more than {slippageTolerance}% your transaction will revert.',
    poolTokensBurned: '{first}-{second} Pool Tokens Burned',
    price: 'Price',
  },
  addLiquidity: {
    title: 'Add liquidity',
    pairIsNotCreated: '@:pairIsNotCreated',
    firstPerSecond: '@:firstPerSecond',
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
    description:
      'Removing pool tokens converts your position back into underlying tokens at the current rate, proportional to your share of the pool. Accrued fees are included in the amounts you receive.',
    outputMessage:
      'Output is estimated. If the price changes more than {slippageTolerance}% your transaction will revert.',
    confirmTitle: 'You will receive',
    shareOfPool: 'Share of pool after transaction',
    locked: '{percent} of your pool is in staking',
  },
  tokens: {
    title: 'Listed Tokens',
    symbol: 'Symbol',
    name: 'Name',
    assetId: 'Asset ID',
  },
  dexSettings: {
    title: 'Transaction settings',
    marketAlgorithm: '@.upper:marketAlgorithmText',
    marketAlgorithms: {
      SMART:
        '<span class="algorithm">SMART</span> liquidity routing ensures the best price for any transaction by combining only the best price options from all available markets. When available, Token Bonding Curve (<span class="algorithm">TBC</span>) will be used for liquidity as long as the asset price is more affordable than from other sources, upon which the <span class="algorithm">XYK</span> pool is utilized.',
      TBC: '<span class="algorithm">TBC</span> — buying only from the Token Bonding Curve (Primary Market). There is a possibility that the price can become unfavorable compared to the <span class="algorithm">XYK</span> pool (Secondary Market), but the value received from the vested rewards might turn out to be much more favorable over time.',
      XYK: '<span class="algorithm">XYK</span> — buying only from the XYK Pool (Secondary Market). Traditional XYK pool swap.',
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
    custom: 'CUSTOM',
    transactionDeadline: 'TRANSACTION DEADLINE',
    transactionDeadlineHint: 'Transaction will be cancelled if it is pending for more than this long.',
    nodeAddress: 'NODE ADDRESS',
    ip: 'IP',
    port: 'PORT',
    min: 'MIN',
  },
  resultDialog: {
    title: 'Transaction submitted',
    ok: 'OK',
  },
  rewards: {
    [RewardsTabsItems.Rewards]: 'Rewards',
    [RewardsTabsItems.ReferralProgram]: '@:referralProgram.title',
    changeAccount: '@:changeAccountText',
    connected: '@:connectedText',
    networkFee: '@:networkFeeText',
    networkFeeTooltip: '@:networkFeeTooltipText',
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
      extension: 'polkadot{.js} browser extension',
      accounts: 'your @:soraText and @:ethereumText accounts respectively',
    },
    hint: {
      connectExternalAccount: 'Connect an @:ethereumText account to check for available PSWAP and VAL rewards.',
      connectAccounts:
        'To claim your PSWAP and VAL rewards you need to connect both your @:soraText and @:ethereumText accounts.',
      connectAnotherAccount: 'Connect another @:ethereumText account to check for available PSWAP and VAL rewards.',
      howToClaimRewards:
        'To claim your {symbols} rewards you need to sign {count} {transactions} in {destination}. Rewards will be deposited to your @:soraText account.',
    },
    action: {
      connectWallet: '@:connectWalletText',
      connectExternalWallet: 'Connect @:ethereumText account',
      signAndClaim: 'Sign and claim',
      pendingInternal: '@:soraText transaction pending...',
      pendingExternal: '@:ethereumText transaction pending...',
      retry: '@:retryText',
      checkRewards: 'Check',
      insufficientBalance: '@:insufficientBalanceText',
    },
    notification: {
      empty: 'No available claims for this account',
    },
    events: {
      [RewardingEvents.XorErc20]: 'XOR ERC-20',
      [RewardingEvents.SoraFarmHarvest]: '@:(soraText).farm harvest',
      [RewardingEvents.NftAirdrop]: 'NFT Airdrop',
      [RewardingEvents.LiquidityProvision]: 'Fees gained from liquidity provision',
      [RewardingEvents.BuyOnBondingCurve]: 'buying from the TBC',
      [RewardingEvents.MarketMakerVolume]: 'Market Making',
      [RewardingEvents.LiquidityProvisionFarming]: 'Farming',
    },
    groups: {
      strategic: 'Strategic Rewards',
      external: 'Rewards for the connected ethereum account',
      crowdloan: 'Crowdloan rewards',
    },
  },
  moonpay: {
    notifications: {
      [MoonpayNotifications.Success]: {
        title: 'Tokens purchased',
        text: 'Token purchase is finished. The HASHI bridge transaction will start automatically as soon as the tokens have been received in the connected Ethereum account. It is safe to close this window and continue using Polkaswap. There will be a notification about the bridge transaction when ready.',
      },
      [MoonpayNotifications.SupportError]: {
        title: 'Token not supported',
        text: 'Unfortunately the token purchased via @:moonpayText is not yet supported by the HASHI bridge in Polkaswap. Normally only the supported tokens should be available for purchase via @:moonpayText in Polkaswap, hence something must have gone wrong somewhere. Please don’t hesitate to let the community know about this case in the <a class="link" href="https://t.me/polkaswap" target="_blank" rel="nofollow noopener" title="@:appName">Polkaswap Telegram group</a>',
      },
      [MoonpayNotifications.FeeError]: {
        title: 'Not enough ETH for the bridge tx',
        text: 'Unfortunately the HASHI bridge transaction has failed due to there not being enough ETH to pay for the Ethereum network transation fees. Please add more ETH and try again.',
      },
      [MoonpayNotifications.TransactionError]: {
        title: 'Transaction has failed',
        text: 'Unfortunately it appears that the @:moonpayText transaction has failed. Please try again. For @:moonpayText support go to <a class="link" href="https://support.moonpay.com" target="_blank" rel="nofollow noopener" title="@:moonpayText">https://support.moonpay.com</a>',
      },
      [MoonpayNotifications.AmountError]: {
        title: 'Insufficient balance',
        text: 'Unfortunately the HASHI bridge transaction has failed due to there not being enough tokens for transaction. Please check your Ethereum account balance and try again.',
      },
      [MoonpayNotifications.AccountAddressError]: {
        title: 'Wrong Ethereum account',
        text: 'Unfortunately, the HASHI bridge transaction failed due to the recipient address of the tokens in the @:moonpayText order does not match your current Ethereum account address. Please switch Ethereum account in extension and try again.',
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
      empty: 'No data',
    },
    confirmations: {
      txReady: 'Transaction Ready For Bridge',
    },
  },
  marketMakerCountdown: {
    title: 'Market Maker Countdown',
    blocks: 'blocks',
    daysLeft: 'days left',
    txs: 'TXs',
    volume: 'MM TX volume',
    description:
      '20 million PSWAP / month will be distributed to market makers with at least 500 tx / month valued over 1 XOR.',
  },
  confirmNextTxFailure: {
    header: 'Attention',
    info: 'Your XOR balance will be less than {fee} XOR after this transaction. You won’t be able to pay for the network fee for another transaction.',
    payoff:
      'You would have to use the Bridge to get XOR from other networks, get sent XOR from another SORA account, or swap any other token already in your account into XOR.',
    button: 'Yes, I understand the risk',
  },
  provider: {
    default: '@:ethereumText provider',
    metamask: '@:metamask',
    messages: {
      checkExtension: '{name} extension is busy, please check it',
      extensionLogin: 'Please login to your {name} extension',
      installExtension:
        '{name} extension is not found. Please install it!\n\nAlready installed extension? Please reload the page',
      reloadPage: 'Reload page',
    },
  },
  referralProgram: {
    title: 'Referral Program',
    connectAccount: 'To invite users you need to connect your SORA account.',
    bondedXOR: 'XOR Bonded',
    referralsNumber: '{number} referrals',
    startInviting: 'To start inviting, bond any amount of XOR.',
    insufficientBondedAmount: 'To invite more referrals, bond at least {inviteUserFee} XOR',
    preview:
      'Invite new users and get 10% from their transaction fees.<br />To start, bond any amount of XOR. <a href="#" target="_blank" rel="nofollow noopener" class="link" title="Learn more">Learn more</a>',
    deposit: 'Deposit',
    balance: 'Balance',
    networkFee: '@:networkFeeText',
    networkFeeTooltip: '@:networkFeeTooltipText',
    insufficientBalance: '@:insufficientBalanceText',
    insufficientBondedBalance: 'Insufficient bonded balance',
    action: {
      connectWallet: '@:connectWalletText',
      empty: 'Enter amount of {tokenSymbol}',
      startInviting: 'Bond {tokenSymbol} to start inviting',
      bondMore: 'Bond More',
      bond: 'Bond',
      unbond: 'Unbond',
      copyLink: 'Copy link',
    },
    transactionDetails: 'Transaction Details',
    receivedRewards: 'Received rewards',
    invitationLink: 'Invitation link',
    successCopy: 'Referral link is copied to the clipboard',
    bondTitle: 'Bond XOR',
    unbondTitle: 'Unbond XOR',
    confirm: {
      text: '@:confirmText',
      bond: 'Confirm bond',
      unbond: 'Confirm unbond',
      inviteTitle: 'You have been invited to Polkaswap',
      inviteDescription:
        'For every transaction, 10% of the fee will go to your referrer, without any extra cost to you.',
      signInvitation: 'Approve',
      freeOfCharge: 'This action is free of charge',
      hasReferrerTitle: 'You’ve already set your referrer',
      hasReferrerDescription: 'Unfortunately, you can only set one',
      ok: 'OK',
    },
  },
  mobilePopup: {
    sideMenu: 'Get SORA Wallet',
    header: 'Download SORA Wallet with <span class="popup-info__headline--highlight">Polkaswap</span> features',
    info: 'Swap tokens from different networks - SORA, Ethereum, Polkadot, Kusama. Provide liquidity pool and earn % from exchange fees.',
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
      stake: '{symbol} staked',
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
  staking: {
    title: 'Staking',
  },
  code: {
    download: 'Download QR Code',
    upload: 'Scan QR',
    receive: 'Receive',
    invalid: 'Invalid QR Code',
    import: 'Import an image',
    scan: 'Scan with camera',
    allowanceError: 'Check your camera availability and browser permissions to use it',
  },
  browserNotificationDialog: {
    title: 'Enable browser notifications',
    info: 'We will send you only relevant updates about your wallet, for example: asset balance changes',
    enable: 'Enable notifications',
    agree: 'Yes, I understand',
    notificationBlocked:
      "To receive the notifications about {appName}, please, allow the notifications in your browser's native settings",
    pointer: 'Press “Allow” to turn notifications on',
  },
  assetDeposit: 'Asset balance has been deposited',
  ofText: '{first} of {second}',
  accountAddressText: 'Account address',
};
