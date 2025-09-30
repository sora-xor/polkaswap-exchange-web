import { EvmNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/evm/consts';

import INTERNAL_ABI from '@/abi/ethereum/internal/MASTER.json';
import BRIDGE_ABI from '@/abi/ethereum/other/BRIDGE.json';
import ERC20_ABI from '@/abi/ethereum/other/ERC20.json';
import type { NetworkData } from '@/types/bridge';

import type { EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';

// Temporary extension until SDK exposes Arbitrum Sepolia id
// TODO: Replace with SDK-provided enum when available
export const EvmNetworkIdExt = Object.freeze({
  ArbitrumSepoliaTestnet: 421614,
});

export enum EvmLinkType {
  Account = 'Account',
  Transaction = 'Transaction',
}

export enum KnownEthBridgeAsset {
  VAL = 'VAL',
  XOR = 'XOR',
  Other = 'OTHER',
}

export enum SmartContractType {
  EthBridge = 'ETH_BRIDGE',
  ERC20 = 'ERC20',
}

export const SmartContracts = {
  [SmartContractType.EthBridge]: {
    [KnownEthBridgeAsset.XOR]: INTERNAL_ABI,
    [KnownEthBridgeAsset.VAL]: INTERNAL_ABI,
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
    endpointUrls: ['https://mainnet.infura.io/v3/', 'https://rpc.ankr.com/eth'],
    blockExplorerUrls: ['https://etherscan.io'],
    shortName: 'Ethereum',
  },
  [EvmNetworkId.EthereumSepolia]: {
    id: EvmNetworkId.EthereumSepolia,
    name: 'Ethereum Sepolia Testnet',
    nativeCurrency: {
      name: 'SepoliaETH',
      symbol: 'ETH',
      decimals: 18,
    },
    endpointUrls: ['https://sepolia.infura.io/v3/', 'https://rpc.sepolia.org'],
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
  // Arbitrum Sepolia Testnet (temporary local id until SDK exposes it)
  // TODO: Deploy bridge contracts on Arbitrum Sepolia and update ETH_BRIDGE addresses in env.json when ready
  // @ts-expect-error: temporary numeric key until SDK provides enum
  [EvmNetworkIdExt.ArbitrumSepoliaTestnet as unknown as EvmNetwork]: {
    // @ts-expect-error: see above comment
    id: EvmNetworkIdExt.ArbitrumSepoliaTestnet,
    name: 'Arbitrum Sepolia Testnet',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    endpointUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://sepolia.arbiscan.io'],
    shortName: 'Arb Sepolia',
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
