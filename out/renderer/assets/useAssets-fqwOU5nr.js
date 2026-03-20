import { v as useWalletStore, H as useAssetsStore, h as computed, a9 as ref, aY as sortAssets } from "./index-73GArslZ.js";
function filterAssetsByQuery(assets, query, options = {}) {
  if (!query) return [...assets];
  const lowerQuery = query.trim().toLowerCase();
  const addressField = options.useExternalAddress ? "externalAddress" : "address";
  return assets.filter((asset) => {
    const nameMatches = asset.name?.toLowerCase?.().includes?.(lowerQuery) ?? false;
    const symbolMatches = asset.symbol?.toLowerCase?.().includes?.(lowerQuery) ?? false;
    const addressValue = asset[addressField];
    const addressMatches = addressValue?.toLowerCase?.() === lowerQuery;
    return nameMatches || symbolMatches || addressMatches;
  });
}
const isBalanceEmpty = (asset) => {
  const transferable = asset?.balance?.transferable ?? null;
  if (transferable === null || transferable === void 0) return true;
  return Number(transferable) === 0;
};
function useAssets(options = {}) {
  const walletStore = useWalletStore();
  const assetsStore = useAssetsStore();
  const excludedAddresses = computed(() => new Set(options.exclude ?? []));
  const compareByBalance = (a, b) => {
    const aEmpty = isBalanceEmpty(a);
    const bEmpty = isBalanceEmpty(b);
    if (aEmpty === bEmpty) {
      return sortAssets(a, b);
    }
    return aEmpty && !bEmpty ? 1 : -1;
  };
  const sortByBalance = compareByBalance;
  const accountAssets = computed(
    () => walletStore.accountAssets ?? []
  );
  const sortedAccountAssets = computed(
    () => accountAssets.value.filter((asset) => !excludedAddresses.value.has(asset.address)).slice().sort((a, b) => compareByBalance(a, b))
  );
  const search = ref("");
  const filteredAccountAssets = computed(() => {
    const baseList = options.includeZeroBalance === false ? sortedAccountAssets.value.filter((asset) => !isBalanceEmpty(asset)) : sortedAccountAssets.value;
    return filterAssetsByQuery(baseList, search.value, options.searchOptions);
  });
  const getAssetsWithBalances = (addresses, exclude = null) => {
    const exclusion = new Set(options.exclude ?? []);
    if (exclude) {
      const extra = Array.isArray(exclude) ? exclude : [exclude];
      extra.forEach((address) => exclusion.add(address));
    }
    const resolve = assetsStore.assetDataByAddress;
    const collection = [];
    addresses.forEach((address) => {
      if (exclusion.has(address)) return;
      const asset = resolve(address);
      if (asset) {
        collection.push(asset);
      }
    });
    return collection.sort((a, b) => compareByBalance(a, b));
  };
  const registeredAssets = computed(() => {
    const entries = assetsStore.registeredAssets ?? {};
    return getAssetsWithBalances(Object.keys(entries));
  });
  const filteredRegisteredAssets = computed(
    () => filterAssetsByQuery(registeredAssets.value, search.value, {
      useExternalAddress: options.searchOptions?.useExternalAddress ?? true
    })
  );
  const getAssetByAddress = (address) => {
    const resolve = assetsStore.assetDataByAddress;
    return resolve(address);
  };
  const filterAssetsList = (assets, queryValue, searchOptions) => {
    const sorted = assets.slice().sort((a, b) => compareByBalance(a, b));
    return filterAssetsByQuery(sorted, queryValue, searchOptions);
  };
  return {
    search,
    accountAssets,
    sortedAccountAssets,
    filteredAccountAssets,
    registeredAssets,
    filteredRegisteredAssets,
    getAssetsWithBalances,
    getAssetByAddress,
    filterAssetsList,
    sortByBalance,
    isBalanceEmpty
  };
}
export {
  filterAssetsByQuery as f,
  useAssets as u
};
