<template>
  <div class="swap-dialog">
    <dialog-base :visible.sync="isVisible" :title="'Swap'" custom-class="dialog__swap">
      <Swap />
    </dialog-base>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import Swap from '@/views/Swap.vue';
@Component({
  components: {
    DialogBase: components.DialogBase,
    Swap,
  },
})
export default class SwapDialog extends Mixins(mixins.TransactionMixin, mixins.DialogMixin) {}
</script>

<style lang="scss">
.dialog__swap {
  .el-dialog {
    max-width: 500px;
    padding: 20px;
    &__body {
      padding: 0 !important;
    }
  }
  .container {
    box-shadow: none;
  }

  .page-header {
    display: none;
  }
}
</style>

<style lang="scss" scoped>
.browse-button {
  width: 100%;
  margin-bottom: 16px;
  margin-top: 24px;
}
</style>
