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
        <s-scrollbar v-if="filteredWhitelistTokens && filteredWhitelistTokens.length > 0" key="filtered" class="token-list-scrollbar">
          <div class="token-list">
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
              <div v-if="connected" class="token-item__balance-container">
                <formatted-amount-with-fiat-value
                  v-if="formatBalance(token) !== formattedZeroSymbol"
                  value-class="token-item__balance"
                  :value="formatBalance(token)"
                  :font-size-rate="FontSizeRate.MEDIUM"
                  :has-fiat-value="shouldFiatBeShown(token)"
                  :fiat-value="getFiatBalance(token)"
                  :fiat-font-size-rate="FontSizeRate.MEDIUM"
                  :fiat-font-weight-rate="FontWeightRate.MEDIUM"
                />
                <span v-else class="token-item__balance">{{ formattedZeroSymbol }}</span>
              </div>
            </div>
          </div>
        </s-scrollbar>
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
          <s-scrollbar v-if="sortedNonWhitelistAccountAssets && sortedNonWhitelistAccountAssets.length > 0" key="filtered" class="token-list-scrollbar">
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
                <div v-if="connected" class="token-item__balance-container">
                  <formatted-amount-with-fiat-value
                    v-if="formatBalance(token) !== formattedZeroSymbol"
                    value-class="token-item__balance"
                    :value="formatBalance(token)"
                    :font-size-rate="FontSizeRate.MEDIUM"
                    :has-fiat-value="shouldFiatBeShown(token)"
                    :fiat-value="getFiatBalance(token)"
                    :fiat-font-size-rate="FontSizeRate.MEDIUM"
                    :fiat-font-weight-rate="FontWeightRate.MEDIUM"
                  />
                  <span v-else class="token-item__balance">{{ formattedZeroSymbol }}</span>
                </div>
                <div class="token-item__remove" @click="handleRemoveCustomAsset(token, $event)">
                  <s-icon name="basic-trash-24" />
                </div>
              </div>
            </div>
          </s-scrollbar>
        </template>
      </s-tab>
    </s-tabs>
  </dialog-base>
</template>

<script lang="ts">
import first from 'lodash/fp/first'
import { Component, Mixins, Prop, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { Asset, AccountAsset, isBlacklistAsset } from '@sora-substrate/util'
import { api, mixins, components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import SelectAssetMixin from '@/components/mixins/SelectAssetMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import DialogBase from '@/components/DialogBase.vue'
import { Components, ObjectInit } from '@/consts'
import { lazyComponent } from '@/router'
import { formatAssetBalance, debouncedInputHandler } from '@/utils'

const namespace = 'assets'

@Component({
  components: {
    FormattedAmountWithFiatValue: components.FormattedAmountWithFiatValue,
    DialogBase,
    TokenLogo: lazyComponent(Components.TokenLogo),
    TokenAddress: lazyComponent(Components.TokenAddress)
  }
})
export default class SelectToken extends Mixins(mixins.FormattedAmountMixin, TranslationMixin, SelectAssetMixin, LoadingMixin) {
  private readonly formattedZeroSymbol = '-'
  readonly tokenTabs = [
    'assets',
    'custom'
  ]

  readonly FontSizeRate = WALLET_CONSTS.FontSizeRate
  readonly FontWeightRate = WALLET_CONSTS.FontWeightRate

  tabValue = first(this.tokenTabs)
  query = ''
  customAddress = ''
  alreadyAttached = false
  isConfirmed = false
  customAsset: Nullable<Asset> = null

  @Prop({ default: false, type: Boolean }) readonly connected!: boolean
  @Prop({ default: ObjectInit, type: Object }) readonly asset!: Asset
  @Prop({ default: false, type: Boolean }) readonly accountAssetsOnly!: boolean
  @Prop({ default: false, type: Boolean }) readonly notNullBalanceOnly!: boolean

  @Getter('whitelistAssets', { namespace }) whitelistAssets!: Array<Asset>
  @Getter('nonWhitelistAccountAssets', { namespace }) nonWhitelistAccountAssets!: Array<AccountAsset>
  @Getter('nonWhitelistAssets', { namespace }) nonWhitelistAssets!: Array<Asset>
  // Wallet store
  @Getter whitelistIdsBySymbol!: any
  @Getter accountAssetsAddressTable!: any

  // Wallet
  @Action addAsset!: (address?: string) => Promise<void>

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
      formattedZero: this.formattedZeroSymbol
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
    await this.withLoading(async () => await this.addAsset((this.customAsset || {}).address))
    this.resetCustomAssetFields()
  }

  handleRemoveCustomAsset (asset: Asset, event: Event): void {
    event.stopImmediatePropagation()
    api.removeAsset(asset.address)
    if (this.customAddress) {
      this.searchCustomAsset()
    }
  }

  shouldFiatBeShown (asset: AccountAsset): boolean {
    return !!this.getAssetFiatPrice(asset)
  }
}
</script>

<style lang="scss">
.asset-select {
  @include exchange-tabs();
  @include select-asset;
}
.token-list-scrollbar {
  @include scrollbar(0, 0)
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
.token-list_text, .add-asset-details, .asset-select__info {
  padding: 0 $inner-spacing-big;
}
.asset-select__info {
  color: var(--s-color-base-content-secondary);
  margin-bottom: $inner-spacing-medium;
}
@include select-asset-scoped;
.token-item__remove {
  margin-top: -5px;
  margin-left: $inner-spacing-medium;
  [class^="s-icon-"] {
    @include icon-styles(true);
  }
}
.token-list {
  max-height: calc(#{$select-asset-item-height} * 7);

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
