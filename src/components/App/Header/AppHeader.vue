<template>
  <header class="header">
    <s-button class="app-menu-button" type="action" primary icon="basic-more-horizontal-24" @click="toggleMenu" />
    <app-logo-button class="app-logo--header" responsive :theme="libraryTheme" @click="goTo(PageNames.Swap)" />
    <div class="app-controls app-controls--fiat-payment s-flex" @click="goTo(PageNames.FiatDepositOptions)">
      <s-button type="tertiary" size="medium">
        <pair-token-logo :first-token="xor" :second-token="eth" size="small" />
        <span class="moonpay-button-text">{{ t('moonpay.buttons.buy') }}</span>
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
import { getter, mutation } from '../../../store/decorators';

import AppAccountButton from './AppAccountButton.vue';
import AppHeaderMenu from './AppHeaderMenu.vue';
import AppLogoButton from './AppLogoButton.vue';

import type { AccountAsset } from '@sora-substrate/util/build/assets/types';
import type Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

@Component({
  components: {
    PolkaswapLogo,
    AppAccountButton,
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

  toggleMenu(): void {
    this.$emit('toggle-menu');
  }
}
</script>

<style lang="scss">
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
