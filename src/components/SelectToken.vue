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
            prefix="s-icon-search-16"
            size="big"
          >
            <template #suffix v-if="query">
              <s-button type="link" class="s-button--clear" icon="clear-X-16" @click="handleClearSearch" />
            </template>
          </s-input>
        </div>
        <div v-if="filteredWhitelistTokens && filteredWhitelistTokens.length > 0" key="filtered" class="token-list">
          <div v-for="token in filteredWhitelistTokens" @click="selectToken(token)" :key="token.address" class="token-item">
            <s-col>
              <s-row flex justify="start" align="middle">
                <token-logo :token="token" size="big" />
                <div class="token-item__info s-flex">
                  <div class="token-item__symbol">{{ token.symbol }}</div>
                  <token-address :name="token.name" :symbol="token.symbol" :address="token.address" class="token-item__details" />
                </div>
              </s-row>
            </s-col>
            <div v-if="connected" class="token-item__amount-container">
              <span class="token-item__amount">{{ formatBalance(token) }}</span>
            </div>
          </div>
        </div>
        <div v-else key="empty" class="token-list token-list__empty">
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
            prefix="s-icon-search-16"
            size="big"
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
          <s-card shadow="always" size="small" border-radius="mini">
            <div class="add-asset-details_asset">
              <token-logo :token="customAsset" />
              <div class="asset-description s-flex">
                <div class="asset-description_symbol">{{ customAsset.symbol }}</div>
                <token-address :name="customAsset.name" :symbol="customAsset.symbol" :address="customAsset.address" class="asset-description_info" />
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
            <s-button class="add-asset-details_action s-typography-button--large" type="primary" :disabled="!customAsset || !isConfirmed || loading" @click="handleAddAsset">
              {{ t('addAsset.action') }}
            </s-button>
          </template>
        </div>
        <template v-if="connected && nonWhitelistAccountAssets">
          <div class="token-list_text">{{ nonWhitelistAccountAssets.length }} {{ t('selectToken.custom.text') }}</div>
          <div class="token-list">
            <div v-for="token in sortedNonWhitelistAccountAssets" @click="selectToken(token)" :key="token.address" class="token-item">
              <s-col>
                <s-row flex justify="start" align="middle">
                  <token-logo :token="token" />
                  <div class="token-item__info s-flex">
                    <div class="token-item__symbol">{{ token.symbol }}</div>
                    <token-address :name="token.name" :symbol="token.symbol" :address="token.address" class="token-item__details" />
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
        </template>
      </s-tab>
    </s-tabs>
  </dialog-base>
</template>

<script lang="ts">
import first from 'lodash/fp/first'
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { Asset, AccountAsset, isBlacklistAsset, Whitelist } from '@sora-substrate/util'
import { api } from '@soramitsu/soraneo-wallet-web'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import SelectAssetMixin from '@/components/mixins/SelectAssetMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'
import DialogBase from '@/components/DialogBase.vue'
import { Components, ObjectInit } from '@/consts'
import { lazyComponent } from '@/router'
import { formatAssetBalance, debouncedInputHandler } from '@/utils'

const namespace = 'assets'

@Component({
  components: {
    DialogBase,
    TokenLogo: lazyComponent(Components.TokenLogo),
    TokenAddress: lazyComponent(Components.TokenAddress)
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
  customAsset: Asset | null | undefined = null

  @Prop({ default: false, type: Boolean }) readonly connected!: boolean
  @Prop({ default: ObjectInit, type: Object }) readonly asset!: Asset
  @Prop({ default: false, type: Boolean }) readonly accountAssetsOnly!: boolean
  @Prop({ default: false, type: Boolean }) readonly notNullBalanceOnly!: boolean

  @Getter('whitelistAssets', { namespace }) whitelistAssets!: Array<Asset>
  @Getter('nonWhitelistAccountAssets', { namespace }) nonWhitelistAccountAssets!: Array<AccountAsset>
  @Getter('nonWhitelistAssets', { namespace }) nonWhitelistAssets!: Array<Asset>
  // Wallet store
  @Getter whitelist!: Whitelist
  @Getter whitelistIdsBySymbol!: any
  @Getter accountAssetsAddressTable

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
    const { asset: excludeAsset, whitelistAssets: assets, accountAssetsAddressTable, notNullBalanceOnly, accountAssetsOnly } = this

    return this.getAssetsWithBalances({ assets, accountAssetsAddressTable, notNullBalanceOnly, accountAssetsOnly, excludeAsset })
      .sort(this.sortByBalance())
  }

  get filteredWhitelistTokens (): Array<AccountAsset> {
    return this.filterAssetsByQuery(this.whitelistAssetsList)(this.query) as Array<AccountAsset>
  }

  selectToken (token: AccountAsset): void {
    this.query = ''
    this.$emit('select', token)
    this.$emit('close')
    this.isVisible = false
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
    return this.nonWhitelistAccountAssets.sort(this.sortByBalance())
  }

  get assetCardStatus (): string {
    return !this.customAsset ? 'success' : 'error'
  }

  get assetNatureText (): string {
    if (!this.customAsset) {
      return ''
    }
    const isBlacklist = isBlacklistAsset(this.customAsset, this.whitelistIdsBySymbol)
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
  transition: var(--s-transition-default);
  &:hover {
    background-color: var(--s-color-base-background-hover);
  }
  &__info {
    flex-direction: column;
  }
  &__details {
    color: var(--s-color-base-content-quaternary);
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-medium);
  }
  &__address, &__symbol {
    white-space: nowrap;
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
      text-align: right;
    }
  }
  &__remove {
    margin-top: -5px;
    margin-left: $inner-spacing-medium;
  }
  .s-col {
    padding-right: $inner-spacing-small;
  }
  .token-logo {
    margin-right: $inner-spacing-mini;
    flex-shrink: 0;
  }
}
.token-list {
  max-height: calc(#{$token-item-height} * 7);
  overflow-y: auto;
  overflow-x: hidden;
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
    background: url("~@/assets/img/no-results.svg") center no-repeat;
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
