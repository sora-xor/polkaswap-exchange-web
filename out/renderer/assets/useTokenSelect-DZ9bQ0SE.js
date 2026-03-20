import { a9 as ref } from "./index-73GArslZ.js";
function useTokenSelect() {
  const isSelectAssetLoading = ref(false);
  const withSelectAssetLoading = async (handler) => {
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
    withSelectAssetLoading
  };
}
export {
  useTokenSelect as u
};
