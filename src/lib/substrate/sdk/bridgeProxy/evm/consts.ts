export enum EvmNetworkId {
  // ETH
  EthereumMainnet = 1,
  EthereumRopsten = 3,
  EthereumRinkeby = 4,
  EthereumGoerli = 5,
  EthereumKovan = 42,
  EthereumSepolia = 11155111,
  // Binance Smart Chain
  BinanceSmartChainMainnet = 56,
  BinanceSmartChainTestnet = 97,
  // Ethereum Classic
  EthereumClassicMainnet = 61,
  EthereumClassicTestnetMordor = 63,
  // Polygon
  PolygonMainnet = 137,
  PolygonTestnetMumbai = 80001,
  // Klaytn
  KlaytnMainnet = 8217,
  KlaytnTestnetBaobab = 1001,
  // Avalanche
  AvalancheMainnet = 43114,
  AvalancheTestnetFuji = 43113,
  // Arbitrum
  ArbitrumMainnet = 42161,
  ArbitrumGoerliTestnet = 421613,
  // Fantom
  FantomMainnet = 250,
  FantomTestnet = 4002,
}

export enum EvmAppKinds {
  EthApp = 'EthApp',
  ERC20App = 'ERC20App',
  SidechainApp = 'SidechainApp',
  HashiBridge = 'HashiBridge',
  XorMaster = 'XorMaster',
  ValMaster = 'ValMaster',
}
