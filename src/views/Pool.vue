<template>
  <div v-loading="parentLoading" class="container el-form--pool">
    <generic-page-header class="page-header--pool" :title="t('exchange.Pool')" :tooltip="t('pool.description')" />
    <div class="pool-wrapper" v-loading="loading">
      <p v-if="!connected" class="pool-info-container">
        {{ t('pool.connectToWallet') }}
      </p>
      <p v-else-if="!accountLiquidity || !accountLiquidity.length" class="pool-info-container">
        {{ t('pool.liquidityNotFound') }}
      </p>
      <!-- TODO 4 alexnatalia: Whole pool area should be clickable -->
      <s-collapse v-else class="pool-list" :borders="true">
        <s-collapse-item v-for="liquidityItem of accountLiquidity" :key="liquidityItem.address" :name="liquidityItem.address" class="pool-info-container">
          <template #title>
            <pair-token-logo :first-token="getAsset(liquidityItem.firstAddress)" :second-token="getAsset(liquidityItem.secondAddress)" size="small" />
            <h3>{{ getPairTitle(getAssetSymbol(liquidityItem.firstAddress), getAssetSymbol(liquidityItem.secondAddress)) }}</h3>
          </template>
          <div class="pool-info">
            <token-logo :token="getAsset(liquidityItem.firstAddress)" size="small" />
            <div>{{ t('pool.pooledToken', { tokenSymbol: getAssetSymbol(liquidityItem.firstAddress) }) }}</div>
            <div class="pool-info-value">{{ getFirstBalance(liquidityItem) }}</div>
          </div>
          <div class="pool-info">
            <token-logo :token="getAsset(liquidityItem.secondAddress)" size="small" />
            <div>{{ t('pool.pooledToken', { tokenSymbol: getAssetSymbol(liquidityItem.secondAddress) }) }}</div>
            <div class="pool-info-value">{{ getSecondBalance(liquidityItem) }}</div>
          </div>
          <div class="pool-info">
            <pair-token-logo :first-token="getAsset(liquidityItem.firstAddress)" :second-token="getAsset(liquidityItem.secondAddress)" size="mini" />
            <div>{{ t('pool.pairTokens', { pair: getPairTitle(getAssetSymbol(liquidityItem.firstAddress), getAssetSymbol(liquidityItem.secondAddress)) }) }}</div>
            <div class="pool-info-value">{{ getBalance(liquidityItem) }}</div>
          </div>
          <!-- TODO: we decided to hide it because of many requests like getLiquidityReserves -->
          <!-- <div class="pool-info pool-info--share">
            <div>{{ t('pool.poolShare')}}</div>
            <div class="pool-info-value">{{ getPoolShare(liquidityItem) }}%</div>
          </div> -->
          <div class="pool-info--buttons">
            <s-button type="primary" size="small" @click="handleAddPairLiquidity(liquidityItem.firstAddress, liquidityItem.secondAddress)">
              {{ t('pool.addLiquidity') }}
            </s-button>
            <s-button type="primary" size="small" @click="handleRemoveLiquidity(liquidityItem.firstAddress, liquidityItem.secondAddress)">
              {{ t('pool.removeLiquidity') }}
            </s-button>
          </div>
        </s-collapse-item>
      </s-collapse>
    </div>
    <template v-if="connected">
      <s-button class="el-button--add-liquidity" type="primary" @click="handleAddLiquidity">
        {{ t('pool.addLiquidity') }}
      </s-button>
      <s-button class="el-button--create-pair" type="secondary" @click="handleCreatePair">
        {{ t('pool.createPair') }}
      </s-button>
    </template>
    <s-button v-else type="primary" @click="handleConnectWallet">
      {{ t('pool.connectWallet') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { AccountLiquidity } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'
import { isWalletConnected } from '@/utils'
import router, { lazyComponent } from '@/router'
import { Components, PageNames } from '@/consts'

const namespace = 'pool'

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo)
  }
})
export default class Pool extends Mixins(TranslationMixin, LoadingMixin, NumberFormatterMixin) {
  @Getter('accountLiquidity', { namespace }) accountLiquidity!: any
  @Getter('assets', { namespace: 'assets' }) assets

  @Action('getAccountLiquidity', { namespace }) getAccountLiquidity
  @Action('getAssets', { namespace: 'assets' }) getAssets

  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  async mounted () {
    await this.withApi(async () => {
      await this.getAssets()
      await this.getAccountLiquidity()
    })
  }

  get connected (): boolean {
    return isWalletConnected()
  }

  getAsset (address): any {
    return this.assets.find(a => a.address === address)
  }

  getAssetSymbol (address): string {
    const asset = this.assets.find(a => a.address === address)
    return asset ? asset.symbol : this.t('pool.unknownAsset')
  }

  handleAddLiquidity (): void {
    router.push({ name: PageNames.AddLiquidity })
  }

  handleCreatePair (): void {
    router.push({ name: PageNames.CreatePair })
  }

  handleAddPairLiquidity (firstAddress, secondAddress): void {
    router.push({ name: PageNames.AddLiquidityId, params: { firstAddress, secondAddress } })
  }

  handleRemoveLiquidity (firstAddress, secondAddress): void {
    router.push({ name: PageNames.RemoveLiquidity, params: { firstAddress, secondAddress } })
  }

  handleConnectWallet (): void {
    router.push({ name: PageNames.Wallet })
  }

  getPairTitle (firstToken, secondToken): string {
    if (firstToken && secondToken) {
      return `${firstToken}-${secondToken}`
    }
    return ''
  }

  getFirstBalance (liquidityItem: AccountLiquidity): string {
    return this.formatCodecNumber(liquidityItem.firstBalance, liquidityItem.decimals)
  }

  getSecondBalance (liquidityItem: AccountLiquidity): string {
    return this.formatCodecNumber(liquidityItem.secondBalance, liquidityItem.decimals)
  }

  getBalance (liquidityItem: AccountLiquidity): string {
    return this.formatCodecNumber(liquidityItem.balance, liquidityItem.decimals)
  }
}
</script>

<style lang="scss">
$pair-icon-height: 36px;
$pool-collapse-icon-height: 2px;
$pool-collapse-icon-width: 10px;

.pool-list {
  .el-collapse-item {
    &__header,
    &__wrap {
      border-bottom: none;
    }
    &__content {
      margin-top: $inner-spacing-medium;
      padding-top: $basic-spacing * 2;
      padding-bottom: 0;
      border-top: 1px solid var(--s-color-base-border-primary);
    }
    .el-collapse-item__header {
      height: $pair-icon-height;
      line-height: $pair-icon-height;
      .pair-logo {
        margin-right: $inner-spacing-medium;
      }
    }
    .el-icon-arrow-right {
      position: relative;
      &:before,
      &:after {
        position: absolute;
        display: block;
        content: '';
        border-radius: 2px;
        background-color: var(--s-color-base-content-primary);
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        margin: auto;
      }
      &:before {
        height: $pool-collapse-icon-height;
        width: $pool-collapse-icon-width;
      }
      &:after {
        height: $pool-collapse-icon-width;
        width: $pool-collapse-icon-height;
      }
      &.is-active:after {
        background-color: transparent;
      }
    }
  }
  .el-icon-arrow-right {
    margin-right: 0;
    border-radius: var(--s-border-radius-small);
  }
}
</style>

<style lang="scss" scoped>
$pair-icon-height: 36px;

.el-form--pool {
  display: flex;
  flex-direction: column;
  align-items: center;
  .page-header--pool {
    .el-button--settings {
      margin-left: auto;
    }
  }
  .el-button {
    &--create-pair {
      margin-left: 0;
      color: var(--s-color-theme-accent);
      &:hover,
      &:active,
      &:disabled {
        border-color: var(--s-color-base-content-quaternary);
      }
      &:active {
        background-color: var(--s-color-base-disabled);
      }
      &:disabled,
      &:disabled:hover {
        background-color: transparent;
        color: var(--s-color-base-on-disabled);
      }
    }
  }
  @include full-width-button;
  @include full-width-button('el-button--create-pair', $inner-spacing-mini);
}

.pool {
  &-wrapper {
    width: 100%;
  }
  &-list {
    width: 100%;
    border-top: none;
    border-bottom: none;
    .pool-info-container {
      margin-bottom: $inner-spacing-mini;
      padding: calc(#{$inner-spacing-big} - (#{$pair-icon-height} - var(--s-size-small)) / 2) $inner-spacing-medium;
      &:last-child {
        margin-bottom: 0;
      }
    }
    h3 {
      letter-spacing: $s-letter-spacing-small;
      font-feature-settings: $s-font-feature-settings-title;
    }
  }
  &-info {
    display: flex;
    align-items: center;
    font-size: var(--s-font-size-small);
    line-height: $s-line-height-big;
    margin-bottom: $inner-spacing-mini;
    &,
    &--buttons {
      padding-left: $inner-spacing-mini;
      padding-right: $inner-spacing-mini;
    }
    &--share {
      color: var(--s-color-base-content-secondary);
    }
    &-value {
      margin-left: auto;
    }
    &-container {
      width: 100%;
      padding: $inner-spacing-big;
      border-radius: var(--s-border-radius-small);
      border: 1px solid var(--s-color-base-border-secondary);
      color: var(--s-color-base-content-tertiary);
      font-size: var(--s-font-size-mini);
      line-height: $s-line-height-small;
      font-feature-settings: $s-font-feature-settings-common;
      text-align: center;
      & + .el-button {
        margin-top: $inner-spacing-medium;
      }
    }
    & > .token-logo {
      margin-right: $inner-spacing-mini;
    }
    &--buttons {
      display: flex;
      margin-top: $inner-spacing-medium;
      .el-button {
        padding-left: $inner-spacing-small;
        padding-right: $inner-spacing-small;
        font-feature-settings: $s-font-feature-settings-title;
        width: auto;
        font-weight: 700;
        + .el-button {
          margin-left: $inner-spacing-mini;
        }
      }
    }
  }
}
</style>
