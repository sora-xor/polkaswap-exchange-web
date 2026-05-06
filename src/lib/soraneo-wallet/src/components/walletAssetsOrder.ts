/**
 * Reapplies a reordered visible asset subset to the full wallet asset order.
 * Hidden assets keep their current slots so filter changes do not create visual
 * gaps or reorder assets that were not part of the drag interaction.
 */
export function mergeVisibleAssetOrder<T>(
  currentAssets: T[],
  sortedVisibleAssets: T[],
  isVisible: (asset: T) => boolean
): T[] {
  if (!sortedVisibleAssets.length) {
    return currentAssets;
  }

  const visibleQueue = [...sortedVisibleAssets];

  return currentAssets.map((asset) => (isVisible(asset) ? (visibleQueue.shift() ?? asset) : asset));
}
