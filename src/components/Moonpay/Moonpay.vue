<template>
  <dialog-base :visible.sync="isVisible" class="moonpay-dialog">
    <template #title>
      <moonpay-logo :theme="libraryTheme" />
    </template>
    <moonpay-widget :src="widgetUrl" />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { Action, State, Getter } from 'vuex-class';
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

import DialogMixin from '@/components/mixins/DialogMixin';
import DialogBase from '@/components/DialogBase.vue';
import MoonpayLogo from '@/components/logo/Moonpay.vue';

import MoonpayBridgeInitMixin from './MoonpayBridgeInitMixin';

import { getCssVariableValue } from '@/utils';
import { MoonpayApi } from '@/utils/moonpay';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { MoonpayNotifications } from '@/components/Moonpay/consts';

import type { MoonpayTransaction } from '@/utils/moonpay';

const namespace = 'moonpay';

@Component({
  components: {
    DialogBase,
    MoonpayLogo,
    MoonpayWidget: lazyComponent(Components.MoonpayWidget),
  },
})
export default class Moonpay extends Mixins(DialogMixin, MoonpayBridgeInitMixin) {
  widgetUrl = '';
  transactionsPolling!: Function;

  @Getter account!: any;
  @Getter isLoggedIn!: boolean;
  @Getter libraryTheme!: Theme;
  @Getter('lastCompletedTransaction', { namespace }) lastCompletedTransaction!: MoonpayTransaction;

  @State((state) => state[namespace].api) moonpayApi!: MoonpayApi;
  @State((state) => state[namespace].pollingTimestamp) pollingTimestamp!: number;
  @State((state) => state[namespace].notificationVisibility) notificationVisibility!: boolean;
  @State((state) => state.settings.language) language!: string;

  @Action('setConfirmationVisibility', { namespace }) setConfirmationVisibility!: (flag: boolean) => Promise<void>;
  @Action('setNotificationVisibility', { namespace }) setNotificationVisibility!: (flag: boolean) => Promise<void>;
  @Action('setNotificationKey', { namespace }) setNotificationKey!: (key: string) => Promise<void>;
  @Action('createTransactionsPolling', { namespace }) createTransactionsPolling!: () => Promise<Function>;
  @Action('setBridgeTransactionData', { namespace: 'moonpay' }) setBridgeTransactionData!: (
    data?: any,
    startBridgeButtonVisibility?: boolean // TODO: type
  ) => Promise<void>;

  @Watch('isLoggedIn', { immediate: true })
  private handleLoggedInStateChange(isLoggedIn: boolean): void {
    if (!isLoggedIn) {
      this.stopPollingMoonpay();
    }
  }

  @Watch('isVisible', { immediate: true })
  private handleVisibleStateChange(visible: boolean): void {
    if (visible && !this.pollingTimestamp) {
      this.startPollingMoonpay();
    }
  }

  @Watch('language')
  @Watch('libraryTheme')
  private handleLanguageChange(): void {
    if (!this.pollingTimestamp) {
      this.updateWidgetUrl();
    }
  }

  @Watch('lastCompletedTransaction')
  private async handleLastTransaction(
    transaction: MoonpayTransaction,
    prevTransaction: MoonpayTransaction
  ): Promise<void> {
    if (!transaction || (prevTransaction && prevTransaction.id === transaction.id)) return;

    await this.prepareBridgeForTransfer(transaction);
  }

  async created(): Promise<void> {
    this.withApi(() => {
      this.initMoonpayApi(); // MoonpayBridgeInitMixin
      this.updateWidgetUrl();
    });
  }

  beforeDestroy(): void {
    this.stopPollingMoonpay();
  }

  private createMoonpayWidgetUrl(): string {
    return this.moonpayApi.createWidgetUrl({
      colorCode: getCssVariableValue('--s-color-theme-accent'),
      externalTransactionId: this.account.address,
      language: this.language,
    });
  }

  private updateWidgetUrl(): void {
    this.widgetUrl = '';

    const url = this.createMoonpayWidgetUrl();

    // to force rerender iframe between vdom updates
    setTimeout(() => {
      this.widgetUrl = url;
    });
  }

  private async startPollingMoonpay(): Promise<void> {
    console.info('Moonpay: start polling to get user transactions');
    this.transactionsPolling = await this.createTransactionsPolling();
  }

  private stopPollingMoonpay(): void {
    console.info('Moonpay: stop polling');
    if (typeof this.transactionsPolling === 'function') {
      this.transactionsPolling();
    }
  }

  private async prepareBridgeForTransfer(transaction: MoonpayTransaction): Promise<void> {
    try {
      this.closeDialog(); // DialogMixin
      this.stopPollingMoonpay();
      this.updateWidgetUrl();

      // show notification what tokens are purchased
      await this.showNotification(MoonpayNotifications.Success);
      // create bridge transaction data
      const bridgeTransactionData = await this.prepareBridgeHistoryItemDataForMoonpayTx(transaction); // MoonpayBridgeInitMixin

      // show notification for transfer to Sora
      await this.setNotificationVisibility(false);
      await this.setBridgeTransactionData(bridgeTransactionData, true);
      await this.setConfirmationVisibility(true);
    } catch (error) {
      await this.handleBridgeInitError(error);
    }
  }
}
</script>

<style lang="scss">
.dialog-wrapper.moonpay-dialog {
  .el-dialog .el-dialog__body {
    padding: $inner-spacing-mini $inner-spacing-big $inner-spacing-big;
  }
}
</style>
