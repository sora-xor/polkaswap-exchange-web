import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class ConfirmDialogMixin extends Mixins(TranslationMixin) {
  showConfirmDialog = false;

  openConfirmDialog(): void {
    this.showConfirmDialog = true;
  }
}
