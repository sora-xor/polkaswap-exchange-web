<template>
  <dialog-base :visible.sync="isVisible" class="x1-dialog">
    <div v-if="showTestEnvDisclaimer" class="disclaimer">
      <div class="disclaimer-warning-icon">
        <s-icon name="notifications-alert-triangle-24" size="42px" />
      </div>
      <div>
        <p class="disclaimer__text">DO NOT ENTER YOUR REAL CARD NUMBER. This is a test environment.</p>
        <p class="disclaimer__text">Please, use the following card details:</p>
        <ul>
          <li>Card number: 4012 0000 0006 0085</li>
          <li>Card CVV: 123</li>
          <li>Card expiration date: Input any date</li>
          <li>Card owner name: Input any name & surname</li>
        </ul>
      </div>
    </div>
    <div class="wrapper" v-loading="loadingX1">
      <div
        v-if="!showErrorInfoBanner"
        :id="widgetId"
        data-from-currency="EUR"
        :data-address="accountAddress"
        :data-from-amount="restEuroToDeposit"
        :data-hide-buy-more-button="true"
        :data-hide-try-again-button="false"
        data-locale="en"
      />
      <div v-else class="x1-error-info-banner">
        <s-icon class="x1-error-info-banner__icon" name="basic-clear-X-24" size="64px" />
        <h4 class="x1-error-info-banner__header">The payment widget is currently unavailable</h4>
        <p class="x1-error-info-banner__text">
          Apologies for the inconvenience. We're working diligently to resolve this. Please, try again later.
        </p>
        <s-button
          class="x1-error-info-banner__btn s-typography-button--large"
          type="primary"
          :disabled="loading"
          @click="closeDialog"
        >
          {{ t('browserNotificationDialog.agree') }}
        </s-button>
      </div>
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins, WALLET_CONSTS, ScriptLoader } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import { getter, state } from '@/store/decorators';
import { X1Api, X1Widget } from '@/utils/x1';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class X1Dialog extends Mixins(mixins.DialogMixin, mixins.LoadingMixin, mixins.TranslationMixin) {
  @state.soraCard.euroBalance private euroBalance!: string;
  @state.wallet.settings.soraNetwork soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @getter.soraCard.accountAddress accountAddress!: string;

  X1Widget: X1Widget = { sdkUrl: '', widgetId: '' };
  showErrorInfoBanner = false;
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

  @Watch('soraNetwork', { immediate: true })
  private checkEnvCongig(value: Nullable<WALLET_CONSTS.SoraNetwork>): void {
    if (!value) {
      return; // if env config is not loaded
    }
    this.X1Widget = X1Api.getWidget(value);
  }

  get restEuroToDeposit(): number {
    return 100 - parseInt(this.euroBalance, 10);
  }

  get widgetId(): string {
    return this.X1Widget.widgetId;
  }

  get isMainnet(): boolean {
    return this.soraNetwork === WALLET_CONSTS.SoraNetwork.Prod;
  }

  get showTestEnvDisclaimer(): boolean {
    return !this.isMainnet && !this.showErrorInfoBanner;
  }

  async loadX1(): Promise<void> {
    try {
      console.info('this.X1Widget.sdkUrl', this.X1Widget.sdkUrl);
      await ScriptLoader.load(this.X1Widget.sdkUrl, false);
    } catch {
      this.showErrorInfoBanner = true;
      this.loadingX1 = false;
    } finally {
      this.loadingX1 = false;
    }
  }

  unloadX1(): void {
    // ScriptLoader.unload(this.X1Widget.sdkUrl, false);
  }
}
</script>

<style lang="scss">
.x1-dialog .el-dialog .wrapper {
  min-height: 320px;
  padding: $basic-spacing-medium;
  margin: -10px -20px -20px;
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
  margin-bottom: $inner-spacing-small;

  & &-warning-icon {
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
[design-system-theme='dark'] .disclaimer-warning-icon .s-icon-notifications-alert-triangle-24 {
  color: var(--s-color-base-content-primary);
}

.x1-error-info-banner {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;

  &__header {
    font-size: var(--s-heading3-font-size);
    font-weight: 500;
  }

  &__text {
    margin-top: var(--s-size-mini);
    line-height: var(--s-font-size-large);
    font-size: var(--s-font-size-medium);
    font-weight: 300;
    width: 67%;
  }

  &__icon {
    display: block;
    color: var(--s-color-status-error);
    width: var(--s-size-mini);
    margin: -20px 20px $basic-spacing 0;
  }

  &__btn {
    margin-top: var(--s-size-mini);
    width: 100%;
  }
}
</style>
