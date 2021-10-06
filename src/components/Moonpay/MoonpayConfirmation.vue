<template>
  <confirm-bridge-transaction-dialog
    :confirm-button-text="t('moonpay.buttons.transfer')"
    v-bind="{
      ...modalData,
      ...$attrs,
    }"
    v-on="$listeners"
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
import { Getter, State } from 'vuex-class';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import MoonpayLogo from '@/components/logo/Moonpay.vue';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';

import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';
import type { Asset, Whitelist } from '@sora-substrate/util';

@Component({
  components: {
    MoonpayLogo,
    ConfirmBridgeTransactionDialog: lazyComponent(Components.ConfirmBridgeTransactionDialog),
  },
})
export default class MoonpayConfirmation extends Mixins(TranslationMixin) {
  @State((state) => state.moonpay.bridgeTransactionData) bridgeTransactionData!: any; // TODO: type

  @Getter libraryTheme!: Theme;
  @Getter whitelist!: Whitelist;
  @Getter('isValidNetworkType', { namespace: 'web3' }) isValidNetworkType!: boolean;

  get modalData(): any {
    return {
      isSoraToEvm: false,
      amount: this.bridgeTransactionData?.amount,
      asset: this.whitelist[this.bridgeTransactionData?.assetAddress],
      evmNetwork: this.bridgeTransactionData?.externalNetwork,
      evmNetworkFee: this.bridgeTransactionData?.ethereumNetworkFee,
      soraNetworkFee: this.bridgeTransactionData?.soraNetworkFee,
      isValidNetworkType: this.isValidNetworkType,
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
