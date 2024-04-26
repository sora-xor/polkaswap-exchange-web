import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state } from '@/store/decorators';

@Component
export default class ConfirmDialogMixin extends Mixins(TranslationMixin) {
  @state.wallet.transactions.isConfirmTxDialogDisabled public isConfirmTxDisabled!: boolean;

  showConfirmDialog = false;

  openConfirmDialog(): void {
    this.showConfirmDialog = true;
  }

  confirmOrExecute(signTxMethod: FnWithoutArgs): void {
    if (this.isConfirmTxDisabled) {
      signTxMethod();
    } else {
      this.openConfirmDialog();
    }
  }
}
