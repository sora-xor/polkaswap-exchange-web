<template>
  <s-dialog
    :visible.sync="visible"
    :title="t('exchange.transactionSubmitted')"
    class="el-dialog--transaction-submit"
    width="496px"
  >
    <s-icon name="arrow-top-right-rounded" />
    <s-divider />
    <div class="transaction">
      <div class="transaction-type">{{ t('exchange.swap') }}</div>
      <div class="transaction-info">{{ transactionInfo }}</div>
      <!-- TODO: Add correct icons and add functionality -->
      <s-icon name="external-link" @click="handleTransactionInfo" />
      <!-- <s-icon name="arrow-bottom-rounded" /> -->
    </div>
    <s-divider />
    <template #footer>
      <s-button type="primary" size="medium" @click="handleClose">{{ t('exchange.ok') }}</s-button>
    </template>
  </s-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import TranslationMixin from '@/components/mixins/TranslationMixin'

@Component
export default class TransactionSubmit extends Mixins(TranslationMixin) {
  @Getter tokenFrom!: any
  @Getter tokenTo!: any
  @Getter fromValue!: number
  @Getter toValue!: number
  @Action setSwapConfirm

  @Prop({ default: false, type: Boolean }) readonly visible!: boolean

  get transactionInfo (): string {
    return this.t('swap.transactionMessage', { tokenFromValue: this.getSwapValue(this.tokenFrom, this.fromValue), tokenToValue: this.getSwapValue(this.tokenTo, this.toValue) })
  }

  getSwapValue (token: any, tokenValue: number): string {
    return token ? `${tokenValue} ${token.symbol}` : ''
  }

  handleTransactionInfo (): void {
    // TODO: Go to Transaction Info
  }

  handleClose (): void {
    this.setSwapConfirm(false)
    this.$emit('close')
  }
}
</script>

<style lang="scss" scoped>
@import '../styles/layout';
@import '../styles/soramitsu-variables';

$transactionIconSize: 68px;

.el-dialog--transaction-submit {
  .s-icon-arrow-top-right-rounded {
    font-size: $transactionIconSize;
    color: $s-color-theme-accent;
  }
  .transaction {
    display: flex;
    align-items: center;
    width: 100%;
    &-type,
    .s-icon-external-link {
      color: $s-color-base-content-secondary;
    }
    &-type {
      display: block;
      padding: $inner-spacing-mini / 2 $inner-spacing-mini;
      margin-right: $inner-spacing-mini / 2;
      text-transform: uppercase;
      font-size: 10px;
      font-weight: bold;
      background-color: $s-color-base-background;
      border-radius: $border-radius-mini;
    }
    &-info {
      margin-right: $inner-spacing-mini;
      font-weight: bold;
    }
    .s-icon-external-link {
      cursor: pointer;
    }
  }
}
</style>
