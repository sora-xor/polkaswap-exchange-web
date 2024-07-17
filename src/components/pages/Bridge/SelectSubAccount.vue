<template>
  <dialog-base :visible.sync="visibility" :show-close-button="false" class="account-select-dialog">
    <connection-view
      :chain-api="chainApi"
      :account="subAccount"
      :login-account="login"
      :logout-account="logout"
      :rename-account="rename"
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
export default class BridgeSelectSubAccount extends Mixins(TranslationMixin) {
  @state.bridge.subBridgeConnector private subBridgeConnector!: SubNetworksConnector;

  @state.web3.subAccountDialogVisibility private subAccountDialogVisibility!: boolean;
  @mutation.web3.setSubAccountDialogVisibility private setSubAccountDialogVisibility!: (flag: boolean) => void;

  @getter.web3.subAccount public subAccount!: WALLET_TYPES.PolkadotJsAccount;

  @action.web3.selectSubAccount private selectSubAccount!: (account: WALLET_TYPES.PolkadotJsAccount) => Promise<void>;
  @action.web3.resetSubAccount public logout!: () => void;
  @action.web3.changeSubAccountName public rename!: (data: { address: string; name: string }) => Promise<void>;

  get visibility(): boolean {
    return this.subAccountDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSubAccountDialogVisibility(flag);
  }

  get chainApi() {
    return this.subBridgeConnector.accountApi;
  }

  async login(account: WALLET_TYPES.PolkadotJsAccount): Promise<void> {
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
