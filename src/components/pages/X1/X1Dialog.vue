<template>
  <dialog-base :visible.sync="isVisible" class="x1-dialog">
    <template #title>
      <x1ex-logo :theme="libraryTheme" />
    </template>
    <div class="wrapper" v-loading="loadingX1">
      <div
        :id="widgetId"
        data-from-currency="EUR"
        :data-address="accountAddress"
        :data-from-amount="restEuroToDeposit"
        :data-hide-buy-more-button="true"
        :data-hide-try-again-button="false"
        data-locale="en"
      />
    </div>
  </dialog-base>
</template>

<script lang="ts">
import { components, mixins, WALLET_CONSTS, ScriptLoader } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import X1exLogo from '../../../components/shared/Logo/X1ex.vue';
import { getter, state } from '../../../store/decorators';
import { X1Api, X1Widget } from '../../../utils/x1';

import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

@Component({
  components: {
    DialogBase: components.DialogBase,
    X1exLogo,
  },
})
export default class X1Dialog extends Mixins(mixins.DialogMixin, mixins.LoadingMixin, mixins.TranslationMixin) {
  @state.soraCard.euroBalance private euroBalance!: string;
  @state.wallet.settings.soraNetwork soraNetwork!: WALLET_CONSTS.SoraNetwork;

  @getter.soraCard.accountAddress accountAddress!: string;
  @getter.settings.x1Enabled x1Enabled!: boolean;
  @getter.libraryTheme libraryTheme!: Theme;

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

  async loadX1(): Promise<void> {
    try {
      await ScriptLoader.load(this.X1Widget.sdkUrl, false);
    } catch {
      this.closeWidget(true);
    } finally {
      setTimeout(() => {
        this.loadingX1 = false;
      }, 1500);
    }
  }

  unloadX1(): void {
    ScriptLoader.unload(this.X1Widget.sdkUrl, false);
  }

  closeWidget(error = false): void {
    this.loadingX1 = false;
    this.unloadX1();
    this.closeDialog();
    if (error) {
      this.$emit('error');
    }
  }

  mounted(): void {
    if (!this.x1Enabled) this.closeWidget();
    this.X1Widget = X1Api.getWidget(this.soraNetwork);
  }
}
</script>

<style lang="scss">
.x1-dialog .el-dialog .wrapper {
  min-height: 320px;
  padding: $basic-spacing-medium;
  margin: -10px -20px;
  border-radius: 16px;

  .el-loading-mask {
    border-radius: 20px;
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
</style>
