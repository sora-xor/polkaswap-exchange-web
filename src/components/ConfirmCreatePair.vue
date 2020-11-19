<template>
  <s-dialog
    :title="t('confirmSupply.title')"
    :visible.sync="visible"
    borderRadius="medium"
    class="el-dialog__supply-confirm"
    width="496px"
  >
    <div class="tokens">
      <s-row flex justify="space-between" class="token">
        <div class="token-value">{{ formatNumber(firstTokenValue, 2) }}</div>
        <s-row flex align="center">
          <token-logo :token="firstToken.symbol" size="medium" />
          <span class="token-symbol">{{ firstToken.symbol }}</span>
        </s-row>
      </s-row>
      <div class="token-divider">+</div>
      <s-row flex justify="space-between" class="token">
        <div class="token-value">{{ formatNumber(secondTokenValue, 2) }}</div>
        <s-row flex align="center">
          <token-logo :token="secondToken.symbol" size="medium" />
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
        <div>{{ t('confirmSupply.poolTokensBurned', {first: firstToken.symbol, second: secondToken.symbol}) }}</div>
        <div>{{ poolTokensBurned }}</div>
      </s-row>
      <s-row flex justify="space-between" class="pair-info__line">
        <div>{{ t('confirmSupply.price') }}</div>
        <div class="price">
          <div>1 {{ firstToken.symbol }} = {{ formatNumber(firstToken.price / secondToken.price) }} {{ secondToken.symbol }}</div>
          <div>1 {{ secondToken.symbol }} = {{ formatNumber(secondToken.price / firstToken.price) }} {{ firstToken.symbol }}</div>
        </div>
      </s-row>
    </div>
    <template #footer>
      <s-button type="primary" @click="handleConfirmCreatePair">{{ t('confirmSupply.confirm') }}</s-button>
    </template>
  </s-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import TokenLogo from '@/components/TokenLogo.vue'
import { formatNumber } from '@/utils'
const namespace = 'createPair'

@Component({
  components: { TokenLogo }
})
export default class ConfirmCreatePair extends Mixins(TranslationMixin) {
  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('firstTokenValue', { namespace }) firstTokenValue!: number
  @Getter('secondTokenValue', { namespace }) secondTokenValue!: number

  @Prop({ default: false, type: Boolean }) readonly visible!: boolean
  formatNumber = formatNumber

  get poolTokensBurned (): string {
    return formatNumber(1000, 2)
  }

  handleConfirmCreatePair (): void {
    this.$emit('close')
  }
}
</script>

<style lang="scss">
$el-dialog-class: '.el-dialog';
$el-dialog-button-size: 40px;

#{$el-dialog-class} {
  &__wrapper #{$el-dialog-class} {
    &__header,
    &__footer {
      padding: $inner-spacing-big;
    }
    &__body {
      padding: $inner-spacing-mini $inner-spacing-big;
    }
  }
  #{$el-dialog-class}__header {
    display: inline-flex;
    align-items: center;
    width: 100%;
    #{$el-dialog-class}__title {
      font-size: $s-font-size-big;
      font-weight: normal;
    }
  }
  .transaction-number {
    color: var(--s-color-base-content-primary);
    font-weight: bold;
  }
  #{$el-dialog-class}__headerbtn {
    position: static;
    margin-left: auto;
    height: $el-dialog-button-size;
    width: $el-dialog-button-size;
    background-color: var(--s-color-base-background);
    border-color: var(--s-color-base-background);
    border-radius: $inner-spacing-small;
    #{$el-dialog-class}__close {
      color: var(--s-color-base-content-primary);
      font-weight: bold;
      font-size: $el-dialog-button-size / 2;
    }
    color: var(--s-color-base-content-primary);
    &:hover, &:active, &:focus {
      background-color: var(--s-color-base-background-hover);
      border-color: var(--s-color-base-background-hover);
      #{$el-dialog-class}__close {
        color: var(--s-color-base-content-primary);
      }
    }
  }
  #{$el-dialog-class}__footer {
    .el-button {
      padding: $inner-spacing-mini;
      width: 100%;
    }
  }
}
</style>

<style lang="scss" scoped>
.tokens {
  font-size: 30px;
  line-height: $s-line-height-mini;
  .token {
    &-logo {
      display: inline-block;
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
