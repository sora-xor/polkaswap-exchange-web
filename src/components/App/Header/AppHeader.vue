<template>
  <header class="header" id="header">
    <div class="container">
      <div class="circle-blured-1"></div>

      <router-link to="/" class="logo">
        <img src="img/logo.svg" width="54" height="50" loading="lazy" alt="" class="logo__img" />
      </router-link>

      <div class="redeem">
        <img src="img/fire.png" loading="lazy" alt="" class="redeem__img" />
        <div class="redeem__text">
          <span class="color-pink">{{ totalRedeemed }}</span> <span>Redeemed</span>
        </div>
      </div>

      <account-button class="account-btn" :disabled="loading" @click="connectInternalWallet" />
    </div>
  </header>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { components, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import { getter, state } from '@/store/decorators';

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin';
import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';

import { lazyComponent } from '@/router';
import { Components } from '@/consts';

@Component({
  components: {
    WalletAvatar: components.WalletAvatar as any,
    AccountButton: lazyComponent(Components.AccountButton),
  },
})
export default class AppHeader extends Mixins(WalletConnectMixin, NodeErrorMixin) {
  @Prop({ type: Boolean, default: false }) readonly loading!: boolean;

  @state.noir.totalRedeemed totalRedeemed!: number;
  @getter.wallet.account.account account!: WALLET_TYPES.Account;
  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
}
</script>

<style lang="scss" scoped>
.account-btn {
  margin-left: 48px;
}
</style>
