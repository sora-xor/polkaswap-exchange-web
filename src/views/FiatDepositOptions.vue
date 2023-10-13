<template>
  <div class="container">
    <div class="pay-options">
      <div class="pay-options__option pay-options-moonpay">
        <moonpay-logo :theme="libraryTheme" />
        <h4>{{ t('fiatPayment.moonpayTitle') }}</h4>
        <span>{{ t('fiatPayment.moonpayDesc') }}</span>
        <s-button type="primary" @click="openMoonpayDialog">{{ moonpayTextBtn }}</s-button>
      </div>
      <div v-if="x1Enabled" class="pay-options__option pay-options-x1">
        <x1ex-logo :theme="libraryTheme" />
        <h4>{{ t('fiatPayment.x1Title') }}</h4>
        <span>{{ t('fiatPayment.x1Desc') }}</span>
        <s-button type="primary" @click="openX1">{{ x1TextBtn }}</s-button>
      </div>
      <div v-if="isLoggedIn" class="pay-options__history-btn" @click="openFiatTxHistory">
        <span>{{ t('fiatPayment.historyBtn') }}</span>
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

import type { EthHistory } from '@sora-substrate/util/build/bridgeProxy/eth/types';
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
  @state.moonpay.bridgeTransactionData private bridgeTransactionData!: Nullable<EthHistory>;
  @state.moonpay.startBridgeButtonVisibility private startBridgeButtonVisibility!: boolean;

  @getter.libraryTheme libraryTheme!: Theme;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.settings.moonpayEnabled moonpayEnabled!: boolean;
  @getter.settings.x1Enabled x1Enabled!: boolean;

  @mutation.moonpay.setDialogVisibility private setMoonpayVisibility!: (flag: boolean) => void;

  showX1Dialog = false;
  showErrorInfoBanner = false;

  get hasPendingTx(): boolean {
    // TODO: add localStorage savings in case user closes tab and returns
    // (combine with X1 history API)
    return this.startBridgeButtonVisibility && !!this.bridgeTransactionData;
  }

  get computedCounterClass(): string {
    const baseClass = ['pay-options__purchase-count'];
    if (this.hasPendingTx) baseClass.push('pay-options__purchase-count--pending');
    return baseClass.join(' ');
  }

  get moonpayTextBtn(): string {
    return !this.isSoraAccountConnected ? this.t('connectWalletText') : this.t('fiatPayment.moonpayTitle');
  }

  get x1TextBtn(): string {
    return !this.isSoraAccountConnected ? this.t('connectWalletText') : this.t('fiatPayment.x1Btn');
  }

  openFiatTxHistory(): void {
    goTo(PageNames.FiatTxHistory);
  }

  openX1(): void {
    if (!this.isSoraAccountConnected) {
      return this.connectSoraWallet();
    }

    this.showX1Dialog = true;
  }

  showErrorMessage(): void {
    this.showErrorInfoBanner = true;
  }

  async openMoonpayDialog(): Promise<void> {
    if (!this.moonpayEnabled) {
      return this.showErrorMessage();
    }

    if (!this.isSoraAccountConnected) {
      return this.connectSoraWallet();
    }

    if (!this.evmAddress) {
      await this.connectEvmWallet();
    }

    this.setMoonpayVisibility(true);
  }

  beforeDestroy(): void {
    this.disconnectExternalNetwork();
  }
}
</script>

<style lang="scss" scoped>
.pay-options {
  &__option {
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    align-items: center;
    margin-bottom: $basic-spacing;
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
    font-size: var(--s-font-size-medium);
    border-radius: var(--s-border-radius-small);
    padding: 18px $basic-spacing;
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
    margin-right: $basic-spacing / 2;

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
