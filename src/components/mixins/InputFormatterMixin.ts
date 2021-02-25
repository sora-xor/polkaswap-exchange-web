import { Vue, Component } from 'vue-property-decorator'

@Component
export default class InputFormatterMixin extends Vue {
  formatNumberField = (fieldValue: any): string => {
    if (!['string', 'number'].includes(typeof fieldValue)) return fieldValue

    let formatted = String(fieldValue)

    if (formatted.indexOf('.') === 0) {
      formatted = '0' + formatted
    }

    return formatted
  }
}
