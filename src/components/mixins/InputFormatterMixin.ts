import { Vue, Component } from 'vue-property-decorator'

@Component
export default class InputFormatterMixin extends Vue {
  formatNumberField = (fieldValue: string): string => {
    if (fieldValue === '.') {
      fieldValue = '0.'
    }
    return fieldValue
  }
}
