import { Vue, Options } from 'vue-property-decorator';

import { delay } from '@/utils';

@Options({})
export default class NetworkFeeDialogMixin extends Vue {
  showWarningFeeDialog = false;
  isWarningFeeDialogConfirmed = false;

  confirmNetworkFeeWariningDialog(): void {
    this.isWarningFeeDialogConfirmed = true;
  }

  openWarningFeeDialog(): void {
    this.showWarningFeeDialog = true;
  }

  async waitOnFeeWarningConfirmation(ms = 500): Promise<void> {
    if (!this.showWarningFeeDialog) return;

    await delay(ms);
    return await this.waitOnFeeWarningConfirmation();
  }
}
