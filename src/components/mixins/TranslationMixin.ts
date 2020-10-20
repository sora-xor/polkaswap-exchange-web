import { Vue, Component } from 'vue-property-decorator'

@Component
export default class TranslationMixin extends Vue {
  t (key: string, values?: any): string {
    return this.$root.$t(key, values) as string
  }

  tc (key: string, choice?: number, values?: any): string {
    return this.$root.$tc(key, choice, values)
  }
}
