<template>
  <dialog-base :visible.sync="visibility" :show-close-button="false" class="account-select-dialog">
    <connection-view
      :chain-api="chainApi"
      :account="soraAccount"
      :login-account="login"
      :logout-account="logout"
      :rename-account="rename"
      :close-view="closeView"
      :show-close="!soraAccount.address"
      shadow="never"
    />
  </dialog-base>
</template>

<script lang="ts">
import { api, components, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { action, getter, state, mutation } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
    ConnectionView: components.ConnectionView,
  },
})
export default class SelectSoraAccountDialog extends Mixins(TranslationMixin) {
  @state.web3.soraAccountDialogVisibility private soraAccountDialogVisibility!: boolean;
  @mutation.web3.setSoraAccountDialogVisibility private setSoraAccountDialogVisibility!: (flag: boolean) => void;

  @getter.wallet.account.account public soraAccount!: Nullable<WALLET_TYPES.PolkadotJsAccount>;

  @action.wallet.account.loginAccount public loginAccount!: (account: WALLET_TYPES.PolkadotJsAccount) => Promise<void>;
  @action.wallet.account.logout public logout!: () => Promise<void>;
  @action.wallet.account.renameAccount public rename!: (data: { address: string; name: string }) => Promise<void>;

  get chainApi() {
    return api;
  }

  get visibility(): boolean {
    return this.soraAccountDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSoraAccountDialogVisibility(flag);
  }

  async login(account: WALLET_TYPES.PolkadotJsAccount): Promise<void> {
    await this.loginAccount(account);
    this.closeView();
  }

  closeView(): void {
    this.visibility = false;
  }
}
</script>

<style lang="scss">
.account-select-dialog.dialog-wrapper {
  .el-dialog > {
    .el-dialog__header {
      display: none;
    }
    .el-dialog__body {
      padding: 0;

      .el-card.base {
        max-width: 100%;
      }
    }
  }
}
</style>
