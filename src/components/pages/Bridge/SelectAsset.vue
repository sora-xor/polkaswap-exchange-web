<template>
  <dialog-base :visible.sync="isVisible" :title="t('selectRegisteredAsset.title')" custom-class="asset-select">
    <search-input
      ref="search"
      v-model="query"
      :placeholder="t('selectRegisteredAsset.search.placeholder')"
      autofocus
      @clear="handleClearSearch"
      class="asset-search"
    />

    <div class="asset-lists-container">
      <h3 v-if="hasFilteredAssets" class="network-label">
        {{
          isSoraToEvm
            ? t('selectRegisteredAsset.search.networkLabelSora')
            : t('selectRegisteredAsset.search.networkLabelEthereum')
        }}
      </h3>

      <select-asset-list
        :assets="filteredAssets"
        :should-balance-be-hidden="shouldBalanceBeHidden"
        :is-sora-to-evm="isSoraToEvm"
        connected
        @click="selectAsset"
      />
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import type { AccountAsset } from '@sora-substrate/util/build/assets/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import SelectAssetMixin from '@/components/mixins/SelectAssetMixin';
import { Components, ObjectInit } from '@/consts';
import { lazyComponent } from '@/router';
import { state } from '@/store/decorators';

import type { EvmAccountAsset, RegisteredAccountAssetWithDecimals } from '@/store/assets/types';

@Component({
  components: {
    DialogBase: components.DialogBase,
    SelectAssetList: lazyComponent(Components.SelectAssetList),
    SearchInput: components.SearchInput,
  },
})
export default class BridgeSelectAsset extends Mixins(TranslationMixin, SelectAssetMixin, mixins.LoadingMixin) {
  @Prop({ default: ObjectInit, type: Object }) readonly asset!: AccountAsset;

  @state.assets.registeredAssets private registeredAssets!: Record<string, EvmAccountAsset>;
  @state.bridge.isSoraToEvm isSoraToEvm!: boolean;
  @state.wallet.settings.shouldBalanceBeHidden shouldBalanceBeHidden!: boolean;

  get assetsList(): Array<RegisteredAccountAssetWithDecimals> {
    const assetsAddresses = Object.keys(this.registeredAssets);
    const excludeAddress = this.asset?.address;

    return this.getAssetsWithBalances(assetsAddresses, excludeAddress).sort(this.sortByBalance(!this.isSoraToEvm));
  }

  get filteredAssets(): Array<RegisteredAccountAssetWithDecimals> {
    return this.filterAssetsByQuery(
      this.assetsList,
      !this.isSoraToEvm
    )(this.searchQuery) as Array<RegisteredAccountAssetWithDecimals>;
  }

  get hasFilteredAssets(): boolean {
    return Array.isArray(this.filteredAssets) && this.filteredAssets.length > 0;
  }
}
</script>

<style lang="scss">
.asset-select {
  .el-dialog {
    overflow: hidden;
    &__body {
      padding: $inner-spacing-mini 0 $inner-spacing-big !important;
    }
  }
}
</style>

<style lang="scss" scoped>
.asset-search,
.network-label {
  margin-left: $inner-spacing-big;
  margin-right: $inner-spacing-big;
  width: inherit;
}

.asset-search {
  margin-bottom: $inner-spacing-medium;
}

.network-label {
  color: var(--s-color-base-content-secondary);
  font-size: $s-heading3-caps-font-size;
  line-height: var(--s-line-height-base);
  letter-spacing: var(--s-letter-spacing-extra-large);
  font-weight: 700 !important;
  text-transform: uppercase;
}

.asset-lists-container {
  margin-top: $inner-spacing-mini;
}
</style>
