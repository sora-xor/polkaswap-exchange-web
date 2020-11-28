<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('confirmSupply.title')"
  >
    <div class="pool-tokens-amount">
      {{ poolTokens }}
    </div>
    <s-row flex align="middle" class="pool-tokens">
      <pair-token-logo class="pair-logo" :firstToken="firstToken.symbol" :secondToken="secondToken.symbol" size="small" />
      {{ t('createPair.firstSecondPoolTokens', { first: firstToken.symbol, second: secondToken.symbol })  }}
    </s-row>
    <div class="tokens">
      <s-row flex justify="space-between" class="token">
        <s-row v-if="firstToken" flex>
          <!-- TODO 4 alexnatalia: fix tokens alignment -->
          <token-logo :token="firstToken.symbol" size="small" />
          <span class="token-symbol">{{ firstToken.symbol }} {{ t('createPair.deposit')}}:</span>
        </s-row>
        <div class="token-value">{{ formatNumber(firstTokenValue, 2) }}</div>
      </s-row>
      <s-row flex justify="space-between" class="token">
        <s-row v-if="secondToken" flex>
          <token-logo :token="secondToken.symbol" size="small" />
          <span class="token-symbol">{{ secondToken.symbol }} {{ t('createPair.deposit')}}:</span>
        </s-row>
        <div class="token-value">{{ formatNumber(secondTokenValue, 2) }}</div>
      </s-row>
    </div>
    <div class="output-description">
      {{ t('confirmSupply.outputDescription') }}
    </div>

    <s-divider />
    <div class="pair-info">
      <s-row flex justify="space-between" class="pair-info__line">
        <div>{{ t('confirmSupply.price') }}</div>
        <div v-if="firstToken && secondToken" class="price">
          <div>1 {{ firstToken.symbol }} = {{ formatNumber(firstToken.price / secondToken.price) }} {{ secondToken.symbol }}</div>
          <div>1 {{ secondToken.symbol }} = {{ formatNumber(secondToken.price / firstToken.price) }} {{ firstToken.symbol }}</div>
        </div>
      </s-row>
      <s-row flex justify="space-between" class="pair-info__line">
        <div>{{ t('createPair.shareOfPool') }}</div>
        <div>{{ shareOfPool }}</div>
      </s-row>
    </div>
    <template #footer>
      <s-button type="primary" @click="handleConfirmCreatePair">{{ t('confirmSupply.confirm') }}</s-button>
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
const namespace = 'addLiquidity'

@Component({
  components: {
    DialogBase,
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo)
  }
})
export default class ConfirmAddLiquidity extends Mixins(TranslationMixin, DialogMixin) {
  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('firstTokenValue', { namespace }) firstTokenValue!: number
  @Getter('secondTokenValue', { namespace }) secondTokenValue!: number

  formatNumber = formatNumber

  get poolTokens (): string {
    return formatNumber(1000, 2)
  }

  get shareOfPool (): string {
    return '1%'
  }

  handleConfirmCreatePair (): void {
    this.$emit('confirm', true)
    this.$emit('close')
    this.isVisible = false
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
  &__line {
    margin-top: $inner-spacing-medium;
    margin-bottom: $inner-spacing-medium;
  }
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

.pair-logo {
  margin-right: $inner-spacing-mini;
}
</style>
