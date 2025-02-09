<template>
  <dialog-base :visible.sync="isVisible" :append-to-body="appendToBody" :modal-append-to-body="appendToBody">
    <network-fee-warning class="network-fee" :fee="fee" :symbol="symbol" :payoff="payoff" @confirm="handleConfirm" />
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { ANLOG_TIMECHAIN } from '@/consts/analog';

@Component({
  components: {
    DialogBase: components.DialogBase,
    NetworkFeeWarning: components.NetworkFeeWarning,
  },
})
export default class NetworkFeeWarningDialog extends Mixins(mixins.DialogMixin, TranslationMixin) {
  @Prop({ type: String }) readonly fee!: string;
  @Prop({ type: String, default: ANLOG_TIMECHAIN.symbol }) readonly symbol!: string;
  @Prop({ type: Boolean, default: true }) readonly payoff!: boolean;
  @Prop({ type: Boolean, default: true }) readonly appendToBody!: boolean;

  handleConfirm(): void {
    this.closeDialog();
    this.$emit('confirm');
  }
}
</script>
