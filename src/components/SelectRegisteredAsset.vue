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

      <asset-list :assets="filteredAssets" @click="selectAsset" :class="assetListClasses(!isSoraToEvm)">
        <template #list-empty>
          <div class="asset-list__empty p4">
            <span class="empty-results-icon" />
            {{ t('selectRegisteredAsset.search.emptyListMessage') }}
          </div>
        </template>

        <template #default="asset">
          <div class="asset__balance-container">
            <formatted-amount-with-fiat-value
              v-if="formatBalance(asset) !== FormattedZeroSymbol"
              value-class="asset__balance"
              value-can-be-hidden
              :value="formatBalance(asset)"
              :font-size-rate="FontSizeRate.MEDIUM"
              :has-fiat-value="shouldFiatBeShown(asset)"
              :fiat-value="getFiatBalance(asset)"
              :fiat-font-size-rate="FontSizeRate.MEDIUM"
              :fiat-font-weight-rate="FontWeightRate.MEDIUM"
            />
            <span v-else class="asset__balance">{{ shouldBalanceBeHidden ? HiddenValue : FormattedZeroSymbol }}</span>
          </div>
        </template>
      </asset-list>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator';
import { Getter, State } from 'vuex-class';
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import type { RegisteredAccountAsset } from '@sora-substrate/util';
import type { Asset, AccountAsset } from '@sora-substrate/util/build/assets/types';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import SelectAssetMixin from '@/components/mixins/SelectAssetMixin';
import DialogBase from '@/components/DialogBase.vue';
import { Components, ObjectInit } from '@/consts';
import { lazyComponent } from '@/router';
import { formatAssetBalance } from '@/utils';

const namespace = 'assets';

// TODO: Combine SelectToken & this component
@Component({
  components: {
    DialogBase,
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    AssetList: components.AssetList,
    TokenLogo: lazyComponent(Components.TokenLogo),
    TokenAddress: lazyComponent(Components.TokenAddress),
  },
})
export default class SelectRegisteredAsset extends Mixins(
  mixins.FormattedAmountMixin,
  mixins.LoadingMixin,
  TranslationMixin,
  SelectAssetMixin
) {
  query = '';

  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate;
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate;
  readonly FormattedZeroSymbol = '-';
  readonly HiddenValue = WALLET_CONSTS.HiddenValue;

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

  formatBalance(asset?: RegisteredAccountAsset): string {
    return formatAssetBalance(asset, {
      internal: this.isSoraToEvm,
      showZeroBalance: false,
      formattedZero: this.FormattedZeroSymbol,
    });
  }

  assetListClasses(isEthereumAssetsList = false): string {
    const componentClass = 'asset-list';
    const classes = [componentClass];

    if (isEthereumAssetsList) {
      classes.push(`${componentClass}--evm`);
    }

    return classes.join(' ');
  }

  selectAsset(asset: RegisteredAccountAsset): void {
    this.handleClearSearch();
    this.$emit('select', asset);
    this.closeDialog();
  }

  handleClearSearch(): void {
    this.query = '';
  }

  shouldFiatBeShown(asset: RegisteredAccountAsset): boolean {
    return this.isSoraToEvm && !!this.getAssetFiatPrice(asset);
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
$select-asset-horizontal-spacing: $inner-spacing-big;

@include search-item;
.asset-search,
.network-label {
  margin-left: $select-asset-horizontal-spacing;
  width: calc(100% - 2 * #{$select-asset-horizontal-spacing});
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
  .asset-list + & {
    margin-top: $inner-spacing-medium;
  }
}
.asset-lists-container {
  margin-top: $inner-spacing-mini;
}
.asset-list {
  &__empty {
    display: flex;
    align-items: center;
    flex-direction: column;
    padding-top: $inner-spacing-big;
    @include empty-search;
  }
  .empty-results-icon {
    margin-bottom: $inner-spacing-medium;
    display: block;
    height: 70px;
    width: 70px;
    background: url('~@/assets/img/no-results.svg') center no-repeat;
  }
}
</style>
