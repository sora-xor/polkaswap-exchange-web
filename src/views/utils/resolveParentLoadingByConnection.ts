type ResolveParentLoadingByConnectionParams = {
  transactionLoading: boolean;
  nodeConnected: boolean;
  nodeGateExpired: boolean;
  hasNodeConfiguration: boolean;
};

/**
 * Resolves global route loading state by combining transaction-level loading
 * and an initial, time-bounded node bootstrap gate.
 *
 * The node gate prevents a flash during startup but must not block the UI
 * indefinitely when RPC nodes are temporarily unreachable.
 *
 * `transactionLoading` can be reused for bootstrap work in App initialization.
 * When the app is still disconnected and the node gate already expired, we
 * treat this loading as stale bootstrap state and do not block route rendering.
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
