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

<script lang="ts">
import { Options, mixins } from 'vue-property-decorator';

import { FilterOptions } from '@/types/common';

import { api } from '../../api';
import { AddAssetTabs } from '../../consts';
import { state, getter } from '../../store/decorators';
import { getAssetsSubset } from '../../util';
import AssetList from '../AssetList.vue';
import SearchInput from '../Input/SearchInput.vue';
import AddAssetMixin from '../mixins/AddAssetMixin';
import LoadingMixin from '../mixins/LoadingMixin';
import AssetsFilter from '../shared/AssetsFilter.vue';

import AddAssetDetailsCard from './AddAssetDetailsCard.vue';

import type { Asset, Whitelist } from '@sora-substrate/sdk/build/assets/types';

@Options({
  components: {
    AssetList,
    AssetsFilter,
    SearchInput,
    AddAssetDetailsCard,
  },
})
export default class AddAssetToken extends mixins(LoadingMixin, AddAssetMixin) {
  readonly AddAssetTabs = AddAssetTabs;

  @state.settings.assetsFilter assetsFilter!: FilterOptions;
  @getter.account.whitelist private whitelist!: Whitelist;
  /** `true` by default cuz we have a lot of assets */
  isVerifiedOnly = true;

  private get notAddedAssets(): Array<Asset> {
    return this.assets.filter(
      (asset) => !(asset.address in this.accountAssetsAddressTable) && !api.assets.isNft(asset)
    );
  }

  private get prefilteredAssets(): Array<Asset> {
    const prefiltered = getAssetsSubset(this.notAddedAssets, this.assetsFilter);

    return this.isVerifiedOnly
      ? prefiltered.filter((asset) => api.assets.isWhitelist(asset, this.whitelist))
      : prefiltered;
  }

  get foundAssets(): Array<Asset> {
    if (!this.searchValue) return this.prefilteredAssets;
    return this.getSoughtAssets(this.prefilteredAssets);
  }

  get assetIsAlreadyAdded(): boolean {
    if (!this.searchValue) return false;

    return this.accountAssets.some(
      ({ name = '', symbol = '', address = '' }) =>
        address.toLowerCase() === this.searchValue ||
        symbol.toLowerCase() === this.searchValue ||
        name.toLowerCase() === this.searchValue
    );
  }

  get showAddButton(): boolean {
    return this.selectedAssets.length > 0;
  }

  handleAdd() {
    this.$emit('change-visibility');
  }
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
