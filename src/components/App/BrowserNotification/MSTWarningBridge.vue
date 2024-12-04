<template>
  <dialog-base class="browser-notification" title="MST Bridge" :visible.sync="isVisible">
    <div class="browser-notification-dialog">
      <p>Transfer from MST is not supported for now</p>
      <p>You could switch from MST or transfer to MST</p>
      <s-button
        type="primary"
        class="s-typography-button--large browser-notification-dialog__btn"
        :loading="loading"
        @click="agree"
      >
        Swith from MST
      </s-button>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { api, mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { mutation, state, action } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class AppBrowserMSTWarningBridge extends Mixins(
  TranslationMixin,
  mixins.DialogMixin,
  mixins.LoadingMixin
) {
  @mutation.wallet.account.setIsMstAddressExist setIsMstAddressExist!: (isExist: boolean) => void;
  @mutation.wallet.account.setIsMST setIsMST!: (isMST: boolean) => void;
  @mutation.wallet.account.syncWithStorage syncWithStorage!: () => void;
  @state.wallet.account.isMST isMST!: boolean;

  @action.wallet.account.afterLogin afterLogin!: () => void;

  agree(): void {
    this.closeDialog();
    api.mst.switchAccount(false);
    this.setIsMST(false);
    this.syncWithStorage();
    this.afterLogin();
  }
}
</script>

<style lang="scss" scoped>
.browser-notification-dialog {
  @include browser-notification-dialog;
  p {
    margin-bottom: 16px;
  }
}
</style>
