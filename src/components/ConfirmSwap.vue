<template>
  <s-dialog
    :visible.sync="visible"
    :title="t('swap.confirmSwap')"
    class="el-dialog--swap-confirm"
    width="496px"
  >
    <div v-if="tokenFrom" class="token">
      <span class="token-value">{{ formattedFromValue }}</span>
      <span :class="'token-logo token-logo--' + tokenFrom.logo" />
      {{ tokenFrom ? tokenFrom.symbol : '' }}
    </div>
    <s-icon name="arrow-bottom-rounded" />
    <div v-if="tokenTo" class="token">
      <span class="token-value">{{ formattedToValue }}</span>
      <span :class="'token-logo token-logo--' + tokenTo.logo" />
      {{ tokenTo ? tokenTo.symbol : '' }}
    </div>
    <!-- TODO: Make value text bold -->
    <p class="transaction-message">{{ t('swap.swapOutputMessage', { transactionValue: toValue }) }}</p>
    <s-divider />
    <swap-info :showPrice="true" />
    <swap-info />
    <template #footer>
      <s-button type="primary" size="medium" @click="handleConfirmSwap">{{ t('swap.confirmSwap') }}</s-button>
    </template>
  </s-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import { formatNumber } from '@/utils'
import SwapInfo from '@/components/SwapInfo.vue'

@Component({
  components: { SwapInfo }
})
export default class ConfirmSwap extends Mixins(TranslationMixin) {
  @Getter tokenFrom!: any
  @Getter tokenTo!: any
  @Getter fromValue!: number
  @Getter toValue!: number
  @Action setSwapConfirm

  @Prop({ default: false, type: Boolean }) readonly visible!: boolean

  get formattedFromValue (): string {
    return formatNumber(this.fromValue, 4)
  }

  get formattedToValue (): string {
    return formatNumber(this.toValue, 4)
  }

  handleConfirmSwap (): void {
    // TODO: Make Swap here
    this.setSwapConfirm(true)
    this.$emit('close')
  }
}
</script>

<style lang="scss">
@import '../styles/layout';
@import '../styles/typography';
@import '../styles/soramitsu-variables';

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
  #{$el-dialog-class}__headerbtn {
    position: static;
    margin-left: auto;
    height: $el-dialog-button-size;
    width: $el-dialog-button-size;
    background-color: $s-color-base-background;
    border-color: $s-color-base-background;
    border-radius: $inner-spacing-small;
    #{$el-dialog-class}__close {
      color: $s-color-base-content-primary;
      font-weight: bold;
      font-size: $el-dialog-button-size / 2;
    }
    color: $s-color-base-content-primary;
    &:hover, &:active, &:focus {
      background-color: $s-color-base-background-hover;
      border-color: $s-color-base-background-hover;
      #{$el-dialog-class}__close {
        color: $s-color-base-content-primary;
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
@import '../styles/layout';
@import '../styles/typography';
@import '../styles/soramitsu-variables';

$token-logo-size: 40px;

.el-dialog--swap-confirm {
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
  .token {
    display: flex;
    align-items: center;
    font-size: 30px;
    &-value {
      margin-right: auto;
    }
    &-logo {
      display: block;
      margin-right: $inner-spacing-medium;
      height: $token-logo-size;
      width: $token-logo-size;
      background-color: $s-color-utility-surface;
      background-size: 100%;
      background-repeat: no-repeat;
      border: 1px solid $s-color-utility-surface;
      border-radius: 50%;
      box-shadow: $s-shadow-tooltip;
      &--ksm {
        background-image: url('~@/assets/img/ksm.svg');
      }
      &--xor {
        background-image: url('~@/assets/img/xor.svg');
      }
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
    color: $s-color-base-content-tertiary;
    line-height: 1.8;
  }
  .el-divider {
    margin-top: $inner-spacing-mini;
    margin-bottom: $inner-spacing-big;
  }
}
</style>
