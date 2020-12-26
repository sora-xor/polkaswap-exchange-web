<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('swap.confirmSwap')"
    custom-class="dialog--confirm-swap"
  >
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedFromValue }}</span>
        <s-icon class="icon-divider" name="arrow-bottom-rounded" size="medium" />
        <span class="token-value">{{ formattedToValue }}</span>
      </div>
      <div class="tokens-info-container">
        <div v-if="tokenFrom" class="token">
          <token-logo :token="tokenFrom" />
          {{ tokenFrom.symbol }}
        </div>
        <div v-if="tokenTo" class="token">
          <token-logo :token="tokenTo" />
          {{ tokenTo.symbol }}
        </div>
      </div>
    </div>
    <p class="transaction-message" v-html="t('swap.swapOutputMessage', { transactionValue : `<span class='transaction-number'>${toValue}</span>` })" />
    <s-divider />
    <swap-info :show-price="true" />
    <swap-info :show-tooltips="false" />
    <template #footer>
      <s-button type="primary" @click="handleConfirmSwap">{{ t('swap.confirmSwap') }}</s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import DialogBase from '@/components/DialogBase.vue'
import { formatNumber } from '@/utils'
import { lazyComponent } from '@/router'
import { Components } from '@/consts'
import { dexApi } from '@soramitsu/soraneo-wallet-web'

@Component({
  components: {
    DialogBase,
    SwapInfo: lazyComponent(Components.SwapInfo),
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class ConfirmSwap extends Mixins(TranslationMixin, DialogMixin) {
  @Getter tokenFrom!: any
  @Getter tokenTo!: any
  @Getter fromValue!: number | string
  @Getter toValue!: number | string
  @Getter slippageTolerance!: number

  get formattedFromValue (): string {
    return formatNumber(this.fromValue)
  }

  get formattedToValue (): string {
    return formatNumber(this.toValue)
  }

  async handleConfirmSwap (): Promise<void> {
    try {
      await dexApi.swap(this.tokenFrom.address, this.tokenTo.address, this.fromValue.toString(), this.toValue.toString(), this.slippageTolerance)
      this.$emit('confirm', true)
    } catch (error) {
      this.$emit('confirm')
      throw new Error(error)
    }
    this.$emit('close')
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
  }
}
</style>

<style lang="scss" scoped>
.tokens {
  display: flex;
  justify-content: space-between;
  font-size: var(--s-heading2-font-size);
  line-height: $s-line-height-small;
  &-info-container {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
}
.token {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  white-space: nowrap;
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
