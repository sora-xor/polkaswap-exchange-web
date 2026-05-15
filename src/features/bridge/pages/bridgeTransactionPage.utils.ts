import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';

const soraPendingStates = new Set<unknown>([ETH_BRIDGE_STATES.SORA_SUBMITTED, ETH_BRIDGE_STATES.SORA_PENDING]);
const externalPendingStates = new Set<unknown>([ETH_BRIDGE_STATES.EVM_SUBMITTED, ETH_BRIDGE_STATES.EVM_PENDING]);

/**
 * Builds the accessible label for a bridge address row by pairing the transfer
 * direction with the network-specific account label.
 */
export function buildBridgeAddressAriaLabel(direction: string, networkAddressLabel: string): string {
  return [direction.trim(), networkAddressLabel.trim()].filter(Boolean).join(': ');
}

/**
 * Detects legacy ETH bridge states that are still waiting on the SORA-side
 * transaction or request approval before the EVM leg can continue.
 */
export function isBridgeWaitingForSoraConfirmation(transactionState: unknown): boolean {
  return soraPendingStates.has(transactionState);
}

/**
 * Resolves the network name shown in the disabled pending action. Legacy ETH
 * transfers have explicit SORA and EVM phases; single-step bridge variants fall
 * back to the transfer source network.
 */
export function resolveBridgePendingNetworkName({
  transactionState,
  isOutgoing,
  internalNetworkName,
  externalNetworkName,
}: {
  transactionState: unknown;
  isOutgoing: boolean;
  internalNetworkName: string;
  externalNetworkName: string;
}): string {
  const internalName = internalNetworkName.trim();
  const externalName = externalNetworkName.trim();

  if (soraPendingStates.has(transactionState)) return internalName;
  if (externalPendingStates.has(transactionState)) return externalName || internalName;

  return isOutgoing ? internalName : externalName || internalName;
}
