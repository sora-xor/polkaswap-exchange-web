import { Component, Vue } from 'vue-property-decorator';

import { mutation } from '@/store/decorators';
import { FocusedField } from '@/store/removeLiquidity/types';

@Component
export default class InputSliderMixin extends Vue {
  @mutation.removeLiquidity.setFocusedField setFocusedField!: (field: FocusedField) => void;

  sliderInput: any;
  sliderDragButton: any;

  focusSliderInput(): void {
    this.setFocusedField(FocusedField.Percent);

    if (this.sliderInput) {
      this.sliderInput.focus();
    }
  }

  addListenerToSliderDragButton(): void {
    this.sliderDragButton = this.$el.querySelector('.slider-container .el-slider__button');
    this.sliderInput = this.$el.querySelector('.s-input--with-slider .el-input__inner');

    if (this.sliderDragButton) {
      this.sliderDragButton.addEventListener('mousedown', this.focusSliderInput);
    }
  }

  private removeListenerFromSliderDragButton(): void {
    if (this.sliderDragButton) {
      this.$el.removeEventListener('mousedown', this.sliderDragButton);
    }
  }

  beforeDestroy(): void {
    this.removeListenerFromSliderDragButton();
  }
}
