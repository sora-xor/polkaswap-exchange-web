export enum BridgeTxDirection {
  Outgoing = 'Outgoing',
  Incoming = 'Incoming',
}

export enum BridgeTxStatus {
  // Common statuses
  Done = 'Done',
  Failed = 'Failed',
  Pending = 'Pending',
  // Eth bridge statuses
  Ready = 'ApprovalsReady',
  Frozen = 'Frozen',
  Broken = 'Broken',
}

export enum BridgeNetworkType {
  Eth = 'EVMLegacy',
  Evm = 'EVM',
  Sub = 'Sub',
}

export enum BridgeAccountType {
  Evm = 'EVM',
  Sora = 'Sora',
  Parachain = 'Parachain',
  Liberland = 'Liberland',
  Unknown = 'Unknown',
}
