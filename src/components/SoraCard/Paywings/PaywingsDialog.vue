<template>
  <dialog-base :visible.sync="isVisible" class="x1-dialog"> PW view </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { getter, state } from '@/store/decorators';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { loadScript, unloadScript } from 'vue-plugin-load-script';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class PaywingsDialog extends Mixins(mixins.DialogMixin, mixins.LoadingMixin) {
  @state.soraCard.euroBalance private euroBalance!: string;
  @getter.soraCard.accountAddress accountAddress!: string;

  loadingPaywings = true;

  @Watch('isVisible', { immediate: true })
  private handleVisibleStateChange(visible: boolean): void {
    if (visible) {
      this.loadPaywings();
    } else {
      this.unloadPaywings();
      this.loadingPaywings = true;
    }
  }

  loadPaywings(): void {
    loadScript('https://checkout.paywings.io/HostedFields/custom/js/client.min.js').then(() => {});
  }

  unloadPaywings(): void {
    unloadScript('https://checkout.paywings.io/HostedFields/custom/js/client.min.js').catch(() => {});
  }
}
</script>

<style lang="scss">
.x1-dialog .el-dialog {
  .wrapper {
    min-height: 420px;
  }
}

#pw-creditcard-form {
  border: 1px solid #bbb;
  padding: 0.5rem;
  background-color: #fff;
}
.input-container {
  height: 1.5rem;
  border-bottom: 1px solid grey;
  margin-bottom: 1rem;
}
</style>
