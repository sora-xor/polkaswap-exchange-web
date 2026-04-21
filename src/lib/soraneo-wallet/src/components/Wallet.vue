<template>
  <wallet-base :title="headerTitle" :show-back="!!selectedTransaction" :reset-focus="headerTitle" @back="handleBack">
    <template v-if="!selectedTransaction" #actions>
      <s-button :type="isMultisig() ? 'primary' : 'tertiary'" @click="handleMST"> MULTI-SIG </s-button>
      <!-- <s-button @click="handleEncrypt">Encrypt</s-button> -->

      <s-button type="action" :tooltip="t('accountSettings.title')" @click="handleAccountSettings">
        <s-icon name="basic-settings-24" size="28"></s-icon>
      </s-button>
      <s-button
        v-if="permissions.createAssets"
        type="action"
        :tooltip="t('createTokenText')"
        @click="handleCreateToken"
      >
        <s-icon name="various-atom-24" size="28"></s-icon>
      </s-button>
    </template>

    <wallet-account v-if="!selectedTransaction" class="wallet-account-panel">
      <qr-code-scan-button alternative @change="parseQrCodeValue"></qr-code-scan-button>

      <s-button
        type="action"
        size="small"
        alternative
        rounded
        :tooltip="t('code.receive')"
        @click="receiveByQrCode(null)"
      >
        <s-icon name="finance-receive-show-QR-24" size="24"></s-icon>
      </s-button>

      <s-button
        type="action"
        size="small"
        alternative
        rounded
        :tooltip="t('account.switch')"
        @click="handleSwitchAccount"
      >
        <s-icon name="arrows-refresh-ccw-24" size="24"></s-icon>
      </s-button>

      <account-actions-menu
        v-if="!isExternal"
        :actions="accountActions"
        @select="handleAccountActionType"
      ></account-actions-menu>
    </wallet-account>

    <div v-show="!selectedTransaction" class="wallet">
      <s-tabs v-model="currentTab" type="rounded">
        <s-tab v-for="tab in WalletTabs" :key="tab" :label="t(`wallet.${tab}`)" :name="tab"></s-tab>
      </s-tabs>
      <component :is="currentTabComponent" @swap="handleSwap"></component>
    </div>

    <wallet-transaction-details
      v-if="selectedTransaction"
      @back-to-wallet="signTransaction"
    ></wallet-transaction-details>

    <account-settings-dialog v-model:visible="accountSettingsVisibility"></account-settings-dialog>
    <mst-onboarding-dialog v-model:visible="mstOnboardingDialog"></mst-onboarding-dialog>
    <multisig-change-name-dialog v-model:visible="dialogMSTNameChange"></multisig-change-name-dialog>

    <template v-if="!isExternal">
      <account-rename-dialog
        v-model:visible="accountRenameVisibility"
        :loading="loading"
        @confirm="handleAccountRename"
      ></account-rename-dialog>
      <account-export-dialog
        v-model:visible="accountExportVisibility"
        :loading="loading"
        @confirm="handleAccountExport"
      ></account-export-dialog>
      <account-delete-dialog
        v-model:visible="accountDeleteVisibility"
        :loading="loading"
        @confirm="handleAccountDelete"
      ></account-delete-dialog>
    </template>
  </wallet-base>
</template>

<script setup lang="ts">
import { api } from '@sora-substrate/sdk';
import { computed, onMounted, ref, type Component } from 'vue';

import { getWalletCurrentParams } from '@/platform/wallet/navigation';
import { useAccountActions } from '../composables/useAccountActions';
import { useOperations } from '../composables/useOperations';
import { useQrCodeParser } from '../composables/useQrCodeParser';
import { PolkadotJsAccount } from '@/types/common';

import { useWalletStore } from '@/stores/wallet';

import { RouteNames, WalletTabs, AccountActionTypes } from '../consts';

import AccountActionsMenu from './Account/ActionsMenu.vue';
import AccountExportDialog from './Account/ConfirmDialog.vue';
import AccountDeleteDialog from './Account/DeleteDialog.vue';
import AccountRenameDialog from './Account/RenameDialog.vue';
import AccountSettingsDialog from './Account/SettingsDialog.vue';
import WalletAccount from './Account/WalletAccount.vue';
import MstOnboardingDialog from './MST/MstOnboardingDialog.vue';
import MultisigChangeNameDialog from './MST/MultisigChangeNameDialog.vue';
import QrCodeScanButton from './QrCode/QrCodeScanButton.vue';
import WalletAssets from './WalletAssets.vue';
import WalletBase from './WalletBase.vue';
import WalletHistory from './WalletHistory.vue';
import WalletTransactionDetails from './WalletTransactionDetails.vue';

import type { WalletPermissions } from '../consts';
import type { HistoryItem } from '@sora-substrate/sdk';

const emit = defineEmits<{
  swap: [asset: unknown];
}>();

const walletStore = useWalletStore();
const {
  loading,
  accountRenameVisibility,
  accountExportVisibility,
  accountDeleteVisibility,
  handleAccountAction,
  handleAccountRename,
  handleAccountExport,
  handleAccountDelete,
} = useAccountActions();
const { t, getTitle } = useOperations();
const { parseQrCodeValue, receiveByQrCode } = useQrCodeParser();

const accountActions = [
  AccountActionTypes.Rename,
  AccountActionTypes.Export,
  AccountActionTypes.Logout,
  AccountActionTypes.Delete,
];

const currentTab = ref<WalletTabs>(WalletTabs.Assets);
const accountSettingsVisibility = ref(false);
const mstOnboardingDialog = ref(false);
const dialogMSTNameChange = ref(false);

const walletTabComponents = {
  [WalletTabs.Assets]: WalletAssets,
  [WalletTabs.History]: WalletHistory,
} as const satisfies Record<WalletTabs, Component>;

const permissions = computed(() => walletStore.permissions);
const isMSTAvailable = computed(() => walletStore.isMSTAvailable);
const isExternal = computed(() => walletStore.isExternal);
const isMST = computed(() => walletStore.isMST);
const isMstAddressExist = computed(() => walletStore.isMstAddressExist);
const selectedTransaction = computed(() => walletStore.selectedTransaction);
const accountOwn = computed(() => walletStore.account);
const currentRouteParams = computed<Record<string, Nullable<WalletTabs>>>(() => {
  return getWalletCurrentParams<Record<string, Nullable<WalletTabs>>>();
});
const currentTabComponent = computed<Component>(() => walletTabComponents[currentTab.value]);
const headerTitle = computed(() => {
  if (!selectedTransaction.value) return t('account.accountTitle');

  return getTitle(selectedTransaction.value as HistoryItem);
});
const mstName = computed(() => api.mst?.getMSTName?.() ?? '');
const isMSTAccount = computed(() => isMST.value && mstName.value !== '');
const hasMSTAccount = computed(() => !isMST.value && (isMstAddressExist.value || mstName.value !== ''));

function resetTxDetailsId(): void {
  walletStore.resetTxDetailsId();
}

function navigate(options: { name: string; params?: Record<string, unknown> }): void {
  walletStore.navigate(options);
}

function handleSwap(asset: unknown): void {
  emit('swap', asset);
}

function handleCreateToken(): void {
  navigate({ name: RouteNames.CreateToken });
}

function handleSwitchAccount(): void {
  navigate({ name: RouteNames.WalletConnection });
}

function signTransaction(): void {
  resetTxDetailsId();
  currentTab.value = WalletTabs.Assets;
}

async function handleEncrypt(): Promise<void> {
  const callData = { foo: 'bar', number: 42 };
  const callDataStr = JSON.stringify(callData);
  interface Cosigners {
    [address: string]: Uint8Array;
  }
  const cosignersForEncrypt: any = {
    mySelf: '0xb059889e6a2ea918fb1ad11cec2bd16dc8e9acf20cca4afc8773a26ffdcc8b1e',
    bob: '0xf86369e951ec69f1ec84b12cb20097b30590480d0f62abacc391e30f2e18ce54',
    charlie: '0xdebe76e08fb9036a25d968e939c1c2836186049bc57f708ec827bc145869f406',
  };
  console.info('cosignersForEncrypt', cosignersForEncrypt);
  interface EncryptByCosignerData {
    address: string;
    data: string;
    cosigners: Cosigners;
  }
  console.info('this.accountOwn.address', (accountOwn.value as PolkadotJsAccount).address);
  const encryptParams: EncryptByCosignerData = {
    address: (accountOwn.value as PolkadotJsAccount).address,
    data: callDataStr,
    cosigners: cosignersForEncrypt,
  };
  console.info('encryptParams', encryptParams);

  const finalEncrypted = await (window as any).injectedWeb3['fearless-wallet'].encryptByCosigner(encryptParams);
  console.info('finalEncrypted', finalEncrypted);
}

function handleMST(): void {
  if ((isMSTAccount.value || hasMSTAccount.value) && isMSTAvailable.value) {
    dialogMSTNameChange.value = true;
  } else {
    mstOnboardingDialog.value = true;
  }
}

function handleAccountActionType(actionType: string): void {
  if (!accountOwn.value) return;

  handleAccountAction(actionType, accountOwn.value);
}

function handleAccountSettings(): void {
  accountSettingsVisibility.value = !accountSettingsVisibility.value;
}

function handleBack(): void {
  if (selectedTransaction.value) {
    resetTxDetailsId();
  }
}

function isMultisig(): boolean {
  return isMSTAccount.value;
}

onMounted(() => {
  if (currentRouteParams.value.currentTab) {
    currentTab.value = currentRouteParams.value.currentTab;
  }
});
</script>

<style lang="scss">
.wallet {
  @include custom-tabs;
}
</style>

<style scoped lang="scss">
.wallet {
  margin-top: 16px;

  :deep(.el-tabs__item) {
    text-transform: uppercase;
  }
}
</style>
