<template>
  <dialog-base :visible.sync="isVisible" :showCloseButton="false">
    <network-fee-warning class="network-fee" :fee="fee" @confirm="handleConfirm" />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { components } from '@soramitsu/soraneo-wallet-web';
import DialogBase from './DialogBase.vue';
import DialogMixin from './mixins/DialogMixin';
import TranslationMixin from '@/components/mixins/TranslationMixin';
@Component({
  components: {
    DialogBase,
    NetworkFeeWarning: components.NetworkFeeWarning,
  },
})
export default class NetworkFeeWarningDialog extends Mixins(DialogMixin, TranslationMixin) {
  @Prop({ type: String }) readonly fee!: string;

  async handleConfirm(): Promise<void> {
    this.closeDialog();
  }
}
</script>

<style lang="scss" scoped>
.network-fee {
  margin-top: -18px;
  margin-bottom: var(--s-size-mini);
}
</style>
