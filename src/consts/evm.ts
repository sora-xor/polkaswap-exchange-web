// TODO: move to js-lib
export enum EvmNetworkId {
  EthereumMainnet = 1,
  EthereumRopsten = 3,
  EthereumRinkeby = 4,
  EthereumGoerli = 5,
  EthereumKovan = 42,
  EthereumClassicMordor = 63,
  KlaytnBaobab = 1001,
  KlaytnCypress = 8217, // mainnet
}

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
  },
  [EvmNetworkId.EthereumClassicMordor]: {
    id: EvmNetworkId.EthereumClassicMordor,
    name: 'Ethereum Classic Mordor Testnet',
    nativeCurrency: {
      name: 'METC',
      symbol: 'ETC',
      decimals: 18,
    },
    rpcUrls: ['https://www.ethercluster.com/mordor'],
    blockExplorerUrls: ['https://blockscout.com/etc/mordor'],
  },
  [EvmNetworkId.KlaytnBaobab]: {
    id: EvmNetworkId.KlaytnBaobab,
    name: 'Klaytn Baobab Testnet',
    nativeCurrency: {
      name: 'KLAY',
      symbol: 'KLAY',
      decimals: 18,
    },
    rpcUrls: ['https://api.baobab.klaytn.net:8651/'],
    blockExplorerUrls: ['https://baobab.scope.klaytn.com/'],
  },
  [EvmNetworkId.KlaytnCypress]: {
    id: EvmNetworkId.KlaytnCypress,
    name: 'Klaytn Cypress Mainnet',
    nativeCurrency: {
      name: 'KLAY',
      symbol: 'KLAY',
      decimals: 18,
    },
    rpcUrls: ['https://public-node-api.klaytnapi.com/v1/cypress'],
    blockExplorerUrls: ['https://scope.klaytn.com'],
  },
};
