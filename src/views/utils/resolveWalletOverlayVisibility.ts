/**
 * Controls whether wallet-bound overlays should be mounted.
 * Overlays are available only after wallet bootstrap completes,
 * and are hidden during teardown to avoid stale modal state updates.
 */
export function resolveWalletOverlayVisibility(isWalletLoaded: boolean, isTearingDown: boolean): boolean {
  return isWalletLoaded && !isTearingDown;
}
