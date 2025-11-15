import { Options, mixins as vueMixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { state } from '@/store/decorators';

@Options({})
export default class ConfirmDialogMixin extends vueMixins(TranslationMixin) {
  @state.wallet.transactions.isConfirmTxDialogDisabled public isConfirmTxDisabled!: boolean;

  confirmDialogVisibility = false;

  openConfirmDialog(): void {
    this.confirmDialogVisibility = true;
  }

  confirmOrExecute(signTxMethod: FnWithoutArgs | AsyncFnWithoutArgs): void {
    if (this.isConfirmTxDisabled) {
      signTxMethod();
    } else {
      this.openConfirmDialog();
    }
  }
}
