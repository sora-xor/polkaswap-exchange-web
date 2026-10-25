<template>
  <account-confirm-dialog
    v-model:visible="visible"
    with-timeout
    :account="account"
    :loading="loading"
    :passphrase="passphrase"
    :confirm-button-text="t('desktop.dialog.confirmButton')"
    @confirm="handleConfirm"
  ></account-confirm-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick } from 'vue';

import { useWalletStore } from '@/stores/wallet';

import { useLoading } from '../composables/useLoading';
import { useNotification } from '../composables/useNotification';
import { delay } from '../util';
import { unlockAccountPair } from '../util/account';

import AccountConfirmDialog from './Account/ConfirmDialog.vue';

import type { PolkadotJsAccount } from '../types/common';
import type { WithKeyring } from '@sora-substrate/sdk';

const props = defineProps<{
  account: Nullable<PolkadotJsAccount>;
  chainApi: WithKeyring;
  visibility: boolean;
  setVisibility: (flag: boolean) => void;
}>();

const walletStore = useWalletStore();
const { t, withAppNotification } = useNotification();
const { loading, withLoading } = useLoading();

const isSignTxDialogDisabled = computed(() => walletStore.isSignTxDialogDisabled);
const getPassword = computed(() => walletStore.getPassword);
const visible = computed({
  get: (): boolean => props.visibility,
  set: (flag: boolean): void => {
    props.setVisibility(flag);
  },
});
const passphrase = computed<Nullable<string>>(() => {
  const address = props.account?.address;

  return address ? getPassword.value(address) : null;
});

function setAccountPassphrase(payload: { address: string; password: string }) {
  return walletStore.setAccountPassphrase(payload);
}

function resetAccountPassphrase(address: string) {
  return walletStore.resetAccountPassphrase(address);
}

async function handleConfirm(password: string): Promise<void> {
  await withLoading(async () => {
    // hack: to render loading state before sync code execution, 250 - button transition
    await nextTick();
    await delay(250);

    await withAppNotification(async () => {
      const address = props.account?.address;

      if (!address) {
        props.setVisibility(false);
        return;
      }

      unlockAccountPair(props.chainApi, password);

      if (isSignTxDialogDisabled.value) {
        setAccountPassphrase({ address, password });
      } else {
        resetAccountPassphrase(address);
      }

      props.setVisibility(false);
    });
  });
}
</script>
