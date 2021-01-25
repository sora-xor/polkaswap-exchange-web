<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('confirmSupply.title')"
    v-if="firstToken && secondToken"
  >
    <div class="pool-tokens-amount">
      {{ minted }}
    </div>
    <s-row v-if="firstToken && secondToken" flex align="middle" class="pool-tokens">
      <pair-token-logo :first-token="firstToken" :second-token="secondToken" size="small" />
      {{ t('createPair.firstSecondPoolTokens', { first: firstToken.symbol, second: secondToken.symbol }) }}
    </s-row>
    <div class="output-description">
      {{ t('confirmSupply.outputDescription', { slippageTolerance }) }}
    </div>
    <s-divider />
    <div class="tokens">
      <s-row flex justify="space-between" class="token">
        <s-row v-if="firstToken" flex>
          <token-logo :token="firstToken" size="small" />
          <span class="token-symbol">{{ firstToken.symbol }} {{ t('createPair.deposit')}}</span>
        </s-row>
        <div class="token-value">{{ firstTokenValue }}</div>
      </s-row>
      <s-row flex justify="space-between" class="token">
        <s-row v-if="secondToken" flex>
          <token-logo :token="secondToken" size="small" />
          <span class="token-symbol">{{ secondToken.symbol }} {{ t('createPair.deposit')}}</span>
        </s-row>
        <div class="token-value">{{ secondTokenValue }}</div>
      </s-row>
    </div>
    <div class="pair-info">
      <s-row flex justify="space-between" class="pair-info__line">
        <div>{{ t('confirmSupply.price') }}</div>
        <div v-if="firstToken && secondToken" class="price">
          <div>1 {{ firstToken.symbol }} = {{ firstPerSecondPrice }} {{ secondToken.symbol }}</div>
          <div>1 {{ secondToken.symbol }} = {{ secondPerFirstPrice }} {{ firstToken.symbol }}</div>
        </div>
      </s-row>
      <s-row flex justify="space-between" class="pair-info__line">
        <div>{{ t('createPair.shareOfPool') }}</div>
        <div>{{ shareOfPool }}%</div>
      </s-row>
    </div>
    <template #footer>
      <s-button type="primary" @click="handleConfirmAddLiquidity">{{ t('exchange.confirm') }}</s-button>
    </template>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import DialogMixin from '@/components/mixins/DialogMixin'
import DialogBase from '@/components/DialogBase.vue'
import { lazyComponent } from '@/router'
import { Components } from '@/consts'
import { formatNumber } from '@/utils'
import { FPNumber } from '@sora-substrate/util'

const namespace = 'addLiquidity'

@Component({
  components: {
    DialogBase,
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo)
  }
})
export default class ConfirmAddLiquidity extends Mixins(TranslationMixin, DialogMixin) {
  @Getter('minted', { namespace }) minted!: any
  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('firstTokenValue', { namespace }) firstTokenValue!: number
  @Getter('secondTokenValue', { namespace }) secondTokenValue!: number
  @Getter('shareOfPool', { namespace }) shareOfPool!: string
  @Getter slippageTolerance!: number

  formatNumber = formatNumber

  get firstPerSecondPrice (): string {
    return this.firstTokenValue && this.secondTokenValue
      ? new FPNumber(this.firstTokenValue).div(new FPNumber(this.secondTokenValue)).toFixed(2)
      : '0'
  }

  get secondPerFirstPrice (): string {
    return this.firstTokenValue && this.secondTokenValue
      ? new FPNumber(this.secondTokenValue).div(new FPNumber(this.firstTokenValue)).toFixed(2)
      : '0'
  }

  handleConfirmAddLiquidity (): void {
    this.$emit('confirm', true)
  }
}
</script>

<style lang="scss" scoped>
.tokens {
  line-height: $s-line-height-big;
  .token {
    &-logo {
      display: inline-block;
      margin-right: $inner-spacing-mini;
    }
  }
}
.output-description {
  margin-top: $inner-spacing-mini;
  margin-bottom: $inner-spacing-mini;
  font-size: var(--s-font-size-mini);
  line-height: $s-line-height-big;
}
.pair-info {
  line-height: $s-line-height-big;
  color: var(--s-color-base-content-secondary);
  &__line {
    margin-top: $inner-spacing-medium;
    margin-bottom: $inner-spacing-medium;
  }
}
.price {
  text-align: right;
}
.supply-info {
  display: flex;
  justify-content: space-between;
}

.pool-tokens-amount {
  font-size: var(--s-heading1-font-size);
  line-height: $s-line-height-mini;
  letter-spacing: $s-letter-spacing-mini;
}

.pool-tokens {
  margin: $inner-spacing-mini 0;
  font-size: var(--s-heading4-font-size);
  line-height: $s-line-height-medium;
  letter-spacing: $s-letter-spacing-small;
}
</style>
