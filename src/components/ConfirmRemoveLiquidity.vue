<template>
  <s-dialog
    :visible.sync="visible"
    :title="t('swap.confirmSwap')"
    borderRadius="medium"
    class="el-dialog--remove-liquidity-confirm"
    width="496px"
  >
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedFromValue }}</span>
        <s-icon name="arrow-bottom-rounded" />
        <span class="token-value">{{ formattedToValue }}</span>
      </div>
      <div class="tokens-info-container">
        <div v-if="tokenFrom" class="token">
          <token-logo class="token-logo" :token="tokenFrom.symbol" />
          {{ tokenFrom ? tokenFrom.symbol : '' }}
        </div>
        <div v-if="tokenTo" class="token">
          <token-logo class="token-logo" :token="tokenTo.symbol" />
          <span :class="getTokenClasses(tokenTo)" />
          {{ tokenTo ? tokenTo.symbol : '' }}
        </div>
      </div>
    </div>
    <p class="transaction-message" v-html="t('removeLiquidity.outputMessage')"/>
    <s-divider />
    <s-row flex justify="space-between">
        <div>{{ t('removeLiquidity.price')  }}</div>
        <div>
          <div>1 {{ firstToken.symbol }} = {{ formatNumber(firstToken.price / secondToken.price, 2) }} {{ secondToken.symbol }}</div>
          <div>1 {{ secondToken.symbol }} = {{ formatNumber(secondToken.price / firstToken.price, 2) }} {{ firstToken.symbol }}</div>
        </div>
    </s-row>
    <template #footer>
      <s-button type="primary" @click="handleConfirmSwap">{{ t('removeLiquidity.confirm') }}</s-button>
    </template>
  </s-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import { formatNumber } from '@/utils'
import { lazyComponent } from '@/router'
import { Components } from '@/consts'

@Component({
  components: {
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class ConfirmSwap extends Mixins(TranslationMixin) {
  @Prop({ default: false, type: Boolean }) readonly visible!: boolean

  get formattedFromValue (): string {
    return formatNumber(12, 4)
  }

  get formattedToValue (): string {
    return formatNumber(13, 4)
  }

  handleConfirmSwap (): void {
    // TODO: Make Swap here
    this.$emit('close')
  }
}
</script>

<style lang="scss">
$el-dialog-class: '.el-dialog';
$el-dialog-button-size: 40px;

#{$el-dialog-class} {
  &__wrapper #{$el-dialog-class} {
    border-radius: $border-radius-medium;
    &__header,
    &__footer {
      padding: $inner-spacing-big;
    }
    &__body {
      padding: $inner-spacing-mini $inner-spacing-big;
    }
  }
  #{$el-dialog-class}__header {
    display: inline-flex;
    align-items: center;
    width: 100%;
    #{$el-dialog-class}__title {
      font-size: $s-font-size-big;
      font-weight: normal;
    }
  }
  .transaction-number {
    color: var(--s-color-base-content-primary);
    font-weight: bold;
  }
  #{$el-dialog-class}__headerbtn {
    position: static;
    margin-left: auto;
    height: $el-dialog-button-size;
    width: $el-dialog-button-size;
    background-color: var(--s-color-base-background);
    border-color: var(--s-color-base-background);
    border-radius: $inner-spacing-small;
    #{$el-dialog-class}__close {
      color: var(--s-color-base-content-primary);
      font-weight: bold;
      font-size: $el-dialog-button-size / 2;
    }
    color: var(--s-color-base-content-primary);
    &:hover, &:active, &:focus {
      background-color: var(--s-color-base-background-hover);
      border-color: var(--s-color-base-background-hover);
      #{$el-dialog-class}__close {
        color: var(--s-color-base-content-primary);
      }
    }
  }
  #{$el-dialog-class}__footer {
    .el-button {
      padding: $inner-spacing-mini;
      border-radius: $border-radius-small;
      width: 100%;
    }
  }
}
</style>

<style lang="scss" scoped>
.el-dialog--remove-liquidity-confirm {
  .el-dialog {
    &__header {
      padding: $inner-spacing-big;
    }
    &__body {
      padding: $inner-spacing-mini $inner-spacing-big;
    }
    &__footer {
      padding: $inner-spacing-big;
    }
  }
  .tokens {
    display: flex;
    justify-content: space-between;
    font-size: 30px;
    &-info-container {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
  }
  .token {
    display: flex;
    align-items: center;
    white-space: nowrap;

    &-logo {
      display: block;
      margin-right: $inner-spacing-medium;
      flex-shrink: 0;
    }
  }
  .s-icon-arrow-bottom-rounded {
    margin-top: $inner-spacing-mini;
    margin-bottom: $inner-spacing-mini;
    display: block;
    font-size: $s-font-size-medium;
  }
  .transaction-message {
    margin-top: $inner-spacing-big;
    color: var(--s-color-base-content-tertiary);
    line-height: 1.4;
  }
  .el-divider {
    margin-top: $inner-spacing-mini;
    margin-bottom: $inner-spacing-big;
  }
}
</style>
