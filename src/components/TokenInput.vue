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

  async handleInput (value: string): Promise<void> {
    const formatted = this.formatNumberField(value, this.token)
    // this is a hack: to force watcher in SInput, we should emit a stringy value at first
    this.onInput(formatted)

    await this.$nextTick()

    // then, if formatted is not a number like value, emit default value
    if (!isNumberValue(formatted)) {
      this.onInput(DEFAULT_VALUE)
    }
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
