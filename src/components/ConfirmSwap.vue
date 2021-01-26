<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('swap.confirmSwap')"
    custom-class="dialog--confirm-swap"
  >
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ fromValue }}</span>
        <div v-if="tokenFrom" class="token">
          <token-logo :token="tokenFrom" />
          {{ getAssetSymbol(tokenFrom.symbol) }}
        </div>
      </div>
      <s-icon class="icon-divider" name="arrow-bottom-rounded" size="medium" />
      <div class="tokens-info-container">
        <span class="token-value">{{ toValue }}</span>
        <div v-if="tokenTo" class="token">
          <token-logo :token="tokenTo" />
          {{ getAssetSymbol(tokenTo.symbol) }}
        </div>
      </div>
    </div>
    <p class="transaction-message" v-html="t('swap.swapOutputMessage', { transactionValue : `<span class='transaction-number'>${toValue}</span>` })" />
    <s-divider />
    <swap-info :show-price="true" />
    <swap-info :show-tooltips="false" />
    <template #footer>
      <s-button type="primary" @click="handleConfirmSwap">{{ t('exchange.confirm') }}</s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import { dexApi } from '@soramitsu/soraneo-wallet-web'

import TransactionMixin from '@/components/mixins/TransactionMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import DialogBase from '@/components/DialogBase.vue'
import { lazyComponent } from '@/router'
import { Components } from '@/consts'
import { getAssetSymbol } from '@/utils'

@Component({
  components: {
    DialogBase,
    SwapInfo: lazyComponent(Components.SwapInfo),
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class ConfirmSwap extends Mixins(TransactionMixin, DialogMixin) {
  @Getter tokenFrom!: any
  @Getter tokenTo!: any
  @Getter fromValue!: number | string
  @Getter toValue!: number | string
  @Getter slippageTolerance!: number
  @Getter isExchangeB!: boolean

  @Prop({ default: false, type: Boolean }) readonly isInsufficientBalance!: boolean

  getAssetSymbol = getAssetSymbol

  async handleConfirmSwap (): Promise<void> {
    await this.$emit('checkConfirm')
    if (this.isInsufficientBalance) {
      this.$alert(this.t('exchange.insufficientBalance', { tokenSymbol: getAssetSymbol(this.tokenFrom ? this.tokenFrom.symbol : '') }), { title: this.t('errorText') })
      this.$emit('confirm')
    } else {
      try {
        await this.withNotifications(
          async () => await dexApi.swap(
            this.tokenFrom.address,
            this.tokenTo.address,
            this.fromValue.toString(),
            this.toValue.toString(),
            this.slippageTolerance,
            this.isExchangeB
          )
        )
        this.$emit('confirm', true)
      } catch (error) {
        this.$emit('confirm')
      }
    }
    this.isVisible = false
  }
}
</script>

<style lang="scss">
.dialog--confirm-swap {
  .transaction-number {
    color: var(--s-color-base-content-primary);
    font-feature-settings: $s-font-feature-settings-common;
    @include font-weight(600);
    word-break: break-all;
  }
}
</style>

<style lang="scss" scoped>
.tokens {
  display: flex;
  flex-direction: column;
  font-size: var(--s-heading2-font-size);
  line-height: $s-line-height-small;
  &-info-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
.token {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  white-space: nowrap;
  &-value {
    margin-right: $inner-spacing-medium;
  }
  &-logo {
    display: block;
    margin-right: $inner-spacing-medium;
    flex-shrink: 0;
  }
}
.transaction-message {
  margin-top: $inner-spacing-mini;
  color: var(--s-color-base-content-tertiary);
  line-height: $s-line-height-big;
}
@include vertical-divider;
@include vertical-divider('el-divider');
</style>
