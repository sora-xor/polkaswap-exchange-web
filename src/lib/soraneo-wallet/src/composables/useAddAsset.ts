import { computed, ref } from 'vue';

import { useWalletStore } from '@/stores/wallet';

import { RouteNames } from '../consts';

import { useLoading } from './useLoading';
import { useNotification } from './useNotification';

import type { WalletNavigationTarget } from '@/platform/wallet/navigation';
import type { Asset } from '@sora-substrate/sdk/build/assets/types';

export function useAddAsset() {
  const walletStore = useWalletStore();
  const loadingApi = useLoading();
  const notification = useNotification();
  const { withLoading } = loadingApi;
  const { showAppNotification, t } = notification;

  const selectedAsset = ref<Nullable<Asset>>(null);
  const selectedAssets = ref<Asset[]>([]);
  const search = ref('');

  const assets = computed(() => walletStore.assets);
  const accountAssets = computed(() => walletStore.accountAssets);
  const accountAssetsAddressTable = computed(() => walletStore.accountAssetsAddressTable);
  const searchValue = computed(() => (search.value ? search.value.trim().toLowerCase() : ''));
  const whitelist = computed(() => walletStore.whitelist);

  const addAsset = (address: string) => walletStore.addAsset(address);

  const navigate = (options: WalletNavigationTarget): void => {
    walletStore.navigate(options);
  };

  const getSoughtAssets = (items: Asset[]): Asset[] => {
    return items.filter(
      ({ name, symbol, address }) =>
        address.toLowerCase() === searchValue.value ||
        symbol.toLowerCase().includes(searchValue.value) ||
        name.toLowerCase().includes(searchValue.value)
    );
  };

  const resetSearch = (): void => {
    search.value = '';
  };

  const ensureAssetCatalogLoaded = async (): Promise<void> => {
    if (assets.value.length && Object.keys(whitelist.value ?? {}).length) {
      return;
    }

    await withLoading(async () => {
      if (!Object.keys(whitelist.value ?? {}).length) {
        await walletStore.getWhitelist();
      }

      if (!assets.value.length) {
        await walletStore.subscribeOnAssets();
      }
    });
  };

  const addAccountAsset = async (addedAsset: Nullable<Asset>): Promise<void> => {
    const asset: Partial<Asset> = addedAsset || {};

    await withLoading(async () => await addAsset(asset.address as string));
    navigate({ name: RouteNames.Wallet, params: { asset: addedAsset } });
    showAppNotification(t('addAsset.success', { symbol: asset.symbol || '' }), 'success');
  };

  const handleSelectAsset = (asset: Asset): void => {
    if (!asset) return;

    const assetIndex = selectedAssets.value.findIndex((item) => item.address === asset.address);

    if (assetIndex >= 0) {
      selectedAssets.value.splice(assetIndex, 1);
    } else {
      selectedAssets.value.push(asset);
    }
  };

  return {
    ...loadingApi,
    ...notification,
    selectedAsset,
    selectedAssets,
    search,
    assets,
    accountAssets,
    accountAssetsAddressTable,
    whitelist,
    searchValue,
    addAsset,
    navigate,
    getSoughtAssets,
    resetSearch,
    ensureAssetCatalogLoaded,
    addAccountAsset,
    handleSelectAsset,
  };
}
