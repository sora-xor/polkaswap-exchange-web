<template>
  <dialog-base :visible.sync="visibility" :show-close-button="false" class="account-select-dialog">
    <connection-view
      :get-api="getApi"
      :account="subAccount"
      :login-account="loginAccount"
      :logout-account="logoutAccount"
      :rename-account="renameAccount"
      :close-view="closeView"
      :show-close="!subAccount.address"
      shadow="never"
    />
  </dialog-base>
</template>

<script lang="ts">
import { components, WALLET_TYPES } from '@soramitsu/soraneo-wallet-web';
import { Component, Mixins } from 'vue-property-decorator';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import { action, getter, state, mutation } from '@/store/decorators';
import type { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';

@Component({
  components: {
    DialogBase: components.DialogBase,
    ConnectionView: components.ConnectionView,
  },
})
export default class BridgeSelectAccount extends Mixins(TranslationMixin) {
  @state.bridge.subBridgeConnector private subBridgeConnector!: SubNetworksConnector;

  @getter.web3.subAccount public subAccount!: WALLET_TYPES.PolkadotJsAccount;

  @state.web3.selectAccountDialogVisibility private selectAccountDialogVisibility!: boolean;
  @mutation.web3.setSelectAccountDialogVisibility private setSelectAccountDialogVisibility!: (flag: boolean) => void;

  @action.web3.selectSubAccount private selectSubAccount!: (account: WALLET_TYPES.PolkadotJsAccount) => Promise<void>;
  @action.web3.resetSubAccount public logoutAccount!: () => void;
  @action.web3.changeSubAccountName public renameAccount!: (data: { address: string; name: string }) => Promise<void>;

  get visibility(): boolean {
    return this.selectAccountDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSelectAccountDialogVisibility(flag);
  }

  getApi() {
    return this.subBridgeConnector.accountApi;
  }

  async loginAccount(account: WALLET_TYPES.PolkadotJsAccount): Promise<void> {
    await this.selectSubAccount(account);
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

<style lang="scss" scoped>
.account-select {
  display: flex;
  flex-flow: column nowrap;
  gap: $inner-spacing-medium;

  @include full-width-button('account-select-button', 0);
}
</style>
