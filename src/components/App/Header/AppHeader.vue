<template>
  <header class="header">
    <s-button class="app-menu-button" type="action" primary icon="basic-more-horizontal-24" @click="toggleMenu" />
    <app-logo-button class="app-logo--header" responsive :theme="libraryTheme" @click="goTo(PageNames.Swap)" />
    <div v-if="areMoonpayButtonsVisible" class="app-controls app-controls--moonpay s-flex">
      <s-button
        type="tertiary"
        size="medium"
        icon="various-atom-24"
        class="moonpay-button moonpay-button--buy"
        @click="openMoonpayDialog"
      >
        <span class="moonpay-button-text">{{ t('moonpay.buttons.buy') }}</span>
      </s-button>
      <moonpay-history-button class="moonpay-button moonpay-button--history" />
    </div>
    <div class="app-controls s-flex" :class="{ 'without-moonpay': !areMoonpayButtonsVisible }">
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
import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';
import PolkaswapLogo from '@/components/logo/Polkaswap.vue';

import { lazyComponent, goTo } from '@/router';
import { PageNames, Components } from '@/consts';
import { getter, mutation } from '@/store/decorators';

@Component({
  components: {
    WalletAvatar: components.WalletAvatar,
    PolkaswapLogo,
    AccountButton: lazyComponent(Components.AccountButton),
    AppLogoButton: lazyComponent(Components.AppLogoButton),
    AppHeaderMenu: lazyComponent(Components.AppHeaderMenu),
    SelectNodeDialog: lazyComponent(Components.SelectNodeDialog),
    SelectLanguageDialog: lazyComponent(Components.SelectLanguageDialog),
    Moonpay: lazyComponent(Components.Moonpay),
    MoonpayNotification: lazyComponent(Components.MoonpayNotification),
    MoonpayHistoryButton: lazyComponent(Components.MoonpayHistoryButton),
    MoonpayConfirmation: lazyComponent(Components.MoonpayConfirmation),
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
    margin-right: $inner-spacing-mini;
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

  @include desktop {
    margin-left: auto;
  }

  &--moonpay {
    margin-left: auto;

    @include desktop {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      margin-right: 0;
    }
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
