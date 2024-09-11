<template>
  <dialog-base :visible.sync="isVisible">
    <network-fee-warning class="network-fee" :fee="fee" :symbol="symbol" :payoff="payoff" @confirm="handleConfirm" />
  </dialog-base>
</template>

<script lang="ts">
import { KnownSymbols } from '@sora-substrate/sdk/build/assets/consts';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component({
  components: {
    DialogBase: components.DialogBase,
    NetworkFeeWarning: components.NetworkFeeWarning,
  },
})
export default class NetworkFeeWarningDialog extends Mixins(mixins.DialogMixin, TranslationMixin) {
  @Prop({ type: String }) readonly fee!: string;
  @Prop({ type: String, default: KnownSymbols.XOR }) readonly symbol!: string;
  @Prop({ type: Boolean, default: true }) readonly payoff!: boolean;

  handleConfirm(): void {
    this.closeDialog();
    this.$emit('confirm');
  }
}
</script>
