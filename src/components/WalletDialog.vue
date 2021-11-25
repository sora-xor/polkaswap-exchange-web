<template>
  <dialog-base :visible.sync="isVisible" custom-class="wallet-dialog-wrapper">
    <sora-wallet v-loading="parentLoading" class="wallet-dialog" />
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';

import DialogMixin from './mixins/DialogMixin';
import DialogBase from './DialogBase.vue';

@Component({
  components: {
    DialogBase,
  },
})
export default class WalletDialog extends Mixins(DialogMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean;
}
</script>

<style lang="scss">
.wallet-dialog-wrapper.dialog-wrapper .el-dialog > .el-dialog__body .dialog-content {
  padding: 0;
}
</style>
