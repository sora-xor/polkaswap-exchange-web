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

<script lang="ts">
import { defineComponent } from 'vue';

import { api } from '../../api';
import AssetList from '../AssetList.vue';
import SearchInput from '../Input/SearchInput.vue';
import AddAssetMixin from '../mixins/AddAssetMixin';

import AddAssetDetailsCard from './AddAssetDetailsCard.vue';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

export default defineComponent({
  components: {
    AssetList,
    SearchInput,
    AddAssetDetailsCard,
  },
  mixins: [AddAssetMixin],
  emits: ['change-visibility'],
  computed: {
    notAddedNftAssets(this: any): Asset[] {
      return this.assets.filter(
        (asset: Asset) => !(asset.address in this.accountAssetsAddressTable) && api.assets.isNft(asset)
      );
    },
    foundAssets(this: any): Asset[] {
      if (!this.searchValue) return this.notAddedNftAssets;

      return this.getSoughtAssets(this.notAddedNftAssets);
    },
    assetIsAlreadyAdded(this: any): boolean {
      if (!this.searchValue) return false;

      return this.accountAssets
        .filter((asset: Asset) => api.assets.isNft(asset))
        .some(
          ({ name = '', symbol = '', address = '' }: Asset) =>
            address.toLowerCase() === this.searchValue ||
            symbol.toLowerCase() === this.searchValue ||
            name.toLowerCase() === this.searchValue
        );
    },
    showAddButton(this: any): boolean {
      return this.selectedAssets.length > 0;
    },
  },
  methods: {
    handleAdd(this: any): void {
      this.$emit('change-visibility');
    },
  },
});
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
