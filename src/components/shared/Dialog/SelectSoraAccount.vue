<template>
  <dialog-base v-model:visible="visible" :show-close-button="false" class="account-select-dialog">
    <connection-view
      :chain-api="chainApi"
      :account="soraAccount"
      :login-account="login"
      :logout-account="logout"
      :rename-account="rename"
      :close-view="closeView"
      :show-close="!soraAccount?.address"
    ></connection-view>
  </dialog-base>
</template>

<script setup lang="ts">
import { api, components, WALLET_TYPES } from '@wallet';
import { computed } from 'vue';

import store from '@/store';
import { useWalletStore } from '@/stores/wallet';

defineOptions({
  components: {
    DialogBase: components.DialogBase,
    ConnectionView: components.ConnectionView,
  },
});

const visible = computed({
  get: () => Boolean(store.state.web3.soraAccountDialogVisibility),
  set: (flag: boolean) => {
    store.commit.web3.setSoraAccountDialogVisibility(flag);
  },
});

const walletStore = useWalletStore();

const soraAccount = computed(() => walletStore.account as Nullable<WALLET_TYPES.PolkadotJsAccount>);

const chainApi = api;

const loginAccount = walletStore.loginAccount;
const logout = () => walletStore.logout();
const rename = (data: { address: string; name: string }) => walletStore.renameAccount(data);

async function login(account: WALLET_TYPES.PolkadotJsAccount): Promise<void> {
  await loginAccount(account);
  closeView();
}

function closeView(): void {
  visible.value = false;
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
