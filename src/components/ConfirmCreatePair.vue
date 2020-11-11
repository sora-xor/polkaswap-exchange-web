<template>
  <s-dialog
    :visible.sync="visible"
    class="el-dialog__supply-confirm"
    width="496px"
  >
    <template #title>
      <div class="supply-confirm__title">
      {{ t('confirmSupply.title') }}
      </div>
    </template>

    <div class="tokens">
      <s-row flex justify="space-between" class="token">
        <div class="token-value">{{ formatNumber(firstTokenValue, 2) }}</div>
        <div>
          <span class="token-logo"></span>
          <span class="token-symbol">{{ firstToken.symbol }}</span>
        </div>
      </s-row>
      <div class="token-divider">+</div>
      <s-row flex justify="space-between" class="token">
        <div class="token-value">{{ formatNumber(secondTokenValue, 2) }}</div>
        <div>
          <span class="token-logo"></span>
          <span class="token-symbol">{{ secondToken.symbol }}</span>
        </div>
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
      <s-button type="primary" size="medium" @click="handleConfirmCreatePair">{{ t('confirmSupply.confirm') }}</s-button>
    </template>
  </s-dialog>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import { formatNumber } from '@/utils'
const namespace = 'createPair'

@Component
export default class ConfirmCreatePair extends Mixins(TranslationMixin) {
  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('firstTokenValue', { namespace }) firstTokenValue!: number
  @Getter('secondTokenValue', { namespace }) secondTokenValue!: number

  @Prop({ default: false, type: Boolean }) readonly visible!: boolean
  formatNumber = formatNumber
  getTokenClasses (token): string {
    let classes = 'token-logo'
    if (token && token.symbol) {
      classes += ' token-logo--' + token.symbol.toLowerCase()
    }
    return classes
  }

  get poolTokensBurned (): string {
    return formatNumber(1000, 2)
  }

  handleConfirmCreatePair (): void {
    this.$emit('close')
  }
}
</script>

<style lang="scss">
@import '../styles/layout';
@import '../styles/typography';
@import '../styles/soramitsu-variables';

$el-dialog-class: '.el-dialog';
$el-dialog-button-size: 40px;
#{$el-dialog-class} {
  &__wrapper #{$el-dialog-class} {
    border-radius: $border-radius-medium;
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
    color: $s-color-base-content-primary;
    font-weight: bold;
  }
  #{$el-dialog-class}__headerbtn {
    position: static;
    margin-left: auto;
    height: $el-dialog-button-size;
    width: $el-dialog-button-size;
    background-color: $s-color-base-background;
    border-color: $s-color-base-background;
    border-radius: $inner-spacing-small;
    #{$el-dialog-class}__close {
      color: $s-color-base-content-primary;
      font-weight: bold;
      font-size: $el-dialog-button-size / 2;
    }
    color: $s-color-base-content-primary;
    &:hover, &:active, &:focus {
      background-color: $s-color-base-background-hover;
      border-color: $s-color-base-background-hover;
      #{$el-dialog-class}__close {
        color: $s-color-base-content-primary;
      }
    }
  }
  #{$el-dialog-class}__footer {
    .el-button {
      padding: $inner-spacing-mini;
      border-radius: $border-radius-small;
      width: 100%;
    }
  }
}
</style>

<style lang="scss" scoped>
@import '../styles/mixins';
@import '../styles/layout';
@import '../styles/typography';
@import '../styles/soramitsu-variables';

.supply-confirm__title {
  font-size: 24px;
  letter-spacing: -0.02em;
}

.tokens {
  font-size: 30px;
  line-height: 130%;
}

.output-description {
  font-size: $s-font-size-mini;
  line-height: 180%;
  margin-top: $inner-spacing-mini;
  margin-bottom: $inner-spacing-mini;
}

.pair-info {
  line-height: 180%;

  .pair-info__line {
    margin-top: $inner-spacing-medium;
    margin-bottom: $inner-spacing-medium;
  }
}

.supply-info {
  display: flex;
  justify-content: space-between;
}
</style>
