<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('swap.confirmSwap')"
    customClass="dialog--confirm-swap"
  >
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedFromValue }}</span>
        <s-icon name="arrow-bottom-rounded" />
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
    <swap-info :showPrice="true" />
    <swap-info />
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
  @Getter fromValue!: number
  @Getter toValue!: number

  get formattedFromValue (): string {
    return formatNumber(this.fromValue, 4)
  }

  get formattedToValue (): string {
    return formatNumber(this.toValue, 4)
  }

  handleConfirmSwap (): void {
    this.$emit('confirm', true)
    this.$emit('close')
    this.isVisible = false
  }
}
</script>

<style lang="scss">
.dialog--confirm-swap {
  .transaction-number {
    color: var(--s-color-base-content-primary);
    font-weight: $s-font-weight-medium;
    font-feature-settings: $s-font-feature-settings-common;
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
  white-space: nowrap;
  &-logo {
    display: block;
    margin-right: $inner-spacing-medium;
    flex-shrink: 0;
  }
}
.s-icon-arrow-bottom-rounded,
.transaction-message,
.el-divider {
  margin-top: $inner-spacing-mini;
}
.s-icon-arrow-bottom-rounded,
.el-divider {
  margin-bottom: $inner-spacing-mini;
}
.s-icon-arrow-bottom-rounded {
  display: block;
  font-size: var(--s-icon-font-size-mini);
}
.transaction-message {
  color: var(--s-color-base-content-tertiary);
  line-height: $s-line-height-big;
}
</style>
