<template>
  <dialog-base :visible.sync="visibility" :title="t('connection.selectAccount')" class="account-select-dialog">
    <connection-view :get-api="getApi" :account="subAccount" :login-account="loginAccount" :close-view="closeView" />
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

  @state.web3.subAddress private subAddress!: string;
  @state.web3.selectAccountDialogVisibility private selectAccountDialogVisibility!: boolean;
  @mutation.web3.setSelectAccountDialogVisibility private setSelectAccountDialogVisibility!: (flag: boolean) => void;

  @action.web3.selectSubAccount private selectSubAccount!: (account: WALLET_TYPES.PolkadotJsAccount) => Promise<void>;

  get visibility(): boolean {
    return this.selectAccountDialogVisibility;
  }

  set visibility(flag: boolean) {
    this.setSelectAccountDialogVisibility(flag);
  }

  getApi() {
    return this.subBridgeConnector.accountApi;
  }

  async loginAccount(account: WALLET_TYPES.PolkadotJsAccount) {
    await this.selectSubAccount(account);
    this.closeView();
  }

  closeView(): void {
    this.visibility = false;
  }
}
</script>

<style lang="scss" scoped>
.account-select {
  display: flex;
  flex-flow: column nowrap;
  gap: $inner-spacing-medium;

  @include full-width-button('account-select-button', 0);
}
</style>
