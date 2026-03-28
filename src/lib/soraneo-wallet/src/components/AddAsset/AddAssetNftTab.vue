<template>
  <div class="add-asset-nft">
    <div v-if="!tokenDetailsPageOpened" class="add-asset-nft__page">
      <search-input
        v-model="search"
        autofocus
        :placeholder="t(`addAsset.searchInputText`)"
        :maxlength="100"
        class="add-asset-nft__input"
        @clear="resetSearch"
      ></search-input>
      <asset-list
        :assets="foundAssets"
        class="asset-search-list"
        :selected="selectedAssets"
        selectable
        @click="handleSelectAsset"
      >
        <template #list-empty>
          {{ t(assetIsAlreadyAdded ? 'addAsset.alreadyAttached' : 'addAsset.empty') }}
        </template>
      </asset-list>
      <s-button
        v-if="showAddButton"
        class="add-nfts-button"
        type="primary"
        :loading="parentLoading || loading"
        @click="handleAdd"
      >
        {{ t('addAsset.add') }}
      </s-button>
    </div>
    <add-asset-details-card v-else :select-assets="selectedAssets" asset-type-key="nft"></add-asset-details-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useAddAsset } from '../../composables/useAddAsset';
import { api } from '../../api';
import AssetList from '../AssetList.vue';
import SearchInput from '../Input/SearchInput.vue';

import AddAssetDetailsCard from './AddAssetDetailsCard.vue';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

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

const notAddedNftAssets = computed((): Asset[] => {
  return assets.value.filter(
    (asset: Asset) => !(asset.address in accountAssetsAddressTable.value) && api.assets.isNft(asset)
  );
});

const foundAssets = computed((): Asset[] => {
  if (!searchValue.value) return notAddedNftAssets.value;

  return getSoughtAssets(notAddedNftAssets.value);
});

const assetIsAlreadyAdded = computed((): boolean => {
  if (!searchValue.value) return false;

  return accountAssets.value
    .filter((asset: Asset) => api.assets.isNft(asset))
    .some(
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

<style scoped lang="scss">
.add-asset-nft {
  &__input {
    margin-top: #{$basic-spacing-medium};
    margin-bottom: #{$basic-spacing-medium};
  }
  .asset {
    &:hover,
    &.selected {
      background-color: var(--s-color-base-background-hover);
      cursor: pointer;
    }

    &-symbol {
      font-size: var(--s-font-size-default);
    }
  }
}

.add-nfts-button {
  margin-top: #{$basic-spacing};
  width: 100%;
}
</style>
