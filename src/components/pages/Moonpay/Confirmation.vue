<template>
  <confirm-bridge-transaction-dialog
    :visible.sync="visibility"
    :confirm-button-text="t('moonpay.buttons.transfer')"
    v-bind="{
      ...modalData,
      ...$attrs,
    }"
    v-on="{
      confirm: startBridgeForMoonpayTransaction,
      ...$listeners,
    }"
  >
    <template #title>
      <moonpay-logo :theme="libraryTheme" />
    </template>
    <template #content-title>
      <div class="moonpay-confirmation__title">
        {{ t('moonpay.confirmations.txReady') }}
      </div>
    </template>
  </confirm-bridge-transaction-dialog>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import MoonpayBridgeInitMixin from '@/components/pages/Moonpay/BridgeInitMixin';
import MoonpayLogo from '@/components/shared/Logo/Moonpay.vue';
import { Components } from '@/consts';
import { lazyComponent } from '@/router';
import { getter, state } from '@/store/decorators';

import type { Whitelist } from '@sora-substrate/util/build/assets/types';
import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

@Component({
  components: {
    MoonpayLogo,
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog),
  },
})
export default class MoonpayConfirmation extends Mixins(MoonpayBridgeInitMixin) {
  @state.moonpay.confirmationVisibility private confirmationVisibility!: boolean;

  @getter.wallet.account.whitelist private whitelist!: Whitelist;
  @getter.web3.isValidNetwork private isValidNetwork!: boolean;
  @getter.libraryTheme libraryTheme!: Theme;

  get visibility(): boolean {
    return this.confirmationVisibility;
  }

  set visibility(flag: boolean) {
    this.setConfirmationVisibility(flag);
  }

  get modalData(): any {
    if (!this.bridgeTransactionData) return {};

    return {
      isSoraToEvm: false,
      amount: this.bridgeTransactionData.amount,
      asset: this.whitelist[this.bridgeTransactionData.assetAddress as string],
      network: this.bridgeTransactionData.externalNetwork,
      externalNetworkFee: this.bridgeTransactionData.externalNetworkFee,
      soraNetworkFee: this.bridgeTransactionData.soraNetworkFee,
      isValidNetwork: this.isValidNetwork,
    };
  }
}
</script>

<style lang="scss" scoped>
.moonpay-confirmation {
  &__title {
    font-size: var(--s-font-size-large);
    font-weight: 300;
    letter-spacing: var(--s-letter-spacing-mini);
    line-height: var(--s-line-height-small);
    margin-bottom: $inner-spacing-big;
  }
}
</style>
