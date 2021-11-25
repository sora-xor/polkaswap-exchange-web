import { Component, Mixins } from 'vue-property-decorator';
import { Getter } from 'vuex-class';

import router from '@/router';
import { getWalletAddress, formatAddress } from '@/utils';
import { PageNames } from '@/consts';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class WalletConnectMixin extends Mixins(TranslationMixin) {
  @Getter('isLoggedIn') isSoraAccountConnected!: boolean;

  getWalletAddress = getWalletAddress;
  formatAddress = formatAddress;

  get areNetworksConnected(): boolean {
    return this.isSoraAccountConnected;
  }

  connectInternalWallet(): void {
    router.push({ name: PageNames.Wallet });
  }
}
