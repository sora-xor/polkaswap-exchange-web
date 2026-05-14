<template>
  <wallet-base
    :class="{ 'wallet-dashboard': !selectedTransaction }"
    :title="headerTitle"
    :show-back="!!selectedTransaction"
    :reset-focus="headerTitle"
    @back="handleBack"
  >
    <template v-if="!selectedTransaction" #actions>
      <s-button class="wallet-dashboard__mst" :type="isMultisig() ? 'primary' : 'tertiary'" @click="handleMST">
        MULTI-SIG
      </s-button>
      <!-- <s-button @click="handleEncrypt">Encrypt</s-button> -->

      <s-button
        type="action"
        :tooltip="t('accountSettings.title')"
        :aria-label="t('accountSettings.title')"
        @click="handleAccountSettings"
      >
        <s-icon name="basic-settings-24" size="28"></s-icon>
      </s-button>
      <s-button
        v-if="permissions.createAssets"
        type="action"
        :tooltip="t('createTokenText')"
        :aria-label="t('createTokenText')"
        @click="handleCreateToken"
      >
        <s-icon name="various-atom-24" size="28"></s-icon>
      </s-button>
    </template>

    <wallet-account v-if="!selectedTransaction" class="wallet-account-panel">
      <div class="wallet-account-actions">
        <qr-code-scan-button alternative @change="parseQrCodeValue"></qr-code-scan-button>

        <s-button
          type="action"
          size="small"
          alternative
          rounded
          :tooltip="t('code.receive')"
          :aria-label="t('code.receive')"
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
          :aria-label="t('account.switch')"
          @click="handleSwitchAccount"
        >
          <s-icon name="arrows-refresh-ccw-24" size="24"></s-icon>
        </s-button>

        <account-actions-menu
          v-if="!isExternal"
          :actions="accountActions"
          @select="handleAccountActionType"
        ></account-actions-menu>
      </div>
    </wallet-account>

    <div v-show="!selectedTransaction" class="wallet">
      <s-tabs v-model="currentTab" class="wallet-tabs" type="rounded">
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

.wallet-dashboard {
  max-width: min(760px, calc(100vw - 32px));
  width: 100%;

  &.base,
  &.container.container--wallet {
    max-width: min(760px, calc(100vw - 32px));
  }

  :deep(.el-card__header) {
    padding-bottom: 4px;
  }

  :deep(.base-title) {
    align-items: flex-start;
    gap: 16px;
    height: auto;
    min-height: var(--s-size-medium);
    margin-bottom: 20px;
    padding-right: 0;
  }

  :deep(.base-title_text) {
    line-height: var(--s-line-height-medium);
    white-space: normal;
  }

  :deep(.base-title_action) {
    position: static;
    display: flex;
    flex: 0 0 auto;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
    max-width: 50%;
    margin-left: auto;
  }

  :deep(.base-title_action .s-button + .s-button) {
    margin-left: 0;
  }

  :deep(.base-title_action .s-button) {
    box-shadow: none;
    border-color: var(--s-color-base-border-primary);
  }

  :deep(.base-title_action .wallet-dashboard__mst) {
    min-width: 96px;
  }

  .wallet {
    margin-top: 18px;
    padding: 0 28px 28px;
  }

  .wallet-tabs {
    width: min(300px, 100%);
    margin: 0 auto;

    :deep(.el-tabs__header) {
      width: 100%;
    }

    :deep(.el-tabs__nav-wrap) {
      height: auto;
      min-height: 38px;
      overflow: visible;
      box-sizing: border-box;
      padding: 3px;
      background: var(--s-color-utility-body);
      border: 1px solid var(--s-color-base-border-primary);
      border-radius: 8px;
      box-shadow: none;
    }

    :deep(.el-tabs__nav-scroll) {
      overflow: visible;
      padding: 0;
    }

    :deep(.el-tabs__nav) {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px;
      width: 100%;
    }

    :deep(.el-tabs__active-bar) {
      display: none;
    }

    :deep(.el-tabs__item) {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: auto;
      min-width: 0;
      height: 30px;
      min-height: 30px;
      padding: 0 12px;
      line-height: var(--s-line-height-base);
      border-radius: 6px;
      font-size: var(--s-font-size-mini);
      font-weight: 700;
      letter-spacing: 0;
      color: var(--s-color-base-content-secondary);
      box-shadow: none;
      transition:
        background-color 150ms ease,
        color 150ms ease,
        box-shadow 150ms ease;
    }

    :deep(.el-tabs__item:last-child),
    :deep(.el-tabs__item:nth-child(2)) {
      padding: 0 12px;
    }

    :deep(.el-tabs__item:not(.is-active):hover),
    :deep(.el-tabs__item:not(.is-active):focus.is-focus) {
      background: var(--s-color-utility-surface);
      box-shadow: none;
      color: var(--s-color-theme-accent-hover);
    }

    :deep(.el-tabs__item.is-active) {
      background: var(--s-color-utility-surface);
      box-shadow: var(--s-shadow-element);
      color: var(--s-color-theme-accent);
    }
  }
}

.wallet-account-panel {
  margin: 0 28px;

  &.s-card.neumorphic {
    border: 1px solid var(--s-color-base-border-primary);
    background: var(--s-color-utility-body);
    box-shadow: none;
  }

  :deep(.account) {
    min-height: 74px;
    gap: 16px;
  }

  :deep(.account-avatar) {
    width: 44px;
    height: 44px;
  }

  :deep(.account-gravatar) {
    width: 40px;
    height: 40px;
    border-color: var(--s-color-theme-accent);
  }

  :deep(.account-details) {
    min-width: 0;
    gap: 16px;
  }

  :deep(.account-credentials_name) {
    font-size: var(--s-font-size-big);
    line-height: var(--s-line-height-medium);
  }

  :deep(.account-credentials_description) {
    max-width: 100%;
  }
}

.wallet-account-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-left: auto;

  :deep(.s-button + .s-button) {
    margin-left: 0;
  }

  :deep(.s-button),
  :deep(.qr-code-container),
  :deep(.account-actions) {
    flex: 0 0 auto;
  }

  :deep(.s-button.s-button_size_sm),
  :deep(.s-button.s-small) {
    width: 36px;
    min-width: 36px;
    height: 36px;
    min-height: 36px;
    border-color: var(--s-color-base-border-primary);
    background: var(--s-color-utility-surface);
    box-shadow: none;
    color: var(--s-color-base-content-secondary);
  }

  :deep(.account-actions) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: 1px solid var(--s-color-base-border-primary);
    border-radius: 50%;
    background: var(--s-color-utility-surface);
    color: var(--s-color-base-content-secondary);
  }

  :deep(.s-button:hover),
  :deep(.s-button:focus),
  :deep(.account-actions:hover),
  :deep(.account-actions:focus-within) {
    color: var(--s-color-theme-accent);
  }
}

@media (max-width: 640px) {
  .wallet-dashboard {
    max-width: calc(100vw - 20px);

    :deep(.base-title) {
      align-items: center;
      gap: 8px;
    }

    :deep(.base-title_text) {
      flex: 1 1 auto;
      font-size: var(--s-font-size-medium);
    }

    :deep(.base-title_action) {
      flex-wrap: nowrap;
      justify-content: flex-end;
      gap: 6px;
      max-width: 100%;
      margin-left: auto;
    }

    :deep(.base-title_action .wallet-dashboard__mst) {
      min-width: 88px;
      min-height: 36px;
      height: 36px;
      padding-right: 12px;
      padding-left: 12px;
    }

    :deep(.base-title_action .s-button:not(.wallet-dashboard__mst)) {
      width: 36px;
      min-width: 36px;
      height: 36px;
      min-height: 36px;
    }

    .wallet {
      margin-top: 16px;
      padding-right: 16px;
      padding-left: 16px;
    }

    .wallet-tabs {
      width: 100%;

      :deep(.el-tabs__item) {
        height: 32px;
        min-height: 32px;
        padding: 0 8px;
        font-size: var(--s-font-size-extra-small);
      }

      :deep(.el-tabs__item:last-child),
      :deep(.el-tabs__item:nth-child(2)) {
        padding: 0 8px;
      }
    }
  }

  .wallet-account-panel {
    margin-right: 16px;
    margin-left: 16px;

    :deep(.account) {
      align-items: flex-start;
    }

    :deep(.account-details) {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }
  }

  .wallet-account-actions {
    justify-content: flex-start;
    margin-left: 0;
  }
}

@media (max-width: 360px) {
  .wallet-dashboard {
    :deep(.base-title) {
      align-items: stretch;
    }

    :deep(.base-title_action) {
      justify-content: flex-start;
      margin-left: 0;
    }
  }
}
</style>
