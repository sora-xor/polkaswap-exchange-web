import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { PageNames } from '@/consts';
import { goTo } from '@/router';
import { getter, mutation, state } from '@/store/decorators';
import { formatAddress } from '@/utils';

@Component
export default class InternalConnectMixin extends Mixins(TranslationMixin) {
  @state.wallet.account.address public soraAddress!: string;

  @getter.wallet.account.isLoggedIn public isLoggedIn!: boolean;

  @mutation.web3.setSoraAccountDialogVisibility public setSoraAccountDialogVisibility!: (flag: boolean) => void;

  formatAddress = formatAddress;

  public connectSoraWallet(): void {
    this.setSoraAccountDialogVisibility(true);
  }

  public navigateToWallet(): void {
    goTo(PageNames.Wallet);
  }
}
