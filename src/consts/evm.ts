import { EvmNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/evm/consts';

import BRIDGE_ABI from '@/abi/ethereum/other/BRIDGE.json';
import ERC20_ABI from '@/abi/ethereum/other/ERC20.json';
import type { NetworkData } from '@/types/bridge';

import type { EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';

export enum EvmLinkType {
  Account = 'Account',
  Transaction = 'Transaction',
}

export enum KnownEthBridgeAsset {
  Other = 'OTHER',
}

export enum SmartContractType {
  EthBridge = 'ETH_BRIDGE',
  ERC20 = 'ERC20',
}

export const SmartContracts = {
  [SmartContractType.EthBridge]: {
    [KnownEthBridgeAsset.Other]: BRIDGE_ABI,
  },
  [SmartContractType.ERC20]: ERC20_ABI,
};

// EVM networks data
// This data could be added to Metamask automatically using "switchOrAddChain" function
export const EVM_NETWORKS: Record<EvmNetwork, NetworkData> = {
  [EvmNetworkId.EthereumMainnet]: {
    id: EvmNetworkId.EthereumMainnet,
    name: 'Ethereum Mainnet',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    endpointUrls: ['https://mainnet.infura.io/v3/'],
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
    endpointUrls: ['https://ropsten.infura.io/v3/'],
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
    endpointUrls: ['https://rinkeby.infura.io/v3/'],
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
    endpointUrls: ['https://goerli.infura.io/v3/'],
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
    endpointUrls: ['https://kovan.infura.io/v3/'],
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
    endpointUrls: ['https://sepolia.infura.io/v3/'],
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
    endpointUrls: ['https://bsc-dataseed.binance.org/'],
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
    endpointUrls: ['https://bsc-testnet.publicnode.com'],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
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
    endpointUrls: ['https://etc.rivet.link/'],
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
    endpointUrls: ['https://www.ethercluster.com/mordor'],
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
    endpointUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
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
    endpointUrls: ['https://rpc-mumbai.maticvigil.com/'],
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
    endpointUrls: ['https://public-node-api.klaytnapi.com/v1/baobab'],
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
    endpointUrls: ['https://public-node-api.klaytnapi.com/v1/cypress'],
    blockExplorerUrls: ['https://scope.klaytn.com'],
    shortName: 'Cypress',
  },
  [EvmNetworkId.AvalancheMainnet]: {
    id: EvmNetworkId.AvalancheMainnet,
    name: 'Avalanche Mainnet C-Chain',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    },
    endpointUrls: ['https://api.avax.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://snowtrace.io'],
    shortName: 'C-Chain',
  },
  [EvmNetworkId.AvalancheTestnetFuji]: {
    id: EvmNetworkId.AvalancheTestnetFuji,
    name: 'Avalanche FUJI Testnet',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    },
    endpointUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://testnet.snowtrace.io'],
    shortName: 'FUJI',
  },
  [EvmNetworkId.ArbitrumMainnet]: {
    id: EvmNetworkId.ArbitrumMainnet,
    name: 'Arbitrum One Mainnet',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    endpointUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io'],
    shortName: 'Arbitrum',
  },
  [EvmNetworkId.ArbitrumGoerliTestnet]: {
    id: EvmNetworkId.ArbitrumGoerliTestnet,
    name: 'Arbitrum Goerli Testnet',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    endpointUrls: ['https://goerli-rollup.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://goerli.arbiscan.io'],
    shortName: 'Goerli',
  },
  [EvmNetworkId.FantomMainnet]: {
    id: EvmNetworkId.FantomMainnet,
    name: 'Fantom Opera',
    nativeCurrency: {
      name: 'Fantom',
      symbol: 'FTM',
      decimals: 18,
    },
    endpointUrls: ['https://rpc.ankr.com/fantom'],
    blockExplorerUrls: ['https://ftmscan.com'],
    shortName: 'Opera',
  },
  [EvmNetworkId.FantomTestnet]: {
    id: EvmNetworkId.FantomTestnet,
    name: 'Fantom Testnet',
    nativeCurrency: {
      name: 'Fantom',
      symbol: 'FTM',
      decimals: 18,
    },
    endpointUrls: ['https://rpc.testnet.fantom.network'],
    blockExplorerUrls: ['https://testnet.ftmscan.com'],
    shortName: 'FTM Test',
  },
};
