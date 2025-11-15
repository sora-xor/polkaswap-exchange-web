import { Options, Prop, mixins, Ref } from 'vue-property-decorator';

@Options({})
export default class InputFocusMixin extends mixins() {
  @Prop({ default: false, type: Boolean }) readonly autofocus!: boolean;

  @Ref('input') readonly input!: any;

  mounted(): void {
    this.focusCheck();
  }

  activated(): void {
    this.focusCheck();
  }

  async focusCheck(): Promise<void> {
    if (this.autofocus) {
      await this.$nextTick();
      this.focus();
    }
  }

  focus(): void {
    if (this.input && typeof this.input.focus === 'function') {
      this.input.focus();
    }
  }
}
