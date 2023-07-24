<template>
  <dialog-base :visible.sync="isVisible">
    <simple-notification
      optional
      modal-content
      v-model="hidePopup"
      :button-text="t('confirmNextTxFailure.button')"
      @submit.native.prevent="handleConfirm"
    >
      <template #title>{{ t('confirmNextTxFailure.header') }}</template>
      <template #text>{{ t('exchange.lossWarning', { value }) }}</template>
    </simple-notification>
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { ZeroStringValue } from '@/consts';
import { mutation } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
    SimpleNotification: components.SimpleNotification,
  },
})
export default class SwapLossWarningDialog extends Mixins(mixins.DialogMixin, TranslationMixin) {
  @Prop({ default: ZeroStringValue, type: String }) readonly value!: string;

  @mutation.swap.setAllowLossPopup private setAllowLossPopup!: (flag: boolean) => void;

  hidePopup = false;

  async handleConfirm(): Promise<void> {
    this.setAllowLossPopup(!this.hidePopup);
    this.closeDialog();
    this.$emit('confirm');
  }
}
</script>
