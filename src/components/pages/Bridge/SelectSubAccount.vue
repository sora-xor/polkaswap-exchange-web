<template>
  <dialog-base v-model:visible="visibility" :show-close-button="false" append-to-body class="account-select-dialog">
    <connection-view
      :chain-api="chainApi"
      :account="subAccount"
      :login-account="login"
      :logout-account="logout"
      :rename-account="rename"
      :close-view="closeView"
      :check-connected-account-source="checkConnectedAccountSource"
      :show-close="!subAccount.address"
      shadow="never"
    ></connection-view>
  </dialog-base>
</template>

<script lang="ts" setup>
import { components, WALLET_TYPES } from '@wallet';
import { computed } from 'vue';

import store from '@/store';
import { useBridgeStore } from '@/stores/bridge';
import { useWeb3Store } from '@/stores/web3';

import type { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';

defineOptions({
  components: {
    DialogBase: components.DialogBase,
    ConnectionView: components.ConnectionView,
  },
});

const bridgeStore = useBridgeStore();
const web3Store = useWeb3Store();

const visibility = computed({
  get: () => web3Store.subAccountDialogVisibility,
  set: (flag: boolean) => store.commit.web3.setSubAccountDialogVisibility(flag),
});

const subBridgeConnector = computed<SubNetworksConnector>(() => bridgeStore.connector);
const subAccount = computed<WALLET_TYPES.PolkadotJsAccount>(() => {
  return (
    web3Store.subAccount ??
    ({
      address: '',
      name: '',
      source: '' as WALLET_TYPES.AppWallet,
    } as WALLET_TYPES.PolkadotJsAccount)
  );
});

const chainApi = computed(() => subBridgeConnector.value.accountApi);

const logout = () => store.dispatch.web3.resetSubAccount();
const rename = (payload: { address: string; name: string }) => store.dispatch.web3.changeSubAccountName(payload);

const checkConnectedAccountSource = (source: string) => {
  if (source && subAccount.value && subAccount.value.source === source) {
    logout();
  }
};

const closeView = () => {
  visibility.value = false;
};

const login = async (account: WALLET_TYPES.PolkadotJsAccount): Promise<void> => {
  await store.dispatch.web3.selectSubAccount(account);
  closeView();
};
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
