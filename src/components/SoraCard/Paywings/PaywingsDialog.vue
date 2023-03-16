<template>
  <dialog-base v-loading="loading" :visible.sync="isVisible" class="pw-dialog">
    <div class="wrapper">To be implemented</div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { loadScript, unloadScript } from 'vue-plugin-load-script';

import { getter, state } from '@/store/decorators';

// TODO: Set up widget for payment
@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class PaywingsDialog extends Mixins(mixins.DialogMixin, mixins.LoadingMixin) {
  @state.soraCard.euroBalance private euroBalance!: string;
  @getter.soraCard.accountAddress accountAddress!: string;

  @Watch('isVisible', { immediate: true })
  private handleVisibleStateChange(visible: boolean): void {
    if (visible) {
      this.loadPaywings();
    } else {
      this.unloadPaywings();
    }
  }

  private loadPaywings(): void {
    loadScript('https://checkout.paywings.io/HostedFields/custom/js/client.min.js').then(() => {});
  }

  private unloadPaywings(): void {
    unloadScript('https://checkout.paywings.io/HostedFields/custom/js/client.min.js').catch(() => {});
  }
}
</script>

<style lang="scss">
.pw-dialog .el-dialog {
  .wrapper {
    min-height: 420px;
  }
}
</style>
