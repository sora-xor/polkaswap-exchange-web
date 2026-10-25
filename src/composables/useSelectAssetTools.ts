import { useAssets } from '@/composables/useAssets';

/**
 * Backwards-compatible helper that now proxies to {@link useAssets}.
 */
export function useSelectAssetTools() {
  const { sortByBalance, getAssetsWithBalances } = useAssets();

  return {
    sortByBalance,
    getAssetsWithBalances,
  };
}

export type SelectAssetToolsComposable = ReturnType<typeof useSelectAssetTools>;
