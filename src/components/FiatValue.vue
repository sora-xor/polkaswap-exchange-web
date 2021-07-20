<template>
  <span :class="computedClasses" v-if="value">
    <span class="fiat-value__prefix">~$</span>
    <span class="fiat-value__number">{{ formatted.value }}</span>
    <span v-if="withDecimals" class="fiat-value__decimals">{{ formatted.decimals }}</span>
  </span>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'

import { FPNumber } from '@sora-substrate/util'
import NumberFormatterMixin from './mixins/NumberFormatterMixin'

@Component
export default class FiatValue extends Mixins(NumberFormatterMixin) {
  @Prop({ default: '', type: String }) readonly value!: string
  @Prop({ default: false, type: Boolean }) readonly withDecimals!: boolean
  @Prop({ default: false, type: Boolean }) readonly withLeftShift!: boolean

  get formatted (): any {
    const formattedValue = this.formatStringValue(this.value)
    const delimiterIndex = formattedValue.indexOf(FPNumber.DELIMITERS_CONFIG.decimal)
    return {
      value: delimiterIndex !== -1 ? formattedValue.substring(0, delimiterIndex) : formattedValue,
      decimals: this.withDecimals
        ? delimiterIndex !== -1 ? formattedValue.substring(delimiterIndex, delimiterIndex + 3) : FPNumber.DELIMITERS_CONFIG.decimal + '00'
        : ''
    }
  }

  get computedClasses (): string {
    const baseClass = 'fiat-value'
    const classes = [baseClass]

    if (this.withLeftShift) {
      classes.push(`${baseClass}--shifted`)
    }

    return classes.join(' ')
  }
}
</script>

<style scoped lang="scss">
.fiat-value {
  color: var(--s-color-fiat-value);
  font-family: var(--s-font-family-default);
  font-weight: 800;
  font-size: var(--s-font-size-small);
  line-height: var(--s-line-height-medium);
  letter-spacing: var(--s-letter-spacing-small);
  white-space: nowrap;
  word-spacing: -1em;
  &--shifted {
    margin-left: calc(var(--s-basic-spacing) / 2);
  }
  &__prefix {
    opacity: .6;
    padding-right: calc(var(--s-basic-spacing) / 4);
  }
  &__number {
    font-weight: 600;
  }
  &__decimals {
    font-weight: 300;
    font-size: var(--s-font-size-mini);
  }
}
</style>
