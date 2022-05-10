import { Component, Mixins } from 'vue-property-decorator';

import { getter, mutation } from '@/store/decorators';
import { getWalletAddress, formatAddress } from '@/utils';

import TranslationMixin from '@/components/mixins/TranslationMixin';

@Component
export default class WalletConnectMixin extends Mixins(TranslationMixin) {
  @getter.wallet.account.isLoggedIn isSoraAccountConnected!: boolean;
  @mutation.noir.setWalletDialogVisibility private setWalletDialogVisibility!: (flag: boolean) => void;

  getWalletAddress = getWalletAddress;
  formatAddress = formatAddress;

  get areNetworksConnected(): boolean {
    return this.isSoraAccountConnected;
  }

  connectInternalWallet(): void {
    this.setWalletDialogVisibility(true);
  }
}
