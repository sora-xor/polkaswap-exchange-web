<template>
  <div class="el-form--pool">
    <div class="pool-header">
      <h3 class="pool-header-title">{{ t('pool.yourLiquidity') }}</h3>
      <s-tooltip class="pool-header-icon" borderRadius="mini" :content="t('pool.yourLiquidityTooltip')" theme="light" placement="bottom-end" :show-arrow="false">
        <s-icon name="info" size="16"/>
      </s-tooltip>
    </div>
    <p v-if="!connected" class="pool-info">
      {{ t('pool.connectToWallet') }}
    </p>
    <p v-else-if="!liquidity" class="pool-info">
      {{ t('pool.liquidityNotFound') }}
    </p>
    <s-collapse v-else class="pool-info" :borders="true" @change="handleChoosePair">
      <!-- TODO: make for with pairs here -->
      <s-collapse-item title="Consistency" name="1">
        <div>Lorem Ipsum</div>
      </s-collapse-item>
    </s-collapse>
    <s-button type="primary" @click="handleAddLiquidity">
      {{ t('pool.addLiquidity') }}
    </s-button>
    <s-button v-if="connected" type="secondary" @click="handleCreatePair">
      {{ t('pool.createPair') }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Getter } from 'vuex-class'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import { isWalletConnected } from '@/utils'

@Component
export default class Pool extends Mixins(TranslationMixin) {
  @Getter liquidity!: any

  get connected (): boolean {
    return isWalletConnected()
  }

  handleAddLiquidity (): void {
    // TODO: Add Liquidity here
    console.log('handleAddLiquidity')
  }

  handleCreatePair (): void {
    // TODO: Link with Create Pair functionality
    console.log('handleCreatePair')
  }

  handleChoosePair (): void {
    console.log('handleChoosePair')
  }
}
</script>

<style lang="scss" scoped>
$tooltip-button-height: var(--s-size-small);

.el-form--pool {
  display: flex;
  flex-direction: column;
  align-items: center;
  .el-button {
    margin-top: $inner-spacing-mini;
    width: 100%;
    & ~ .el-button {
      margin-left: 0;
      color: var(--s-color-theme-accent);
    }
  }
}

.pool {
  &-header {
    position: relative;
    width: 100%;
    margin-top: $inner-spacing-mini;
    margin-bottom: $inner-spacing-mini;
    &-title {
      width: 100%;
      padding-right: var(--s-size-small) + $inner-spacing-small;
      padding-left: var(--s-size-small) + $inner-spacing-small;
      text-align: center;
      line-height: $tooltip-button-height;
    }
    &-icon {
      position: absolute;
      top: 0;
      right: 0;
      height: $tooltip-button-height;
      width: $tooltip-button-height;
      background-color: var(--s-color-base-background);
      border-radius: var(--s-border-radius-small);
      text-align: center;
      cursor: pointer;
      &:before {
        font-size: $s-font-size-medium;
        line-height: $tooltip-button-height;
      }
    }
  }
  &-info {
    width: 100%;
    padding: $inner-spacing-big;
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
}
</style>
