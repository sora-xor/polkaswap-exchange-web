import { defineComponent } from 'vue';

import { copyToClipboard, delay } from '../../util';

import TranslationMixin from './TranslationMixin';

export default defineComponent({
  mixins: [TranslationMixin],
  data() {
    return {
      targetElement: null as Nullable<EventTarget>,
      wasAddressCopied: false,
    };
  },
  methods: {
    async handleCopyAddress(this: any, address: string, event?: PointerEvent | MouseEvent): Promise<void> {
      if (event) {
        event.stopImmediatePropagation();
        this.targetElement = event.target;
        if (this.targetElement) {
          this.targetElement.addEventListener('mouseleave', this.handleMouseleaveListener);
        }
      }
      await copyToClipboard(address);
      this.wasAddressCopied = true;
      await delay(1000);
    },
    async handleMouseleaveListener(this: any): Promise<void> {
      await delay(500);
      this.wasAddressCopied = false;
      if (this.targetElement) {
        this.targetElement.removeEventListener('mouseleave', this.handleMouseleaveListener);
      }
    },
    copyTooltip(this: any, tooltipCopyValue?: string): string {
      // TODO: [UI-LIB] add key property with the content value for tooltip in buttons to rerender it each time
      if (!this.wasAddressCopied) {
        return tooltipCopyValue ? this.t('copyWithValue', { value: tooltipCopyValue }) : this.t('assets.receive');
      }
      return tooltipCopyValue ? this.t('copiedWithValue', { value: tooltipCopyValue }) : this.t('assets.copied');
    },
  },
});
