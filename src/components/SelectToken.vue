<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('selectToken.title')"
    custom-class="asset-select"
  >
    <s-tabs v-model="tabValue" class="s-tabs--exchange" type="rounded" @click="handleTabClick">
      <s-tab :label="t('selectToken.assets.title')" name="assets">
        <div class="asset-select__search">
          <s-input
            ref="search"
            v-model="query"
            :placeholder="t('selectToken.searchPlaceholder')"
            class="token-search"
            prefix="el-icon-search"
            size="big"
            border-radius="mini"
          >
            <template #suffix v-if="query">
              <s-button type="link" class="s-button--clear" icon="clear-X-16" @click="handleClearSearch" />
            </template>
          </s-input>
        </div>
        <div v-if="filteredWhitelistTokens && filteredWhitelistTokens.length > 0" class="token-list">
          <div v-for="token in filteredWhitelistTokens" @click="selectToken(token)" :key="token.address" class="token-item">
            <s-col>
              <s-row flex justify="start" align="middle">
                <token-logo :token="token" />
                <div class="token-item__info s-flex">
                  <div class="token-item__symbol">{{ token.symbol }}</div>
                  <div class="token-item__details">{{ getTokenName(token) }}
                    <s-tooltip :content="t('selectToken.copy')">
                      <span class="token-item__address" @click="handleCopy(token, $event)">({{ getFormattedAddress(token) }})</span>
                    </s-tooltip>
                  </div>
                </div>
              </s-row>
            </s-col>
            <div v-if="connected" class="token-item__amount-container">
              <span class="token-item__amount">{{ formatBalance(token) }}</span>
            </div>
          </div>
        </div>
        <div v-else class="token-list token-list__empty">
          <span class="empty-results-icon" />
          {{ t('selectToken.emptyListMessage') }}
        </div>
      </s-tab>
      <s-tab :label="t('selectToken.custom.title')" name="custom">
        <div class="asset-select__search">
          <s-input
            v-model="customAddress"
            :placeholder="t('selectToken.custom.search')"
            class="token-search"
            prefix="el-icon-search"
            size="big"
            border-radius="mini"
            @input="debouncedCustomAssetSearch"
          >
            <template #suffix v-if="customAddress">
              <s-button type="link" class="s-button--clear" icon="clear-X-16" @click="resetCustomAssetFields" />
            </template>
          </s-input>
        </div>
        <div class="asset-select__info" v-if="alreadyAttached">{{ t('selectToken.custom.alreadyAttached') }}</div>
        <div class="asset-select__info" v-else-if="!customAsset && customAddress">{{ t('selectToken.custom.notFound') }}</div>
        <div class="add-asset-details" v-if="customAsset">
          <div class="add-asset-details_asset">
            <token-logo :token="customAsset" />
            <div class="asset-description s-flex">
              <div class="asset-description_symbol">{{ customAsset.symbol }}</div>
              <div class="asset-description_info">{{ getTokenName(customAsset) }}
                <s-tooltip :content="t('assets.copy')">
                  <span class="asset-id" @click="handleCopy(customAsset, $event)">({{ getFormattedAddress(customAsset) }})</span>
                </s-tooltip>
              </div>
              <div class="asset-nature" :style="assetNatureStyles">{{ assetNatureText }}</div>
            </div>
          </div>
          <div class="add-asset-details_text">
            <span class="p2">{{ t('addAsset.warningTitle') }}</span>
            <span class="warning-text p4">{{ t('addAsset.warningMessage') }}</span>
          </div>
          <div class="add-asset-details_confirm">
            <span>{{ t('addAsset.understand') }}</span>
            <s-switch v-model="isConfirmed" :disabled="loading" />
          </div>
          <s-button class="add-asset-details_action s-typography-button--big" type="primary" :disabled="!customAsset || !isConfirmed || loading" @click="handleAddAsset">
            {{ t('addAsset.action') }}
          </s-button>
        </div>
        <div v-if="nonWhitelistAccountAssets" class="token-list">
          <div class="token-list_text">{{ nonWhitelistAccountAssets.length }} {{ t('selectToken.custom.text') }}</div>
          <div v-for="token in sortedNonWhitelistAccountAssets" @click="selectToken(token)" :key="token.address" class="token-item">
            <s-col>
              <s-row flex justify="start" align="middle">
                <token-logo :token="token" />
                <div class="token-item__info s-flex">
                  <div class="token-item__symbol">{{ token.symbol }}</div>
                  <div class="token-item__details">{{ getTokenName(token) }}
                    <s-tooltip :content="t('selectToken.copy')">
                      <span class="token-item__address" @click="handleCopy(token, $event)">({{ getFormattedAddress(token) }})</span>
                    </s-tooltip>
                  </div>
                </div>
              </s-row>
            </s-col>
            <div v-if="connected" class="token-item__amount-container">
              <span class="token-item__amount">{{ formatBalance(token) }}</span>
            </div>
            <div class="token-item__remove" @click="handleRemoveCustomAsset(token, $event)">
              <s-icon name="basic-trash-24" />
            </div>
          </div>
        </div>
      </s-tab>
    </s-tabs>
  </dialog-base>
</template>

<script lang="ts">
import first from 'lodash/fp/first'
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { Asset, AccountAsset } from '@sora-substrate/util'
import { api } from '@soramitsu/soraneo-wallet-web'
import { isBlacklistAsset } from 'polkaswap-token-whitelist'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import SelectAssetMixin from '@/components/mixins/SelectAssetMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'
import DialogBase from '@/components/DialogBase.vue'
import { Components } from '@/consts'
import { lazyComponent } from '@/router'
import { copyToClipboard, formatAddress, formatAssetBalance, debouncedInputHandler } from '@/utils'

const namespace = 'assets'

@Component({
  components: {
    DialogBase,
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class SelectToken extends Mixins(TranslationMixin, SelectAssetMixin, LoadingMixin, NumberFormatterMixin) {
  readonly tokenTabs = [
    'assets',
    'custom'
  ]

  tabValue = first(this.tokenTabs)
  query = ''
  customAddress = ''
  alreadyAttached = false
  isConfirmed = false
  customAsset: Asset | null = null

  @Prop({ default: () => false, type: Boolean }) readonly connected!: boolean
  @Prop({ default: () => null, type: Object }) readonly asset!: Asset
  @Prop({ default: () => false, type: Boolean }) readonly accountAssetsOnly!: boolean
  @Prop({ default: () => false, type: Boolean }) readonly notNullBalanceOnly!: boolean

  @Getter('whitelistAssets', { namespace }) whitelistAssets!: Array<Asset>
  @Getter('nonWhitelistAccountAssets', { namespace }) nonWhitelistAccountAssets!: Array<AccountAsset>
  @Getter('nonWhitelistAssets', { namespace }) nonWhitelistAssets!: Array<Asset>
  @Getter accountAssetsAddressTable // Wallet store

  // Wallet
  @Action addAsset!: (options: { address?: string }) => Promise<void>

  resetCustomAssetFields (): void {
    this.isConfirmed = false
    this.alreadyAttached = false
    this.customAsset = null
    this.customAddress = ''
  }

  @Watch('visible')
  async handleVisibleChangeToFocusSearch (value: boolean): Promise<void> {
    await this.$nextTick()

    if (!value) return

    this.tabValue = first(this.tokenTabs)
    this.resetCustomAssetFields()
    this.focusSearchInput()
  }

  handleTabClick ({ name }): void {
    this.tabValue = name
  }

  get whitelistAssetsList (): Array<AccountAsset> {
    const { asset: excludeAsset, whitelistAssets, accountAssetsAddressTable, notNullBalanceOnly, accountAssetsOnly } = this

    return this.getWhitelistAssetsWithBalances({ whitelistAssets, accountAssetsAddressTable, notNullBalanceOnly, accountAssetsOnly, excludeAsset })
  }

  get filteredWhitelistTokens (): Array<AccountAsset> {
    if (!this.query) {
      return this.whitelistAssetsList
    }
    const query = this.query.toLowerCase().trim()
    return this.whitelistAssetsList.filter(t =>
      t.address?.toLowerCase?.() === query ||
      t.symbol?.toLowerCase?.()?.includes?.(query) ||
      t.name?.toLowerCase?.()?.includes?.(query)
    )
  }

  selectToken (token: AccountAsset): void {
    this.query = ''
    this.$emit('select', token)
    this.$emit('close')
    this.isVisible = false
  }

  async handleCopy (token: AccountAsset, event: Event): Promise<void> {
    event.stopImmediatePropagation()
    try {
      await copyToClipboard(token.address)
      this.$notify({
        message: this.t('selectToken.successCopy', { symbol: token.symbol }),
        type: 'success',
        title: ''
      })
    } catch (error) {
      this.$notify({
        message: `${this.t('warningText')} ${error}`,
        type: 'warning',
        title: ''
      })
    }
  }

  getFormattedAddress (token: AccountAsset): string {
    return formatAddress(token.address, 10)
  }

  getTokenName (token: AccountAsset): string {
    return `${token.name || token.symbol}`
  }

  formatBalance (token: AccountAsset): string {
    return formatAssetBalance(token, {
      showZeroBalance: false,
      formattedZero: '-'
    })
  }

  handleClearSearch (): void {
    this.query = ''
  }

  get sortedNonWhitelistAccountAssets (): Array<AccountAsset> {
    return this.nonWhitelistAccountAssets.sort(this.sort)
  }

  get assetNatureStyles (): object {
    const styles = {}
    if (!this.customAsset) {
      return styles
    }
    return {
      color: 'var(--s-color-status-error)'
    }
  }

  get assetNatureText (): string {
    if (!this.customAsset) {
      return ''
    }
    const isBlacklist = isBlacklistAsset(this.customAsset)
    if (isBlacklist) {
      return this.t('addAsset.scam')
    }
    return this.t('addAsset.unknown')
  }

  searchCustomAsset (): void {
    const value = this.customAddress
    this.alreadyAttached = false
    if (!value.trim()) {
      this.customAsset = null
      return
    }
    const search = value.trim().toLowerCase()
    if (this.nonWhitelistAccountAssets.find(({ address }) => address.toLowerCase() === search)) {
      this.customAsset = null
      this.alreadyAttached = true
      return
    }
    const asset = this.nonWhitelistAssets.find(({ address }) => address.toLowerCase() === search)
    this.customAsset = asset ?? null
  }

  debouncedCustomAssetSearch = debouncedInputHandler(this.searchCustomAsset)

  async handleAddAsset (): Promise<void> {
    await this.withLoading(async () => await this.addAsset({ address: (this.customAsset || {}).address }))
    this.resetCustomAssetFields()
  }

  handleRemoveCustomAsset (asset: Asset, event: Event): void {
    event.stopImmediatePropagation()
    api.removeAsset(asset.address)
    if (this.customAddress) {
      this.searchCustomAsset()
    }
  }
}
</script>

<style lang="scss">
.asset-select {
  @include exchange-tabs();
}
</style>

<style lang="scss" scoped>
@include search-item('asset-select__search');

$token-item-height: 71px;

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
.token-list_text, .token-item, .add-asset-details, .asset-select__info {
  padding: 0 $inner-spacing-big;
}
.asset-select__info {
  color: var(--s-color-base-content-secondary);
  margin-bottom: $inner-spacing-medium;
}
.token-item {
  height: $token-item-height;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.125s ease-in-out;
  &:hover {
    background-color: var(--s-color-base-background-hover);
  }
  &__info {
    flex-direction: column;
  }
  &__info, &__amount {
    font-size: var(--s-font-size-small);
  }
  &__details {
    color: var(--s-color-base-content-quaternary);
    font-size: var(--s-font-size-mini);
  }
  &__address, &__symbol {
    white-space: nowrap;
  }
  &__address {
    outline: none;
    &:hover {
      text-decoration: underline;
      cursor: pointer;
    }
  }
  &__symbol, &__amount {
    font-size: var(--s-font-size-big);
    line-height: var(--s-line-height-small);
    letter-spacing: var(--s-letter-spacing-small);
    font-weight: 800;
    white-space: nowrap;
  }
  &__amount {
    &-container {
      width: 45%;
      text-align: right;
    }
  }
  &__remove {
    margin-top: -25px;
    margin-left: $inner-spacing-medium;
  }
  .s-col {
    padding-right: $inner-spacing-small;
  }
  .token-logo {
    margin-right: $inner-spacing-medium;
    flex-shrink: 0;
  }
}
.token-list {
  height: calc(#{$token-item-height} * 7);
  overflow: auto;
  &__empty {
    display: flex;
    align-items: center;
    flex-direction: column;
    padding-top: $inner-spacing-big;
    color: var(--s-color-base-content-tertiary);
    font-feature-settings: $s-font-feature-settings-common;
    line-height: var(--s-line-height-big);
  }
  .empty-results-icon {
    margin-bottom: $inner-spacing-medium;
    display: block;
    height: 70px;
    width: 70px;
    background: url("~@/assets/img/no-results.svg") center no-repeat;
  }
}
.add-asset-details {
  &_asset {
    display: flex;
    align-items: center;
    background: var(--s-color-base-background);
    padding: $inner-spacing-small $inner-spacing-medium;
    margin-bottom: $inner-spacing-medium;
    border-radius: var(--s-border-radius-small);
    .asset {
      &-description {
        flex: 1;
        flex-direction: column;
        line-height: var(--s-line-height-big);
        margin-left: $inner-spacing-small;
        &_symbol {
          font-feature-settings: var(--s-font-feature-settings-common);
          font-weight: 600;
        }
        &_info {
          color: var(--s-color-base-content-tertiary);
          font-size: var(--s-font-size-mini);
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
  &_text {
    display: flex;
    flex-direction: column;
    padding: $inner-spacing-medium;
    margin-bottom: $inner-spacing-medium;
    border: 1px solid var(--s-color-base-border-secondary);
    border-radius: var(--s-border-radius-small);
    .warning-text {
      color: var(-s-color-base-content-secondary);
    }
  }
  &_confirm {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--s-color-base-background);
    padding: $inner-spacing-small $inner-spacing-medium;
    border-radius: var(--s-border-radius-mini);
    margin-bottom: $inner-spacing-medium;
  }
  &_action {
    width: 100%;
    margin-bottom: $inner-spacing-medium;
  }
}
</style>
