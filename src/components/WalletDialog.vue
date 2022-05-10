<template>
  <dialog-base :visible.sync="visibility" custom-class="wallet-dialog-wrapper">
    <sora-wallet v-loading="parentLoading" class="wallet-dialog" />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { state, mutation } from '@/store/decorators';

import DialogMixin from './mixins/DialogMixin';
import DialogBase from './DialogBase.vue';

@Component({
  components: {
    DialogBase,
  },
})
export default class WalletDialog extends Mixins(DialogMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean;

  @state.noir.walletDialogVisibility private walletDialogVisibility!: boolean;
  @mutation.noir.setWalletDialogVisibility private setWalletDialogVisibility!: (flag: boolean) => void;

  get visibility(): boolean {
    return this.walletDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setWalletDialogVisibility(flag);
  }
}
</script>

<style lang="scss">
.wallet-dialog-wrapper.dialog-wrapper .el-dialog > .el-dialog__body .cart__content {
  padding: 0;
}
</style>
