<template>
  <header class="header">
    <s-button class="app-menu-button" type="action" primary icon="basic-more-horizontal-24" @click="toggleMenu" />
    <app-logo-button class="app-logo--header" responsive :theme="libraryTheme" @click="goTo(PageNames.Swap)" />
    <div class="app-controls app-controls--middle s-flex">
      <app-marketing v-show="!isMobile" />
      <s-button :class="fiatBtnClass" :type="fiatBtnType" size="medium" @click="goTo(PageNames.FiatDepositOptions)">
        <pair-token-logo class="payment-icon" :first-token="xor" :second-token="eth" :size="fiatBtnSize" />
        <span v-if="!isAnyMobile">{{ t('moonpay.buttons.buy') }}</span>
      </s-button>
    </div>
    <div class="app-controls s-flex">
      <app-account-button :disabled="loading" @click="goTo(PageNames.Wallet)" />
      <app-header-menu />
    </div>
    <select-language-dialog />
  </header>
</template>

<script lang="ts">
import { XOR, ETH } from '@sora-substrate/util/build/assets/consts';
import { components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import WalletConnectMixin from '../../../components/mixins/WalletConnectMixin';
import PolkaswapLogo from '../../../components/shared/Logo/Polkaswap.vue';
import { PageNames, Components, BreakpointClass } from '../../../consts';
import { lazyComponent, goTo } from '../../../router';
import { state, getter } from '../../../store/decorators';

import AppAccountButton from './AppAccountButton.vue';
import AppHeaderMenu from './AppHeaderMenu.vue';
import AppLogoButton from './AppLogoButton.vue';
import AppMarketing from './AppMarketing.vue';

import type Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';

@Component({
  components: {
    PolkaswapLogo,
    AppAccountButton,
    AppMarketing,
    AppHeaderMenu,
    AppLogoButton,
    SelectLanguageDialog: lazyComponent(Components.SelectLanguageDialog),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    WalletAvatar: components.WalletAvatar,
  },
})
export default class AppHeader extends Mixins(WalletConnectMixin) {
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

  get fiatBtnClass(): string[] {
    const base = ['app-controls-fiat-btn', 'active'];

    if (this.$route.name === PageNames.FiatDepositOptions) base.push('app-controls-fiat-btn--active', 's-pressed');

    return base;
  }

  get fiatBtnType(): string {
    return this.isAnyMobile ? 'action' : 'tertiary';
  }

  get fiatBtnSize(): string {
    return this.isAnyMobile ? 'mini' : 'small';
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
