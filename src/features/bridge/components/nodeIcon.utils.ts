import { Status } from '@soramitsu-ui/ui/types';
import type { NodesConnection } from '@/utils/connection';

/**
 * Determines whether the bridge connection is currently establishing a link.
 */
export function isNodeConnecting(connection: Nullable<NodesConnection>): boolean {
  return Boolean(connection?.nodeAddressConnecting);
}

/**
 * Determines whether the bridge connection is already established.
 */
export function isNodeConnected(connection: Nullable<NodesConnection>): boolean {
  return Boolean(connection?.nodeIsConnected);
}

/**
 * Resolves the Soramitsu status badge for a given connection state.
 */
export function resolveNodeStatus(connection: Nullable<NodesConnection>) {
  if (isNodeConnected(connection)) return Status.SUCCESS;
  if (isNodeConnecting(connection)) return Status.INFO;
  return Status.ERROR;
}

/**
 * Returns the icon name that should be displayed for the current connection state.
 */
export function resolveNodeIcon(connection: Nullable<NodesConnection>): string {
  return isNodeConnecting(connection) ? 'el-icon-loading' : 'globe-16';
}
