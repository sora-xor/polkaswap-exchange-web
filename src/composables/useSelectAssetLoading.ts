import { ref } from 'vue';

export function useSelectAssetLoading() {
  const isSelectAssetLoading = ref<boolean>(false);

  const withSelectAssetLoading = async (func: FnWithoutArgs | AsyncFnWithoutArgs): Promise<void> => {
    isSelectAssetLoading.value = true;

    try {
      await func();
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      isSelectAssetLoading.value = false;
    }
  };

  return {
    isSelectAssetLoading,
    withSelectAssetLoading,
  };
}
