<template>
  <header class="header">
    <s-button class="app-menu-button" type="action" primary icon="basic-more-horizontal-24" @click="toggleMenu" />
    <app-logo-button class="app-logo--header" responsive :theme="libraryTheme" @click="goTo(PageNames.Swap)" />
    <div v-if="moonpayEnabled" class="app-controls app-controls--moonpay s-flex">
      <s-button
        type="tertiary"
        size="medium"
        icon="various-atom-24"
        class="moonpay-button moonpay-button--buy"
        @click="openMoonpayDialog"
      >
        <span class="moonpay-button-text">{{ t('moonpay.buttons.buy') }}</span>
      </s-button>
      <moonpay-history-button v-if="isLoggedIn" class="moonpay-button moonpay-button--history" />
    </div>
    <div class="app-controls s-flex">
      <market-maker-countdown />
      <s-button type="action" class="node-control s-pressed" :tooltip="nodeTooltip" @click="openNodeSelectionDialog">
        <token-logo class="node-control__logo" v-bind="nodeLogo" />
      </s-button>
      <account-button :disabled="loading" @click="goTo(PageNames.Wallet)" />
      <s-button
        type="action"
        class="settings-control s-pressed"
        :tooltip="t('headerMenu.settings')"
        @click="handleClickHeaderMenu"
      >
        <s-dropdown
          ref="headerMenu"
          class="header-menu__button"
          popper-class="header-menu"
          icon="grid-block-align-left-24"
          type="ellipsis"
          placement="bottom-start"
          @select="handleSelectHeaderMenu"
        >
          <template #menu>
            <s-dropdown-item class="header-menu__item" :icon="hideBalancesIcon" :value="HeaderMenuType.HideBalances">
              {{ hideBalancesText }}
            </s-dropdown-item>
            <s-dropdown-item class="header-menu__item" :icon="themeIcon" :value="HeaderMenuType.Theme">
              {{ t('headerMenu.switchTheme', { theme: t(themeTitle) }) }}
            </s-dropdown-item>
            <s-dropdown-item class="header-menu__item" icon="basic-globe-24" :value="HeaderMenuType.Language">
              {{ t('headerMenu.switchLanguage') }}
            </s-dropdown-item>
          </template>
        </s-dropdown>
      </s-button>
    </div>

    <select-node-dialog />
    <select-language-dialog :visible.sync="showSelectLanguageDialog" />

    <template v-if="moonpayEnabled">
      <moonpay />
      <moonpay-notification />
      <moonpay-confirmation />
    </template>
  </header>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Getter, Action } from 'vuex-class';
import { KnownSymbols } from '@sora-substrate/util';
import { components, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import { switchTheme } from '@soramitsu/soramitsu-js-ui/lib/utils';
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';
import PolkaswapLogo from '@/components/logo/Polkaswap.vue';

import { lazyComponent, goTo } from '@/router';
import { PageNames, Components, LogoSize } from '@/consts';

enum HeaderMenuType {
  HideBalances = 'hide-balances',
  Theme = 'theme',
  Language = 'language',
}

@Component({
  components: {
    WalletAvatar: components.WalletAvatar as any,
    PolkaswapLogo,
    AccountButton: lazyComponent(Components.AccountButton),
    AppLogoButton: lazyComponent(Components.AppLogoButton),
    MarketMakerCountdown: lazyComponent(Components.MarketMakerCountdown),
    SelectNodeDialog: lazyComponent(Components.SelectNodeDialog),
    SelectLanguageDialog: lazyComponent(Components.SelectLanguageDialog),
    Moonpay: lazyComponent(Components.Moonpay),
    MoonpayNotification: lazyComponent(Components.MoonpayNotification),
    MoonpayHistoryButton: lazyComponent(Components.MoonpayHistoryButton),
    MoonpayConfirmation: lazyComponent(Components.MoonpayConfirmation),
    TokenLogo: lazyComponent(Components.TokenLogo),
  },
})
export default class AppHeader extends Mixins(WalletConnectMixin, NodeErrorMixin) {
  readonly PageNames = PageNames;
  readonly iconSize = 28;
  readonly HeaderMenuType = HeaderMenuType;

  @Prop({ type: Boolean, default: false }) readonly loading!: boolean;

  @Getter shouldBalanceBeHidden!: boolean;
  @Getter libraryTheme!: Theme;
  @Getter isLoggedIn!: boolean;
  @Getter account!: WALLET_TYPES.Account;
  @Getter moonpayEnabled!: boolean;

  @Action toggleHideBalance!: AsyncVoidFn;
  @Action('setDialogVisibility', { namespace: 'moonpay' }) setMoonpayVisibility!: (flag: boolean) => Promise<void>;

  goTo = goTo;
  showSelectLanguageDialog = false;

  get nodeTooltip(): string {
    if (this.nodeIsConnected) {
      return this.t('selectNodeConnected', { chain: this.node.chain });
    }
    return this.t('selectNodeText');
  }

  get nodeLogo() {
    return {
      size: LogoSize.MEDIUM,
      tokenSymbol: KnownSymbols.XOR,
    };
  }

  get themeIcon(): string {
    return this.libraryTheme === Theme.LIGHT ? 'various-moon-24' : 'various-brightness-low-24';
  }

  get themeTitle(): string {
    return this.libraryTheme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT;
  }

  get hideBalancesIcon(): string {
    return this.shouldBalanceBeHidden ? 'basic-eye-no-24' : 'basic-filterlist-24';
  }

  get hideBalancesText(): string {
    return this.t(`headerMenu.${this.shouldBalanceBeHidden ? 'showBalances' : 'hideBalances'}`);
  }

  openNodeSelectionDialog(): void {
    this.setSelectNodeDialogVisibility(true);
  }

  async openMoonpayDialog(): Promise<void> {
    if (!this.isSoraAccountConnected) {
      return this.connectInternalWallet();
    }
    await this.checkConnectionToExternalAccount(async () => {
      await this.setMoonpayVisibility(true);
    });
  }

  toggleMenu(): void {
    this.$emit('toggle-menu');
  }

  handleClickHeaderMenu(): void {
    const dropdown = (this.$refs.headerMenu as any).dropdown;
    dropdown.visible ? dropdown.hide() : dropdown.show();
  }

  handleSelectHeaderMenu(value: HeaderMenuType): void {
    switch (value) {
      case HeaderMenuType.HideBalances:
        this.toggleHideBalance();
        break;
      case HeaderMenuType.Theme:
        switchTheme();
        break;
      case HeaderMenuType.Language:
        this.showSelectLanguageDialog = true;
        break;
    }
  }
}
</script>

<style lang="scss">
$icon-size: 28px;

.settings-control:hover > span > .header-menu__button i {
  color: var(--s-color-base-content-secondary);
}

.header-menu {
  $dropdown-background: var(--s-color-utility-body);
  $dropdown-margin: 24px;
  $dropdown-item-line-height: 42px;

  &.el-dropdown-menu.el-popper {
    margin-top: $dropdown-margin;
    background-color: $dropdown-background;
    border-color: var(--s-color-base-border-secondary);
    .popper__arrow {
      display: none;
    }
  }
  &__button i {
    font-size: $icon-size !important; // cuz font-size is inline style
  }
  &__item.el-dropdown-menu__item {
    line-height: $dropdown-item-line-height;
    font-weight: 300;
    font-size: var(--s-font-size-small);
    letter-spacing: var(--s-letter-spacing-small);
    font-feature-settings: 'case' on;
    color: var(--s-color-base-content-secondary);
    display: flex;
    align-items: center;
    i {
      color: var(--s-color-base-content-tertiary);
      font-size: $icon-size;
    }
    &:not(.is-disabled) {
      &:hover,
      &:focus {
        background-color: transparent;
        &,
        i {
          color: var(--s-color-base-content-secondary);
        }
      }
    }
  }
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

    .moonpay-button-text {
      display: none;

      @include large-mobile {
        display: inline-block;
      }
    }
  }

  &-text {
    white-space: normal;
    text-align: left;
    letter-spacing: var(--s-letter-spacing-small);
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
    @include element-size('token-logo', 28px);
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
  @include mobile {
    display: none;
  }
}
</style>
