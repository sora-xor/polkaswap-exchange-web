<template>
  <div class="add-asset-token">
    <div v-if="!tokenDetailsPageOpened" class="add-asset-token__page">
      <search-input
        v-model="search"
        autofocus
        :placeholder="t(`addAsset.searchInputText`)"
        :maxlength="100"
        class="add-asset-token__search"
        @clear="resetSearch"
      ></search-input>
      <assets-filter v-model="isVerifiedOnly" show-only-verified-switch class="add-asset-token__filter"></assets-filter>
      <asset-list
        :assets="foundAssets"
        class="asset-search-list"
        selectable
        :selected="selectedAssets"
        @click="handleSelectAsset"
      >
        <template #list-empty>
          {{ t(assetIsAlreadyAdded ? 'addAsset.alreadyAttached' : 'addAsset.empty') }}
        </template>
      </asset-list>
      <s-button
        v-if="showAddButton"
        class="add-assets-button"
        type="primary"
        :loading="parentLoading || loading"
        @click="handleAdd"
      >
        {{ t('addAsset.add') }}
      </s-button>
    </div>
    <add-asset-details-card v-else :select-assets="selectedAssets" asset-type-key="token"></add-asset-details-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { FilterOptions } from '@/types/common';
import { useWalletStore } from '@/stores/wallet';

import { useAddAsset } from '../../composables/useAddAsset';
import { api } from '../../api';
import { AddAssetTabs } from '../../consts';
import { getAssetsSubset } from '../../util';
import AssetList from '../AssetList.vue';
import SearchInput from '../Input/SearchInput.vue';
import AssetsFilter from '../shared/AssetsFilter.vue';

import AddAssetDetailsCard from './AddAssetDetailsCard.vue';

import type { Asset, Whitelist } from '@sora-substrate/sdk/build/assets/types';

withDefaults(
  defineProps<{
    tokenDetailsPageOpened?: boolean;
  }>(),
  {
    tokenDetailsPageOpened: false,
  }
);

const emit = defineEmits<{
  'change-visibility': [];
}>();

const walletStore = useWalletStore();
const {
  t,
  search,
  searchValue,
  resetSearch,
  selectedAssets,
  parentLoading,
  loading,
  assets,
  accountAssetsAddressTable,
  accountAssets,
  getSoughtAssets,
  handleSelectAsset,
} = useAddAsset();
const isVerifiedOnly = ref(true);

const assetsFilter = computed(() => walletStore.assetsFilter);
const whitelist = computed(() => walletStore.whitelist);
const notAddedAssets = computed((): Asset[] => {
  return assets.value.filter(
    (asset: Asset) => !(asset.address in accountAssetsAddressTable.value) && !api.assets.isNft(asset)
  );
});
const prefilteredAssets = computed((): Asset[] => {
  const prefiltered = getAssetsSubset(notAddedAssets.value, assetsFilter.value as FilterOptions);

  return isVerifiedOnly.value
    ? prefiltered.filter((asset: Asset) => api.assets.isWhitelist(asset, whitelist.value as Whitelist))
    : prefiltered;
});
const foundAssets = computed((): Asset[] => {
  if (!searchValue.value) return prefilteredAssets.value;
  return getSoughtAssets(prefilteredAssets.value);
});
const assetIsAlreadyAdded = computed((): boolean => {
  if (!searchValue.value) return false;

  return accountAssets.value.some(
    ({ name = '', symbol = '', address = '' }: Asset) =>
      address.toLowerCase() === searchValue.value ||
      symbol.toLowerCase() === searchValue.value ||
      name.toLowerCase() === searchValue.value
  );
});
const showAddButton = computed(() => selectedAssets.value.length > 0);

function handleAdd(): void {
  emit('change-visibility');
}
</script>

<style lang="scss">
.asset-search-list {
  @include asset-list($basic-spacing-big);

  .asset {
    padding-left: $basic-spacing-big;
    padding-right: $basic-spacing-big;

    @include focus-outline($withOffset: true);

    &:hover,
    &.selected {
      background-color: var(--s-color-base-background-hover);
      cursor: pointer;
    }

    &-symbol {
      font-size: var(--s-font-size-default);
    }
    &:focus:not(:active) {
      outline: unset;
    }
  }
}
</style>

<style scoped lang="scss">
.add-asset-token {
  &__filter {
    margin-bottom: 8px;
  }

  &__search {
    margin-bottom: #{$basic-spacing-medium};
  }
}
.add-assets-button {
  margin-top: #{$basic-spacing};
  width: 100%;
}
</style>
