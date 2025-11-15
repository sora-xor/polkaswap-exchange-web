<template>
  <wallet-base :title="headerTitle" :show-back="!!selectedTransaction" :reset-focus="headerTitle" @back="handleBack">
    <template v-if="!selectedTransaction" #actions>
      <s-button :type="isMultisig() ? 'primary' : 'tertiary'" @click="handleMST"> Multi-Sig </s-button>
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

    <wallet-account v-if="!selectedTransaction">
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
import { hexToU8a } from '@polkadot/util';
import { api } from '@sora-substrate/sdk';
import { Options, mixins, Watch } from 'vue-property-decorator';

import { PolkadotJsAccount } from '@/types/common';

import { useRouterStore } from '@/stores/router';

import { RouteNames, WalletTabs, AccountActionTypes } from '../consts';
import { state, getter, mutation } from '../store/decorators';

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

@Options({
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
})
export default class Wallet extends mixins(AccountActionsMixin, OperationsMixin, QrCodeParserMixin) {
  readonly WalletTabs = WalletTabs;
  readonly accountActions = [
    AccountActionTypes.Rename,
    AccountActionTypes.Export,
    AccountActionTypes.Logout,
    AccountActionTypes.Delete,
  ];

  @state.settings.permissions permissions!: WalletPermissions;
  @state.settings.isMSTAvailable isMSTAvailable!: boolean;
  @state.account.isExternal isExternal!: boolean;
  @state.account.isMST isMST!: boolean;
  @state.account.isMstAddressExist isMstAddressExist!: boolean;
  @state.transactions.pendingMstTransactions pendingMstTransactions!: Array<any>;

  @getter.transactions.selectedTx selectedTransaction!: Nullable<HistoryItem>;
  @getter.account.account public accountOwn!: PolkadotJsAccount;

  @mutation.transactions.resetTxDetailsId private resetTxDetailsId!: FnWithoutArgs;

  currentTab: WalletTabs = WalletTabs.Assets;

  accountSettingsVisibility = false;
  mstOnboardingDialog = false;
  dialogMSTNameChange = false;

  private get routerStore() {
    return useRouterStore((this as any).$pinia);
  }

  get currentRouteParams(): Record<string, Nullable<WalletTabs>> {
    return this.routerStore.currentParams as Record<string, Nullable<WalletTabs>>;
  }

  get headerTitle(): string {
    if (!this.selectedTransaction) return this.t('account.accountTitle');

    return this.getTitle(this.selectedTransaction);
  }

  private navigate(options: Route): void {
    this.routerStore.navigate(options);
  }

  get isMSTAccount(): boolean {
    return this.isMST && api.mst.getMSTName() !== '';
  }

  get hasMSTAccount(): boolean {
    return !this.isMST && (this.isMstAddressExist || api.mst.getMSTName() !== '');
  }

  async mounted(): Promise<void> {
    if (this.currentRouteParams.currentTab) {
      this.currentTab = this.currentRouteParams.currentTab;
    }
  }

  handleSwap(asset: any): void {
    this.$emit('swap', asset);
  }

  handleCreateToken(): void {
    this.navigate({ name: RouteNames.CreateToken });
  }

  handleSwitchAccount(): void {
    this.navigate({ name: RouteNames.WalletConnection });
  }

  signTransaction() {
    this.resetTxDetailsId();
    this.currentTab = WalletTabs.Assets;
  }

  async handleEncrypt(): Promise<void> {
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
    console.info('this.accountOwn.address', this.accountOwn.address);
    const encryptParams: any = {
      address: this.accountOwn.address,
      data: callDataStr,
      cosigners: cosignersForEncrypt,
    };
    console.info('encryptParams', encryptParams);

    const finalEncrypted = await (window as any).injectedWeb3['fearless-wallet'].encryptByCosigner(encryptParams);
    console.info('finalEncrypted', finalEncrypted);
  }

  handleMST(): void {
    if (this.isMSTAccount && this.isMSTAvailable) {
      // User is currently in MST account
      this.dialogMSTNameChange = true;
    } else if (this.hasMSTAccount && this.isMSTAvailable) {
      // User has an MST account but is not currently in it
      this.dialogMSTNameChange = true;
    } else {
      // User does not have an MST account
      this.mstOnboardingDialog = true;
    }
  }

  handleAccountActionType(actionType: string) {
    this.handleAccountAction(actionType, this.account);
  }

  handleAccountSettings(): void {
    this.accountSettingsVisibility = !this.accountSettingsVisibility;
  }

  handleBack(): void {
    if (this.selectedTransaction) {
      this.resetTxDetailsId();
    }
  }

  isMultisig(): boolean {
    return this.isMSTAccount;
  }
}
</script>

<style lang="scss">
.wallet {
  @include custom-tabs;
}
</style>

<style scoped lang="scss">
.wallet {
  margin-top: #{$basic-spacing-medium};
}
</style>
