export enum SubAssetKind {
  Thischain = 'Thischain',
  Sidechain = 'Sidechain',
}

export enum SubNetworkId {
  /** SORA  */
  Mainnet = 'Mainnet',
  /** Polkadot relaychain */
  Polkadot = 'Polkadot',
  /** SORA parachain in Polkadot relaychain */
  PolkadotSora = 'PolkadotSora',
  /** Acala parachain in Polkadot relaychain */
  PolkadotAcala = 'PolkadotAcala',
  /** AssetHub parachain in Polkadot relaychain */
  PolkadotAssetHub = 'PolkadotAssetHub',
  /** Astar parachain in Polkadot relaychain */
  PolkadotAstar = 'PolkadotAstar',
  /** Moonbeam parachain in Polkadot relaychain */
  PolkadotMoonbeam = 'PolkadotMoonbeam',
  /** Kusama relaychain */
  Kusama = 'Kusama',
  /** AssetHub parachain in Kusama relaychain */
  KusamaAssetHub = 'KusamaAssetHub',
  /** Curio parachain in Kusama relaychain */
  KusamaCurio = 'KusamaCurio',
  /** SORA parachain in Kusama relaychain */
  KusamaSora = 'KusamaSora',
  /** Shiden parachain in Kusama relaychain (Astar ecosystem) */
  KusamaShiden = 'KusamaShiden',
  /** Rococo relaychain (Kusama testnet) */
  Rococo = 'Rococo',
  /** SORA parachain in Rococo relaychain */
  RococoSora = 'RococoSora',
  /** `Alphanet` relaychain (testnet) */
  Alphanet = 'Alphanet',
  /** SORA parachain in `Alphanet` relaychain */
  AlphanetSora = 'AlphanetSora',
  /** Moonbase parachain in Alphanet relaychain.
   *  Account address in Moonbase parachain has EVM like format.
   *
   * Token transfer routes between Mainnet `SORA` & `AlphanetMoonbase`:
   * 1. Native for Alphanet relaychain: `Mainnet` <-> `AlphanetSora` <-> `Alphanet` <-> `AlphanetMoonbase`
   * 2. Another: `Mainnet` <-> `AlphanetSora` <-> `AlphanetMoonbase`
   */
  AlphanetMoonbase = 'AlphanetMoonbase',
  /** `Liberland` - Standalone Substrate network */
  Liberland = 'Liberland',
}

export const SubEvmNetworks = [SubNetworkId.AlphanetMoonbase] as const;

export const SoraParachains = [
  SubNetworkId.PolkadotSora,
  SubNetworkId.KusamaSora,
  SubNetworkId.RococoSora,
  SubNetworkId.AlphanetSora,
] as const;

export const PolkadotParachains = [
  SubNetworkId.PolkadotSora,
  SubNetworkId.PolkadotAcala,
  SubNetworkId.PolkadotAssetHub,
  SubNetworkId.PolkadotAstar,
  SubNetworkId.PolkadotMoonbeam,
] as const;

export const KusamaParachains = [
  SubNetworkId.KusamaSora,
  SubNetworkId.KusamaAssetHub,
  SubNetworkId.KusamaCurio,
  SubNetworkId.KusamaShiden,
] as const;

export const AlphanetParachains = [SubNetworkId.AlphanetSora, SubNetworkId.AlphanetMoonbase] as const;

export const RococoParachains = [SubNetworkId.RococoSora] as const;

export const Relaychains = [
  SubNetworkId.Polkadot,
  SubNetworkId.Kusama,
  SubNetworkId.Rococo,
  SubNetworkId.Alphanet,
] as const;

export const Parachains = [
  ...PolkadotParachains,
  ...KusamaParachains,
  ...AlphanetParachains,
  ...RococoParachains,
] as const;

export const Standalones = [SubNetworkId.Liberland] as const;

export enum XcmVersionedMultiLocation {
  V2 = 'V2',
  V3 = 'V3',
}

// V2 & V3
export enum XcmMultilocationJunction {
  X1 = 'X1',
  X2 = 'X2',
  X3 = 'X3',
  X4 = 'X4',
  X5 = 'X5',
  X6 = 'X6',
  X7 = 'X7',
  X8 = 'X8',
  Here = 'Here',
}

// V2 & V3
export enum XcmJunction {
  Parachain = 'Parachain',
  AccountId32 = 'AccountId32',
  AccountIndex64 = 'AccountIndex64',
  AccountKey20 = 'AccountKey20',
  PalletInstance = 'PalletInstance',
  GeneralIndex = 'GeneralIndex',
  GeneralKey = 'GeneralKey',
  OnlyChild = 'OnlyChild',
  Plurality = 'Plurality',
  GlobalConsensus = 'GlobalConsensus',
}

// XcmV2NetworkId
export enum XcmV2NetworkId {
  Any = 'Any',
  Named = 'Named',
  Polkadot = 'Polkadot',
  Kusama = 'Kusama',
}

// XcmV3JunctionNetworkId
export enum XcmV3NetworkId {
  ByGenesis = 'ByGenesis',
  ByFork = 'ByFork',
  Polkadot = 'Polkadot',
  Kusama = 'Kusama',
  Westend = 'Westend',
  Rococo = 'Rococo',
  Wococo = 'Wococo',
  Ethereum = 'Ethereum',
  BitcoinCore = 'BitcoinCore',
  BitcoinCash = 'BitcoinCash',
}

// XcmV2BodyId
export enum XcmV2BodyId {
  Unit = 'Unit',
  Named = 'Named',
  Index = 'Index',
  Executive = 'Executive',
  Technical = 'Technical',
  Legislative = 'Legislative',
  Judicial = 'Judicial',
  Defense = 'Defense',
  Administration = 'Administration',
  Treasury = 'Treasury',
}

// XcmV3JunctionBodyId
export enum XcmV3BodyId {
  Unit = 'Unit',
  Moniker = 'Moniker',
  Index = 'Index',
  Executive = 'Executive',
  Technical = 'Technical',
  Legislative = 'Legislative',
  Judicial = 'Judicial',
  Defense = 'Defense',
  Administration = 'Administration',
  Treasury = 'Treasury',
}

// XcmV2BodyPart
// XcmV3JunctionBodyPart
export enum XcmBodyPart {
  Voice = 'Voice',
  Members = 'Members',
  Fraction = 'Fraction',
  AtLeastProportion = 'AtLeastProportion',
  MoreThanProportion = 'MoreThanProportion',
}

export enum LiberlandAssetType {
  LLD = 'LLD',
  Asset = 'Asset',
}
