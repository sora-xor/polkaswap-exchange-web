<template>
  <dialog-base :visible.sync="isVisible" :title="t('selectToken.title')" custom-class="asset-select">
    <s-tabs v-model="tabValue" class="s-tabs--exchange" type="rounded" @click="handleTabClick">
      <div class="asset-select__search">
        <s-input
          ref="search"
          v-model="query"
          :placeholder="activeSearchPlaceholder"
          class="token-search"
          prefix="s-icon-search-16"
          size="big"
        >
          <template #suffix>
            <s-button v-show="query" type="link" class="s-button--clear" icon="clear-X-16" @click="handleClearSearch" />
          </template>
        </s-input>
      </div>

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

      <asset-list :assets="activeAssetsList" :items="6" @click="selectToken">
        <template #list-empty>
          <div key="empty" class="token-list__empty">
            <span class="empty-results-icon" />
            {{ t('selectToken.emptyListMessage') }}
          </div>
        </template>

        <template #default="token">
          <div v-if="connected" class="asset__balance-container">
            <formatted-amount-with-fiat-value
              v-if="formatBalance(token) !== FormattedZeroSymbol"
              value-class="asset__balance"
              value-can-be-hidden
              :value="formatBalance(token)"
              :font-size-rate="FontSizeRate.MEDIUM"
              :has-fiat-value="shouldFiatBeShown(token)"
              :fiat-value="getFiatBalance(token)"
              :fiat-font-size-rate="FontSizeRate.MEDIUM"
              :fiat-font-weight-rate="FontWeightRate.MEDIUM"
            />
            <span v-else class="asset__balance">
              {{ shouldBalanceBeHidden ? HiddenValue : FormattedZeroSymbol }}
            </span>
          </div>
          <div v-if="isCustomTabActive" class="token-item__remove" @click.stop="handleRemoveCustomAsset(token)">
            <s-icon name="basic-trash-24" />
          </div>
        </template>
      </asset-list>
    </s-tabs>
  </dialog-base>
</template>

<script lang="ts">
import first from 'lodash/fp/first';
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';
import { Action, Getter } from 'vuex-class';
import { api, mixins, components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import SelectAssetMixin from '@/components/mixins/SelectAssetMixin';
import DialogBase from '@/components/DialogBase.vue';
import { Components, ObjectInit } from '@/consts';
import { lazyComponent } from '@/router';
import { formatAssetBalance } from '@/utils';

const namespace = 'assets';

enum Tabs {
  Assets = 'assets',
  Custom = 'custom',
}

@Component({
  components: {
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    AssetList: components.AssetList,
    DialogBase,
    TokenLogo: lazyComponent(Components.TokenLogo),
    TokenAddress: lazyComponent(Components.TokenAddress),
  },
})
export default class SelectToken extends Mixins(
  mixins.FormattedAmountMixin,
  TranslationMixin,
  SelectAssetMixin,
  mixins.LoadingMixin
) {
  readonly FormattedZeroSymbol = '-';
  readonly tokenTabs = [Tabs.Assets, Tabs.Custom];

  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;
  readonly HiddenValue = WALLET_CONSTS.HiddenValue;

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

  shouldFiatBeShown(asset: AccountAsset): boolean {
    return !!this.getAssetFiatPrice(asset);
  }

  selectToken(token: AccountAsset): void {
    this.handleClearSearch();
    this.$emit('select', token);
    this.closeDialog();
  }

  formatBalance(token: AccountAsset): string {
    return formatAssetBalance(token, {
      showZeroBalance: false,
      formattedZero: this.FormattedZeroSymbol,
    });
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
  @include exchange-tabs();
  @include select-asset('asset');
}
</style>

<style lang="scss" scoped>
@include search-item('asset-select__search');

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

.token-list {
  &__empty {
    display: flex;
    align-items: center;
    flex-direction: column;
    padding-top: $inner-spacing-big;
    color: var(--s-color-base-content-tertiary);
    line-height: var(--s-line-height-big);
  }
  .empty-results-icon {
    margin-bottom: $inner-spacing-medium;
    display: block;
    height: 70px;
    width: 70px;
    background: url('~@/assets/img/no-results.svg') center no-repeat;
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
