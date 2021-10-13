<template>
  <header class="header">
    <s-button class="polkaswap-menu" type="action" primary icon="basic-more-horizontal-24" @click="toggleMenu" />
    <s-button class="polkaswap-logo polkaswap-logo--tablet" type="link" size="large" @click="goTo(PageNames.Swap)">
      <polkaswap-logo :theme="libraryTheme" class="polkaswap-logo__image" />
    </s-button>
    <div class="app-controls s-flex">
      <s-button
        type="action"
        class="theme-control s-pressed"
        :tooltip="t(hideBalancesTooltip)"
        @click="toggleHideBalance"
      >
        <s-icon :name="hideBalancesIcon" :size="iconSize" />
      </s-button>
      <s-button type="action" class="node-control s-pressed" :tooltip="nodeTooltip" @click="openSelectNodeDialog">
        <token-logo class="node-control__logo" v-bind="nodeLogo" />
      </s-button>
      <s-button
        type="tertiary"
        :class="['account-control', { 's-pressed': isLoggedIn }]"
        size="medium"
        :tooltip="accountTooltip"
        :disabled="loading"
        @click="goTo(PageNames.Wallet)"
      >
        <div :class="['account-control-title', { name: isLoggedIn }]">{{ accountInfo }}</div>
        <div class="account-control-icon">
          <s-icon v-if="!isLoggedIn" name="finance-wallet-24" :size="iconSize" />
          <WalletAvatar v-else :address="account.address" />
        </div>
      </s-button>
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

    <select-node-dialog :visible.sync="showSelectNodeDialog" />
    <select-language-dialog :visible.sync="showSelectLanguageDialog" />
  </header>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Getter, State, Action } from 'vuex-class';
import { components } from '@soramitsu/soraneo-wallet-web';
import { switchTheme } from '@soramitsu/soramitsu-js-ui/lib/utils';
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';
import { KnownSymbols } from '@sora-substrate/util';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';
import PolkaswapLogo from '@/components/logo/Polkaswap.vue';

import { lazyComponent, goTo } from '@/router';
import { PageNames, Components, LogoSize } from '@/consts';
import { formatAddress } from '@/utils';

enum HeaderMenuType {
  Theme = 'theme',
  Language = 'language',
}

@Component({
  components: {
    WalletAvatar: components.WalletAvatar,
    PolkaswapLogo,
    SelectNodeDialog: lazyComponent(Components.SelectNodeDialog),
    SelectLanguageDialog: lazyComponent(Components.SelectLanguageDialog),
    TokenLogo: lazyComponent(Components.TokenLogo),
  },
})
export default class AppHeader extends Mixins(TranslationMixin, NodeErrorMixin) {
  readonly PageNames = PageNames;
  readonly iconSize = 28;
  readonly HeaderMenuType = HeaderMenuType;

  @Prop({ type: Boolean, default: false }) readonly loading!: boolean;

  @State((state) => state.settings.selectNodeDialogVisibility) selectNodeDialogVisibility!: boolean;

  @Getter shouldBalanceBeHidden!: boolean;
  @Getter libraryTheme!: Theme;
  @Getter isLoggedIn!: boolean;
  @Getter account!: any; // TODO: WALLET ACCOUNT TYPE

  @Action toggleHideBalance!: AsyncVoidFn;

  goTo = goTo;
  showSelectLanguageDialog = false;

  get accountTooltip(): string {
    return this.t(`${this.isLoggedIn ? 'connectedAccount' : 'connectWalletTextTooltip'}`);
  }

  get accountInfo(): string {
    if (!this.isLoggedIn) {
      return this.t('connectWalletText');
    }
    return this.account.name || formatAddress(this.account.address, 8);
  }

  get nodeTooltip(): string {
    if (this.nodeIsConnected) {
      return this.t('selectNodeConnected', { chain: this.node.chain });
    }
    return this.t('selectNodeText');
  }

  get nodeLogo(): any {
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

  get hideBalancesTooltip(): string {
    return `headerMenu.${this.shouldBalanceBeHidden ? 'showBalances' : 'hideBalances'}`;
  }

  get showSelectNodeDialog(): boolean {
    return this.selectNodeDialogVisibility;
  }

  set showSelectNodeDialog(flag: boolean) {
    this.setSelectNodeDialogVisibility(flag);
  }

  openSelectNodeDialog(): void {
    this.setSelectNodeDialogVisibility(true);
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

.account-control {
  &-icon {
    svg circle:first-child {
      fill: var(--s-color-utility-surface);
    }
  }
  span {
    flex-direction: row-reverse;
  }
  [class^='s-icon-'] {
    @include icon-styles;
  }
}

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
</style>

<style lang="scss" scoped>
$account-control-name-max-width: 200px;

@include polkaswap-logo;

.polkaswap-menu {
  @include large-mobile {
    display: none;
  }
}

.header {
  display: flex;
  align-items: center;
  padding: $inner-spacing-mini;
  min-height: $header-height;
  position: relative;
  @include tablet {
    padding: $inner-spacing-mini $inner-spacing-medium;

    &:after {
      left: $inner-spacing-medium;
      right: $inner-spacing-medium;
    }
  }
  &:after {
    content: '';
    position: absolute;
    height: 1px;
    bottom: 0;
    left: $inner-spacing-mini;
    right: $inner-spacing-mini;
    background-color: var(--s-color-base-border-secondary);
  }
}

.app-controls {
  margin-left: auto;
  & > *:not(:last-child) {
    margin-right: $inner-spacing-mini;
  }
  .el-button {
    + .el-button {
      margin-left: 0;
    }
  }
}

.node-control {
  @include element-size('token-logo', 28px);
  .token-logo {
    display: block;
    margin: auto;
  }
}

.account-control {
  letter-spacing: var(--s-letter-spacing-small);
  &-title {
    font-size: var(--s-font-size-small);
    max-width: $account-control-name-max-width;
    overflow: hidden;
    text-overflow: ellipsis;
    &.name {
      text-transform: none;
    }
  }
  &.s-tertiary {
    &.el-button {
      padding-left: $basic-spacing-mini;
    }
    .account-control-title {
      margin-left: $basic-spacing-mini;
    }
  }
  &-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--s-size-small);
    height: var(--s-size-small);
    overflow: hidden;
    border-radius: 50%;
  }
}
</style>
