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
      <component :is="currentTab" @swap="handleSwap"></component>
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

<script lang="ts">
import { api } from '@sora-substrate/sdk';
import { defineComponent } from 'vue';
import { mapGetters, mapMutations, mapState } from 'vuex';

import { PolkadotJsAccount } from '@/types/common';

import { useRouterStore } from '@/stores/router';

import { RouteNames, WalletTabs, AccountActionTypes } from '../consts';

import AccountActionsMenu from './Account/ActionsMenu.vue';
import AccountExportDialog from './Account/ConfirmDialog.vue';
import AccountDeleteDialog from './Account/DeleteDialog.vue';
import AccountRenameDialog from './Account/RenameDialog.vue';
import AccountSettingsDialog from './Account/SettingsDialog.vue';
import WalletAccount from './Account/WalletAccount.vue';
import AccountActionsMixin from './mixins/AccountActionsMixin';
import OperationsMixin from './mixins/OperationsMixin';
import QrCodeParserMixin from './mixins/QrCodeParserMixin';
import MstOnboardingDialog from './MST/MstOnboardingDialog.vue';
import MultisigChangeNameDialog from './MST/MultisigChangeNameDialog.vue';
import QrCodeScanButton from './QrCode/QrCodeScanButton.vue';
import WalletAssets from './WalletAssets.vue';
import WalletBase from './WalletBase.vue';
import WalletHistory from './WalletHistory.vue';
import WalletTransactionDetails from './WalletTransactionDetails.vue';

import type { Route } from '../store/router/types';
import type { WalletPermissions } from '../consts';
import type { HistoryItem } from '@sora-substrate/sdk';

export default defineComponent({
  components: {
    WalletBase,
    WalletAccount,
    WalletAssets,
    WalletHistory,
    QrCodeScanButton,
    WalletTransactionDetails,
    AccountActionsMenu,
    AccountRenameDialog,
    AccountExportDialog,
    AccountDeleteDialog,
    AccountSettingsDialog,
    MstOnboardingDialog,
    MultisigChangeNameDialog,
  },
  mixins: [AccountActionsMixin, OperationsMixin, QrCodeParserMixin],
  emits: ['swap'],
  data() {
    return {
      WalletTabs,
      accountActions: [
        AccountActionTypes.Rename,
        AccountActionTypes.Export,
        AccountActionTypes.Logout,
        AccountActionTypes.Delete,
      ],
      currentTab: WalletTabs.Assets as WalletTabs,
      accountSettingsVisibility: false,
      mstOnboardingDialog: false,
      dialogMSTNameChange: false,
    };
  },
  computed: {
    ...mapState('wallet/settings', ['permissions', 'isMSTAvailable']),
    ...mapState('wallet/account', ['isExternal', 'isMST', 'isMstAddressExist']),
    ...mapGetters('wallet/transactions', { selectedTransaction: 'selectedTx' }),
    ...mapGetters('wallet/account', { accountOwn: 'account' }),
    routerStore(this: any) {
      return useRouterStore(this.$pinia);
    },
    currentRouteParams(this: any): Record<string, Nullable<WalletTabs>> {
      return this.routerStore.currentParams as Record<string, Nullable<WalletTabs>>;
    },
    headerTitle(this: any): string {
      if (!this.selectedTransaction) return this.t('account.accountTitle');

      return this.getTitle(this.selectedTransaction as HistoryItem);
    },
    mstName(): string {
      return api.mst?.getMSTName?.() ?? '';
    },
    isMSTAccount(this: any): boolean {
      return this.isMST && this.mstName !== '';
    },
    hasMSTAccount(this: any): boolean {
      return !this.isMST && (this.isMstAddressExist || this.mstName !== '');
    },
  },
  async mounted(this: any): Promise<void> {
    if (this.currentRouteParams.currentTab) {
      this.currentTab = this.currentRouteParams.currentTab;
    }
  },
  methods: {
    ...mapMutations('wallet/transactions', ['resetTxDetailsId']),
    navigate(this: any, options: Route): void {
      this.routerStore.navigate(options);
    },
    handleSwap(this: any, asset: unknown): void {
      this.$emit('swap', asset);
    },
    handleCreateToken(this: any): void {
      this.navigate({ name: RouteNames.CreateToken });
    },
    handleSwitchAccount(this: any): void {
      this.navigate({ name: RouteNames.WalletConnection });
    },
    signTransaction(this: any): void {
      this.resetTxDetailsId();
      this.currentTab = WalletTabs.Assets;
    },
    async handleEncrypt(this: any): Promise<void> {
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
      console.info('this.accountOwn.address', (this.accountOwn as PolkadotJsAccount).address);
      const encryptParams: EncryptByCosignerData = {
        address: (this.accountOwn as PolkadotJsAccount).address,
        data: callDataStr,
        cosigners: cosignersForEncrypt,
      };
      console.info('encryptParams', encryptParams);

      const finalEncrypted = await (window as any).injectedWeb3['fearless-wallet'].encryptByCosigner(encryptParams);
      console.info('finalEncrypted', finalEncrypted);
    },
    handleMST(this: any): void {
      if ((this.isMSTAccount || this.hasMSTAccount) && this.isMSTAvailable) {
        this.dialogMSTNameChange = true;
      } else {
        this.mstOnboardingDialog = true;
      }
    },
    handleAccountActionType(this: any, actionType: string): void {
      this.handleAccountAction(actionType, this.account);
    },
    handleAccountSettings(this: any): void {
      this.accountSettingsVisibility = !this.accountSettingsVisibility;
    },
    handleBack(this: any): void {
      if (this.selectedTransaction) {
        this.resetTxDetailsId();
      }
    },
    isMultisig(this: any): boolean {
      return this.isMSTAccount;
    },
  },
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

.wallet-account-panel {
  :deep(.s-button.s-button_type_action),
  :deep(.s-button.s-action),
  :deep(.account-actions.el-dropdown) {
    color: var(--s-color-base-content-tertiary);
  }

  :deep(.s-button.s-button_type_action .s-button__icon > i),
  :deep(.s-button.s-action .s-button__icon > i),
  :deep(.account-actions.el-dropdown .s-icon-basic-more-vertical-24) {
    color: inherit;
    opacity: 0.7;
  }
}
</style>
