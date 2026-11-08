import { BLOCK_PRODUCE_TIME_MS, ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';

/**
 * Time added to the peers' signing delay for the request's block to finalize (peers start their
 * timers only then) and for the signatures to reach a block.
 */
export const ETH_BRIDGE_APPROVAL_ALLOWANCE_MS = 30_000;

export type EthBridgeApprovalDelayProgress = {
  /** Expected share of the wait that has passed, 0-100. */
  percent: number;
  /** Expected milliseconds until the peers have signed; 0 once that estimate has passed. */
  remainingMs: number;
};

const soraPendingStates = new Set<unknown>([ETH_BRIDGE_STATES.SORA_SUBMITTED, ETH_BRIDGE_STATES.SORA_PENDING]);
const externalPendingStates = new Set<unknown>([ETH_BRIDGE_STATES.EVM_SUBMITTED, ETH_BRIDGE_STATES.EVM_PENDING]);
const externalConfirmationStates = new Set<unknown>([ETH_BRIDGE_STATES.EVM_SUBMITTED, ETH_BRIDGE_STATES.EVM_REJECTED]);

/**
 * Builds the accessible label for a bridge address row by pairing the transfer
 * direction with the network-specific account label.
 */
export function buildBridgeAddressAriaLabel(direction: string, networkAddressLabel: string): string {
  return [direction.trim(), networkAddressLabel.trim()].filter(Boolean).join(': ');
}

/**
 * Determines whether the current transaction phase can ask the external wallet
 * to sign. EVM bridge flows can require that wallet in multiple phases; a
 * Substrate bridge only needs it for an unsigned incoming transfer.
 */
export function requiresBridgeExternalAccountMatch({
  isEvmTransaction,
  isSubTransaction,
  isOutgoing,
  isUnsigned,
}: {
  isEvmTransaction: boolean;
  isSubTransaction: boolean;
  isOutgoing: boolean;
  isUnsigned: boolean;
}): boolean {
  return isEvmTransaction || (isSubTransaction && !isOutgoing && isUnsigned);
}

/**
 * Requires the external network when the next action can sign there. An
 * outgoing Hashi transfer needs Ethereum again after SORA approval, while
 * SORA approval and already-submitted incoming transfers can be tracked
 * without changing the external wallet's network.
 */
export function requiresBridgeExternalNetworkMatch({
  isEvmTransaction,
  isOutgoing,
  isUnsigned,
  transactionState,
}: {
  isEvmTransaction: boolean;
  isOutgoing: boolean;
  isUnsigned: boolean;
  transactionState: unknown;
}): boolean {
  if (!isOutgoing) return isUnsigned;

  return isEvmTransaction && externalConfirmationStates.has(transactionState);
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

/**
 * Estimates how far an outgoing Hashi request is through the bridge peers' signing delay.
 * Elapsed time is counted in SORA blocks since the request was registered, so neither the
 * browser clock nor block timestamps are involved. Returns `null` when there is nothing to show:
 * no delay on the connected runtime, or an unknown request or block height.
 */
export function getEthBridgeApprovalDelayProgress({
  delayMs,
  submissionHeight,
  currentBlockNumber,
  blockTimeMs = BLOCK_PRODUCE_TIME_MS,
  allowanceMs = ETH_BRIDGE_APPROVAL_ALLOWANCE_MS,
}: {
  delayMs: number;
  submissionHeight: number;
  currentBlockNumber: number;
  blockTimeMs?: number;
  allowanceMs?: number;
}): EthBridgeApprovalDelayProgress | null {
  if (!(delayMs > 0 && submissionHeight > 0 && currentBlockNumber > 0 && blockTimeMs > 0)) return null;

  const totalMs = delayMs + Math.max(allowanceMs, 0);
  const elapsedMs = Math.max(currentBlockNumber - submissionHeight, 0) * blockTimeMs;
  const remainingMs = Math.max(totalMs - elapsedMs, 0);

  return {
    percent: Math.min(Math.floor((elapsedMs * 100) / totalMs), 100),
    remainingMs,
  };
}

/**
 * Formats a countdown as `m:ss`, rounding up to whole seconds so it reaches `0:00` only when
 * the wait is over.
 */
export function formatBridgeCountdown(ms: number): string {
  const totalSeconds = Number.isFinite(ms) ? Math.max(Math.ceil(ms / 1000), 0) : 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
