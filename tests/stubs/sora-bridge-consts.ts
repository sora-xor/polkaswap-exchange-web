export const BridgeTxStatus = {
  Pending: 'Pending',
  Completed: 'Completed',
  Failed: 'Failed',
} as const;

export const BridgeTxDirection = {
  Incoming: 'Incoming',
  Outgoing: 'Outgoing',
} as const;

export const BridgeNetworkType = {
  Eth: 'eth',
  Evm: 'evm',
  Sub: 'sub',
} as const;

export default {
  BridgeTxStatus,
  BridgeTxDirection,
  BridgeNetworkType,
};
