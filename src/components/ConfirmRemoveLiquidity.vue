<template>
  <dialog-base
    :visible.sync="isVisible"
    :title="t('removeLiquidity.confirmTitle')"
  >
    <div class="tokens">
      <div class="tokens-info-container">
        <span class="token-value">{{ formattedFromValue }}</span>
        <s-icon name="arrow-bottom-rounded" />
        <span class="token-value">{{ formattedToValue }}</span>
      </div>
      <div class="tokens-info-container">
        <div v-if="tokenFrom" class="token">
          <token-logo class="token-logo" :token="tokenFrom.symbol" />
          {{ tokenFrom.symbol }}
        </div>
        <div v-if="tokenTo" class="token">
          <token-logo class="token-logo" :token="tokenTo.symbol" />
          {{ tokenTo.symbol }}
        </div>
      </div>
    </div>
    <p class="transaction-message" v-html="t('removeLiquidity.outputMessage')" />
    <s-divider />
    <s-row flex justify="space-between">
        <div>{{ t('removeLiquidity.price')  }}</div>
        <div>
          <div>1 {{ firstToken.symbol }} = {{ formatNumber(firstToken.price / secondToken.price, 2) }} {{ secondToken.symbol }}</div>
          <div>1 {{ secondToken.symbol }} = {{ formatNumber(secondToken.price / firstToken.price, 2) }} {{ firstToken.symbol }}</div>
        </div>
    </s-row>
    <template #footer>
      <s-button type="primary" @click="handleConfirmRemoveLiquidity">{{ t('removeLiquidity.confirm') }}</s-button>
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
    TokenLogo: lazyComponent(Components.TokenLogo)
  }
})
export default class ConfirmSwap extends Mixins(TranslationMixin, DialogMixin) {
  @Prop({ default: false, type: Boolean }) readonly visible!: boolean

  get formattedFromValue (): string {
    return formatNumber(12, 4)
  }

  get formattedToValue (): string {
    return formatNumber(13, 4)
  }

  handleConfirmRemoveLiquidity (): void {
    // TODO: Remove Liquidity here
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
  line-height: $s-line-height-small;
}
.el-divider {
  margin-top: $inner-spacing-mini;
  margin-bottom: $inner-spacing-big;
}
</style>
