<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('selectRegisteredAsset.title')"
    :custom-class="containerClasses"
  >
    <s-form-item class="el-form-item--search">
      <s-input
        v-model="query"
        :placeholder="t('selectRegisteredAsset.search.placeholder')"
        class="asset-search"
        prefix="el-icon-search"
        size="medium"
        border-radius="mini"
        @focus="handleSearchFocus"
      >
        <template #suffix v-if="query">
          <s-button class="s-button--clear" icon="clear-X-16" @click="handleClearSearch" />
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
            <div :class="assetListClasses(filteredAssets, !isSoraToEvm)">
              <div v-for="asset in filteredAssets" @click="selectAsset(asset)" :key="asset.address" class="asset-item">
                <s-col>
                  <s-row flex justify="start" align="middle">
                    <token-logo :token="asset" />
                    <div class="asset-item__name">{{ getAssetName(asset, !isSoraToEvm) }}</div>
                  </s-row>
                </s-col>
                <div class="asset-item__balance-container">
                  <span class="asset-item__balance">{{ formatBalance(asset) }}</span>
                </div>
              </div>
            </div>
          </template>
          <div v-else class="asset-list asset-list__empty p4">
            <span class="empty-results-icon" />
            {{ t('selectRegisteredAsset.search.emptyListMessage') }}
          </div>
        </div>
      </s-tab>
      <s-tab :label="t('selectRegisteredAsset.customAsset.title')" name="custom">
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
            :placeholder="t(`selectRegisteredAsset.customAsset.addressPlaceholder`)"
            :maxlength="128"
            border-radius="mini"
            @change="handleCustomAssetSearch"
          />
          <s-input
            v-if="customSymbol"
            v-model="customSymbol"
            class="custom-asset-symbol"
            :placeholder="t(`selectRegisteredAsset.customAsset.symbolPlaceholder`)"
            :maxlength="10"
            border-radius="mini"
            readonly
          />
          <!-- TODO: Add appropriate validation styles -->
          <div v-if="customAddress && !customSymbol" class="custom-asset-info">
            {{ t(`selectRegisteredAsset.customAsset.${alreadyAttached ? 'alreadyAttached' : 'empty'}`) }}
          </div>
          <s-button class="s-button--next" type="primary" :disabled="!(customAddress && customSymbol)" @click="handleCustomAssetNext">{{ t('bridge.next') }}</s-button>
        </div>
      </s-tab>
    </s-tabs>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { Asset, AccountAsset, RegisteredAccountAsset, KnownAssets } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'
import DialogBase from '@/components/DialogBase.vue'
import { Components } from '@/consts'
import { lazyComponent } from '@/router'
import { formatAssetBalance } from '@/utils'

const namespace = 'assets'

// TODO: Combine SelectToken & this component
@Component({
  components: {
    DialogBase,
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class SelectRegisteredAsset extends Mixins(TranslationMixin, DialogMixin, LoadingMixin, NumberFormatterMixin) {
  query = ''
  selectedAsset: AccountAsset | RegisteredAccountAsset | null = null
  readonly tokenTabs = [
    'tokens',
    'custom'
  ]

  tabValue = this.tokenTabs[0]
  customAddress = ''
  customSymbol = ''
  alreadyAttached = false
  selectedCustomAsset: Asset | undefined | null = null

  @Prop({ default: () => null, type: Object }) readonly asset!: AccountAsset

  @Getter accountAssets!: Array<AccountAsset> // Wallet store

  @Getter('isSoraToEvm', { namespace: 'bridge' }) isSoraToEvm!: boolean
  @Getter('registeredAssets', { namespace }) registeredAssets!: Array<RegisteredAccountAsset>

  @Action('getCustomAsset', { namespace }) getAsset

  get containerClasses (): string {
    const componentClass = 'asset-select'
    const classes = [componentClass]

    if (this.query) {
      classes.push(`${componentClass}--search`)
    }

    return classes.join(' ')
  }

  get assetsList (): Array<AccountAsset | RegisteredAccountAsset> {
    return this.getAssets(this.isSoraToEvm ? this.accountAssets : this.registeredAssets)
  }

  get addressSymbol (): string {
    return this.isSoraToEvm ? 'address' : 'externalAddress'
  }

  get filteredAssets (): Array<AccountAsset | RegisteredAccountAsset> {
    return this.getFilteredAssets(this.assetsList)
  }

  get hasFilteredAssets (): boolean {
    return Array.isArray(this.filteredAssets) && this.filteredAssets.length > 0
  }

  formatBalance (asset?: AccountAsset | RegisteredAccountAsset): string {
    return formatAssetBalance(asset, {
      internal: this.isSoraToEvm,
      showZeroBalance: false,
      formattedZero: '-'
    })
  }

  getAssets (assets: Array<AccountAsset | RegisteredAccountAsset>): Array<AccountAsset | RegisteredAccountAsset> {
    const assetsList = this.asset ? assets?.filter(asset => asset.address !== this.asset.address) : assets
    return this.isSoraToEvm ? assetsList.filter(asset => !Number.isNaN(+asset?.balance?.transferable)) : assetsList
  }

  getFilteredAssets (assets: Array<AccountAsset | RegisteredAccountAsset>): Array<AccountAsset | RegisteredAccountAsset> {
    if (this.query) {
      const query = this.query.toLowerCase().trim()
      return assets.filter(asset =>
        `${asset.name}`.toLowerCase().includes(query) ||
        `${asset.symbol}`.toLowerCase().includes(query) ||
        `${asset[this.addressSymbol]}`.toLowerCase() === query
      )
    }

    return assets
  }

  assetListClasses (filteredAssetsList: Array<AccountAsset>, isEthereumAssetsList = false): string {
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

  selectAsset (asset: AccountAsset | RegisteredAccountAsset): void {
    this.selectedAsset = asset
    this.query = ''
    this.tabValue = this.tokenTabs[0]
    this.$emit('select', asset)
    this.$emit('close')
    this.isVisible = false
  }

  getAssetName (asset: AccountAsset | RegisteredAccountAsset, isMirrorAsset = false): string {
    let assetName = ''
    if (isMirrorAsset) {
      assetName = this.t('selectRegisteredAsset.search.mirrorPrefix') + ' '
    }
    assetName += (asset.name || asset.symbol) + ' ('
    if (isMirrorAsset) {
      assetName += this.isSoraToEvm ? 's' : 'e'
    }
    assetName += asset.symbol + ')'
    return assetName
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

  handleCustomAssetNext (): void {
    // TODO: Should we rename the button to Add Asset?
  }
}
</script>

<style lang="scss">
$tabs-class: ".el-tabs";
$tabs-container-height: 40px;
$tabs-container-padding: 2px;
$tabs-item-height: 36px;

.asset-select {
  .el-dialog {
    overflow: hidden;
    &__body {
      padding: $inner-spacing-mini 0 $inner-spacing-big !important;
    }
  }
  .s-tabs.s-tabs--exchange {
    &#{$tabs-class} {
      #{$tabs-class}__header {
        margin-bottom: $inner-spacing-medium;
      }
    }
    #{$tabs-class} {
      &__header {
        margin-left: $inner-spacing-big;
        width: calc(100% - 2 * #{$inner-spacing-big});
        #{$tabs-class}__nav-wrap #{$tabs-class}__item {
          padding-right: $inner-spacing-medium;
          padding-left: $inner-spacing-medium;
          &.is-active {
            box-shadow: var(--s-shadow-tab);
            &, &:hover {
              background-color: var(--s-color-base-on-accent);
            }
          }
        }
        #{$tabs-class}__item {
          height: $tabs-item-height;
          width: 50%;
          line-height: $tabs-item-height;
          font-feature-settings: $s-font-feature-settings-title;
          font-weight: 700 !important;
          text-align: center;
          &.is-focus:not(.is-active) {
            box-shadow: none !important;
          }
        }
      }
      &__nav {
        width: 100%;
        &-wrap {
          height: $tabs-container-height;
          background-color: var(--s-color-base-background);
        }
      }
      &__content {
        height: calc(#{$select-asset-item-height} * 7);
      }
    }
  }
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
.asset-item {
  height: $select-asset-item-height;
  padding: 0 $select-asset-horizontal-spacing;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  &:hover {
    background-color: var(--s-color-base-background-hover);
  }
  &__name, &__balance {
    font-size: var(--s-font-size-small);
    font-weight: 600;
  }
  &__balance-container {
    width: 45%;
    text-align: right;
  }
  .s-col {
    padding-right: $inner-spacing-small;
  }
  .token-logo {
    margin-right: $inner-spacing-medium;
    flex-shrink: 0;
  }
}
.network-label {
  color: var(--s-color-base-content-secondary);
  font-size: $s-heading3-caps-font-size;
  line-height: $s-line-height-base;
  letter-spacing: $s-letter-spacing-type;
  font-weight: 700 !important;
  font-feature-settings: $s-font-feature-settings-type;
  text-transform: uppercase;
  .asset-list + & {
    margin-top: $inner-spacing-medium;
  }
}
.asset-lists-container {
  margin-top: $inner-spacing-mini;
}
.asset-list {
  &--scrollbar {
    height: #{$select-asset-item-height * 6};
    overflow: auto;
  }
  &--evm {
    @include evm-logo-styles;
  }
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
    line-height: $s-line-height-big;
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
