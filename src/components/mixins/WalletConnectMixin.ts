import { Component, Mixins } from 'vue-property-decorator';
import { Getter, Action } from 'vuex-class';

import { getWalletAddress, formatAddress } from '@/utils';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class WalletConnectMixin extends Mixins(TranslationMixin) {
  @Getter('isLoggedIn') isSoraAccountConnected!: boolean;

  @Action setWalletDialogVisibility!: (flag: boolean) => void;

  getWalletAddress = getWalletAddress;
  formatAddress = formatAddress;

  get areNetworksConnected(): boolean {
    return this.isSoraAccountConnected;
  }

  connectInternalWallet(): void {
    this.setWalletDialogVisibility(true);
  }
}
