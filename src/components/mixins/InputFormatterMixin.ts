import { Vue, Component } from 'vue-property-decorator'

@Component
export default class InputFormatterMixin extends Vue {
  formatNumberField = (fieldValue: string): string => {
    if (fieldValue.indexOf('.') === 0) {
      fieldValue = '0' + fieldValue
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

  promiseTimeout (): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 50))
  }
}
