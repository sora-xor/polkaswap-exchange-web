<template>
  <header class="header" id="header">
    <div class="header-container">
      <div class="header__wrap-logo">
        <a href="#" class="logo">
          <img src="img/logo.png" loading="lazy" alt="" class="logo__img" />
          <span class="logo__text">NOIR</span>
        </a>
      </div>

      <div class="header__wrap-btn">
        <button class="btn btn-empty">CONNECT WALLET</button>
      </div>

      <div class="header__wrap-redeemed">
        <div class="circle-blured-1"></div>

        <div class="redeem">
          <img src="img/fire.png" loading="lazy" alt="" class="redeem__img" />
          <div class="redeem__text"><span class="color-pink">198</span> <span>Redeemed</span></div>
        </div>
      </div>
    </div>

    <select-node-dialog />
  </header>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Getter } from 'vuex-class';
import { components, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import { switchTheme } from '@soramitsu/soramitsu-js-ui/lib/utils';
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';
import PolkaswapLogo from '@/components/logo/Polkaswap.vue';

import { lazyComponent, goTo } from '@/router';
import { PageNames, Components } from '@/consts';

enum HeaderMenuType {
  Node = 'node',
  Theme = 'theme',
  Language = 'language',
}

@Component({
  components: {
    WalletAvatar: components.WalletAvatar as any,
    PolkaswapLogo,
    AccountButton: lazyComponent(Components.AccountButton),
    AppLogoButton: lazyComponent(Components.AppLogoButton),
    SelectNodeDialog: lazyComponent(Components.SelectNodeDialog),
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

  goTo = goTo;
}
</script>

<style lang="scss" scoped>
.header {
  position: absolute;
  left: 0;
  top: 80px;
  width: 100%;
  z-index: 5;

  &__wrap-logo {
    position: relative;
    width: 25%;
  }

  &__wrap-btn {
    position: relative;
  }

  &__wrap-redeemed {
    position: relative;
    width: 25%;
    text-align: right;
  }

  .header-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}

.header-container {
  margin: 0 auto;
  max-width: 1574px;
  position: relative;
  width: 100%;
}

@media screen and (max-width: 1600px) {
  .header-container {
    max-width: calc(100% - 32px);
  }
}

@media screen and (max-width: 1050px) {
  .header-container {
    max-width: calc(100% - 32px);
  }
}

@media screen and (max-width: 640px) {
  .header-container {
    max-width: calc(100% - 20px);
  }
}

.logo {
  text-decoration: none;
  color: #ffffff;
  display: inline-flex;
  align-items: center;

  &:hover {
    text-decoration: none;
  }

  &__img {
    margin: 0 8px 0 0;
  }

  &__text {
    position: relative;
  }
}

.redeem {
  display: inline-flex;
  position: relative;
  align-items: center;

  &__img {
    margin: -5px 15px 0 0;
  }

  &__text {
    position: relative;
  }
}
</style>
