<template>
  <dialog-base :visible.sync="visibility" class="moonpay-dialog">
    <template #title>
      <moonpay-logo :theme="libraryTheme" />
    </template>
    <widget :src="widgetUrl" />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { components } from '@soramitsu/soraneo-wallet-web';
import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';
import type { WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';

import MoonpayLogo from '@/components/shared/Logo/Moonpay.vue';
import MoonpayBridgeInitMixin from './BridgeInitMixin';

import { getCssVariableValue } from '@/utils';
import { lazyComponent } from '@/router';
import { Components } from '@/consts';
import { getter, state, mutation, action } from '@/store/decorators';
import { MoonpayNotifications } from '@/components/pages/Moonpay/consts';

import type { MoonpayTransaction } from '@/utils/moonpay';

@Component({
  components: {
    DialogBase: components.DialogBase,
    MoonpayLogo,
    Widget: lazyComponent(Components.Widget),
  },
})
export default class Moonpay extends Mixins(MoonpayBridgeInitMixin) {
  widgetUrl = '';
  transactionsPolling!: FnWithoutArgs;

  @getter.wallet.account.account private account!: WALLET_TYPES.PolkadotJsAccount;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.libraryTheme libraryTheme!: Theme;

  @state.moonpay.transactions private transactions!: Array<MoonpayTransaction>;
  @state.moonpay.pollingTimestamp private pollingTimestamp!: number;
  @state.moonpay.dialogVisibility private dialogVisibility!: boolean;

  @mutation.moonpay.setDialogVisibility private setDialogVisibility!: (flag: boolean) => void;
  @action.moonpay.createTransactionsPolling private createTransactionsPolling!: () => Promise<FnWithoutArgs>;

  @Watch('isLoggedIn', { immediate: true })
  private handleLoggedInStateChange(isLoggedIn: boolean): void {
    if (!isLoggedIn) {
      this.stopPollingMoonpay();
    }
  }

  @Watch('visibility', { immediate: true })
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

  get lastCompletedTransaction(): Nullable<MoonpayTransaction> {
    if (this.pollingTimestamp === 0) return undefined;

    return this.transactions.find(
      (tx) => Date.parse(tx.createdAt) >= this.pollingTimestamp && tx.status === 'completed'
    );
  }

  get visibility(): boolean {
    return this.dialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setDialogVisibility(flag);
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
    this.setDialogVisibility(false);
    this.stopPollingMoonpay();
    this.updateWidgetUrl();

    // show notification what tokens are purchased
    await this.showNotification(MoonpayNotifications.Success);
    await this.prepareMoonpayTxForBridgeTransfer(transaction, true);
  }
}
</script>
