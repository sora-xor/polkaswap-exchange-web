<template>
  <div class="confirm-finishing-dialog">
    <dialog-base :visible.sync="isVisible" custom-class="dialog__fix-issues">
      <div class="route-assets__page-header-title">Confirm finishing routing despite transaction issues</div>
      <div class="route-assets__page-header-description">
        {{
          `If there is a certain transaction issue and re-running it doesn’t help, you can finish the routing process despite transaction issues.`
        }}
      </div>
      <div class="buttons-container">
        <s-button type="primary" class="s-typography-button--big browse-button" @click.stop="onConfirmClick">
          {{ 'I CONFIRM, FINISH ROUTING' }}
        </s-button>
        <s-button
          type="secondary"
          class="s-typography-button--big browse-button"
          @click.stop="
            () => {
              $emit('update:visible', false);
            }
          "
        >
          {{ 'Cancel' }}
        </s-button>
      </div>
    </dialog-base>
  </div>
</template>

<script lang="ts">
import { mixins, components } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';
@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class ConfirmFinishingDialog extends Mixins(mixins.TransactionMixin, mixins.DialogMixin) {
  onConfirmClick() {
    this.$emit('onConfirmClick');
  }
}
</script>

<style lang="scss">
.dialog__confirm-finishing {
  .el-dialog {
    max-width: 468px;
    &__body {
      > div > div {
        margin-bottom: $inner-spacing-medium;
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.browse-button {
  width: 100%;
  //   margin: 24px 0 16px 0;
  margin-right: 0;
  margin-left: 0;
}

.buttons-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
