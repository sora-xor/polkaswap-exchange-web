<template>
  <div class="container">
    <div class="pay-options">
      <div class="pay-options__option pay-options-moonpay">
        <moonpay-logo :theme="libraryTheme" />
        <h4>{{ t('fiatPayment.moonpayTitle') }}</h4>
        <span>{{ t('fiatPayment.moonpayDesc') }}</span>
        <s-button type="primary" @click="openMoonpayDialog">{{ moonpayTextBtn }}</s-button>
      </div>
      <div class="pay-options__option pay-options-cede">
        <cede-store-logo :theme="libraryTheme" />
        <h4>{{ t('fiatPayment.cedeStoreTitle', { value: TranslationConsts.CEX }) }}</h4>
        <span>{{
          t('fiatPayment.cedeStoreDesc', {
            value1: TranslationConsts.CEX,
            value2: TranslationConsts.Polkaswap,
            value3: TranslationConsts.CedeStore,
          })
        }}</span>
        <s-button type="primary" @click="openCedeDialog">{{
          t('fiatPayment.cedeStoreBtn', { value1: TranslationConsts.CEX, value2: TranslationConsts.CedeStore })
        }}</s-button>
      </div>
      <div v-if="isLoggedIn" class="pay-options__history-btn" @click="openFiatTxHistory">
        <span>{{ t('fiatPayment.historyBtn') }}</span>
        <div>
          <span :class="computedCounterClass">{{ +hasPendingTx }}</span>
          <s-icon name="arrows-chevron-right-rounded-24" size="18" />
        </div>
      </div>
    </div>
    <cede-store-dialog @error="showErrorMessage" :visible.sync="showCedeDialog" />
    <template v-if="moonpayEnabled">
      <moonpay />
      <moonpay-notification />
      <moonpay-confirmation />
      <select-provider-dialog />
    </template>
    <payment-error :visible.sync="showErrorInfoBanner" />
  </div>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import WalletConnectMixin from '../components/mixins/WalletConnectMixin';
import CedeStoreLogo from '../components/shared/Logo/CedeStore.vue';
import MoonpayLogo from '../components/shared/Logo/Moonpay.vue';
import { Components, PageNames, TranslationConsts } from '../consts';
import { goTo, lazyComponent } from '../router';
import { mutation, state, getter } from '../store/decorators';

import type { EthHistory } from '@sora-substrate/util/build/bridgeProxy/eth/types';
import type Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';

@Component({
  components: {
    DialogBase: components.DialogBase,
    Moonpay: lazyComponent(Components.Moonpay),
    MoonpayNotification: lazyComponent(Components.MoonpayNotification),
    MoonpayConfirmation: lazyComponent(Components.MoonpayConfirmation),
    PaymentError: lazyComponent(Components.PaymentErrorDialog),
    SelectProviderDialog: lazyComponent(Components.SelectProviderDialog),
    CedeStoreDialog: lazyComponent(Components.CedeStore),
    MoonpayLogo,
    CedeStoreLogo,
  },
})
export default class FiatTxHistory extends Mixins(mixins.TranslationMixin, WalletConnectMixin) {
  @state.moonpay.bridgeTransactionData private bridgeTransactionData!: Nullable<EthHistory>;
  @state.moonpay.startBridgeButtonVisibility private startBridgeButtonVisibility!: boolean;

  @getter.libraryTheme libraryTheme!: Theme;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.settings.moonpayEnabled moonpayEnabled!: boolean;

  @mutation.moonpay.setDialogVisibility private setMoonpayVisibility!: (flag: boolean) => void;

  TranslationConsts = TranslationConsts;

  showCedeDialog = false;
  showErrorInfoBanner = false;

  get hasPendingTx(): boolean {
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

  openFiatTxHistory(): void {
    goTo(PageNames.FiatTxHistory);
  }

  openCedeDialog(): void {
    if (!this.isSoraAccountConnected) {
      return this.connectSoraWallet();
    }

    this.showCedeDialog = true;
  }

  showErrorMessage(): void {
    this.showErrorInfoBanner = true;
  }

  openMoonpayDialog(): void {
    if (!this.moonpayEnabled) {
      return this.showErrorMessage();
    }

    if (!this.isSoraAccountConnected) {
      return this.connectSoraWallet();
    }

    if (!this.evmAddress) {
      return this.connectEvmWallet();
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
      width: 140px;
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
