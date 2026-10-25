import { Operation } from '@sora-substrate/sdk';
import { BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';

/**
 * Resolves the SDK operation type for the selected bridge network and direction.
 */
export function resolveBridgeOperation(networkType: BridgeNetworkType, isSoraToEvm: boolean): Operation {
  switch (networkType) {
    case BridgeNetworkType.Eth:
      return isSoraToEvm ? Operation.EthBridgeOutgoing : Operation.EthBridgeIncoming;
    case BridgeNetworkType.Evm:
      return isSoraToEvm ? Operation.EvmOutgoing : Operation.EvmIncoming;
    default:
      return isSoraToEvm ? Operation.SubstrateOutgoing : Operation.SubstrateIncoming;
  }
}

/**
 * Normalizes the bridge network family stored on generated history records.
 */
export function resolveBridgeExternalNetworkType(networkType: BridgeNetworkType): BridgeNetworkType {
  switch (networkType) {
    case BridgeNetworkType.Sub:
      return BridgeNetworkType.Sub;
    case BridgeNetworkType.Evm:
      return BridgeNetworkType.Evm;
    default:
      return BridgeNetworkType.Eth;
  }
}
