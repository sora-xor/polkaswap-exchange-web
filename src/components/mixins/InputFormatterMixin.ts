import { Vue, Component } from 'vue-property-decorator'

@Component
export default class InputFormatterMixin extends Vue {
  formatNumberField = (fieldValue: string): string => {
    if (fieldValue.indexOf('.') === 0) {
      return '0' + fieldValue
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

  inputMaxLength = (fieldValue: string, token: any) => {
    if (!token?.decimals || fieldValue.indexOf('.') === -1) return undefined
    const integer = fieldValue.split('.')[0]
    return integer.length + token.decimals + 1
  }

  promiseTimeout (): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 50))
  }
}
