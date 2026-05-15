<template>
  <dialog-base
    v-model:visible="visible"
    :show-close-button="false"
    class="account-select-dialog"
    wrapper-class="account-select-dialog"
  >
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
import { api } from '@/lib/soraneo-wallet/src/api';
import { computed } from 'vue';

import type { PolkadotJsAccount } from '@/lib/soraneo-wallet/src/types/common';
import { useWalletStore } from '@/stores/wallet';
import { useWeb3Store } from '@/stores/web3';
import WalletComponentDialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import WalletComponentConnectionView from '@/lib/soraneo-wallet/src/components/Connection/ConnectionView.vue';

defineOptions({
  components: {
    DialogBase: WalletComponentDialogBase,
    ConnectionView: WalletComponentConnectionView,
  },
});

const web3Store = useWeb3Store();

const visible = computed({
  get: () => Boolean(web3Store.soraAccountDialogVisibility),
  set: (flag: boolean) => {
    web3Store.setSoraAccountDialogVisibility(flag);
  },
});

const walletStore = useWalletStore();

const soraAccount = computed(() => walletStore.account as Nullable<PolkadotJsAccount>);

const chainApi = api;

const loginAccount = walletStore.loginAccount;
const logout = () => walletStore.logout();
const rename = (data: { address: string; name: string }) => walletStore.renameAccount(data);

async function login(account: PolkadotJsAccount): Promise<void> {
  await loginAccount(account);
  closeView();
}

function closeView(): void {
  visible.value = false;
}
</script>

<style lang="scss">
.account-select-dialog.dialog-wrapper {
  font-family: var(--s-font-family-default, 'Sora, sans-serif');

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
    font-family: inherit;

    > .el-card__body {
      padding: 0;
    }
  }

  .wallet-connection,
  .wallet-connection * {
    font-family: inherit;
  }

  .dialog-card .base-title.base-title--center {
    padding-left: calc(var(--s-size-medium) + 8px);
    padding-right: calc(var(--s-size-medium) + 8px);
  }

  .dialog-card .base-title.base-title--actions.base-title--center {
    padding-left: calc(var(--s-size-medium) + 8px);
    padding-right: calc(var(--s-size-medium) + 8px);
  }

  .dialog-card .base-title_text {
    min-width: 0;
  }

  @media (max-width: 480px) {
    .dialog-card .base-title {
      height: auto;
      min-height: var(--s-size-medium);
      align-items: flex-start;
    }

    .dialog-card .base-title_text {
      white-space: normal;
      overflow: visible;
      text-overflow: clip;
      font-size: var(--s-font-size-medium);
      line-height: var(--s-line-height-small);
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
