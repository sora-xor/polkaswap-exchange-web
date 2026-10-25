/**
 * Reloads the current browser page. Extracted into a helper so unit tests can
 * spy on the side effect without mutating `window.location` directly.
 */
export function reloadPage(): void {
  window.location.reload();
}
