<template>
  <div v-loading="parentLoading" class="container el-form--pool">
    <generic-page-header class="page-header--pool" :title="t('exchange.Pool')" :tooltip="t('pool.description')" />
    <div v-loading="loading" class="pool-wrapper">
      <p v-if="!isLoggedIn" class="pool-info-container pool-info-container--empty">
        {{ t('pool.connectToWallet') }}
      </p>
      <p v-else-if="!accountLiquidity || !accountLiquidity.length" class="pool-info-container pool-info-container--empty">
        {{ t('pool.liquidityNotFound') }}
      </p>
      <s-collapse v-else class="pool-list" :borders="true">
        <s-collapse-item v-for="liquidityItem of accountLiquidity" :key="liquidityItem.address" :name="liquidityItem.address" class="pool-info-container">
          <template #title>
            <pair-token-logo :first-token="getAsset(liquidityItem.firstAddress)" :second-token="getAsset(liquidityItem.secondAddress)" size="small" />
            <h3 class="pool-info-container__title">{{ getPairTitle(getAssetSymbol(liquidityItem.firstAddress), getAssetSymbol(liquidityItem.secondAddress)) }}</h3>
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
          <div class="pool-info pool-info--share">
            <div>{{ t('pool.poolShare')}}</div>
            <div class="pool-info-value">{{ getPoolShare(liquidityItem.poolShare) }}</div>
          </div>
          <div class="pool-info--buttons">
            <s-button type="secondary" class="s-typography-button--medium" @click="handleAddPairLiquidity(liquidityItem.firstAddress, liquidityItem.secondAddress)">
              {{ t('pool.addLiquidity') }}
            </s-button>
            <s-button type="secondary" class="s-typography-button--medium" @click="handleRemoveLiquidity(liquidityItem.firstAddress, liquidityItem.secondAddress)">
              {{ t('pool.removeLiquidity') }}
            </s-button>
          </div>
        </s-collapse-item>
      </s-collapse>
    </div>
    <template v-if="isLoggedIn">
      <s-button class="el-button--add-liquidity s-typography-button--large" type="primary" @click="handleAddLiquidity">
        {{ t('pool.addLiquidity') }}
      </s-button>
      <s-button class="el-button--create-pair s-typography-button--large" type="secondary" @click="handleCreatePair">
        {{ t('pool.createPair') }}
      </s-button>
    </template>
    <s-button v-else type="primary" class="s-typography-button--large" @click="handleConnectWallet">
      {{ t('pool.connectWallet') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { AccountLiquidity, Asset } from '@sora-substrate/util'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'

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
  @Getter isLoggedIn!: boolean
  @Getter('accountLiquidity', { namespace }) accountLiquidity!: any
  @Getter('assets', { namespace: 'assets' }) assets!: Array<Asset>
  @Action('getAssets', { namespace: 'assets' }) getAssets!: () => Promise<void>

  @Action('getAccountLiquidity', { namespace }) getAccountLiquidity!: () => Promise<void>
  @Action('createAccountLiquiditySubscription', { namespace: 'pool' }) createAccountLiquiditySubscription!: () => Promise<() => void>

  accountLiquiditySubscription!: () => void

  async created (): Promise<void> {
    this.accountLiquiditySubscription = await this.createAccountLiquiditySubscription()

    await this.withApi(async () => {
      await Promise.all([
        this.getAssets(),
        this.getAccountLiquidity()
      ])
    })
  }

  beforeDestroy (): void {
    if (typeof this.accountLiquiditySubscription === 'function') {
      this.accountLiquiditySubscription() // unsubscribe
    }
  }

  getAsset (address: string): any {
    return this.assets.find(a => a.address === address)
  }

  getAssetSymbol (address: string): string {
    const asset = this.assets.find(a => a.address === address)
    return asset ? asset.symbol : this.t('pool.unknownAsset')
  }

  handleAddLiquidity (): void {
    router.push({ name: PageNames.AddLiquidity })
  }

  handleCreatePair (): void {
    router.push({ name: PageNames.CreatePair })
  }

  handleAddPairLiquidity (firstAddress: string, secondAddress: string): void {
    router.push({ name: PageNames.AddLiquidityId, params: { firstAddress, secondAddress } })
  }

  handleRemoveLiquidity (firstAddress: string, secondAddress: string): void {
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

  getPoolShare (poolShare: string): string {
    return `${this.formatStringValue(poolShare)}%`
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
      background-color: unset;
    }
    &__content {
      margin-top: 0;
      padding: 0 $inner-spacing-medium $inner-spacing-medium;
      font-weight: 600;
    }
    .el-collapse-item__header {
      height: #{$pair-icon-height + $inner-spacing-medium * 2};
      line-height: $pair-icon-height;
      padding: $inner-spacing-medium;
      .pair-logo {
        margin-right: $inner-spacing-medium;
      }
    }
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
      margin-bottom: $inner-spacing-medium;
      padding: 0;
      &:last-child {
        margin-bottom: 0;
      }
    }
    h3 {
      letter-spacing: var(--s-letter-spacing-small);
    }
  }
  &-info {
    display: flex;
    align-items: center;
    font-size: var(--s-font-size-small);
    line-height: var(--s-line-height-big);
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
      background: var(--s-color-base-background);
      border-radius: var(--s-border-radius-small);
      box-shadow: var(--s-shadow-element-pressed);
      color: var(--s-color-base-content-secondary);
      font-size: var(--s-font-size-mini);
      line-height: var(--s-line-height-small);
      text-align: center;

      &--empty {
        background: var(--s-color-base-border-primary);
        box-shadow: 0.4px -0.4px 0px var(--s-color-base-content-tertiary), -0.4px 0.4px 0px var(--s-color-base-content-tertiary), -0.4px -0.4px 0px var(--s-color-base-content-tertiary), 0.4px 0.4px 0px var(--s-color-base-content-tertiary);
        font-size: var(--s-font-size-small);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: var(--s-letter-spacing-small);
      }

      &.is-active {
        box-shadow: var(--s-shadow-element);
      }

      &__title {
        font-weight: 700;
      }

      & + .el-button {
        margin-top: $inner-spacing-medium;
      }
    }
    & > .token-logo {
      margin-right: $inner-spacing-mini;
    }
    &--buttons {
      display: flex;
      justify-content: space-around;
      margin-top: $inner-spacing-medium;
    }
  }
}
</style>
