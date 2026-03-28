<template>
  <div>
    <div class="connection">
      <p v-if="text" class="connection__text">
        {{ text }}
      </p>

      <account-connection-list
        :accounts="accounts"
        :wallet="selectedWallet"
        :is-connected="isConnectedAccount"
        :chain-api="chainApi"
        class="connection__accounts"
        @select="handleSelectAccount"
      >
        <template v-if="isInternal" #menu="account">
          <account-actions-menu
            :actions="accountActions"
            @select="handleAccountAction($event, account)"
          ></account-actions-menu>
        </template>
      </account-connection-list>

      <connection-items v-if="isInternal">
        <account-card v-button class="connection__button" tabindex="0" @click="handleCreateAccount">
          <template #avatar>
            <s-icon name="basic-circle-plus-24" size="28" class="connection__button-icon"></s-icon>
          </template>
          <template #name>{{ t('desktop.button.createAccount') }}</template>
        </account-card>
        <account-card v-button class="connection__button" tabindex="0" @click="handleImportAccount">
          <template #avatar>
            <s-icon name="el-icon-link" size="28" class="connection__button-icon"></s-icon>
          </template>
          <template #name>{{ t('desktop.button.importAccount') }}</template>
        </account-card>
      </connection-items>

      <s-button
        v-else-if="noAccounts"
        class="connection__button s-typography-button--large"
        type="primary"
        :loading="loading"
        @click="handleRefreshClick"
      >
        {{ t('connection.action.refresh') }}
      </s-button>
    </div>

    <template v-if="isInternal">
      <account-rename-dialog
        v-model:visible="accountRenameVisibility"
        :account="selectedAccount"
        :loading="loading"
        @confirm="handleRenameAccount"
      ></account-rename-dialog>
      <account-export-dialog
        v-model:visible="accountExportVisibility"
        :account="selectedAccount"
        :loading="loading"
        @confirm="handleExportAccount"
      ></account-export-dialog>
      <account-delete-dialog
        v-model:visible="accountDeleteVisibility"
        :loading="loading"
        @confirm="handleDeleteAccount"
      ></account-delete-dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

import { useLoading } from '../../../composables/useLoading';
import { useNotification } from '../../../composables/useNotification';
import { AccountActionTypes, AppWallet } from '../../../consts';
import { GDriveWallet } from '../../../services/google/wallet';
import { delay } from '../../../util';
import { verifyAccountJson, exportAccountJson } from '../../../util/account';
import { settingsStorage } from '../../../util/storage';
import AccountCard from '../../Account/AccountCard.vue';
import AccountActionsMenu from '../../Account/ActionsMenu.vue';
import AccountExportDialog from '../../Account/ConfirmDialog.vue';
import AccountDeleteDialog from '../../Account/DeleteDialog.vue';
import AccountRenameDialog from '../../Account/RenameDialog.vue';
import AccountConnectionList from '../List/Account.vue';
import ConnectionItems from '../List/ConnectionItems.vue';
import { formatConnectedAddress } from '../utils';

import type { PolkadotJsAccount } from '../../../types/common';
import type { WithKeyring } from '@sora-substrate/sdk';

const accountActions = [AccountActionTypes.Rename, AccountActionTypes.Export, AccountActionTypes.Delete];

const props = withDefaults(
  defineProps<{
    chainApi: WithKeyring;
    text?: string;
    isInternal?: boolean;
    selectedWallet?: string;
    connectedWallet?: AppWallet | '';
    connectedAccount?: string;
    accounts?: PolkadotJsAccount[];
    logoutAccount?: () => Promise<void>;
    renameAccount?: (data: { address: string; name: string }) => Promise<void>;
    exportAccount?: (data: { address: string; password: string }) => Promise<void>;
    deleteAccount?: (address: string) => Promise<void>;
  }>(),
  {
    text: '',
    isInternal: false,
    selectedWallet: '',
    connectedWallet: '',
    connectedAccount: '',
    accounts: () => [],
    logoutAccount: async () => undefined,
    renameAccount: async () => undefined,
    exportAccount: async () => undefined,
    deleteAccount: async () => undefined,
  }
);

const emit = defineEmits<{
  select: [account: PolkadotJsAccount, isConnected: boolean];
  create: [];
  import: [];
}>();

const { loading, withLoading } = useLoading();
const { t, withAppNotification } = useNotification();

const accountRenameVisibility = ref(false);
const accountExportVisibility = ref(false);
const accountDeleteVisibility = ref(false);
const selectedAccount = ref<Nullable<PolkadotJsAccount>>(null);

const noAccounts = computed(() => !props.accounts.length);

function isConnectedAccount(account: PolkadotJsAccount): boolean {
  return (
    props.connectedWallet === account.source &&
    formatConnectedAddress(
      props.chainApi as Nullable<{ formatAddress?: (address: string, isShort?: boolean) => string }>,
      props.connectedAccount
    ) === account.address
  );
}

function handleAccountAction(actionType: string, account: PolkadotJsAccount): void {
  selectedAccount.value = { ...account };

  switch (actionType) {
    case AccountActionTypes.Rename: {
      accountRenameVisibility.value = true;
      break;
    }
    case AccountActionTypes.Export: {
      accountExportVisibility.value = true;
      break;
    }
    case AccountActionTypes.Delete: {
      const storageValue = settingsStorage.get('allowAccountDeletePopup');
      const popupVisibility = storageValue ? Boolean(JSON.parse(storageValue)) : true;

      if (popupVisibility) {
        accountDeleteVisibility.value = true;
      } else {
        void handleDeleteAccount();
      }
      break;
    }
  }
}

function handleRefreshClick(): void {
  window.history.go();
}

function handleSelectAccount(account: PolkadotJsAccount, isConnected: boolean): void {
  emit('select', account, isConnected);
}

function handleCreateAccount(): void {
  emit('create');
}

function handleImportAccount(): void {
  emit('import');
}

async function handleRenameAccount(name: string): Promise<void> {
  await withLoading(async () => {
    await withAppNotification(async () => {
      if (!selectedAccount.value) return;

      const { address, source } = selectedAccount.value;

      if (source === AppWallet.GoogleDrive) {
        await GDriveWallet.accounts.changeName(address, name);
      }

      if (isConnectedAccount(selectedAccount.value) || source === AppWallet.Sora) {
        await props.renameAccount({ address, name });
      }

      accountRenameVisibility.value = false;
    });
  });
}

async function handleExportAccount(password: string): Promise<void> {
  await withLoading(async () => {
    await nextTick();
    await delay(250);

    await withAppNotification(async () => {
      if (!selectedAccount.value) return;

      const { address, source } = selectedAccount.value;

      if (source === AppWallet.GoogleDrive) {
        const json = await GDriveWallet.accounts.getAccount(address, password);

        if (!json) throw new Error('polkadotjs.noAccount');

        const verified = verifyAccountJson(props.chainApi, json, password);

        exportAccountJson(verified);
      } else {
        await props.exportAccount({ address, password });
      }

      accountExportVisibility.value = false;
    });
  });
}

async function handleDeleteAccount(allowAccountDeletePopup = true): Promise<void> {
  await withLoading(async () => {
    await withAppNotification(async () => {
      if (!selectedAccount.value) return;

      if (!allowAccountDeletePopup) {
        settingsStorage.set('allowAccountDeletePopup', false);
      }

      if (isConnectedAccount(selectedAccount.value)) {
        await props.logoutAccount();
      }

      if (selectedAccount.value.source === AppWallet.GoogleDrive) {
        await GDriveWallet.accounts.delete(selectedAccount.value.address);
      } else {
        await props.deleteAccount(selectedAccount.value.address);
      }

      accountDeleteVisibility.value = false;
    });
  });
}
</script>

<style scoped lang="scss">
.connection {
  display: flex;
  flex-flow: column nowrap;
  gap: $basic-spacing-medium;

  &__text {
    font-size: var(--s-font-size-extra-small);
    font-weight: 300;
    line-height: var(--s-line-height-base);
    color: var(--s-color-base-content-primary);
  }

  &__button {
    &-icon {
      color: var(--s-color-base-content-tertiary);
    }

    &:hover,
    &:focus,
    &:active {
      .connection__button-icon {
        color: var(--s-color-base-content-secondary);
      }
    }
  }
}
</style>
