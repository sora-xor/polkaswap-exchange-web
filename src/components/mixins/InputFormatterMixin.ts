import { Vue, Component } from 'vue-property-decorator'

@Component
export default class InputFormatterMixin extends Vue {
  formatNumberField = (fieldValue: string, token?: any): string => {
    if (fieldValue.indexOf('.') === 0) {
      fieldValue = '0' + fieldValue
    }

    const lengthLimit = this.tokenValueMaxLength(fieldValue, token)

    if (lengthLimit && fieldValue.length > lengthLimit) {
      fieldValue = fieldValue.slice(0, lengthLimit)
    }

    return fieldValue
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

  promiseTimeout (): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 50))
  }
}
