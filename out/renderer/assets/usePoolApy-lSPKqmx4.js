import { l as loadWalletCore, h as computed, x as useNumberFormatter, s as store } from "./index-73GArslZ.js";
const { api } = await loadWalletCore();
const { getFPNumberFromCodec, Hundred } = useNumberFormatter();
function usePoolApy() {
  const poolApyObject = computed(() => store.state.pool.poolApyObject);
  const getPoolApy = (baseAssetAddress, targetAssetAddress) => {
    if (!(baseAssetAddress && targetAssetAddress)) return null;
    const poolInfo = api.poolXyk.getInfo(baseAssetAddress, targetAssetAddress);
    if (!poolInfo?.address) return null;
    return poolApyObject.value[poolInfo.address] ?? null;
  };
  const getPoolApyFormatted = (baseAssetAddress, targetAssetAddress) => {
    const apy = getPoolApy(baseAssetAddress, targetAssetAddress);
    if (!apy) return "";
    return `${getFPNumberFromCodec(apy).mul(Hundred).toLocaleString()}%`;
  };
  return {
    poolApyObject,
    getPoolApy,
    getPoolApyFormatted
  };
}
export {
  usePoolApy as u
};
