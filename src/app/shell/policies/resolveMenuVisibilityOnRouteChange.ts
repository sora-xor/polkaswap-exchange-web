/**
 * Ensures sidebar overlays do not remain mounted across route transitions.
 * Returning `false` on actual route changes prevents stale sidebars from intercepting clicks.
 */
export function resolveMenuVisibilityOnRouteChange(
  isMenuVisible: boolean,
  previousFullPath: string | undefined,
  nextFullPath: string | undefined
): boolean {
  if (!isMenuVisible) return false;
  if (!nextFullPath || previousFullPath === nextFullPath) return isMenuVisible;
  return false;
}
