<template>
  <div class="el-form--pool">
    <div class="header">
      <h3 class="header-title">{{ t('pool.yourLiquidity') }}</h3>
      <!-- TODO: Add appropriate tooltip -->
      <s-tooltip class="header-tooltip" borderRadius="mini" :content="'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'" theme="light" placement="bottom-end" :show-arrow="false">
        <s-icon name="info" size="16" />
      </s-tooltip>
    </div>
    <p v-if="!connected" class="pool-info-container">
      {{ t('pool.connectToWallet') }}
    </p>
    <p v-else-if="!liquidity" class="pool-info-container">
      {{ t('pool.liquidityNotFound') }}
    </p>
    <s-collapse v-else-if="firstToken && secondToken" class="pool-info-container" :borders="true" @change="handleChoosePair">
      <!-- TODO 4 alexnatalia: make for with pairs here -->
      <s-collapse-item name="1">
        <template #title>
          <pair-token-logo class="pair-token-logo" :firstToken="firstToken" :secondToken="secondToken" size="small" />
          <h3>{{ getPairTitle(firstToken, secondToken) }}</h3>
        </template>
        <div class="pool-info">
          <token-logo :token="firstToken" size="small" />
          <div>{{ t('pool.pooledToken', { tokenSymbol: firstToken.symbol }) }}</div>
          <div v-if="firstTokenValue" class="pool-info-value">{{ firstTokenValue }}</div>
        </div>
        <div class="pool-info">
          <token-logo :token="secondToken" size="small" />
          <div>{{ t('pool.pooledToken', { tokenSymbol: secondToken.symbol }) }}</div>
          <div v-if="secondTokenValue" class="pool-info-value">{{ secondTokenValue }}</div>
        </div>
        <div class="pool-info">
          <pair-token-logo class="pair-token-logo" :firstToken="firstToken" :secondToken="secondToken" size="mini" />
          <div>{{ t('pool.pairTokens', { pair: getPairTitle(firstToken, secondToken) }) }}</div>
          <div class="pool-info-value">{{ pairValue }}</div>
        </div>
        <div class="pool-info pool-info--share">
          <div>{{ t('pool.poolShare')}}</div>
          <div class="pool-info-value">1.5%</div>
        </div>
        <div class="pool-info--buttons">
          <s-button type="primary" size="small" @click="handleAddPairLiquidity">
            {{ t('pool.addLiquidity') }}
          </s-button>
          <s-button type="primary" size="small" @click="handleRemovePairLiquidity">
            {{ t('pool.removeLiquidity') }}
          </s-button>
        </div>
      </s-collapse-item>
    </s-collapse>
    <s-button class="el-button--add-liquidity" type="primary" @click="handleAddLiquidity">
      {{ t('pool.addLiquidity') }}
    </s-button>
    <s-button v-if="connected" class="el-button--create-pair" type="secondary" @click="handleCreatePair">
      {{ t('pool.createPair') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import { isWalletConnected, formatNumber } from '@/utils'
import router, { lazyComponent } from '@/router'
import { Components, PageNames } from '@/consts'

const namespace = 'createPair'

@Component({
  components: {
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo)
  }
})
export default class Pool extends Mixins(TranslationMixin) {
  @Getter liquidity!: any
  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('firstTokenValue', { namespace }) firstTokenValue!: number
  @Getter('secondTokenValue', { namespace }) secondTokenValue!: number
  @Action getLiquidity

  get connected (): boolean {
    return isWalletConnected()
  }

  get pairValue (): string {
    // TODO: Play with Pair value
    return formatNumber(10.00000171, 4)
  }

  handleAddLiquidity (): void {
    // TODO: Add Liquidity functionality goes here
    this.getLiquidity()
    // router.push({ name: PageNames.AddLiquidity })
  }

  handleCreatePair (): void {
    router.push({ name: PageNames.CreatePair })
  }

  handleChoosePair (): void {
    console.log('handleChoosePair')
  }

  handleAddPairLiquidity (): void {
    console.log('handleAddPairLiquidity')
  }

  handleRemovePairLiquidity (): void {
    console.log('handleRemovePairLiquidity')
  }

  getPairTitle (firstToken, secondToken): string {
    if (firstToken && secondToken) {
      return `${firstToken.symbol} - ${secondToken.symbol}`
    }
    return ''
  }
}
</script>

<style lang="scss">
$pool-collapse-icon-height: 2px;
$pool-collapse-icon-width: 10px;

.pool-info-container {
  .el-collapse-item {
    &__header,
    &__wrap {
      border-bottom: none;
    }
    &__content {
      margin-top: $inner-spacing-mini;
      padding-top: $basic-spacing * 2;
      padding-bottom: 0;
      border-top: 1px solid var(--s-color-base-border-primary);
    }
    .el-collapse-item__header {
      height: 50px;
      line-height: 50px;
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
@include header-styles($inner-spacing-mini);
.header {
  margin-top: $inner-spacing-mini;
}

.el-form--pool {
  display: flex;
  flex-direction: column;
  align-items: center;
  .el-button {
    &--add-liquidity,
    &--create-pair {
      margin-top: $inner-spacing-mini;
      width: 100%;
    }
    &--create-pair {
      margin-left: 0;
      color: var(--s-color-theme-accent);
    }
  }
}

.pool {
  &-info {
    display: flex;
    align-items: center;
    font-size: $s-font-size-small;
    line-height: $s-line-height-medium;
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
      padding: $inner-spacing-medium;
      border-radius: var(--s-border-radius-small);
      border: 1px solid var(--s-color-base-border-secondary);
      color: var(--s-color-base-content-tertiary);
      font-size: $s-font-size-mini;
      line-height: $s-line-height-medium;
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
      margin-bottom: $inner-spacing-mini;
      .el-button {
        padding-left: $inner-spacing-small;
        padding-right: $inner-spacing-small;
      }
    }
  }
}
</style>
