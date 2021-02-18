import { Vue, Component } from 'vue-property-decorator'

@Component
export default class InputFormatterMixin extends Vue {
  formatNumberField = (fieldValue: any, token?: any): string => {
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

  trimNeedlesSymbols = (fieldValue: string): string => {
    // Trim zeros in the beginning
    if (fieldValue.indexOf('0') === 0 && fieldValue.indexOf('.') !== 1) {
      fieldValue = fieldValue.replace(/^0+/, '')
    }
    // Trim dot in the end
    if (fieldValue.indexOf('.') === fieldValue.length - 1) {
      fieldValue = fieldValue.substring(0, fieldValue.length - 1)
    }
    return fieldValue
  }

  tokenValueMaxLength = (fieldValue: number | string, token?: any) => {
    const stringValue = String(fieldValue)

    if (stringValue.length === 0 || token?.decimals === undefined) return undefined

    const fpIndex = stringValue.indexOf('.')

    return fpIndex !== -1 ? fpIndex + 1 + token.decimals : undefined
  }
}
