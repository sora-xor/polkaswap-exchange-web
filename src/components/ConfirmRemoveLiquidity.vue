<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('removeLiquidity.confirmTitle')"
  >
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedFromValue }}</span>
        <s-icon class="icon-divider" name="plus-16" />
        <span class="token-value">{{ formattedToValue }}</span>
      </div>
      <div class="tokens-info-container">
        <div v-if="firstToken" class="token">
          <token-logo class="token-logo" :token="firstToken" />
          {{ firstToken.symbol }}
        </div>
        <div v-if="secondToken" class="token">
          <token-logo class="token-logo" :token="secondToken" />
          {{ secondToken.symbol }}
        </div>
      </div>
    </div>
    <p class="transaction-message">
      {{ t('removeLiquidity.outputMessage', { slippageTolerance: formatStringValue(`${slippageTolerance}`) }) }}
    </p>
    <s-divider />
    <info-line
      :label="t('confirmSupply.poolTokensBurned', { first: firstToken.symbol, second: secondToken.symbol })"
      :value="formattedLiquidityValue"
    >
      <template #info-line-prefix>
        <pair-token-logo :first-token="firstToken" :second-token="secondToken" size="mini" />
      </template>
    </info-line>
    <info-line
      :label="t('removeLiquidity.price')"
      :value="`1 ${firstToken.symbol} = ${formatStringValue(priceReversed)}`"
      :asset-symbol="secondToken.symbol "
    />
    <info-line
      :value="`1 ${secondToken.symbol} = ${formatStringValue(price)}`"
      :asset-symbol="firstToken.symbol"
    />
    <template #footer>
      <s-button
        type="primary"
        class="s-typography-button--large"
        :loading="parentLoading"
        @click="handleConfirmRemoveLiquidity"
      >
        {{ t('exchange.confirm') }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Getter, State } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'
import DialogBase from '@/components/DialogBase.vue'
import { lazyComponent } from '@/router'
import { Components } from '@/consts'

const namespace = 'removeLiquidity'

@Component({
  components: {
    DialogBase,
    TokenLogo: lazyComponent(Components.TokenLogo),
    InfoLine: lazyComponent(Components.InfoLine),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo)
  }
})
export default class ConfirmRemoveLiquidity extends Mixins(TranslationMixin, DialogMixin, LoadingMixin, NumberFormatterMixin) {
  @State(state => state[namespace].liquidityAmount) liquidityAmount!: any
  @State(state => state[namespace].firstTokenAmount) firstTokenAmount!: any
  @State(state => state[namespace].secondTokenAmount) secondTokenAmount!: any

  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('price', { namespace: 'prices' }) price!: string | number
  @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string | number

  @Getter slippageTolerance!: string

  get formattedFromValue (): string {
    return this.formatStringValue(this.firstTokenAmount)
  }

  get formattedToValue (): string {
    return this.formatStringValue(this.secondTokenAmount)
  }

  get formattedLiquidityValue (): string {
    return this.formatStringValue(this.liquidityAmount)
  }

  handleConfirmRemoveLiquidity (): void {
    this.$emit('confirm')
  }
}
</script>

<style lang="scss" scoped>
.tokens {
  display: flex;
  justify-content: space-between;
  font-size: var(--s-heading2-font-size);
  line-height: var(--s-line-height-small);
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
  justify-content: flex-end;
  &-logo {
    display: block;
    margin-right: $inner-spacing-medium;
    flex-shrink: 0;
  }
}
.transaction-message {
  margin-top: $inner-spacing-big;
  color: var(--s-color-base-content-primary);
  line-height: var(--s-line-height-base);
}
@include vertical-divider;
@include vertical-divider('el-divider');
</style>
