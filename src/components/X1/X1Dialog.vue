<template>
  <dialog-base :visible.sync="isVisible" class="x1-dialog">
    <div class="wrapper" v-loading="loadingX1">
      <!-- Prod widget -->
      <div id="sprkwdgt-WUQBA5U2"></div>
      <!-- Dev widget (XOR not supported) -->
      <div
        id="sprkwdgt-WYL6QBNC"
        :data-address="accountAddress"
        data-from-currency="EUR"
        :data-from-amount="restEuroToDeposit"
        data-locale="en"
        data-hide-buy-more-button="true"
        data-hide-try-again-button="false"
        data-payload="{ session_id: 16 }"
      ></div>
    </div>
  </dialog-base>
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
export default class X1Dialog extends Mixins(mixins.DialogMixin, mixins.LoadingMixin) {
  @state.soraCard.euroBalance private euroBalance!: string;
  @getter.soraCard.accountAddress accountAddress!: string;

  loadingX1 = false;

  @Watch('isVisible', { immediate: true })
  private handleVisibleStateChange(visible: boolean): void {
    if (visible) {
      this.loadX1();
    } else {
      this.unloadX1();
      this.loadingX1 = true;
    }
  }

  get restEuroToDeposit(): number {
    return 100 - parseInt(this.euroBalance, 10);
  }

  loadX1(): void {
    // TODO: subtitute prod widget URL https://x1ex.com/widgets/sdk.js when ready
    loadScript('https://dev.x1ex.com/widgets/sdk.js')
      .then((data) => {
        setTimeout(() => {
          this.loadingX1 = false;
        }, 1500);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  unloadX1(): void {
    unloadScript('https://dev.x1ex.com/widgets/sdk.js').catch(() => {});
  }
}
</script>

<style lang="scss">
.x1-dialog .el-dialog {
  .wrapper {
    min-height: 420px;
  }
}
</style>
