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

<script lang="ts">
import { mixins, Options, Prop } from 'vue-property-decorator';

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
import LoadingMixin from '../../mixins/LoadingMixin';
import NotificationMixin from '../../mixins/NotificationMixin';
import AccountConnectionList from '../List/Account.vue';
import ConnectionItems from '../List/ConnectionItems.vue';
import { formatConnectedAddress } from '../utils';

import type { PolkadotJsAccount } from '../../../types/common';
import type { WithKeyring } from '@sora-substrate/sdk';

@Options({
  components: {
    AccountConnectionList,
    AccountCard,
    AccountActionsMenu,
    AccountRenameDialog,
    AccountExportDialog,
    AccountDeleteDialog,
    ConnectionItems,
  },
})
export default class AccountListStep extends mixins(LoadingMixin, NotificationMixin) {
  @Prop({ required: true, type: Object }) public readonly chainApi!: WithKeyring;

  @Prop({ default: '', type: String }) readonly text!: string;
  @Prop({ default: false, type: Boolean }) readonly isInternal!: boolean;
  @Prop({ default: '', type: String }) readonly selectedWallet!: string;
  @Prop({ default: '', type: String }) readonly connectedWallet!: AppWallet;
  @Prop({ default: '', type: String }) readonly connectedAccount!: string;
  @Prop({ default: () => [], type: Array }) readonly accounts!: Array<PolkadotJsAccount>;

  @Prop({ default: () => {}, type: Function }) private readonly logoutAccount!: () => Promise<void>;

  @Prop({ default: () => {}, type: Function }) private readonly renameAccount!: (data: {
    address: string;
    name: string;
  }) => Promise<void>;

  @Prop({ default: () => {}, type: Function }) private readonly exportAccount!: (data: {
    address: string;
    password: string;
  }) => Promise<void>;

  @Prop({ default: () => {}, type: Function }) private readonly deleteAccount!: (address: string) => Promise<void>;

  readonly accountActions = [AccountActionTypes.Rename, AccountActionTypes.Export, AccountActionTypes.Delete];

  accountRenameVisibility = false;
  accountExportVisibility = false;
  accountDeleteVisibility = false;

  selectedAccount: Nullable<PolkadotJsAccount> = null;

  get noAccounts(): boolean {
    return !this.accounts.length;
  }

  isConnectedAccount(account: PolkadotJsAccount): boolean {
    return (
      this.connectedWallet === account.source &&
      formatConnectedAddress(
        this.chainApi as Nullable<{ formatAddress?: (address: string, isShort?: boolean) => string }>,
        this.connectedAccount
      ) === account.address
    );
  }

  handleAccountAction(actionType: string, account: PolkadotJsAccount): void {
    this.selectedAccount = { ...account };

    switch (actionType) {
      case AccountActionTypes.Rename: {
        this.accountRenameVisibility = true;
        break;
      }
      case AccountActionTypes.Export: {
        this.accountExportVisibility = true;
        break;
      }
      case AccountActionTypes.Delete: {
        const storageValue = settingsStorage.get('allowAccountDeletePopup');
        const popupVisibility = storageValue ? Boolean(JSON.parse(storageValue)) : true;

        if (popupVisibility) {
          this.accountDeleteVisibility = true;
        } else {
          this.handleDeleteAccount();
        }
        break;
      }
    }
  }

  handleRefreshClick(): void {
    window.history.go();
  }

  handleSelectAccount(account: PolkadotJsAccount, isConnected: boolean): void {
    this.$emit('select', account, isConnected);
  }

  handleCreateAccount(): void {
    this.$emit('create');
  }

  handleImportAccount(): void {
    this.$emit('import');
  }

  async handleRenameAccount(name: string): Promise<void> {
    await this.withLoading(async () => {
      await this.withAppNotification(async () => {
        if (!this.selectedAccount) return;

        const { address, source } = this.selectedAccount;

        if (source === AppWallet.GoogleDrive) {
          await GDriveWallet.accounts.changeName(address, name);
        }

        if (this.isConnectedAccount(this.selectedAccount) || source === AppWallet.Sora) {
          await this.renameAccount({ address, name });
        }

        this.accountRenameVisibility = false;
      });
    });
  }

  async handleExportAccount(password: string): Promise<void> {
    await this.withLoading(async () => {
      // hack: to render loading state before sync code execution, 250 - button transition
      await this.$nextTick();
      await delay(250);

      await this.withAppNotification(async () => {
        if (!this.selectedAccount) return;

        const { address, source } = this.selectedAccount;

        if (source === AppWallet.GoogleDrive) {
          const json = await GDriveWallet.accounts.getAccount(address, password);

          if (!json) throw new Error('polkadotjs.noAccount');

          const verified = verifyAccountJson(this.chainApi, json, password);

          exportAccountJson(verified);
        } else {
          await this.exportAccount({ address, password });
        }

        this.accountExportVisibility = false;
      });
    });
  }

  async handleDeleteAccount(allowAccountDeletePopup = true): Promise<void> {
    await this.withLoading(async () => {
      await this.withAppNotification(async () => {
        if (!this.selectedAccount) return;

        if (!allowAccountDeletePopup) {
          settingsStorage.set('allowAccountDeletePopup', false);
        }

        if (this.isConnectedAccount(this.selectedAccount)) {
          await this.logoutAccount();
        }

        if (this.selectedAccount.source === AppWallet.GoogleDrive) {
          await GDriveWallet.accounts.delete(this.selectedAccount.address);
        } else {
          await this.deleteAccount(this.selectedAccount.address);
        }

        this.accountDeleteVisibility = false;
      });
    });
  }
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
