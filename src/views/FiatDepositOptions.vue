<template>
  <div class="container">
    <div class="pay-options">
      <div class="pay-options__option pay-options-moonpay">
        <moonpay-logo :theme="libraryTheme" />
        <h4>Buy ETH via MoonPay</h4>
        <span>Purchase ETH tokens on Ethereum and transfer them to SORA network via the bridge</span>
        <s-button type="primary" @click="openMoonpayDialog">{{ 'BUY ETH VIA MOONPAY' }}</s-button>
      </div>
      <div class="pay-options__option pay-options-x1">
        <x1ex-logo :theme="libraryTheme" />
        <h4>Buy XOR with your card</h4>
        <span>Purchase XOR tokens with your debit or credit card.</span>
        <s-button type="primary" @click="openX1">{{ 'BUY XOR WITH CARD' }}</s-button>
      </div>
      <div class="pay-options__history-btn" @click="openFiatTxHistory">
        <span>My Purchases</span>
        <div>
          <span :class="computedCounterClass">{{ hasPendingTx ? 1 : 0 }}</span>
          <s-icon name="arrows-chevron-right-rounded-24" size="18" />
        </div>
      </div>
    </div>
    <x1-dialog @error="showErrorMessage" :visible.sync="showX1Dialog" />
    <template v-if="moonpayEnabled">
      <moonpay />
      <moonpay-notification />
      <moonpay-confirmation />
    </template>
    <payment-error :visible.sync="showErrorInfoBanner" />
  </div>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import WalletConnectMixin from '../components/mixins/WalletConnectMixin';
import MoonpayLogo from '../components/shared/Logo/Moonpay.vue';
import X1exLogo from '../components/shared/Logo/X1ex.vue';
import { Components, PageNames } from '../consts';
import { goTo, lazyComponent } from '../router';
import { mutation, state, getter } from '../store/decorators';

import type { BridgeHistory } from '@sora-substrate/util';
import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

@Component({
  components: {
    DialogBase: components.DialogBase,
    X1Dialog: lazyComponent(Components.X1Dialog),
    Moonpay: lazyComponent(Components.Moonpay),
    MoonpayNotification: lazyComponent(Components.MoonpayNotification),
    MoonpayConfirmation: lazyComponent(Components.MoonpayConfirmation),
    PaymentError: lazyComponent(Components.PaymentErrorDialog),
    MoonpayLogo,
    X1exLogo,
  },
})
export default class FiatTxHistory extends Mixins(mixins.TranslationMixin, WalletConnectMixin) {
  @state.settings.payOptionsVisibility private payOptionsVisibility!: boolean;
  @state.moonpay.bridgeTransactionData private bridgeTransactionData!: Nullable<BridgeHistory>;
  @state.moonpay.startBridgeButtonVisibility private startBridgeButtonVisibility!: boolean;

  @getter.libraryTheme libraryTheme!: Theme;
  @getter.settings.moonpayEnabled moonpayEnabled!: boolean;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;

  @mutation.settings.setPayOptionsVisibility private setPayOptionsVisibility!: (flag: boolean) => void;
  @mutation.moonpay.setDialogVisibility private setMoonpayVisibility!: (flag: boolean) => void;

  showX1Dialog = false;
  showErrorInfoBanner = false;

  get visibility(): boolean {
    return this.payOptionsVisibility;
  }

  set visibility(flag: boolean) {
    this.setPayOptionsVisibility(flag);
  }

  get hasPendingTx(): boolean {
    // TODO: add localStorage savings in case user closes tab and returns
    // combine with X1 history API
    // return true;
    return this.startBridgeButtonVisibility && !!this.bridgeTransactionData;
  }

  get computedCounterClass(): string {
    const baseClass = ['pay-options__purchase-count'];
    if (this.hasPendingTx) baseClass.push('pay-options__purchase-count--pending');
    return baseClass.join(' ');
  }

  openFiatTxHistory(): void {
    this.visibility = false;
    goTo(PageNames.FiatTxHistory);
  }

  openX1(): void {
    this.showX1Dialog = true;
  }

  showErrorMessage(): void {
    console.log('called');

    this.showErrorInfoBanner = true;
  }

  async openMoonpayDialog(): Promise<void> {
    if (!this.moonpayEnabled) {
      console.log('Moonpay not enabled');

      return this.showErrorMessage();
    }

    if (!this.isSoraAccountConnected) {
      return this.connectInternalWallet();
    }

    await this.checkConnectionToExternalAccount(async () => {
      this.setMoonpayVisibility(true);
    });
  }
}
</script>

<style lang="scss" scoped>
.container {
  min-width: 500px;
}
.pay-options {
  &__option {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    align-items: center;
    margin-bottom: 16px;
    padding: 20px 0 20px 0;
    height: 240px;
    background: var(--s-color-utility-body);
    box-shadow: $button-custom-shadow;
    border-radius: 24px;
    text-align: center;

    span {
      width: 70%;
    }

    svg {
      width: 100px;
    }

    button {
      width: 85%;
    }
  }

  &__history-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--s-color-utility-body);
    font-size: 16px;
    border-radius: 24px;
    padding: 18px 16px;
    color: var(--s-color-base-content-secondary);
    width: 102%;
    i {
      color: var(--s-color-base-content-tertiary);
    }

    &:hover {
      cursor: pointer;
    }

    &:hover i {
      color: var(--s-color-base-content-secondary);
    }
  }
  &__purchase-count {
    background: var(--s-color-utility-surface);
    box-shadow: var(--s-shadow-element);
    border-radius: 30px;
    padding: 1px 12px;
    margin-right: 8px;

    &--pending {
      background: var(--s-color-base-content-secondary);
      color: var(--s-color-base-on-accent);
      box-shadow: none;
    }
  }
}

.s-icon-arrows-chevron-right-rounded-24::before {
  position: relative;
  top: 2px;
}
</style>
