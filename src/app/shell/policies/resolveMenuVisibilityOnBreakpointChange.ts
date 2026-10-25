/**
 * Keeps mobile menu visibility from leaking across viewport breakpoint changes.
 * When the breakpoint changes, force-close the sidebar overlay.
 */
export function resolveMenuVisibilityOnBreakpointChange(
  isMenuVisible: boolean,
  previousBreakpoint: string | undefined,
  nextBreakpoint: string | undefined
): boolean {
  if (!isMenuVisible) return false;
  if (!nextBreakpoint || previousBreakpoint === nextBreakpoint) return isMenuVisible;
  return false;
}
