<template>
  <dialog-base :visible.sync="isVisible" class="x1-dialog">
    <div class="wrapper" v-loading="loadingX1">
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
import { components, mixins } from '@soramitsu/soraneo-wallet-web';
import { loadScript, unloadScript } from 'vue-plugin-load-script';
import { getter, state } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class X1 extends Mixins(mixins.DialogMixin, mixins.LoadingMixin) {
  @state.soraCard.euroBalance private euroBalance!: string;
  @getter.soraCard.accountAddress accountAddress!: string;

  loadingX1 = true;

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
    loadScript('https://dev.x1ex.com/widgets/sdk.js')
      .then((data) => {
        setTimeout(() => {
          this.loadingX1 = false;
        }, 1000);
      })
      .catch((error) => {
        console.log(error);
      });
  }

  unloadX1(): void {
    unloadScript('https://dev.x1ex.com/widgets/sdk.js');
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
