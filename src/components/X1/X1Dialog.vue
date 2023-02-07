<template>
  <dialog-base :visible.sync="isVisible" class="x1-dialog">
    <div class="wrapper" v-loading="loadingX1">
      <div
        :id="widgetId"
        data-from-currency="EUR"
        :data-address="accountAddress"
        :data-from-amount="restEuroToDeposit"
        :data-hide-buy-more-button="true"
        :data-hide-try-again-button="false"
        data-locale="en"
      ></div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import { X1Api, X1Widget } from '@/utils/x1';
import { getter, state } from '@/store/decorators';

import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { loadScript, unloadScript } from 'vue-plugin-load-script';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class X1Dialog extends Mixins(mixins.DialogMixin, mixins.LoadingMixin) {
  @state.soraCard.euroBalance private euroBalance!: string;
  @state.wallet.settings.soraNetwork soraNetwork!: WALLET_CONSTS.SoraNetwork;
  @getter.soraCard.accountAddress accountAddress!: string;

  X1Widget: X1Widget = { sdkUrl: '', widgetId: '' };
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

  get widgetId(): string {
    return this.X1Widget.widgetId;
  }

  loadX1(): void {
    loadScript(this.X1Widget.sdkUrl)
      .then(() => {
        setTimeout(() => {
          this.loadingX1 = false;
        }, 1500);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  unloadX1(): void {
    unloadScript(this.X1Widget.sdkUrl).catch(() => {});
  }

  mounted(): void {
    this.X1Widget = X1Api.getWidget(this.soraNetwork);
  }
}
</script>

<style lang="scss">
.x1-dialog .el-dialog {
  .wrapper {
    min-height: 320px;
  }
}
</style>
