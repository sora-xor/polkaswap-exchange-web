<template>
  <dialog-base :visible.sync="isVisible" :title="t('selectRegisteredAsset.title')" custom-class="asset-select">
    <s-form-item class="el-form-item--search">
      <s-input
        ref="search"
        v-model="query"
        :placeholder="t('selectRegisteredAsset.search.placeholder')"
        class="asset-search"
        prefix="s-icon-search-16"
        size="big"
      >
        <template #suffix>
          <s-button v-show="query" type="link" class="s-button--clear" icon="clear-X-16" @click="handleClearSearch" />
        </template>
      </s-input>
    </s-form-item>

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
        :has-fiat-value="isSoraToEvm"
        connected
        @click="selectAsset"
      />
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';
import { Getter, State } from 'vuex-class';
import { mixins } from '@soramitsu/soraneo-wallet-web';
import type { RegisteredAccountAsset } from '@sora-substrate/util';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import SelectAssetMixin from '@/components/mixins/SelectAssetMixin';
import DialogBase from '@/components/DialogBase.vue';
import { Components, ObjectInit } from '@/consts';
import { lazyComponent } from '@/router';

const namespace = 'assets';

@Component({
  components: {
    SelectAssetList: lazyComponent(Components.SelectAssetList),
    DialogBase,
  },
})
export default class SelectRegisteredAsset extends Mixins(TranslationMixin, SelectAssetMixin, mixins.LoadingMixin) {
  query = '';

  @Prop({ default: ObjectInit, type: Object }) readonly asset!: AccountAsset;

  @State((state) => state.bridge.isSoraToEvm) isSoraToEvm!: boolean;

  @Getter('whitelistAssets', { namespace }) whitelistAssets!: Array<Asset>;
  @Getter('registeredAssets', { namespace }) registeredAssets!: Array<RegisteredAccountAsset>;
  // Wallet store
  @Getter assets!: Array<Asset>;
  @Getter accountAssetsAddressTable;
  @Getter shouldBalanceBeHidden!: boolean;

  @Watch('visible')
  async handleVisibleChangeToFocusSearch(value: boolean): Promise<void> {
    await this.$nextTick();

    if (!value) return;

    this.focusSearchInput();
  }

  get assetsList(): Array<RegisteredAccountAsset> {
    const { registeredAssets: assets, accountAssetsAddressTable, asset: excludeAsset } = this;

    return this.getAssetsWithBalances({ assets, accountAssetsAddressTable, excludeAsset }).sort(
      this.sortByBalance(!this.isSoraToEvm)
    ) as Array<RegisteredAccountAsset>;
  }

  get filteredAssets(): Array<RegisteredAccountAsset> {
    return this.filterAssetsByQuery(this.assetsList, !this.isSoraToEvm)(this.query) as Array<RegisteredAccountAsset>;
  }

  get hasFilteredAssets(): boolean {
    return Array.isArray(this.filteredAssets) && this.filteredAssets.length > 0;
  }

  selectAsset(asset: RegisteredAccountAsset): void {
    this.handleClearSearch();
    this.$emit('select', asset);
    this.closeDialog();
  }

  handleClearSearch(): void {
    this.query = '';
  }
}
</script>

<style lang="scss" scoped>
$select-asset-horizontal-spacing: $inner-spacing-big;

@include search-item;
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
