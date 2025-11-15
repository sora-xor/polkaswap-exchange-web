export const EvmNetworkId = {
  EthereumMainnet: 1,
  EthereumSepolia: 11155111,
  BinanceSmartChainMainnet: 56,
  BinanceSmartChainTestnet: 97,
  EthereumClassicMainnet: 61,
  EthereumClassicTestnetMordor: 63,
  PolygonMainnet: 137,
  PolygonTestnetMumbai: 80001,
  KlaytnTestnetBaobab: 1001,
  KlaytnMainnet: 8217,
} as const;

export default {
  EvmNetworkId,
};
