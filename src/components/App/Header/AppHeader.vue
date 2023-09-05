<template>
  <header class="header">
    <s-button class="app-menu-button" type="action" primary icon="basic-more-horizontal-24" @click="toggleMenu" />
    <app-logo-button class="app-logo--header" responsive :theme="libraryTheme" @click="goTo(PageNames.Swap)" />
    <div class="app-controls app-controls--fiat-payment s-flex">
      <app-ad />
      <s-button :class="computedClassBtn" type="tertiary" size="medium" @click="goTo(PageNames.FiatDepositOptions)">
        <pair-token-logo class="app-menu-payment" :first-token="xor" :second-token="eth" size="small" />
        <span>{{ t('moonpay.buttons.buy') }}</span>
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
import { XOR } from '@sora-substrate/util/build/assets/consts';
import { components, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import WalletConnectMixin from '../../../components/mixins/WalletConnectMixin';
import PolkaswapLogo from '../../../components/shared/Logo/Polkaswap.vue';
import { PageNames, Components } from '../../../consts';
import { lazyComponent, goTo } from '../../../router';
import { getter } from '../../../store/decorators';

import AppAccountButton from './AppAccountButton.vue';
import AppAd from './AppAd.vue';
import AppHeaderMenu from './AppHeaderMenu.vue';
import AppLogoButton from './AppLogoButton.vue';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

@Component({
  components: {
    PolkaswapLogo,
    AppAccountButton,
    AppAd,
    AppHeaderMenu,
    AppLogoButton,
    SelectLanguageDialog: lazyComponent(Components.SelectLanguageDialog),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    WalletAvatar: components.WalletAvatar,
  },
})
export default class AppHeader extends Mixins(WalletConnectMixin) {
  readonly PageNames = PageNames;

  @Prop({ type: Boolean, default: false }) readonly loading!: boolean;

  @getter.libraryTheme libraryTheme!: Theme;
  @getter.assets.xor xor!: Nullable<AccountAsset>;
  @getter.assets.eth eth!: Nullable<AccountAsset>;

  goTo = goTo;

  get nodeLogo() {
    return {
      size: WALLET_CONSTS.LogoSize.MEDIUM,
      tokenSymbol: XOR.symbol,
    };
  }

  get computedClassBtn(): string[] {
    const base = ['app-menu-fiat-btn', 'active'];

    if (this.$route.name === PageNames.FiatDepositOptions) base.push('app-menu-fiat-btn--active');

    return base;
  }

  toggleMenu(): void {
    this.$emit('toggle-menu');
  }
}
</script>

<style lang="scss">
.app-menu-fiat-btn.app-menu-fiat-btn--active.neumorphic.s-tertiary.active {
  box-shadow: var(--s-shadow-element);

  span {
    color: var(--s-color-theme-accent);
  }
}

.settings-control:hover > span > .header-menu__button i {
  color: var(--s-color-base-content-secondary);
}

.app-menu-payment {
  .token-logo.second-logo .asset-logo {
    background-image: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg clip-path='url(%23clip0_15602_344599)'%3E%3Cpath d='M9.99998 19C14.9706 19 19 14.9706 19 10C19 5.02944 14.9706 1 9.99998 1C5.02944 1 1 5.02944 1 10C1 14.9706 5.02944 19 9.99998 19Z' fill='%23627EEA'/%3E%3Cpath d='M9.99805 3.45166V8.29193L14.0891 10.12L9.99805 3.45166Z' fill='white' fill-opacity='0.6'/%3E%3Cpath d='M9.99881 3.45166L5.90723 10.12L9.99881 8.29193V3.45166Z' fill='white'/%3E%3Cpath d='M9.99805 13.2565V16.5453L14.0918 10.8816L9.99805 13.2565Z' fill='white' fill-opacity='0.6'/%3E%3Cpath d='M9.99783 16.5453V13.2559L5.90625 10.8816L9.99783 16.5453Z' fill='white'/%3E%3Cpath d='M9.99805 12.4953L14.0891 10.12L9.99805 8.29297V12.4953Z' fill='white' fill-opacity='0.2'/%3E%3Cpath d='M5.90625 10.12L9.99783 12.4953V8.29297L5.90625 10.12Z' fill='white' fill-opacity='0.6'/%3E%3C/g%3E%3Crect x='0.5' y='0.5' width='19' height='19' rx='9.5' stroke='%23F4F0F1'/%3E%3Cdefs%3E%3CclipPath id='clip0_15602_344599'%3E%3Crect x='1' y='1' width='18' height='18' rx='9' fill='white'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E") !important;
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

  @include desktop {
    margin-left: auto;
  }

  &--fiat-payment {
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
