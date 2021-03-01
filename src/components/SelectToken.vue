<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('selectToken.title')"
    custom-class="token-select"
  >
    <s-form-item class="el-form-item--search">
      <s-input
        v-model="query"
        :placeholder="t('selectToken.searchPlaceholder')"
        class="token-search"
        prefix="el-icon-search"
        size="medium"
        border-radius="mini"
      />
      <s-button class="s-button--clear" icon="circle-x" @click="handleClearSearch" />
    </s-form-item>
    <div v-if="filteredTokens && filteredTokens.length > 0" class="token-list">
      <div v-for="token in filteredTokens" @click="selectToken(token)" :key="token.symbol" class="token-item">
        <s-col>
          <s-row flex justify="start" align="middle">
            <token-logo :token="token" />
            <div class="token-item__name">
              {{ getTokenName(token.symbol) }}
            </div>
          </s-row>
        </s-col>
        <div>
          <span class="token-item__amount">{{ token.balance || '-' }}</span>
        </div>
      </div>
    </div>
    <div v-else class="token-list token-list__empty">
      <span class="empty-results-icon" />
      {{ t('selectToken.emptyListMessage') }}
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { Asset, AccountAsset } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import DialogBase from '@/components/DialogBase.vue'
import { Components } from '@/consts'
import { lazyComponent } from '@/router'

const namespace = 'assets'

@Component({
  components: {
    DialogBase,
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class SelectToken extends Mixins(TranslationMixin, DialogMixin, LoadingMixin) {
  query = ''

  @Prop({ default: () => null, type: Object }) readonly asset!: Asset
  @Prop({ default: () => false, type: Boolean }) readonly accountAssetsOnly!: boolean
  @Prop({ default: () => false, type: Boolean }) readonly notNullBalanceOnly!: boolean

  @Getter('assets', { namespace }) assets!: Array<Asset>
  @Action('getAssets', { namespace }) getAssets

  @Getter('accountAssets') accountAssets!: Array<AccountAsset>
  @Action('getAccountAssets') getAccountAssets

  get accountAssetsHashTable () {
    return this.accountAssets.reduce((result, item) => ({
      ...result,
      [item.address]: item
    }), {})
  }

  get assetsList (): Array<AccountAsset> {
    const { asset, assets, accountAssetsHashTable, notNullBalanceOnly, accountAssetsOnly } = this

    return assets.reduce((result: Array<AccountAsset>, item: Asset) => {
      if (!item || (asset && item.address === asset.address)) return result

      const accountAsset = accountAssetsHashTable[item.address]

      if (accountAssetsOnly && !accountAsset) return result

      const accountBalance = Number(accountAsset?.balance) || 0

      if (notNullBalanceOnly && accountBalance <= 0) return result

      const prepared = {
        ...item,
        balance: String(accountBalance)
      } as AccountAsset

      return [...result, prepared]
    }, [])
  }

  get filteredTokens (): Array<AccountAsset> {
    if (this.query) {
      const query = this.query.toLowerCase().trim()

      return this.assetsList.filter(t =>
        this.t(`assetNames.${t.symbol}`).toLowerCase().includes(query) ||
        t.symbol?.toLowerCase?.()?.includes?.(query) ||
        t.address?.toLowerCase?.()?.includes?.(query)
      )
    }

    return this.assetsList
  }

  created (): void {
    if (this.accountAssetsOnly) {
      this.withApi(this.getAccountAssets)
    } else {
      this.withApi(this.getAssets)
    }
  }

  selectToken (token: AccountAsset): void {
    this.query = ''
    this.$emit('select', token)
    this.$emit('close')
    this.isVisible = false
  }

  getTokenName (tokenSymbol: string): string {
    if (this.te(`assetNames.${tokenSymbol}`)) {
      return `${this.t(`assetNames.${tokenSymbol}`)} (${tokenSymbol})`
    }
    return tokenSymbol
  }

  handleClearSearch (): void {
    this.query = ''
  }
}
</script>

<style lang="scss">
.token-select {
  @include search-item-unscoped;

  .el-dialog {
    overflow: hidden;
    &__body {
      padding: $inner-spacing-mini 0 $inner-spacing-big !important;
    }
  }
}
</style>

<style lang="scss" scoped>
@include search-item;

$token-item-height: 71px;

.token-search {
  // TODO: Fix input styles (paddings and icon position)
  margin-left: $inner-spacing-big;
  margin-bottom: $inner-spacing-medium;
  width: calc(100% - 2 * #{$inner-spacing-big});
}
.token-item {
  height: $token-item-height;
  padding: 0 $inner-spacing-big;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  &:hover {
    background-color: var(--s-color-base-background-hover);
  }
  &__name, &__amount {
    white-space: nowrap;
    font-size: var(--s-font-size-small);
    @include font-weight(600);
  }

  .token-logo {
    margin-right: $inner-spacing-medium;
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
    line-height: $s-line-height-big;
  }
  .empty-results-icon {
    margin-bottom: $inner-spacing-medium;
    display: block;
    height: 70px;
    width: 70px;
    background: url("~@/assets/img/no-results.svg") center no-repeat;
  }
}
</style>
