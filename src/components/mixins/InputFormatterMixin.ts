import { Vue, Component } from 'vue-property-decorator'

@Component
export default class InputFormatterMixin extends Vue {
  formatNumberField = (fieldValue: string, token?: any): string => {
    if (fieldValue.indexOf('.') === 0) {
      fieldValue = '0' + fieldValue
    }

    const tokenValueMaxLength = this.inputMaxLength(fieldValue, token)

    if (tokenValueMaxLength && fieldValue.length > tokenValueMaxLength) {
      fieldValue = fieldValue.slice(0, tokenValueMaxLength)
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

  inputMaxLength = (fieldValue: string, token?: any) => {
    if (token?.decimals === undefined || fieldValue.indexOf('.') === -1) return undefined
    const integer = fieldValue.split('.')[0]
    return integer.length + token.decimals + 1
  }

  promiseTimeout (): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 50))
  }
}
