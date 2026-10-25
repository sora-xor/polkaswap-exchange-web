/**
 * Ensures route-scoped dialogs do not remain mounted after route transitions.
 * Returning `false` on actual route changes prevents stale modal hitboxes from intercepting clicks.
 */
export function resolveDialogVisibilityOnRouteChange(
  isDialogVisible: boolean,
  previousFullPath: string | undefined,
  nextFullPath: string | undefined
): boolean {
  if (!isDialogVisible) return false;
  if (!nextFullPath || previousFullPath === nextFullPath) return isDialogVisible;
  return false;
}
