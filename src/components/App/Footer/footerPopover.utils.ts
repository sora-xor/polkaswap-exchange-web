type ResolvePopoverLeftParams = {
  currentLeft: string;
  popoverLeft: number;
  popoverRight: number;
  popoverWidth: number;
  viewportWidth: number;
  viewportPadding?: number;
};

/**
 * Returns `true` when the responsive breakpoint class changed between updates.
 * Footer popovers should close in this case to avoid stale positioning and overlay stacking.
 */
export function shouldClosePopoverOnBreakpointChange(
  previousBreakpoint: string | undefined,
  nextBreakpoint: string | undefined
): boolean {
  if (!previousBreakpoint || !nextBreakpoint) return false;
  return previousBreakpoint !== nextBreakpoint;
}

/**
 * Resolves a viewport-safe `left` offset for a popover.
 * Falls back to the measured popover left position when inline style cannot be parsed.
 */
export function resolvePopoverLeft({
  currentLeft,
  popoverLeft,
  popoverRight,
  popoverWidth,
  viewportWidth,
  viewportPadding = 8,
}: ResolvePopoverLeftParams): number {
  const parsedLeft = Number.parseFloat(currentLeft);
  const initialLeft = Number.isFinite(popoverLeft) ? popoverLeft : viewportPadding;
  const baseLeft = Number.isFinite(parsedLeft) ? parsedLeft : initialLeft;

  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return Math.round(baseLeft);

  const minLeft = viewportPadding;
  const maxRight = viewportWidth - viewportPadding;

  let nextLeft = baseLeft;

  if (popoverLeft < minLeft) {
    nextLeft += minLeft - popoverLeft;
  }

  if (popoverRight > maxRight) {
    nextLeft -= popoverRight - maxRight;
  }

  const maxLeft = viewportWidth - viewportPadding - popoverWidth;
  if (Number.isFinite(maxLeft) && maxLeft >= minLeft) {
    nextLeft = Math.min(Math.max(nextLeft, minLeft), maxLeft);
  } else {
    nextLeft = minLeft;
  }

  return Math.round(nextLeft);
}
