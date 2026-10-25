import { ref } from 'vue';

/**
 * Tracks asset selection async state (replacement for `TokenSelectMixin`).
 */
export function useTokenSelect() {
  const isSelectAssetLoading = ref(false);

  const withSelectAssetLoading = async (handler: FnWithoutArgs | AsyncFnWithoutArgs) => {
    isSelectAssetLoading.value = true;

    try {
      await handler();
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      isSelectAssetLoading.value = false;
    }
  };

  return {
    isSelectAssetLoading,
    withSelectAssetLoading,
  };
}

export type TokenSelectComposable = ReturnType<typeof useTokenSelect>;
