<template>
  <dialog-base
    v-model:visible="visibility"
    :show-close-button="false"
    append-to-body
    class="account-select-dialog"
    wrapper-class="account-select-dialog"
  >
    <connection-view
      :chain-api="chainApi"
      :account="subAccount"
      :login-account="login"
      :logout-account="logout"
      :rename-account="rename"
      :close-view="closeView"
      :check-connected-account-source="checkConnectedAccountSource"
      :show-close="!subAccount.address"
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
  .dialog-card {
    box-shadow: var(--s-shadow-dialog);
  }

  .dialog-card__header {
    display: none;
  }

  .dialog-card__content {
    padding: 0;
    max-height: none;
    overflow: visible;
  }

  .dialog-card > .el-card.base {
    max-width: 100%;
  }

  .dialog-card .base-title_close.el-button {
    width: 42px;
    min-width: 42px;
    height: 42px;
    border-radius: 50% !important;
    background-color: var(--s-color-utility-body);
    color: #d5cdd0;
    box-shadow: var(--s-shadow-element) !important;
  }

  .dialog-card .base-title_close.el-button .s-button__icon > i {
    color: #d5cdd0 !important;
    opacity: 1 !important;
  }

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
