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
import { components } from '@/shims/wallet-components';
import { computed } from 'vue';

import type { AppWallet } from '@/shims/wallet-consts';
import type { PolkadotJsAccount } from '@/shims/wallet-common-types';
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
  set: (flag: boolean) => web3Store.setSubAccountDialogVisibility(flag),
});

const subBridgeConnector = computed<SubNetworksConnector>(() => bridgeStore.connector);
const subAccount = computed<PolkadotJsAccount>(() => {
  return (
    web3Store.subAccount ??
    ({
      address: '',
      name: '',
      source: '' as AppWallet,
    } as PolkadotJsAccount)
  );
});

const chainApi = computed(() => subBridgeConnector.value.accountApi);

const logout = () => web3Store.resetSubAccount();
const rename = (payload: { address: string; name: string }) => web3Store.changeSubAccountName(payload);

const checkConnectedAccountSource = (source: string) => {
  if (source && subAccount.value && subAccount.value.source === source) {
    logout();
  }
};

const closeView = () => {
  visibility.value = false;
};

const login = async (account: PolkadotJsAccount): Promise<void> => {
  await web3Store.selectSubAccount(account);
  closeView();
};
</script>

<style lang="scss">
.account-select-dialog.dialog-wrapper {
  .dialog-card {
    background: transparent;
    box-shadow: none !important;
    border-radius: 0;
    overflow: hidden;
  }

  .dialog-card__header {
    display: none;
  }

  .dialog-card__content {
    padding: 0;
    max-height: none;
    overflow: hidden;
  }

  .dialog-card__content > .el-card.base {
    width: 100%;
    max-width: none;
    box-sizing: border-box;
    box-shadow: none !important;
    padding: 24px 24px 32px;

    > .el-card__body {
      padding: 0;
    }
  }

  .dialog-card__content .connection-items.el-scrollbar > .el-scrollbar__wrap {
    overflow-y: auto !important;
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
        width: 100%;
        max-width: none;
        box-sizing: border-box;
        box-shadow: none !important;
        padding: 24px 24px 32px;

        > .el-card__body {
          padding: 0;
        }
      }
    }
  }
}
</style>
