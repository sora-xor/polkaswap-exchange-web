<template>
  <dialog-base :visible.sync="isVisible" :title="t('selectToken.title')" custom-class="asset-select">
    <s-tabs v-model="tabValue" class="s-tabs--exchange" type="rounded" @click="handleTabClick">
      <search-input
        ref="search"
        v-model="query"
        :placeholder="activeSearchPlaceholder"
        autofocus
        @clear="handleClearSearch"
        class="token-search"
      />

      <s-tab :label="t('selectToken.assets.title')" name="assets"></s-tab>

      <s-tab :label="t('selectToken.custom.title')" name="custom" class="asset-select__info">
        <template v-if="customAsset">
          <span v-if="alreadyAttached">{{ t('selectToken.custom.alreadyAttached') }}</span>

          <add-asset-details-card
            v-else
            :asset="customAsset"
            :theme="libraryTheme"
            :whitelist="whitelist"
            :whitelist-ids-by-symbol="whitelistIdsBySymbol"
            :loading="loading"
            @add="handleAddAsset"
          />
        </template>

        <span v-else-if="searchQuery">{{ t('selectToken.custom.notFound') }}</span>

        <div v-if="connected && sortedNonWhitelistAccountAssets.length" class="token-list_text">
          {{ sortedNonWhitelistAccountAssets.length }} {{ t('selectToken.custom.text') }}
        </div>
      </s-tab>

      <select-asset-list
        :assets="activeAssetsList"
        :size="assetsListSize"
        :connected="connected"
        :should-balance-be-hidden="shouldBalanceBeHidden"
        has-fiat-value
        @click="selectAsset"
      >
        <template #action="token">
          <div v-if="isCustomTabActive" class="token-item__remove" @click.stop="handleRemoveCustomAsset(token)">
            <s-icon name="basic-trash-24" />
          </div>
        </template>
      </select-asset-list>
    </s-tabs>
  </dialog-base>
</template>

<script lang="ts">
import first from 'lodash/fp/first';
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';
import { Action, Getter } from 'vuex-class';
import { api, mixins, components } from '@soramitsu/soraneo-wallet-web';
import type { Asset, AccountAsset, Whitelist } from '@sora-substrate/util/build/assets/types';
import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import SelectAssetMixin from '@/components/mixins/SelectAssetMixin';
import DialogBase from '@/components/DialogBase.vue';
import { Components, ObjectInit } from '@/consts';
import { lazyComponent } from '@/router';

const namespace = 'assets';

enum Tabs {
  Assets = 'assets',
  Custom = 'custom',
}

// TODO: move to js lib
type WhitelistIdsBySymbol = {
  [key: string]: string;
};

@Component({
  components: {
    DialogBase,
    SelectAssetList: lazyComponent(Components.SelectAssetList),
    TokenLogo: lazyComponent(Components.TokenLogo),
    TokenAddress: components.TokenAddress,
    SearchInput: components.SearchInput,
    AddAssetDetailsCard: components.AddAssetDetailsCard,
  },
})
export default class SelectToken extends Mixins(TranslationMixin, SelectAssetMixin, mixins.LoadingMixin) {
  readonly tokenTabs = [Tabs.Assets, Tabs.Custom];

  tabValue = first(this.tokenTabs);

  @Prop({ default: false, type: Boolean }) readonly connected!: boolean;
  @Prop({ default: ObjectInit, type: Object }) readonly asset!: Asset;
  @Prop({ default: false, type: Boolean }) readonly accountAssetsOnly!: boolean;
  @Prop({ default: false, type: Boolean }) readonly notNullBalanceOnly!: boolean;

  @Getter('whitelistAssets', { namespace }) whitelistAssets!: Array<Asset>;
  @Getter('nonWhitelistDivisibleAccountAssets', { namespace }) nonWhitelistAccountAssets!: Array<AccountAsset>;
  @Getter('nonWhitelistDivisibleAssets', { namespace }) nonWhitelistAssets!: Array<Asset>;
  // Wallet store
  @Getter isLoggedIn!: boolean;
  @Getter libraryTheme!: Theme;
  @Getter whitelist!: Whitelist;
  @Getter whitelistIdsBySymbol!: WhitelistIdsBySymbol;
  @Getter shouldBalanceBeHidden!: boolean;
  @Getter accountAssetsAddressTable!: any;

  // Wallet
  @Action addAsset!: (address?: string) => Promise<void>;

  @Watch('visible')
  async handleTabChange(value: boolean): Promise<void> {
    if (!value) return;

    this.tabValue = first(this.tokenTabs);
  }

  get whitelistAssetsList(): Array<AccountAsset> {
    const {
      asset: excludeAsset,
      whitelistAssets: assets,
      accountAssetsAddressTable,
      notNullBalanceOnly,
      accountAssetsOnly,
    } = this;

    return this.getAssetsWithBalances({
      assets,
      accountAssetsAddressTable,
      notNullBalanceOnly,
      accountAssetsOnly,
      excludeAsset,
    }).sort(this.sortByBalance());
  }

  get filteredWhitelistTokens(): Array<AccountAsset> {
    return this.filterAssetsByQuery(this.whitelistAssetsList)(this.query) as Array<AccountAsset>;
  }

  get isCustomTabActive(): boolean {
    return this.tabValue === Tabs.Custom;
  }

  get assetsListSize(): number {
    return this.isCustomTabActive ? 5 : 6;
  }

  get activeAssetsList(): Array<AccountAsset> {
    return this.isCustomTabActive ? this.sortedNonWhitelistAccountAssets : this.filteredWhitelistTokens;
  }

  get activeSearchPlaceholder(): string {
    return this.t(this.isCustomTabActive ? 'selectToken.custom.search' : 'selectToken.searchPlaceholder');
  }

  get searchQuery(): string {
    return this.query.trim().toLowerCase();
  }

  get alreadyAttached(): boolean {
    return !!this.nonWhitelistAccountAssets[this.searchQuery];
  }

  get customAsset(): Nullable<Asset> {
    return this.nonWhitelistAssets[this.searchQuery] ?? null;
  }

  get sortedNonWhitelistAccountAssets(): Array<AccountAsset> {
    return Object.values(this.nonWhitelistAccountAssets).sort(this.sortByBalance());
  }

  async handleAddAsset(): Promise<void> {
    if (this.isLoggedIn) {
      await this.withLoading(async () => await this.addAsset((this.customAsset || {}).address));
      this.handleClearSearch();
    } else {
      this.selectToken(this.customAsset);
    }
  }

  handleRemoveCustomAsset(asset: AccountAsset): void {
    api.assets.removeAccountAsset(asset.address);
  }

  handleTabClick({ name }): void {
    this.tabValue = name;
    this.handleClearSearch();
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

  @include exchange-tabs();
}
</style>

<style lang="scss" scoped>
.token-search {
  // TODO: Fix input styles (paddings and icon position)
  margin-left: $inner-spacing-big;
  margin-bottom: $inner-spacing-medium;
  width: calc(100% - 2 * #{$inner-spacing-big});
}

.token-list_text {
  font-weight: 800;
}

.asset-select__info {
  color: var(--s-color-base-content-secondary);
  padding: 0 $inner-spacing-big;

  & > *:not(:first-child) {
    margin-top: $inner-spacing-medium;
  }
}

.token-item__remove {
  margin-top: -5px;
  margin-left: $inner-spacing-medium;
  [class^='s-icon-'] {
    @include icon-styles(true);
  }
}
</style>
