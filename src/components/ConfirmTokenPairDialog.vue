<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('confirmSupply.title')"
    v-if="firstToken && secondToken"
  >
    <div class="pool-tokens-amount">
      {{ shareOfPool }}%
    </div>
    <s-row v-if="firstToken && secondToken" flex align="middle" class="pool-tokens">
      <pair-token-logo :first-token="firstToken" :second-token="secondToken" size="small" />
      {{ t('createPair.firstSecondPoolTokens', { first: firstToken.symbol, second: secondToken.symbol }) }}
    </s-row>
    <div class="output-description">
      {{ t('confirmSupply.outputDescription', { slippageTolerance: formattedSlippageTolerance }) }}
    </div>
    <s-divider />
    <info-line
      :label="`${firstToken.symbol} ${t('createPair.deposit')}`"
      :value="formattedFirstTokenValue"
      :fiat-value="fiatFirstAmount"
      is-formatted
    >
      <template #info-line-prefix>
        <token-logo :token="firstToken" size="small" />
      </template>
    </info-line>
    <info-line
      :label="`${secondToken.symbol} ${t('createPair.deposit')}`"
      :value="formattedSecondTokenValue"
      :fiat-value="fiatSecondAmount"
      is-formatted
    >
      <template #info-line-prefix>
        <token-logo :token="secondToken" size="small" />
      </template>
    </info-line>
    <info-line
      :label="t('confirmSupply.price')"
      :value="`1 ${firstToken.symbol} = ${formattedPriceReversed}`"
      :asset-symbol="secondToken.symbol"
    />
    <info-line :value="`1 ${secondToken.symbol} = ${formattedPrice}`" :asset-symbol="firstToken.symbol" />
    <template #footer>
      <s-button
        type="primary"
        class="s-typography-button--large"
        :loading="parentLoading"
        @click="handleConfirm"
      >
        {{ t('exchange.confirm') }}
      </s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { FormattedAmountMixin, InfoLine } from '@soramitsu/soraneo-wallet-web'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import DialogBase from '@/components/DialogBase.vue'
import { lazyComponent } from '@/router'
import { Components } from '@/consts'

@Component({
  components: {
    DialogBase,
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    InfoLine
  }
})
export default class ConfirmTokenPairDialog extends Mixins(FormattedAmountMixin, TranslationMixin, DialogMixin, LoadingMixin) {
  @Prop({ type: String, default: '100' }) readonly shareOfPool!: string
  @Prop({ type: Object }) readonly firstToken!: any
  @Prop({ type: Object }) readonly secondToken!: any
  @Prop({ type: String }) readonly firstTokenValue!: string
  @Prop({ type: String }) readonly secondTokenValue!: string
  @Prop({ type: String }) readonly minted!: string
  @Prop({ type: String }) readonly price!: string
  @Prop({ type: String }) readonly priceReversed!: string
  @Prop({ type: String }) readonly slippageTolerance!: string

  get formattedFirstTokenValue (): string {
    return this.formatStringValue(this.firstTokenValue, this.firstToken?.decimals)
  }

  get formattedSecondTokenValue (): string {
    return this.formatStringValue(this.secondTokenValue, this.secondToken?.decimals)
  }

  get fiatFirstAmount (): Nullable<string> {
    return this.getFiatAmount(this.firstTokenValue, this.firstToken)
  }

  get fiatSecondAmount (): Nullable<string> {
    return this.getFiatAmount(this.secondTokenValue, this.secondToken)
  }

  get formattedPrice (): string {
    return this.formatStringValue(this.price)
  }

  get formattedPriceReversed (): string {
    return this.formatStringValue(this.priceReversed)
  }

  get formattedSlippageTolerance (): string {
    return this.formatStringValue(this.slippageTolerance)
  }

  handleConfirm (): void {
    this.$emit('confirm', true)
  }
}
</script>

<style lang="scss" scoped>
.tokens {
  line-height: var(--s-line-height-big);
  .token {
    &-logo {
      display: inline-block;
      margin-right: $inner-spacing-mini;
    }
  }
  > .s-row:first-child {
    margin-bottom: $inner-spacing-mini;
  }
}

.tokens,
.pair-info {
  padding-left: $inner-spacing-mini;
  padding-right: $inner-spacing-mini;
}

.output-description {
  margin-top: $inner-spacing-mini;
  margin-bottom: $inner-spacing-mini;
  font-size: var(--s-font-size-mini);
  line-height: var(--s-line-height-big);
  text-align: center;
  max-width: 300px;
  margin: auto;
}

.pair-info {
  line-height: var(--s-line-height-big);
  color: var(--s-color-base-content-secondary);
  margin-top: $inner-spacing-big;
  &__line {
    margin-top: $inner-spacing-mini;
  }
}

.price {
  text-align: right;
  div:last-child {
    margin-top: $inner-spacing-mini;
  }
}

.supply-info {
  display: flex;
  justify-content: space-between;
}

.pool-tokens-amount {
  font-size: var(--s-heading1-font-size);
  line-height: var(--s-line-height-mini);
  letter-spacing: var(--s-letter-spacing-mini);
  font-weight: 700;
  text-align: center;
}

.pool-tokens {
  margin: $inner-spacing-mini 0;
  font-size: var(--s-heading4-font-size);
  font-weight: 800;
  line-height: var(--s-line-height-medium);
  letter-spacing: var(--s-letter-spacing-small);
  justify-content: center;
}
</style>
