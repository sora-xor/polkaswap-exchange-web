<template>
  <header class="header">
    <s-button class="app-menu-button" type="action" primary icon="basic-more-horizontal-24" @click="toggleMenu" />
    <app-logo-button class="app-logo--header" responsive :theme="libraryTheme" @click="goTo(PageNames.Swap)" />
    <!-- <div
      v-if="moonpayEnabled"
      class="app-controls app-controls--moonpay s-flex"
      :class="{ 'app-controls--moonpay--dark': themeIsDark }"
    > -->
    <!-- <s-button
        type="tertiary"
        size="medium"
        icon="various-atom-24"
        class="moonpay-button moonpay-button--buy"
        @click="openMoonpayDialog"
      >
        <span class="moonpay-button-text">{{ t('moonpay.buttons.buy') }}</span>
      </s-button>
      <moonpay-history-button v-if="isLoggedIn" class="moonpay-button moonpay-button--history" /> -->
    <!-- </div> -->
    <route-assets-navigation v-if="showRouteAssetsNavigation" class="app-controls s-flex" />
    <div
      class="app-controls app-controls--settings-panel s-flex"
      :class="{ 'app-controls--settings-panel--dark': themeIsDark }"
    >
      <!-- <market-maker-countdown /> -->
      <s-button type="action" class="node-control s-pressed" :tooltip="nodeTooltip" @click="openNodeSelectionDialog">
        <token-logo class="node-control__logo token-logo" v-bind="nodeLogo" />
      </s-button>
      <account-button :disabled="loading" @click="goTo(PageNames.Wallet)" />
      <app-header-menu />
    </div>

    <select-node-dialog />
    <select-language-dialog />

    <template v-if="moonpayEnabled">
      <moonpay />
      <moonpay-notification />
      <moonpay-confirmation />
    </template>
  </header>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';

import { lazyComponent, goTo } from '@/router';
import { PageNames, Components } from '@/consts';
import { AdarComponents } from '@/modules/ADAR/consts';
import { adarLazyComponent } from '@/modules/ADAR/router';
import { getter, mutation } from '@/store/decorators';

@Component({
  components: {
    WalletAvatar: components.WalletAvatar as any,
    AccountButton: lazyComponent(Components.AccountButton),
    AppLogoButton: lazyComponent(Components.AppLogoButton),
    AppHeaderMenu: lazyComponent(Components.AppHeaderMenu),
    SelectNodeDialog: lazyComponent(Components.SelectNodeDialog),
    SelectLanguageDialog: lazyComponent(Components.SelectLanguageDialog),
    Moonpay: lazyComponent(Components.Moonpay),
    MoonpayNotification: lazyComponent(Components.MoonpayNotification),
    MoonpayHistoryButton: lazyComponent(Components.MoonpayHistoryButton),
    MoonpayConfirmation: lazyComponent(Components.MoonpayConfirmation),
    RouteAssetsNavigation: adarLazyComponent(AdarComponents.RouteAssetsNavigation),
    TokenLogo: components.TokenLogo,
  },
})
export default class AppHeader extends Mixins(WalletConnectMixin, NodeErrorMixin) {
  readonly PageNames = PageNames;

  @Prop({ type: Boolean, default: false }) readonly loading!: boolean;

  @getter.libraryTheme libraryTheme!: Theme;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.settings.moonpayEnabled moonpayEnabled!: boolean;

  @mutation.moonpay.setDialogVisibility private setMoonpayVisibility!: (flag: boolean) => void;

  goTo = goTo;

  get nodeTooltip(): string {
    if (this.nodeIsConnected) {
      return this.t('selectNodeConnected', { chain: this.node.chain });
    }
    return this.t('selectNodeText');
  }

  get nodeLogo() {
    return {
      size: WALLET_CONSTS.LogoSize.MEDIUM,
      tokenSymbol: XOR.symbol,
    };
  }

  get themeIsDark() {
    return this.libraryTheme === Theme.DARK;
  }

  get showRouteAssetsNavigation() {
    return this.$route.path.includes('route-assets');
  }

  get areMoonpayButtonsVisible(): boolean {
    return this.moonpayEnabled && this.isLoggedIn;
  }

  openNodeSelectionDialog(): void {
    this.setSelectNodeDialogVisibility(true);
  }

  async openMoonpayDialog(): Promise<void> {
    if (!this.isSoraAccountConnected) {
      return this.connectInternalWallet();
    }
    await this.checkConnectionToExternalAccount(async () => {
      this.setMoonpayVisibility(true);
    });
  }

  toggleMenu(): void {
    this.$emit('toggle-menu');
  }
}
</script>

<style lang="scss">
.settings-control:hover > span > .header-menu__button i {
  color: var(--s-color-base-content-secondary);
}

.moonpay-button {
  &.el-button.neumorphic.s-medium {
    padding-left: 9px;
    padding-right: 9px;
  }

  &--buy {
    max-width: 114px;
    // border-right: 1px solid var(--s-color-base-content-tertiary) !important;
    margin-right: 1px;
  }

  &--history {
    max-width: 134px;
  }

  &-text {
    display: none;
    white-space: normal;
    text-align: left;
    letter-spacing: var(--s-letter-spacing-small);

    @include large-mobile {
      display: inline-block;
    }
  }

  & i + &-text {
    padding-left: 6px;
  }

  &:not(.s-action).s-i-position-left > span > i[class^='s-icon-'] {
    margin-right: 0;
  }
}
</style>

<style lang="scss" scoped>
$app-controls-filter: drop-shadow(-5px -5px 5px rgba(232, 25, 50, 0.05))
  drop-shadow(1px 1px 25px rgba(232, 25, 50, 0.1));
$app-controls-shadow: inset 1px 1px 10px #ffffff;

$app-controls-filter--dark: drop-shadow(-5px -5px 5px rgba(232, 25, 50, 0.05))
  drop-shadow(2px 2px 10px rgba(232, 25, 49, 0.33));
$app-controls-shadow--dark: inset 1px 1px 2px #52523d;
.header {
  display: flex;
  align-items: center;
  padding: $inner-spacing-mini;
  min-height: $header-height;
  position: relative;
  &:after {
    content: '';
    position: absolute;
    height: 1px;
    bottom: 0;
    left: $inner-spacing-mini;
    right: $inner-spacing-mini;
    background-color: var(--s-color-base-border-secondary);
  }
  @include tablet {
    padding: $inner-spacing-mini $inner-spacing-medium;

    &:after {
      left: $inner-spacing-medium;
      right: $inner-spacing-medium;
    }
  }
}

.app-controls {
  &:not(:last-child) {
    margin-right: $inner-spacing-mini;
  }

  & > *:not(:last-child) {
    // margin-right: $inner-spacing-mini;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  & > *:not(:first-child) {
    // margin-right: $inner-spacing-mini;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  .node-control {
    @include element-size('token-logo', 32px);
    &__logo {
      display: block;
      margin: auto;
    }
  }

  .el-button {
    + .el-button {
      margin-left: 0;
    }
  }

  &.without-moonpay {
    margin-left: auto;
  }

  margin-left: auto;

  &--moonpay {
    margin-left: auto;
    box-shadow: $app-controls-shadow;
    filter: $app-controls-filter;
    border-radius: var(--s-border-radius-small);

    & > * {
      box-shadow: none !important;
    }

    @include desktop {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      margin-right: 0;
    }
  }

  &--settings-panel {
    box-shadow: $app-controls-shadow;
    filter: $app-controls-filter;
    border-radius: var(--s-border-radius-small);

    & > *:not(:last-child) {
      // border-right: 1px solid var(--s-color-base-content-tertiary) !important;
      margin-right: 1px;
    }

    & > * {
      box-shadow: none !important;
    }
  }

  &--moonpay--dark,
  &--settings-panel--dark {
    box-shadow: $app-controls-shadow--dark;
    filter: $app-controls-filter--dark;
  }
}

.app-menu-button {
  flex-shrink: 0;

  @include large-mobile {
    display: none;
  }
}

.app-logo--header {
  @include large-mobile(true) {
    display: none;
  }
}
</style>
