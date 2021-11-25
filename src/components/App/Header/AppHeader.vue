<template>
  <header class="header" id="header">
    <div class="container">
      <div class="header__wrap-logo">
        <router-link to="/" class="logo">
          <img src="img/logo.png" loading="lazy" alt="" class="logo__img" />
          <span class="logo__text">NOIR</span>
        </router-link>
      </div>

      <div class="header__wrap-redeemed">
        <div class="circle-blured-1"></div>

        <div class="redeem">
          <img src="img/fire.png" loading="lazy" alt="" class="redeem__img" />
          <div class="redeem__text"><span class="color-pink">198</span> <span>Redeemed</span></div>
        </div>

        <account-button class="account-btn" @click="openWallet" />
      </div>
    </div>
  </header>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Getter } from 'vuex-class';
import { components, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';

import { lazyComponent } from '@/router';
import { PageNames, Components } from '@/consts';

@Component({
  components: {
    WalletAvatar: components.WalletAvatar as any,
    AccountButton: lazyComponent(Components.AccountButton),
    AppLogoButton: lazyComponent(Components.AppLogoButton),
  },
})
export default class AppHeader extends Mixins(WalletConnectMixin, NodeErrorMixin) {
  readonly PageNames = PageNames;

  @Prop({ type: Boolean, default: false }) readonly loading!: boolean;
  @Prop({ type: Function, default: () => {} }) readonly openWallet!: VoidFunction;

  @Getter isLoggedIn!: boolean;
  @Getter account!: WALLET_TYPES.Account;
}
</script>

<style lang="scss" scoped>
.account-btn {
  margin-left: 48px;
}
</style>
