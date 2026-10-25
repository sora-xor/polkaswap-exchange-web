type ResolveParentLoadingByConnectionParams = {
  transactionLoading: boolean;
  nodeConnected: boolean;
  nodeGateExpired: boolean;
  hasNodeConfiguration: boolean;
};

/**
 * Resolves global route loading state by combining transaction-level loading
 * and an initial, time-bounded node bootstrap gate.
 */
export function resolveParentLoadingByConnection({
  transactionLoading,
  nodeConnected,
  nodeGateExpired,
  hasNodeConfiguration,
}: ResolveParentLoadingByConnectionParams): boolean {
  const nodeBootstrapLoading = hasNodeConfiguration && !nodeConnected && !nodeGateExpired;
  const staleBootstrapTransactionLoading = transactionLoading && !nodeConnected && nodeGateExpired;
  const transactionUiLoading = transactionLoading && !staleBootstrapTransactionLoading;
  return transactionUiLoading || nodeBootstrapLoading;
}
