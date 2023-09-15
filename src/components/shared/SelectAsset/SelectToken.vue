<template>
  <dialog-base :visible.sync="isVisible" :title="t('selectToken.title')" custom-class="asset-select">
    <s-tabs :value="tabValue" class="s-tabs--exchange" type="rounded" @input="handleTabChange">
      <search-input
        ref="search"
        v-model="query"
        :placeholder="activeSearchPlaceholder"
        autofocus
        @clear="handleClearSearch"
        class="token-search"
      />

      <s-tab :label="t('selectToken.assets.title')" name="assets" />

      <s-tab :disabled="disabledCustom" :label="t('selectToken.custom.title')" name="custom" class="asset-select__info">
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
        v-show="shouldAssetsListBeShown"
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
import { XOR, XSTUSD, XST } from '@sora-substrate/util/build/assets/consts';
import { api, mixins, components, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import first from 'lodash/fp/first';
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';

import SelectAssetMixin from '@/components/mixins/SelectAssetMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
import { Components, ObjectInit } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, state, action } from '@/store/decorators';
import { syntheticAssetRegexp } from '@/utils/regexp';

import type { Asset, AccountAsset, Whitelist } from '@sora-substrate/util/build/assets/types';
import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

enum Tabs {
  Assets = 'assets',
  Custom = 'custom',
}

function getNonWhitelistDivisibleAssets<T extends Asset | AccountAsset>(
  assets: T[],
  whitelist: Whitelist
): Record<string, T> {
  return assets.reduce((buffer, asset) => {
    if (!api.assets.isWhitelist(asset, whitelist) && asset.decimals) {
      buffer[asset.address] = asset;
    }
    return buffer;
  }, {});
}

@Component({
  components: {
    DialogBase: components.DialogBase,
    SelectAssetList: lazyComponent(Components.SelectAssetList),
    TokenAddress: components.TokenAddress,
    SearchInput: components.SearchInput,
    AddAssetDetailsCard: components.AddAssetDetailsCard,
  },
})
export default class SelectToken extends Mixins(TranslationMixin, SelectAssetMixin, mixins.LoadingMixin) {
  readonly tokenTabs = [Tabs.Assets, Tabs.Custom];

  tabValue = first(this.tokenTabs);

  @Prop({ default: false, type: Boolean }) readonly connected!: boolean;
  @Prop({ default: ObjectInit, type: Object }) readonly asset!: Nullable<Asset>;
  @Prop({ default: false, type: Boolean }) readonly disabledCustom!: boolean;
  @Prop({ default: false, type: Boolean }) readonly isFirstTokenSelected!: boolean;
  @Prop({ default: false, type: Boolean }) readonly isAddLiquidity!: boolean;

  @state.wallet.settings.shouldBalanceBeHidden shouldBalanceBeHidden!: boolean;
  @state.wallet.account.assets private assets!: Asset[];
  @state.wallet.account.accountAssets private accountAssets!: AccountAsset[];

  @getter.libraryTheme libraryTheme!: Theme;
  @getter.assets.whitelistAssets private whitelistAssets!: Array<Asset>;
  @getter.wallet.account.isLoggedIn private isLoggedIn!: boolean;
  @getter.wallet.account.whitelist public whitelist!: Whitelist;
  @getter.wallet.account.whitelistIdsBySymbol public whitelistIdsBySymbol!: WALLET_TYPES.WhitelistIdsBySymbol;

  @action.wallet.account.addAsset private addAsset!: (address?: string) => Promise<void>;

  @Watch('visible')
  async handleTabReset(value: boolean): Promise<void> {
    if (!value) return;

    this.tabValue = first(this.tokenTabs);
  }

  get nonWhitelistAssets(): Record<string, Asset> {
    return getNonWhitelistDivisibleAssets(this.assets, this.whitelist);
  }

  get nonWhitelistAccountAssets(): Record<string, AccountAsset> {
    return getNonWhitelistDivisibleAssets(this.accountAssets, this.whitelist);
  }

  get whitelistAssetsList(): Array<AccountAsset> {
    let whiteList: Array<Asset> = [];
    if (this.isAddLiquidity) {
      whiteList = this.isFirstTokenSelected
        ? this.mainLPSources
        : this.whitelistAssets.filter((asset) => {
            if (this.asset?.address === XSTUSD.address && asset.address === XOR.address) {
              return false; // XSTUSD-XOR isn't allowed
            }
            return true;
          });
    } else {
      whiteList = this.whitelistAssets;
    }
    const assetsAddresses = whiteList.map((asset) => asset.address);
    const excludeAddress = this.asset?.address;

    return this.getAssetsWithBalances(assetsAddresses, excludeAddress).sort(this.sortByBalance);
  }

  get filteredWhitelistTokens(): Array<AccountAsset> {
    return this.filterAssetsByQuery(this.whitelistAssetsList)(this.searchQuery) as Array<AccountAsset>;
  }

  get isCustomTabActive(): boolean {
    return this.tabValue === Tabs.Custom;
  }

  /** Only for empty list for custom tab case when searching */
  get shouldAssetsListBeShown(): boolean {
    return !(this.isCustomTabActive && !this.activeAssetsList.length && this.searchQuery);
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

  get alreadyAttached(): boolean {
    return !!this.nonWhitelistAccountAssets[this.searchQuery];
  }

  get customAsset(): Nullable<Asset> {
    return this.nonWhitelistAssets[this.searchQuery] ?? null;
  }

  get sortedNonWhitelistAccountAssets(): Array<AccountAsset> {
    const { asset: excludeAsset } = this;
    // TODO: we already have balances in nonWhitelistAccountAssets.
    // Need to improve that logic
    return this.getAssetsWithBalances(Object.keys(this.nonWhitelistAccountAssets), excludeAsset?.address).sort(
      this.sortByBalance
    );
  }

  private get mainLPSources(): Array<Asset> {
    const mainSourceAddresses = [XOR.address, XSTUSD.address];

    return this.whitelistAssets.filter((asset) => mainSourceAddresses.includes(asset.address));
  }

  async handleAddAsset(): Promise<void> {
    if (!this.customAsset) return;

    if (this.isLoggedIn) {
      await this.withLoading(async () => await this.addAsset((this.customAsset || {}).address));
      this.handleClearSearch();
    } else {
      this.selectAsset(this.customAsset);
    }
  }

  handleRemoveCustomAsset(asset: AccountAsset): void {
    api.assets.removeAccountAsset(asset.address);
  }

  handleTabChange(name: Tabs): void {
    this.tabValue = name;
    this.clearAndFocusSearch();
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

  @include exchange-tabs;
}
</style>

<style lang="scss" scoped>
.token-search {
  // TODO: Fix input styles (paddings and icon position)
  margin-left: $inner-spacing-big;
  margin-bottom: $inner-spacing-medium;
  width: calc(100% - 2 * #{$inner-spacing-big});
  @include focus-outline($withOffset: true);
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
