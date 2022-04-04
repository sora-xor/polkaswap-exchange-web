<template>
  <dialog-base :visible.sync="isVisible" :title="t('selectToken.title')" custom-class="asset-select">
    <s-tabs v-model="tabValue" class="s-tabs--exchange" type="rounded" @click="handleTabClick">
      <search-input
        ref="search"
        v-model="query"
        :placeholder="activeSearchPlaceholder"
        @clear="handleClearSearch"
        class="token-search"
      />

      <s-tab :label="t('selectToken.assets.title')" name="assets"></s-tab>

      <s-tab :label="t('selectToken.custom.title')" name="custom">
        <div class="asset-select__info" v-if="alreadyAttached">{{ t('selectToken.custom.alreadyAttached') }}</div>
        <div class="asset-select__info" v-else-if="!customAsset && searchQuery">
          {{ t('selectToken.custom.notFound') }}
        </div>

        <div class="add-asset-details" v-if="customAsset && !alreadyAttached">
          <s-card shadow="always" size="small" border-radius="mini">
            <div class="add-asset-details_asset">
              <token-logo :token="customAsset" />
              <div class="asset-description s-flex">
                <div class="asset-description_symbol">{{ customAsset.symbol }}</div>
                <token-address
                  :name="customAsset.name"
                  :symbol="customAsset.symbol"
                  :address="customAsset.address"
                  class="asset-description_info"
                />
                <s-card size="mini" :status="assetCardStatus">
                  <div class="asset-nature">{{ assetNatureText }}</div>
                </s-card>
              </div>
            </div>
          </s-card>
          <template v-if="connected">
            <s-card status="warning" shadow="always" pressed class="add-asset-details_text">
              <div class="p2">{{ t('addAsset.warningTitle') }}</div>
              <div class="warning-text p4">{{ t('addAsset.warningMessage') }}</div>
            </s-card>
            <div class="add-asset-details_confirm">
              <s-switch v-model="isConfirmed" :disabled="loading" />
              <span>{{ t('addAsset.understand') }}</span>
            </div>
            <s-button
              class="add-asset-details_action s-typography-button--large"
              type="primary"
              :disabled="!customAsset || !isConfirmed || loading"
              @click="handleAddAsset"
            >
              {{ t('addAsset.action') }}
            </s-button>
          </template>
        </div>

        <template v-if="connected && sortedNonWhitelistAccountAssets.length">
          <div class="token-list_text">
            {{ sortedNonWhitelistAccountAssets.length }} {{ t('selectToken.custom.text') }}
          </div>
        </template>
      </s-tab>

      <select-asset-list
        :assets="activeAssetsList"
        :items="6"
        :connected="connected"
        :should-balance-be-hidden="shouldBalanceBeHidden"
        has-fiat-value
        @click="selectToken"
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
import { api, mixins } from '@soramitsu/soraneo-wallet-web';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';

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

@Component({
  components: {
    DialogBase,
    SelectAssetList: lazyComponent(Components.SelectAssetList),
    SearchInput: lazyComponent(Components.SearchInput),
    TokenLogo: lazyComponent(Components.TokenLogo),
    TokenAddress: lazyComponent(Components.TokenAddress),
  },
})
export default class SelectToken extends Mixins(TranslationMixin, SelectAssetMixin, mixins.LoadingMixin) {
  readonly tokenTabs = [Tabs.Assets, Tabs.Custom];

  tabValue = first(this.tokenTabs);
  query = '';

  isConfirmed = false;

  @Prop({ default: false, type: Boolean }) readonly connected!: boolean;
  @Prop({ default: ObjectInit, type: Object }) readonly asset!: Asset;
  @Prop({ default: false, type: Boolean }) readonly accountAssetsOnly!: boolean;
  @Prop({ default: false, type: Boolean }) readonly notNullBalanceOnly!: boolean;

  @Getter('whitelistAssets', { namespace }) whitelistAssets!: Array<Asset>;
  @Getter('nonWhitelistDivisibleAccountAssets', { namespace }) nonWhitelistAccountAssets!: Array<AccountAsset>;
  @Getter('nonWhitelistDivisibleAssets', { namespace }) nonWhitelistAssets!: Array<Asset>;
  // Wallet store
  @Getter shouldBalanceBeHidden!: boolean;
  @Getter whitelistIdsBySymbol!: any;
  @Getter accountAssetsAddressTable!: any;

  // Wallet
  @Action addAsset!: (address?: string) => Promise<void>;

  @Watch('visible')
  async handleVisibleChangeToFocusSearch(value: boolean): Promise<void> {
    await this.$nextTick();

    if (!value) return;

    this.tabValue = first(this.tokenTabs);
    this.handleClearSearch();
    this.focusSearchInput();
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

  get customAssetBlacklisted(): boolean {
    return !!this.customAsset && api.assets.isBlacklist(this.customAsset, this.whitelistIdsBySymbol);
  }

  get sortedNonWhitelistAccountAssets(): Array<AccountAsset> {
    return Object.values(this.nonWhitelistAccountAssets).sort(this.sortByBalance());
  }

  get assetCardStatus(): string {
    return !this.customAsset ? 'success' : 'error';
  }

  get assetNatureText(): string {
    if (!this.customAsset) {
      return '';
    }

    return this.t(`addAsset.${this.customAssetBlacklisted ? 'scam' : 'unknown'}`);
  }

  async handleAddAsset(): Promise<void> {
    await this.withLoading(async () => await this.addAsset((this.customAsset || {}).address));
    this.handleClearSearch();
  }

  handleRemoveCustomAsset(asset: AccountAsset): void {
    api.assets.removeAccountAsset(asset.address);
  }

  selectToken(token: AccountAsset): void {
    this.handleClearSearch();
    this.$emit('select', token);
    this.closeDialog();
  }

  handleClearSearch(): void {
    this.query = '';
    this.isConfirmed = false;
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
  color: var(--s-color-base-content-secondary);
}

.token-list_text,
.add-asset-details,
.asset-select__info {
  padding: 0 $inner-spacing-big;
}
.asset-select__info {
  color: var(--s-color-base-content-secondary);
  margin-bottom: $inner-spacing-medium;
}

.token-item__remove {
  margin-top: -5px;
  margin-left: $inner-spacing-medium;
  [class^='s-icon-'] {
    @include icon-styles(true);
  }
}

.add-asset-details {
  & > * {
    margin-bottom: $inner-spacing-medium;
  }

  &_asset {
    display: flex;
    align-items: center;

    .asset {
      &-description {
        align-items: flex-start;
        flex: 1;
        flex-direction: column;
        line-height: var(--s-line-height-big);
        margin-left: $inner-spacing-small;
        &_symbol {
          font-size: var(--s-font-size-big);
          font-weight: 600;
          line-height: var(--s-line-height-small);
        }
        &_info {
          color: var(--s-color-base-content-secondary);
          font-size: var(--s-font-size-mini);
          font-weight: 300;
          line-height: var(--s-line-height-medium);
          .asset-id {
            outline: none;
            &:hover {
              text-decoration: underline;
              cursor: pointer;
            }
          }
        }
      }
      &-nature {
        font-size: var(--s-font-size-mini);
      }
    }
  }
  &_confirm {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 0 $inner-spacing-medium;

    & > span {
      margin-left: calc(var(--s-basic-spacing) * 1.5);
      font-size: var(--s-font-size-medium);
      font-weight: 300;
      letter-spacing: var(--s-letter-spacing-small);
      line-height: var(--s-line-height-medium);
    }
  }
  &_action {
    width: 100%;
    margin-bottom: $inner-spacing-medium;
  }
}
</style>
