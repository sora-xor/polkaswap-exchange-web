import { Vue, Component, Prop, Watch } from 'vue-property-decorator'

@Component
export default class DialogMixin extends Vue {
  @Prop({ type: Boolean, default: false, required: true }) readonly visible!: boolean

  isVisible = false

  @Watch('visible', { immediate: true })
  handleVisibleChange (value: boolean): void {
    this.isVisible = value
  }

  @Watch('isVisible')
  handleIsVisibleChange (value: boolean): void {
    this.$emit('update:visible', value)
  }

  closeDialog (): void {
    this.isVisible = false
  }
}
