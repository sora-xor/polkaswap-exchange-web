<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('selectToken.title')"
    custom-class="token-select"
  >
    <s-input
      v-model="query"
      :placeholder="t('selectToken.searchPlaceholder')"
      class="token-search"
      prefix="el-icon-search"
      size="medium"
      border-radius="mini"
    />
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
          <span class="token-item__amount">{{ token.amount || '-' }}</span>
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
import { KnownAssets, KnownSymbols, Asset } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import DialogBase from '@/components/DialogBase.vue'
import { Token } from '@/types'
import { LogoSize, Components } from '@/consts'
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
  selectedToken: Token | null = null

  @Prop({ default: () => null, type: Object }) readonly asset!: Token
  @Prop({ default: () => false, type: Boolean }) readonly accountAssetsOnly!: boolean
  @Prop({ default: () => false, type: Boolean }) readonly notNullBalanceOnly!: boolean

  @Getter('assets', { namespace }) assets!: Array<Token>
  @Getter('accountAssets', { namespace }) accountAssets!: Array<Token>
  @Action('getAssets', { namespace }) getAssets
  @Action('getAccountAssets', { namespace }) getAccountAssets

  get assetsList (): Array<Token> {
    let assets = this.accountAssetsOnly ? this.accountAssets : this.assets
    assets = this.asset ? assets.filter(asset => asset.symbol !== this.asset.symbol) : assets

    return this.notNullBalanceOnly ? assets.filter(a => a.balance > 0) : assets
  }

  get filteredTokens (): Array<Token> {
    if (this.query) {
      const query = this.query.toLowerCase().trim()
      return this.assetsList.filter(t =>
        this.t(`assetNames.${t.symbol}`).toLowerCase().includes(query) ||
        t.symbol.toLowerCase().includes(query) ||
        t.address.toLowerCase().includes(query)
      )
    }

    return this.assetsList
  }

  created (): void {
    if (this.accountAssetsOnly) {
      this.getAccountAssets()
    } else {
      this.withApi(this.getAssets)
    }
  }

  selectToken (token: Token): void {
    this.selectedToken = token
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
}
</script>

<style lang="scss">
.token-select {
  .el-dialog {
    overflow: hidden;
    &__body {
      padding: $inner-spacing-mini 0 $inner-spacing-big !important;
    }
  }
}
</style>

<style lang="scss" scoped>
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
