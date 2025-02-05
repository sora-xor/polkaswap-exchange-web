<template>
  <header class="header">
    <s-button class="app-menu-button" type="action" primary icon="basic-more-horizontal-24" @click="toggleMenu" />
    <app-logo-button class="app-logo--header" responsive :theme="libraryTheme" @click="goTo(PageNames.Swap)" />
    <div class="app-controls s-flex">
      <app-header-menu />
    </div>
    <rotate-phone-dialog />
    <acceleration-access-dialog />
    <select-language-dialog />
    <select-currency-dialog />
  </header>
</template>

<script lang="ts">
import { XOR, ETH } from '@sora-substrate/sdk/build/assets/consts';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import InternalConnectMixin from '../../../components/mixins/InternalConnectMixin';
import { PageNames, Components } from '../../../consts';
import { BreakpointClass } from '../../../consts/layout';
import { lazyComponent, goTo } from '../../../router';
import { state, getter } from '../../../store/decorators';

import AppHeaderMenu from './AppHeaderMenu.vue';

import type Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';

@Component({
  components: {
    AppHeaderMenu,
    AppLogoButton: lazyComponent(Components.AppLogoButton),
    SelectLanguageDialog: lazyComponent(Components.SelectLanguageDialog),
    SelectCurrencyDialog: lazyComponent(Components.SelectCurrencyDialog),
    RotatePhoneDialog: lazyComponent(Components.RotatePhoneDialog),
    AccelerationAccessDialog: lazyComponent(Components.AccelerationAccessDialog),
  },
})
export default class AppHeader extends Mixins(InternalConnectMixin) {
  readonly PageNames = PageNames;
  readonly xor = XOR;
  readonly eth = ETH;

  @Prop({ type: Boolean, default: false }) readonly loading!: boolean;

  @state.settings.screenBreakpointClass private screenBreakpointClass!: BreakpointClass;

  @getter.libraryTheme libraryTheme!: Theme;

  goTo = goTo;

  get isMobile(): boolean {
    return this.screenBreakpointClass === BreakpointClass.Mobile;
  }

  get isAnyMobile(): boolean {
    return this.isMobile || this.screenBreakpointClass === BreakpointClass.LargeMobile;
  }

  get nodeLogo() {
    return {
      size: WALLET_CONSTS.LogoSize.MEDIUM,
      tokenSymbol: XOR.symbol,
    };
  }

  toggleMenu(): void {
    this.$emit('toggle-menu');
  }
}
</script>

<style lang="scss">
.app-controls-fiat-btn.app-controls-fiat-btn--active.neumorphic.active {
  box-shadow: var(--s-shadow-element);
  span {
    color: var(--s-color-theme-accent);
  }
}

.settings-control:hover > span > .header-menu__button i {
  color: var(--s-color-base-content-secondary);
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

  &-fiat-btn.s-action .payment-icon {
    margin: auto;
    margin-top: 2px; // Only for action button
  }

  .el-button {
    + .el-button {
      margin-left: 0;
    }
  }

  @include desktop {
    margin-left: auto;
  }

  &--middle {
    margin-left: auto;

    @include desktop {
      position: absolute;
      top: 50%;
      left: 42.5%; // Because of marketing banner
      transform: translate(-50%, -50%);
      margin-right: 0;
    }

    @media (minmax(1220px, false)) {
      left: 50%;
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
