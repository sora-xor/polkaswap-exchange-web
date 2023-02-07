import { EvmNetworkId } from '@sora-substrate/util/build/evm/consts';

export interface EvmNetworkData {
  id: EvmNetworkId;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  shortName: string;
}

export enum EvmLinkType {
  Account = 'Account',
  Transaction = 'Transaction',
}

// EVM networks data
// This data could be added to Metamask automatically using "switchOrAddChain" function
export const EVM_NETWORKS: Record<EvmNetworkId, EvmNetworkData> = {
  [EvmNetworkId.EthereumMainnet]: {
    id: EvmNetworkId.EthereumMainnet,
    name: 'Ethereum Mainnet',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://mainnet.infura.io/v3/'],
    blockExplorerUrls: ['https://etherscan.io'],
    shortName: 'Ethereum',
  },
  [EvmNetworkId.EthereumRopsten]: {
    id: EvmNetworkId.EthereumRopsten,
    name: 'Ethereum Ropsten Testnet',
    nativeCurrency: {
      name: 'RopstenETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://ropsten.infura.io/v3/'],
    blockExplorerUrls: ['https://ropsten.etherscan.io'],
    shortName: 'Ropsten',
  },
  [EvmNetworkId.EthereumRinkeby]: {
    id: EvmNetworkId.EthereumRinkeby,
    name: 'Ethereum Rinkeby Testnet',
    nativeCurrency: {
      name: 'RinkebyETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://rinkeby.infura.io/v3/'],
    blockExplorerUrls: ['https://rinkeby.etherscan.io'],
    shortName: 'Rinkeby',
  },
  [EvmNetworkId.EthereumGoerli]: {
    id: EvmNetworkId.EthereumGoerli,
    name: 'Ethereum Goerli Testnet',
    nativeCurrency: {
      name: 'GoerliETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://goerli.infura.io/v3/'],
    blockExplorerUrls: ['https://goerli.etherscan.io'],
    shortName: 'Goerli',
  },
  [EvmNetworkId.EthereumKovan]: {
    id: EvmNetworkId.EthereumKovan,
    name: 'Ethereum Kovan Testnet',
    nativeCurrency: {
      name: 'KovanETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://kovan.infura.io/v3/'],
    blockExplorerUrls: ['https://kovan.etherscan.io'],
    shortName: 'Kovan',
  },
  [EvmNetworkId.EthereumSepolia]: {
    id: EvmNetworkId.EthereumSepolia,
    name: 'Ethereum Sepolia Testnet',
    nativeCurrency: {
      name: 'SepoliaETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia.infura.io/v3/'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    shortName: 'Sepolia',
  },
  [EvmNetworkId.BinanceSmartChainMainnet]: {
    id: EvmNetworkId.BinanceSmartChainMainnet,
    name: 'Binance Smart Chain',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    rpcUrls: ['https://bsc-dataseed.binance.org/'],
    blockExplorerUrls: ['https://bscscan.com'],
    shortName: 'BSC',
  },
  [EvmNetworkId.BinanceSmartChainTestnet]: {
    id: EvmNetworkId.BinanceSmartChainTestnet,
    name: 'Binance Smart Chain Testnet',
    nativeCurrency: {
      name: 'tBNB',
      symbol: 'tBNB',
      decimals: 18,
    },
    rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
    blockExplorerUrls: ['https://testnet.bscscan.com/'],
    shortName: 'BSC Testnet',
  },
  [EvmNetworkId.EthereumClassicMainnet]: {
    id: EvmNetworkId.EthereumClassicMainnet,
    name: 'Ethereum Classic Mainnet',
    nativeCurrency: {
      name: 'ETC',
      symbol: 'ETC',
      decimals: 18,
    },
    rpcUrls: ['https://ethereumclassic.network'],
    blockExplorerUrls: ['https://blockscout.com/etc/mainnet'],
    shortName: 'ETC',
  },
  [EvmNetworkId.EthereumClassicTestnetMordor]: {
    id: EvmNetworkId.EthereumClassicTestnetMordor,
    name: 'Ethereum Classic Mordor Testnet',
    nativeCurrency: {
      name: 'METC',
      symbol: 'ETC',
      decimals: 18,
    },
    rpcUrls: ['https://www.ethercluster.com/mordor'],
    blockExplorerUrls: ['https://blockscout.com/etc/mordor'],
    shortName: 'Mordor',
  },
  [EvmNetworkId.PolygonMainnet]: {
    id: EvmNetworkId.PolygonMainnet,
    name: 'Polygon Mainnet',
    nativeCurrency: {
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://explorer.matic.network/'],
    shortName: 'Matic',
  },
  [EvmNetworkId.PolygonTestnetMumbai]: {
    id: EvmNetworkId.PolygonTestnetMumbai,
    name: 'Polygon Testnet Mumbai',
    nativeCurrency: {
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: ['https://rpc-mumbai.maticvigil.com'],
    blockExplorerUrls: ['https://mumbai.polygonscan.com'],
    shortName: 'Mumbai',
  },
  [EvmNetworkId.KlaytnTestnetBaobab]: {
    id: EvmNetworkId.KlaytnTestnetBaobab,
    name: 'Klaytn Testnet Baobab',
    nativeCurrency: {
      name: 'KLAY',
      symbol: 'KLAY',
      decimals: 18,
    },
    rpcUrls: ['https://api.baobab.klaytn.net:8651/'],
    blockExplorerUrls: ['https://baobab.scope.klaytn.com/'],
    shortName: 'Baobab',
  },
  [EvmNetworkId.KlaytnMainnet]: {
    id: EvmNetworkId.KlaytnMainnet,
    name: 'Klaytn Mainnet Cypress',
    nativeCurrency: {
      name: 'KLAY',
      symbol: 'KLAY',
      decimals: 18,
    },
    rpcUrls: ['https://public-node-api.klaytnapi.com/v1/cypress'],
    blockExplorerUrls: ['https://scope.klaytn.com'],
    shortName: 'Klaytn',
  },
  [EvmNetworkId.AvalancheMainnet]: {
    id: EvmNetworkId.AvalancheMainnet,
    name: 'Avalanche Mainnet C-Chain',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    },
    rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://snowtrace.io/'],
    shortName: 'Avalanche',
  },
  [EvmNetworkId.AvalancheTestnetFuji]: {
    id: EvmNetworkId.AvalancheTestnetFuji,
    name: 'Avalanche FUJI C-Chain',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    },
    rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://testnet.snowtrace.io/'],
    shortName: 'FUJI',
  },
};
