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
import { Vue, Component, Prop } from 'vue-property-decorator'
import { Asset, AccountAsset } from '@sora-substrate/util'

const DEFAULT_VALUE = ''
const DEFAULT_PLACEHOLDER = '0.0'

const isNumberLikeValue = (value: any): boolean => {
  const numberValue = +value
  return typeof numberValue === 'number' && !isNaN(numberValue)
}

@Component
export default class TokenInput extends Vue {
  @Prop({ type: String, default: DEFAULT_VALUE }) readonly value!: string
  @Prop({ type: String, default: DEFAULT_PLACEHOLDER }) readonly placeholder!: string
  @Prop({ type: Object, default: () => null }) readonly token!: Asset | AccountAsset | null

  get maxlength (): any {
    return this.tokenValueMaxLength(this.value, this.token)
  }

  handleInput (value: string): void {
    const formatted = this.formatNumberField(value, this.token)
    const newValue = isNumberLikeValue(formatted) ? formatted : DEFAULT_VALUE

    this.onInput(newValue)
  }

  onBlur (event: Event): void {
    const preparedValue = +this.value === 0
      ? DEFAULT_VALUE
      : this.trimNeedlessSymbols(this.value)

    this.onInput(preparedValue)

    this.$emit('blur', event)
  }

  onInput (value: string): void {
    this.$emit('input', value)
  }

  private trimNeedlessSymbols = (fieldValue: string): string => {
    // Trim zeros in the beginning
    if (fieldValue.indexOf('0') === 0 && fieldValue.indexOf('.') !== 1) {
      fieldValue = fieldValue.replace(/^0+/, '')
    }
    // add leading zero before floating point
    if (fieldValue.indexOf('.') === 0) {
      fieldValue = '0' + fieldValue
    }
    // Trim dot in the end
    if (fieldValue.indexOf('.') === fieldValue.length - 1) {
      fieldValue = fieldValue.slice(0, -1)
    }
    return fieldValue
  }

  private formatNumberField = (fieldValue: any, token?: any): string => {
    if (!['string', 'number'].includes(typeof fieldValue)) return fieldValue

    let formatted = String(fieldValue)

    if (formatted.indexOf('.') === 0) {
      formatted = '0' + formatted
    }

    const lengthLimit = this.tokenValueMaxLength(formatted, token)

    if (lengthLimit && formatted.length > lengthLimit) {
      formatted = formatted.slice(0, lengthLimit)
    }

    return formatted
  }

  private tokenValueMaxLength = (fieldValue: number | string, token?: any) => {
    const stringValue = String(fieldValue)

    if (stringValue.length === 0 || token?.decimals === undefined) return undefined

    const fpIndex = stringValue.indexOf('.')

    return fpIndex !== -1 ? fpIndex + 1 + token.decimals : undefined
  }
}
</script>
