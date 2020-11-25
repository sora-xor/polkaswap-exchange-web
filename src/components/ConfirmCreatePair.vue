<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('confirmSupply.title')"
  >
    <div class="tokens">
      <s-row flex justify="space-between" class="token">
        <div class="token-value">{{ formatNumber(firstTokenValue, 2) }}</div>
        <s-row v-if="firstToken" flex align="center">
          <!-- TODO 4 alexnatalia: fix tokens alignment -->
          <token-logo :token="firstToken.symbol" />
          <span class="token-symbol">{{ firstToken.symbol }}</span>
        </s-row>
      </s-row>
      <div class="token-divider">+</div>
      <s-row flex justify="space-between" class="token">
        <div class="token-value">{{ formatNumber(secondTokenValue, 2) }}</div>
        <s-row v-if="secondToken" flex align="center">
          <token-logo :token="secondToken.symbol" />
          <span class="token-symbol">{{ secondToken.symbol }}</span>
        </s-row>
      </s-row>
    </div>
    <div class="output-description">
      {{ t('confirmSupply.outputDescription') }}
    </div>

    <s-divider />
    <div class="pair-info">
      <s-row flex justify="space-between" class="pair-info__line">
        <div v-if="firstToken && secondToken">{{ t('confirmSupply.poolTokensBurned', {first: firstToken.symbol, second: secondToken.symbol}) }}</div>
        <div>{{ poolTokensBurned }}</div>
      </s-row>
      <s-row flex justify="space-between" class="pair-info__line">
        <div>{{ t('confirmSupply.price') }}</div>
        <div v-if="firstToken && secondToken" class="price">
          <div>1 {{ firstToken.symbol }} = {{ formatNumber(firstToken.price / secondToken.price) }} {{ secondToken.symbol }}</div>
          <div>1 {{ secondToken.symbol }} = {{ formatNumber(secondToken.price / firstToken.price) }} {{ firstToken.symbol }}</div>
        </div>
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
const namespace = 'createPair'

@Component({
  components: {
    DialogBase,
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class ConfirmCreatePair extends Mixins(TranslationMixin, DialogMixin) {
  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('firstTokenValue', { namespace }) firstTokenValue!: number
  @Getter('secondTokenValue', { namespace }) secondTokenValue!: number

  formatNumber = formatNumber

  get poolTokensBurned (): string {
    return formatNumber(1000, 2)
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
  font-size: 30px;
  line-height: $s-line-height-mini;
  .token {
    &-logo {
      display: inline-block;
      margin-right: $inner-spacing-medium;
    }
  }
}
.output-description {
  font-size: $s-font-size-mini;
  line-height: $s-line-height-medium;
  margin-top: $inner-spacing-mini;
  margin-bottom: $inner-spacing-mini;
}
.pair-info {
  line-height: $s-line-height-medium;
  &__line {
    margin-top: $inner-spacing-medium;
    margin-bottom: $inner-spacing-medium;
  }
}
.supply-info {
  display: flex;
  justify-content: space-between;
}
</style>
