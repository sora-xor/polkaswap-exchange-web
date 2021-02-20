<template>
  <s-input
    v-float
    :value="value"
    :maxlength="maxlength"
    :placeholder="placeholder"
    v-bind="$attrs"
    v-on="{
      ...$listeners,
      input: handleInput,
      blur: onBlur
    }"
  />
</template>

<script lang="ts">
import { Component, Prop, Mixins } from 'vue-property-decorator'
import { Asset, AccountAsset } from '@sora-substrate/util'

import InputFormatterMixin from '@/components/mixins/InputFormatterMixin'

import { formatNumber, isNumberValue } from '@/utils'

const DEFAULT_VALUE = ''
const DEFAULT_PLACEHOLDER = formatNumber(0, 1)

@Component
export default class TokenInput extends Mixins(InputFormatterMixin) {
  @Prop({ type: String, default: DEFAULT_VALUE }) readonly value!: string
  @Prop({ type: String, default: DEFAULT_PLACEHOLDER }) readonly placeholder!: string
  @Prop({ type: Object, default: () => null }) readonly token!: Asset | AccountAsset | null

  get maxlength (): any {
    return this.tokenValueMaxLength(this.value, this.token)
  }

  handleInput (value: string): void {
    const formatted = this.formatNumberField(value, this.token)
    const newValue = !isNumberValue(formatted) ? DEFAULT_VALUE : formatted

    this.onInput(newValue)
  }

  onBlur (event: Event): void {
    const preparedValue = +this.value === 0
      ? DEFAULT_VALUE
      : this.trimNeedlesSymbols(this.value)

    this.onInput(preparedValue)

    this.$emit('blur', event)
  }

  onInput (value: string): void {
    this.$emit('input', value)
  }
}
</script>
