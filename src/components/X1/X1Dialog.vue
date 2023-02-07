<template>
  <dialog-base :visible.sync="isVisible" class="x1-dialog">
    <div v-if="soraNetwork !== WALLET_CONSTS.SoraNetwork.Prod" class="disclaimer">
      <div class="disclaimer-warning-icon">
        <s-icon name="notifications-alert-triangle-24" size="42px" />
      </div>
      <div>
        <p class="disclaimer__text">DO NOT ENTER your real card number. This is test environment.</p>
        <p class="disclaimer__text">Please, use the following ones:</p>
        <ul>
          <li>4012000000060085</li>
          <li>4066330000000004</li>
        </ul>
      </div>
    </div>
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

  WALLET_CONSTS = WALLET_CONSTS;

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

<style lang="scss" scoped>
.disclaimer {
  display: flex;
  width: 100%;
  height: auto;
  border-radius: 28px;
  background-color: var(--s-color-status-error-background);
  padding: $basic-spacing;
  margin-bottom: $basic-spacing / 2;
  color: var(--s-color-status-error);

  .disclaimer-warning-icon {
    margin-right: $basic-spacing;

    .s-icon-notifications-alert-triangle-24 {
      display: block;
      color: var(--s-color-status-error);
    }
  }

  ul {
    margin-top: $basic-spacing / 2;
  }
}
</style>
