import { nextTick, ref } from 'vue';

import { useWalletStore } from '@/stores/wallet';

import { api } from '../api';
import { AppWallet, AccountActionTypes } from '../consts';
import { GDriveWallet } from '../services/google/wallet';
import { delay } from '../util';
import { verifyAccountJson, exportAccountJson, exportAccount, deleteAccount } from '../util/account';
import { settingsStorage } from '../util/storage';

import { useLoading } from './useLoading';
import { useNotification } from './useNotification';

import type { PolkadotJsAccount } from '../types/common';

export function useAccountActions() {
  const walletStore = useWalletStore();
  const loadingApi = useLoading();
  const notification = useNotification();
  const { withLoading } = loadingApi;
  const { withAppNotification } = notification;

  const accountRenameVisibility = ref(false);
  const accountExportVisibility = ref(false);
  const accountDeleteVisibility = ref(false);
  const selectedAccount = ref<Nullable<PolkadotJsAccount>>(null);

  const renameAccount = (payload: { address: string; name: string }) => walletStore.renameAccount(payload);
  const logoutAccount = () => walletStore.logout();
  const isConnectedAccount = walletStore.isConnectedAccount;

  const handleAccountAction = (actionType: string, account: PolkadotJsAccount): void => {
    selectedAccount.value = { ...account };

    switch (actionType) {
      case AccountActionTypes.Rename:
        accountRenameVisibility.value = true;
        break;
      case AccountActionTypes.Export:
        accountExportVisibility.value = true;
        break;
      case AccountActionTypes.Logout:
        void logoutAccount();
        break;
      case AccountActionTypes.Delete: {
        const storageValue = settingsStorage.get('allowAccountDeletePopup');
        const popupVisibility = storageValue ? Boolean(JSON.parse(storageValue)) : true;

        if (popupVisibility) {
          accountDeleteVisibility.value = true;
        } else {
          void handleAccountDelete();
        }
        break;
      }
    }
  };

  const handleAccountRename = async (name: string): Promise<void> => {
    await withLoading(async () => {
      await withAppNotification(async () => {
        if (!selectedAccount.value) return;

        const { address, source } = selectedAccount.value;

        if (source === AppWallet.GoogleDrive) {
          await GDriveWallet.accounts.changeName(address, name);
        }

        if (isConnectedAccount(selectedAccount.value)) {
          await renameAccount({ address, name });
        }

        accountRenameVisibility.value = false;
      });
    });
  };

  const handleAccountExport = async (password: string): Promise<void> => {
    await withLoading(async () => {
      await nextTick();
      await delay(250);

      await withAppNotification(async () => {
        if (!selectedAccount.value) return;

        const { address, source } = selectedAccount.value;

        if (source === AppWallet.GoogleDrive) {
          const json = await GDriveWallet.accounts.getAccount(address, password);

          if (!json) throw new Error('polkadotjs.noAccount');

          const verified = verifyAccountJson(api, json, password);

          exportAccountJson(verified);
        } else {
          exportAccount(api, { address, password });
        }

        accountExportVisibility.value = false;
      });
    });
  };

  const handleAccountDelete = async (allowAccountDeletePopup = true): Promise<void> => {
    await withLoading(async () => {
      await withAppNotification(async () => {
        if (!selectedAccount.value) return;

        if (!allowAccountDeletePopup) {
          settingsStorage.set('allowAccountDeletePopup', false);
        }

        if (isConnectedAccount(selectedAccount.value)) {
          await logoutAccount();
        }

        if (selectedAccount.value.source === AppWallet.GoogleDrive) {
          await GDriveWallet.accounts.delete(selectedAccount.value.address);
        } else {
          deleteAccount(api, selectedAccount.value.address);
        }

        accountDeleteVisibility.value = false;
      });
    });
  };

  return {
    ...loadingApi,
    ...notification,
    accountRenameVisibility,
    accountExportVisibility,
    accountDeleteVisibility,
    selectedAccount,
    renameAccount,
    logoutAccount,
    isConnectedAccount,
    handleAccountAction,
    handleAccountRename,
    handleAccountExport,
    handleAccountDelete,
  };
}
