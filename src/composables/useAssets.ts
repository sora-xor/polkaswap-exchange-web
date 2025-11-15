import { computed, ref, type ComputedRef, type Ref } from 'vue';

import { useAssetsStore } from '@/stores/assets';
import { useWalletStore } from '@/stores/wallet';
import { filterAssetsByQuery, type AssetSearchOptions } from '@/composables/useAssetSearch';
import type { Nullable } from '@/types/common';
import { sortAssets } from '@/utils/asset-sort';

import type { AccountAsset, RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';

type AssetBalanceCandidate = AccountAsset | RegisteredAccountAsset;

const isBalanceEmpty = (asset: AccountAsset | RegisteredAccountAsset): boolean => {
  const transferable = (asset as AccountAsset)?.balance?.transferable ?? null;
  if (transferable === null || transferable === undefined) return true;
  return Number(transferable) === 0;
};

export type UseAssetsOptions = {
  /**
   * Optional set of asset addresses that will be excluded from the returned lists.
   */
  exclude?: readonly string[];
  /**
   * When false, zero-balance assets are filtered out from the `filteredAccountAssets` list.
   * Defaults to true (keep zero-balance assets).
   */
  includeZeroBalance?: boolean;
  /**
   * Additional search behaviour overrides passed to `filterAssetsByQuery`.
   */
  searchOptions?: AssetSearchOptions;
};

type RegisteredAssetsMap = Record<string, RegisteredAccountAsset>;

/**
 * Shared asset helpers that wrap the wallet Pinia stores and expose
 * filtering/sorting utilities for asset dialogs and selectors.
 */
export function useAssets(options: UseAssetsOptions = {}) {
  const walletStore = useWalletStore();
  const assetsStore = useAssetsStore();

  const excludedAddresses = computed(() => new Set(options.exclude ?? []));

  const compareByBalance = (a: AssetBalanceCandidate, b: AssetBalanceCandidate): number => {
    const aEmpty = isBalanceEmpty(a);
    const bEmpty = isBalanceEmpty(b);

    if (aEmpty === bEmpty) {
      return sortAssets(a, b);
    }

    return aEmpty && !bEmpty ? 1 : -1;
  };

  const sortByBalance = compareByBalance;

  const accountAssets: ComputedRef<AccountAsset[]> = computed(
    () => (walletStore.accountAssets as AccountAsset[]) ?? []
  );

  const sortedAccountAssets = computed<AccountAsset[]>(() =>
    accountAssets.value
      .filter((asset) => !excludedAddresses.value.has(asset.address))
      .slice()
      .sort((a, b) => compareByBalance(a, b))
  );

  const search: Ref<string> = ref('');

  const filteredAccountAssets = computed<AccountAsset[]>(() => {
    const baseList =
      options.includeZeroBalance === false
        ? sortedAccountAssets.value.filter((asset) => !isBalanceEmpty(asset))
        : sortedAccountAssets.value;

    return filterAssetsByQuery(baseList, search.value, options.searchOptions);
  });

  const getAssetsWithBalances = (
    addresses: readonly string[],
    exclude: Nullable<string | readonly string[]> = null
  ): RegisteredAccountAsset[] => {
    const exclusion = new Set<string>(options.exclude ?? []);
    if (exclude) {
      const extra = Array.isArray(exclude) ? exclude : [exclude];
      extra.forEach((address) => exclusion.add(address));
    }

    const resolve = assetsStore.assetDataByAddress as (address?: string) => Nullable<RegisteredAccountAsset>;

    const collection: RegisteredAccountAsset[] = [];
    addresses.forEach((address) => {
      if (exclusion.has(address)) return;
      const asset = resolve(address);
      if (asset) {
        collection.push(asset);
      }
    });

    return collection.sort((a, b) => compareByBalance(a, b));
  };

  const registeredAssets = computed<RegisteredAccountAsset[]>(() => {
    const entries = (assetsStore.registeredAssets ?? {}) as RegisteredAssetsMap;
    return getAssetsWithBalances(Object.keys(entries));
  });

  const filteredRegisteredAssets = computed<RegisteredAccountAsset[]>(() =>
    filterAssetsByQuery(registeredAssets.value, search.value, {
      useExternalAddress: options.searchOptions?.useExternalAddress ?? true,
    })
  );

  const getAssetByAddress = (address?: string): Nullable<RegisteredAccountAsset> => {
    const resolve = assetsStore.assetDataByAddress as (addr?: string) => Nullable<RegisteredAccountAsset>;
    return resolve(address);
  };

  const filterAssetsList = <T extends AccountAsset | RegisteredAccountAsset>(
    assets: readonly T[],
    queryValue: string,
    searchOptions?: AssetSearchOptions
  ): T[] => {
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
    isBalanceEmpty,
  };
}

export type AssetsComposable = ReturnType<typeof useAssets>;
