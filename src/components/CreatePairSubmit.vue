<template>
  <s-dialog
    :visible.sync="visible"
    :title="t('exchange.transactionSubmitted')"
    borderRadius="medium"
    class="el-dialog--transaction-submit"
    width="496px"
  >
    <s-icon name="arrow-top-right-rounded" />
    <s-divider />

    <div class="transaction">
      <div class="transaction-type">{{ t('createPair.remove') }}</div>
      <div class="transaction-info">{{ transactionInfo }}</div>
      <!-- TODO: Add correct icons and add functionality -->
      <s-icon name="external-link" @click="handleTransactionInfo" />
      <!-- <s-icon name="arrow-bottom-rounded" /> -->
    </div>

    <s-divider />
    <template #footer>
      <s-button type="primary" @click="handleClose">{{ t('createPair.ok') }}</s-button>
    </template>
  </s-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import TranslationMixin from '@/components/mixins/TranslationMixin'
const namespace = 'createPair'

@Component
export default class CreatePairSubmit extends Mixins(TranslationMixin) {
  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('firstTokenValue', { namespace }) firstTokenValue!: number
  @Getter('secondTokenValue', { namespace }) secondTokenValue!: number

  @Action('createPair', { namespace }) createPair

  @Prop({ default: false, type: Boolean }) readonly visible!: boolean

  get transactionInfo (): string {
    return this.t('swap.transactionMessage', { tokenFromValue: this.getSwapValue(this.firstToken, this.firstTokenValue), tokenToValue: this.getSwapValue(this.secondToken, this.secondTokenValue) })
  }

  getSwapValue (token: any, tokenValue: number): string {
    return token ? `${tokenValue} ${token.symbol}` : ''
  }

  handleTransactionInfo (): void {
    // TODO: Go to Transaction Info
  }

  handleClose (): void {
    this.createPair()
    this.$emit('close')
  }
}
</script>

<style lang="scss" scoped>
$transactionIconSize: 68px;

.el-dialog--transaction-submit {
  .s-icon-arrow-top-right-rounded {
    font-size: $transactionIconSize;
    color: var(--s-color-theme-accent);
  }
  .transaction {
    display: flex;
    align-items: center;
    width: 100%;
    &-type,
    .s-icon-external-link {
      color: var(--s-color-base-content-secondary);
    }
    &-type {
      display: block;
      padding: $inner-spacing-mini / 2 $inner-spacing-mini;
      margin-right: $inner-spacing-mini / 2;
      text-transform: uppercase;
      font-size: 10px;
      font-weight: bold;
      background-color: var(--s-color-base-background);
      border-radius: var(--s-border-radius-mini);
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
