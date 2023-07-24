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
      <template #text>
        You are going to lose {{ value }}% on your trade. We've detected a liquidity provision issue. This may lead to
        significant losses during token swaps. Please ensure there is adequate liquidity for your desired swap pair.
      </template>
    </simple-notification>
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { mutation } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
    SimpleNotification: components.SimpleNotification,
  },
})
export default class SwapLossWarningDialog extends Mixins(mixins.DialogMixin, TranslationMixin) {
  @Prop({ type: String }) readonly value!: string;

  @mutation.swap.setAllowLossPopup private setAllowLossPopup!: (flag: boolean) => void;

  hidePopup = false;

  async handleConfirm(): Promise<void> {
    this.setAllowLossPopup(!this.hidePopup);
    this.closeDialog();
    this.$emit('confirm');
  }
}
</script>
