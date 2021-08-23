<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('selectRegisteredAsset.title')"
    :custom-class="containerClasses"
  >
    <s-form-item class="el-form-item--search">
      <s-input
        ref="search"
        v-model="query"
        :placeholder="t('selectRegisteredAsset.search.placeholder')"
        class="asset-search"
        prefix="s-icon-search-16"
        size="big"
        @focus="handleSearchFocus"
      >
        <template #suffix v-if="query">
          <s-button type="link" class="s-button--clear" icon="clear-X-16" @click="handleClearSearch" />
        </template>
      </s-input>
    </s-form-item>
    <!-- TODO: Move each tab to separate component -->
    <s-tabs v-model="tabValue" class="s-tabs--exchange" type="rounded" @click="handleTabClick">
      <s-tab :label="t('selectRegisteredAsset.search.title')" name="tokens">
        <div class="asset-lists-container">
          <template v-if="hasFilteredAssets">
            <h3 class="network-label">
              {{ isSoraToEvm ? t('selectRegisteredAsset.search.networkLabelSora') : t('selectRegisteredAsset.search.networkLabelEthereum') }}
            </h3>
            <s-scrollbar class="asset-list-scrollbar">
              <div :class="assetListClasses(filteredAssets, !isSoraToEvm)">
                <div v-for="asset in filteredAssets" :key="asset.address" :set="formattedAssetBalance = formatBalance(asset)" class="asset-item" @click="selectAsset(asset)">
                  <s-col>
                    <s-row flex justify="start" align="middle">
                      <token-logo :token="asset" size="big" />
                      <div class="asset-item__info s-flex">
                        <div class="asset-item__symbol">{{ asset.symbol }}</div>
                        <token-address :name="asset.name || asset.symbol" :symbol="asset.symbol" :address="asset.address" class="asset-item__details" />
                      </div>
                    </s-row>
                  </s-col>
                  <div class="asset-item__balance-container">
                    <formatted-amount-with-fiat-value
                      v-if="formattedAssetBalance !== formattedZeroSymbol"
                      value-class="asset-item__balance"
                      :value="formattedAssetBalance"
                      :font-size-rate="FontSizeRate.MEDIUM"
                      :has-fiat-value="shouldFiatBeShown(asset)"
                      :fiat-value="getFiatBalance(asset)"
                      :fiat-font-size-rate="FontSizeRate.MEDIUM"
                      :fiat-font-weight-rate="FontWeightRate.MEDIUM"
                    />
                    <span v-else class="asset-item__balance">{{ formattedZeroSymbol }}</span>
                  </div>
                </div>
              </div>
            </s-scrollbar>
          </template>
          <div v-else class="asset-list asset-list__empty p4">
            <span class="empty-results-icon" />
            {{ t('selectRegisteredAsset.search.emptyListMessage') }}
          </div>
        </div>
      </s-tab>
      <s-tab :label="t('selectRegisteredAsset.customAsset.title')" name="custom" disabled>
        <div class="custom-asset">
          <p class="custom-asset-info">
            {{ t('selectRegisteredAsset.customAsset.customInfo') }}
            <s-button
              :tooltip="t('comingSoonText')"
              type="link"
              @click="handleRegisterToken"
            >
              {{ t('selectRegisteredAsset.customAsset.registerToken') }}
            </s-button>
          </p>
          <s-input
            v-model="customAddress"
            class="custom-asset-address"
            :placeholder="t('selectRegisteredAsset.customAsset.addressPlaceholder')"
            :maxlength="128"
            @change="handleCustomAssetSearch"
          />
          <s-input
            v-if="customSymbol"
            v-model="customSymbol"
            class="custom-asset-symbol"
            :placeholder="t('selectRegisteredAsset.customAsset.symbolPlaceholder')"
            :maxlength="10"
            readonly
          />
          <!-- TODO: Add appropriate validation styles -->
          <div v-if="customAddress && !customSymbol" class="custom-asset-info">
            {{ t(`selectRegisteredAsset.customAsset.${alreadyAttached ? 'alreadyAttached' : 'empty'}`) }}
          </div>
          <s-button class="s-button--next s-typography-button--large" type="primary" :disabled="!(customAddress && customSymbol)" @click="handleCustomAssetNext">{{ t('bridge.next') }}</s-button>
        </div>
      </s-tab>
    </s-tabs>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { Asset, AccountAsset, RegisteredAccountAsset } from '@sora-substrate/util'
import { FormattedAmountMixin, FormattedAmountWithFiatValue, FontSizeRate, FontWeightRate } from '@soramitsu/soraneo-wallet-web'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import SelectAssetMixin from '@/components/mixins/SelectAssetMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import DialogBase from '@/components/DialogBase.vue'
import { Components, ObjectInit } from '@/consts'
import { lazyComponent } from '@/router'
import { formatAssetBalance } from '@/utils'

const namespace = 'assets'

// TODO: Combine SelectToken & this component
@Component({
  components: {
    DialogBase,
    FormattedAmountWithFiatValue,
    TokenLogo: lazyComponent(Components.TokenLogo),
    TokenAddress: lazyComponent(Components.TokenAddress)
  }
})
export default class SelectRegisteredAsset extends Mixins(FormattedAmountMixin, TranslationMixin, SelectAssetMixin, LoadingMixin) {
  query = ''
  selectedAsset: Nullable<AccountAsset | RegisteredAccountAsset> = null
  readonly tokenTabs = [
    'tokens',
    'custom'
  ]

  readonly FontSizeRate = FontSizeRate
  readonly FontWeightRate = FontWeightRate
  readonly formattedZeroSymbol = '-'

  tabValue = this.tokenTabs[0]
  customAddress = ''
  customSymbol = ''
  alreadyAttached = false
  selectedCustomAsset: Nullable<Asset> = null

  @Prop({ default: ObjectInit, type: Object }) readonly asset!: AccountAsset

  @Getter('whitelistAssets', { namespace }) whitelistAssets!: Array<Asset>
  @Getter('isSoraToEvm', { namespace: 'bridge' }) isSoraToEvm!: boolean
  @Getter('registeredAssets', { namespace }) registeredAssets!: Array<RegisteredAccountAsset>
  @Getter accountAssetsAddressTable // Wallet store

  @Action('getCustomAsset', { namespace }) getAsset

  @Watch('visible')
  async handleVisibleChangeToFocusSearch (value: boolean): Promise<void> {
    await this.$nextTick()

    if (!value) return

    this.focusSearchInput()
  }

  get containerClasses (): string {
    const componentClass = 'asset-select'
    const classes = [componentClass]

    if (this.query) {
      classes.push(`${componentClass}--search`)
    }

    return classes.join(' ')
  }

  get assetsList (): Array<RegisteredAccountAsset> {
    const { registeredAssets: assets, accountAssetsAddressTable, asset: excludeAsset } = this

    return this.getAssetsWithBalances({ assets, accountAssetsAddressTable, excludeAsset })
      .sort(this.sortByBalance(!this.isSoraToEvm)) as Array<RegisteredAccountAsset>
  }

  get addressSymbol (): string {
    return this.isSoraToEvm ? 'address' : 'externalAddress'
  }

  get filteredAssets (): Array<RegisteredAccountAsset> {
    return this.filterAssetsByQuery(this.assetsList, !this.isSoraToEvm)(this.query) as Array<RegisteredAccountAsset>
  }

  get hasFilteredAssets (): boolean {
    return Array.isArray(this.filteredAssets) && this.filteredAssets.length > 0
  }

  formatBalance (asset?: RegisteredAccountAsset): string {
    return formatAssetBalance(asset, {
      internal: this.isSoraToEvm,
      showZeroBalance: false,
      formattedZero: this.formattedZeroSymbol
    })
  }

  assetListClasses (filteredAssetsList: Array<RegisteredAccountAsset>, isEthereumAssetsList = false): string {
    const componentClass = 'asset-list'
    const classes = [componentClass]

    if (isEthereumAssetsList) {
      classes.push(`${componentClass}--evm`)
    }
    if (filteredAssetsList && filteredAssetsList.length > 6) {
      classes.push(`${componentClass}--scrollbar`)
    }

    return classes.join(' ')
  }

  selectAsset (asset: RegisteredAccountAsset): void {
    this.selectedAsset = asset
    this.query = ''
    this.tabValue = this.tokenTabs[0]
    this.$emit('select', asset)
    this.$emit('close')
    this.isVisible = false
  }

  handleTabClick ({ name }): void {
    this.tabValue = name
  }

  handleSearchFocus (): void {
    if (this.tabValue === this.tokenTabs[1]) {
      this.tabValue = this.tokenTabs[0]
    }
  }

  handleClearSearch (): void {
    this.query = ''
  }

  handleRegisterToken (): void {
    // TODO: Add Register Token component
  }

  async handleCustomAssetSearch (value: string): Promise<void> {
    this.alreadyAttached = false
    if (!value.trim()) {
      this.selectedCustomAsset = null
      this.customSymbol = ''
      return
    }
    const search = value.trim().toLowerCase()
    const asset = await this.getAsset({ address: search })
    if (this.assetsList.find(asset => asset[this.addressSymbol] === search)) {
      this.selectedCustomAsset = null
      this.customSymbol = ''
      this.alreadyAttached = true
      return
    }
    this.selectedCustomAsset = asset
    if (this.selectedCustomAsset && this.selectedCustomAsset.symbol) {
      this.customSymbol = this.selectedCustomAsset.symbol
    } else {
      this.selectedCustomAsset = null
      this.customSymbol = ''
    }
  }

  shouldFiatBeShown (asset: RegisteredAccountAsset): boolean {
    return this.isSoraToEvm && !!this.getAssetFiatPrice(asset)
  }

  handleCustomAssetNext (): void {
    // TODO: Should we rename the button to Add Asset?
  }
}
</script>

<style lang="scss">
.asset-select {
  @include exchange-tabs();
  @include select-asset('asset-item');
}
.asset-list-scrollbar {
  @include scrollbar(0, 0);
}
</style>

<style lang="scss" scoped>
$select-asset-horizontal-spacing: $inner-spacing-big;

.asset-select {
  &--search {
    .network-label {
      display: none;
    }
  }
}
@include search-item;
.asset-search,
.network-label,
.custom-asset {
  margin-left: $select-asset-horizontal-spacing;
  width: calc(100% - 2 * #{$select-asset-horizontal-spacing});
}
.asset-search {
  margin-bottom: $inner-spacing-medium;
}
@include select-asset-scoped('asset-item');
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
  height: calc(#{$select-asset-item-height} * 7);

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
    background: url("~@/assets/img/no-results.svg") center no-repeat;
  }
}
.custom-asset {
  &-info {
    padding-right: $inner-spacing-mini / 2;
    padding-left: $inner-spacing-mini / 2;
    color: var(--s-color-base-content-secondary);
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-big);
    .s-link {
      height: auto;
      padding: 0;
      color: var(--s-color-theme-accent);
      font-size: inherit;
      line-height: inherit;
      text-decoration: underline;
      &:hover {
        text-decoration: none;
      }
    }
    ~ * {
      margin-top: $inner-spacing-medium;
    }
  }
  .s-button--next {
    @include next-button;
  }
}
</style>
