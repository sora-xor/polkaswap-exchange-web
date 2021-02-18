import { Component, Mixins } from 'vue-property-decorator'

import InputFormatterMixin from '@/components/mixins/InputFormatterMixin'

import { isNumberValue } from '@/utils'
@Component
export default class TokenInputMixin extends Mixins(InputFormatterMixin) {
  async handleTokenInputChange (value: string | number, token: any, setValue: (v: any) => void): Promise<any> {
    const formattedValue = this.formatNumberField(value, token)

    if (!isNumberValue(formattedValue)) {
      await this.$nextTick
      this.resetInputField(setValue, typeof value)
      return
    }

    setValue(formattedValue)
  }

  handleTokenInputBlur (value: string | number, setValue: (v: any) => void): void {
    if (+value === 0) {
      this.resetInputField(setValue, typeof value)
    } else {
      setValue(this.trimNeedlesSymbols(String(value)))
    }
  }

  private resetInputField (setValue: (v: any) => void, valueType: string): void {
    const resetValue = valueType === 'number' ? 0 : ''
    setValue(resetValue)
  }
}
