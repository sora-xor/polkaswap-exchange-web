<template>
  <dialog-base :visible.sync="isVisible" :showCloseButton="false">
    <network-fee-warning class="network-fee" :fee="fee" @confirm="handleConfirm" />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component({
  components: {
    DialogBase: components.DialogBase,
    NetworkFeeWarning: components.NetworkFeeWarning,
  },
})
export default class NetworkFeeWarningDialog extends Mixins(mixins.DialogMixin, TranslationMixin) {
  @Prop({ type: String }) readonly fee!: string;

  handleConfirm(): void {
    this.closeDialog();
    this.$emit('confirm');
  }
}
</script>

<style lang="scss" scoped>
.network-fee {
  margin-top: -18px;
  margin-bottom: var(--s-size-mini);
}
</style>
