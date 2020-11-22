<template>
  <dialog-base :visible.sync="visible" :title="t('swap.confirmSwap')">
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedFromValue }}</span>
        <s-icon name="arrow-bottom-rounded" />
        <span class="token-value">{{ formattedToValue }}</span>
      </div>
      <div class="tokens-info-container">
        <div v-if="tokenFrom" class="token">
          <span :class="getTokenClasses(tokenFrom)" />
          {{ tokenFrom ? tokenFrom.symbol : '' }}
        </div>
        <div v-if="tokenTo" class="token">
          <span :class="getTokenClasses(tokenTo)" />
          {{ tokenTo ? tokenTo.symbol : '' }}
        </div>
      </div>
    </div>
    <p class="transaction-message" v-html="t('swap.swapOutputMessage', { transactionValue : `<span class='transaction-number'>${toValue}</span>` })"/>
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
import { formatNumber } from '@/utils'
import { lazyComponent } from '@/router'
import { Components } from '@/consts'

@Component({
  components: {
    DialogBase: lazyComponent(Components.DialogBase),
    SwapInfo: lazyComponent(Components.SwapInfo)
  }
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

  getTokenClasses (token): string {
    let classes = 'token-logo'
    if (token && token.symbol) {
      classes += ' token-logo--' + token.symbol.toLowerCase()
    }
    return classes
  }

  handleConfirmSwap (): void {
    // TODO: Make Swap here
    this.setSwapConfirm(true)
    this.$emit('close')
  }
}
</script>

<style lang="scss" scoped>
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
    @include token-logo-styles;
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
  line-height: $s-line-height-medium;
}
.el-divider {
  margin-top: $inner-spacing-mini;
  margin-bottom: $inner-spacing-big;
}
</style>
