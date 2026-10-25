export enum EthNetwork {
  Ethereum = 0,
}

export enum EthAssetKind {
  Sidechain = 'Sidechain',
  SidechainOwned = 'SidechainOwned',
  Thischain = 'Thischain',
}

/**
 * Type of request which we will wait
 */
export enum EthRequestType {
  Transfer = 'Transfer',
  TransferXOR = 'TransferXOR',
  AddAsset = 'AddAsset',
  AddPeer = 'AddPeer',
  RemovePeer = 'RemovePeer',
  ClaimPswap = 'ClaimPswap',
  CancelOutgoingRequest = 'CancelOutgoingRequest',
  MarkAsDone = 'MarkAsDone',
}

/**
 * Type of currency for approval request next steps
 */
export enum EthCurrencyType {
  /** For `receiveBySidechainAssetId` */
  AssetId = 'AssetId',
  /** For `receievByEthereumAssetAddress` */
  TokenAddress = 'TokenAddress',
}
