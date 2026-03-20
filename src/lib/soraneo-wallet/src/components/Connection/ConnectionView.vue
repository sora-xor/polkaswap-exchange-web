<template>
  <wallet-base
    show-header
    title-center
    :show-back="hasBackBtn"
    :title="viewTitle"
    v-bind="$attrs"
    @back="handleBack"
    @close="closeView"
  >
    <template v-if="logoutButtonVisibility" #actions>
      <s-button type="action" :tooltip="t('logoutText')" @click="handleAccountLogout">
        <s-icon name="basic-eye-24" size="28"></s-icon>
      </s-button>
    </template>

    <extension-list-step
      v-if="isExtensionsList"
      :connected-wallet="connectedWallet"
      :selected-wallet="selectedWallet"
      :selected-wallet-loading="selectedWalletLoading"
      :internal-wallets="wallets.internal"
      :external-wallets="wallets.external"
      :recommended-wallets="recommendedWallets"
      @select="handleWalletSelect"
      @disconnect="handleWalletDisconnect"
    ></extension-list-step>
    <account-list-step
      v-else-if="isAccountList"
      :chain-api="chainApi"
      :text="accountListText"
      :is-internal="isInternal"
      :connected-wallet="connectedWallet"
      :connected-account="connectedAccount"
      :selected-wallet="selectedWallet"
      :accounts="accounts"
      :rename-account="renameAccount"
      :export-account="handleAccountExport"
      :delete-account="handleAccountDelete"
      :logout-account="handleAccountLogout"
      @select="handleAccountSelect"
      @create="navigateToCreateAccount"
      @import="navigateToImportAccount"
    ></account-list-step>
    <create-account-step
      v-else-if="isCreateFlow"
      v-model:step="step"
      :chain-api="chainApi"
      :selected-wallet-title="selectedWalletTitle"
      :loading="loading"
      :create-account="handleAccountCreate"
    ></create-account-step>
    <import-account-step
      v-else-if="isImportFlow"
      v-model:step="step"
      :loading="loading"
      :create-account="handleAccountCreate"
      :restore-account="handleAccountImport"
      :json-only="!isAppStored"
    ></import-account-step>

    <account-confirm-dialog
      v-model:visible="accountLoginVisibility"
      with-timeout
      :account="accountLoginData"
      :loading="loading"
      @confirm="handleAccountLogin"
    ></account-confirm-dialog>
  </wallet-base>
</template>

<script lang="ts">
import { api, type WithKeyring } from '@sora-substrate/sdk';
import { defineComponent, type PropType } from 'vue';
import { mapActions, mapMutations, mapState } from 'vuex';

import { AppWallet, LoginStep } from '../../consts';
import { GDriveWallet } from '../../services/google/wallet';
import { isInternalSource, isInternalWallet, isAppStorageSource, getWallet } from '../../services/wallet';
import { RecommendedWallets } from '../../services/wallet/consts';
import { addWcSubWalletLocally, isWcWallet } from '../../services/walletconnect';
import { delay } from '../../util';
import {
  verifyAccountJson,
  subscribeToWalletAccounts,
  exportAccount,
  deleteAccount,
  createAccount,
  restoreAccount,
  checkExternalAccount,
} from '../../util/account';
import AccountConfirmDialog from '../Account/ConfirmDialog.vue';
import LoadingMixin from '../mixins/LoadingMixin';
import NotificationMixin from '../mixins/NotificationMixin';
import WalletBase from '../WalletBase.vue';

import AccountListStep from './Step/AccountList.vue';
import CreateAccountStep from './Step/CreateAccount.vue';
import ExtensionListStep from './Step/ExtensionList.vue';
import ImportAccountStep from './Step/ImportAccount.vue';

import type { Wallet } from '../../services/wallet/types';
import type { CreateAccountArgs, RestoreAccountArgs } from '../../store/account/types';
import type { PolkadotJsAccount, KeyringPair$Json } from '../../types/common';

const SelectAccountFlow = [LoginStep.ExtensionList, LoginStep.AccountList];
const AccountCreateFlow = [LoginStep.SeedPhrase, LoginStep.ConfirmSeedPhrase, LoginStep.CreateCredentials];
const AccountImportFlow = [LoginStep.Import, LoginStep.ImportCredentials];

export const getPreviousLoginStep = (currentStep?: LoginStep): LoginStep => {
  if (!currentStep) return LoginStep.ExtensionList;

  for (const flow of [AccountCreateFlow, AccountImportFlow]) {
    const currentStepIndex = flow.findIndex((stepValue) => stepValue === currentStep);

    if (currentStepIndex > 0) {
      return flow[currentStepIndex - 1];
    }
  }

  return SelectAccountFlow.includes(currentStep) ? LoginStep.ExtensionList : LoginStep.AccountList;
};

export default defineComponent({
  components: {
    WalletBase,
    AccountConfirmDialog,
    AccountListStep,
    CreateAccountStep,
    ExtensionListStep,
    ImportAccountStep,
  },
  mixins: [NotificationMixin, LoadingMixin],
  props: {
    chainApi: {
      required: true,
      type: Object as PropType<WithKeyring>,
    },
    account: {
      default: () => null,
      type: Object as PropType<Nullable<PolkadotJsAccount>>,
    },
    checkConnectedAccountSource: {
      default: () => {},
      type: Function as PropType<(source: string) => Promise<void>>,
    },
    loginAccount: {
      default: () => {},
      type: Function as PropType<(account: PolkadotJsAccount) => Promise<void>>,
    },
    logoutAccount: {
      default: () => {},
      type: Function as PropType<() => Promise<void>>,
    },
    renameAccount: {
      default: () => {},
      type: Function as PropType<(data: { address: string; name: string }) => Promise<void>>,
    },
    closeView: {
      default: () => {},
      type: Function as PropType<() => void>,
    },
  },
  data() {
    return {
      step: LoginStep.AccountList as LoginStep,
      accountLoginVisibility: false,
      accountLoginData: null as Nullable<PolkadotJsAccount>,
      selectedWallet: null as Nullable<AppWallet>,
      selectedWalletLoading: false,
      accounts: [] as PolkadotJsAccount[],
      accountsSubscription: null as Nullable<VoidFunction>,
      wcName: '',
      recommendedWallets: RecommendedWallets,
    };
  },
  computed: {
    ...mapState('wallet/account', ['availableWallets', 'isMST']),
    ...mapState('wallet/transactions', ['isSignTxDialogDisabled']),
    ...mapState('wallet/settings', ['isMSTAvailable']),
    chainGenesisHash(this: any): string {
      try {
        return this.chainApi.api.genesisHash.toString();
      } catch {
        return '';
      }
    },
    connectedAccount(this: any): string {
      return this.account?.address ?? '';
    },
    connectedWallet(this: any): AppWallet {
      return (this.account?.source ?? '') as AppWallet;
    },
    isInternal(this: any): boolean {
      return !!this.selectedWallet && isInternalSource(this.selectedWallet);
    },
    isAppStored(this: any): boolean {
      return !!this.selectedWallet && isAppStorageSource(this.selectedWallet);
    },
    wallets(this: any): { internal: Wallet[]; external: Wallet[] } {
      const wallets = {
        internal: [] as Wallet[],
        external: [] as Wallet[],
      };

      return this.availableWallets.reduce((buffer: typeof wallets, wallet: Wallet) => {
        // show walletconnect only for this connection
        if (this.wcName && isWcWallet(wallet) && wallet.extensionName !== this.wcName) {
          return buffer;
        }

        if (isInternalWallet(wallet)) {
          buffer.internal.push(wallet);
        } else {
          buffer.external.push(wallet);
        }

        return buffer;
      }, wallets);
    },
    selectedWalletTitle(this: any): string {
      if (!this.selectedWallet) return '';

      const wallet = this.availableWallets.find((wallet: Wallet) => wallet.extensionName === this.selectedWallet);

      return wallet ? wallet.title : this.selectedWallet;
    },
    viewTitle(this: any): string {
      if (this.isAccountList && this.selectedWalletTitle) {
        return this.t('connection.internalTitle', { wallet: this.selectedWalletTitle });
      } else if (this.isCreateFlow) {
        switch (this.step) {
          case LoginStep.SeedPhrase:
            return this.t('desktop.heading.seedPhraseTitle');
          case LoginStep.ConfirmSeedPhrase:
            return this.t('desktop.heading.confirmSeedTitle');
          case LoginStep.CreateCredentials:
            return this.t('desktop.heading.accountDetailsTitle');
          default:
            return '';
        }
      } else if (this.isImportFlow) {
        switch (this.step) {
          case LoginStep.Import:
            return this.t('desktop.heading.importTitle');
          case LoginStep.ImportCredentials:
            return this.t('desktop.heading.accountDetailsTitle');
          default:
            return '';
        }
      } else {
        return this.t('account.accountTitle');
      }
    },
    hasAccounts(this: any): boolean {
      return !!this.accounts.length;
    },
    accountListText(this: any): string {
      if (this.isInternal) {
        return this.t('connection.internalText', { wallet: this.selectedWalletTitle });
      }

      return this.hasAccounts ? this.t('connection.selectAccount') : this.t('desktop.welcome.text');
    },
    isLoggedIn(this: any): boolean {
      return !!this.connectedAccount;
    },
    logoutButtonVisibility(this: any): boolean {
      return this.isLoggedIn && !this.isCreateFlow && !this.isImportFlow;
    },
    isCreateFlow(this: any): boolean {
      return AccountCreateFlow.includes(this.step);
    },
    isImportFlow(this: any): boolean {
      return AccountImportFlow.includes(this.step);
    },
    isAccountList(this: any): boolean {
      return this.step === LoginStep.AccountList;
    },
    isExtensionsList(this: any): boolean {
      return this.step === LoginStep.ExtensionList;
    },
    prevStep(this: any): LoginStep {
      return getPreviousLoginStep(this.step);
    },
    hasPrevStep(this: any): boolean {
      return this.step !== this.prevStep;
    },
    hasBackBtn(this: any): boolean {
      return this.hasPrevStep || this.isLoggedIn;
    },
  },
  watch: {
    async chainGenesisHash(this: any, curr: string, prev: string): Promise<void> {
      if (curr !== prev) {
        await this.updateWallets();
      }
    },
  },
  created(this: any): void {
    this.resetStep();
    void this.updateWallets();
  },
  beforeUnmount(this: any): void {
    this.resetSelectedWallet();
  },
  methods: {
    ...mapMutations('wallet/settings', ['setIsMstAvailable']),
    ...mapActions('wallet/account', ['initMultisigAddress', 'updateAvailableWallets', 'setAccountPassphrase']),
    resetWalletAccountsSubscription(this: any): void {
      this.accountsSubscription?.();
      this.accountsSubscription = null;
    },
    async updateWallets(this: any): Promise<void> {
      await this.updateWcWallet();
      await this.updateAvailableWallets();
    },
    async updateWcWallet(this: any): Promise<void> {
      await this.withChainApi(this.chainApi, async () => {
        this.checkConnectedAccountSource(this.wcName);

        this.wcName = addWcSubWalletLocally(this.chainApi, (source) => {
          this.checkConnectedAccountSource(source);
          this.updateAvailableWallets();
        });
      });
    },
    navigateToCreateAccount(this: any): void {
      this.step = LoginStep.SeedPhrase;
    },
    navigateToImportAccount(this: any): void {
      this.step = LoginStep.Import;
    },
    navigateToAccountList(this: any): void {
      this.step = LoginStep.AccountList;
    },
    switchFromMSTBeforeLogout(this: any): void {
      if (this.isMST && this.isMSTAvailable) {
        api.mst.switchAccount(false);
      }
    },
    async handleAccountImport(this: any, data: RestoreAccountArgs): Promise<void> {
      await this.withLoading(async () => {
        // hack: to render loading state before sync code execution, 250 - button transition
        await this.$nextTick();
        await delay(250);

        await this.withAppNotification(async () => {
          const { json, password } = data;
          const verified = verifyAccountJson(this.chainApi, json, password);

          if (this.selectedWallet === AppWallet.GoogleDrive) {
            await GDriveWallet.accounts.add(verified, password);
          } else if (this.selectedWallet === AppWallet.Sora) {
            this.handleAccountRestore(data);
          }

          this.navigateToAccountList();
        });
      });
    },
    async handleAccountCreate(this: any, data: CreateAccountArgs): Promise<void> {
      await this.withLoading(async () => {
        // hack: to render loading state before sync code execution, 250 - button transition
        await this.$nextTick();
        await delay(250);

        await this.withAppNotification(async () => {
          if (this.selectedWallet === AppWallet.GoogleDrive) {
            const accountJson = createAccount(this.chainApi, { ...data });
            await GDriveWallet.accounts.add(accountJson, data.password, data.seed);
          } else if (this.selectedWallet === AppWallet.Sora) {
            createAccount(this.chainApi, { ...data, saveAccount: true });
          }

          this.navigateToAccountList();
        });
      });
    },
    async handleAccountSelect(this: any, account: PolkadotJsAccount, isConnected: boolean): Promise<void> {
      this.switchFromMSTBeforeLogout();
      this.setIsMstAvailable(account.source === AppWallet.FearlessWallet);

      if (isConnected) {
        this.closeView();
      } else if (this.isInternal && !isAppStorageSource(account.source)) {
        this.accountLoginData = account;
        this.accountLoginVisibility = true;
      } else {
        await this.withLoading(async () => {
          await this.withAppAlert(async () => {
            await checkExternalAccount(account);
            await this.loginAccount(account);
            this.initMultisigAddress();
            this.resetStep();
          });
        });
      }
    },
    async handleWalletSelect(this: any, wallet: Wallet): Promise<void> {
      if (!wallet.installed) return;

      await this.withAppAlert(async () => {
        await this.selectWallet(wallet.extensionName as AppWallet);
        this.navigateToAccountList();
      });
    },
    async handleWalletDisconnect(this: any, wallet: Wallet): Promise<void> {
      if (!wallet.provider) return;

      await wallet.provider.disconnect();
    },
    setSelectedWallet(this: any, wallet: Nullable<AppWallet> = null): void {
      this.selectedWallet = wallet;
    },
    setSelectedWalletLoading(this: any, flag: boolean): void {
      this.selectedWalletLoading = flag;
    },
    async subscribeToWalletAccounts(this: any): Promise<void> {
      if (!this.selectedWallet) return;

      this.accountsSubscription = await subscribeToWalletAccounts(this.chainApi, this.selectedWallet, (accounts) => {
        this.accounts = accounts;
      });
    },
    async selectWallet(this: any, wallet: AppWallet): Promise<void> {
      try {
        this.resetWalletAccountsSubscription();
        this.setSelectedWallet(wallet);
        this.setSelectedWalletLoading(true);

        await getWallet(wallet);

        this.setSelectedWalletLoading(false);

        await this.subscribeToWalletAccounts();
      } catch (error) {
        console.error(error);
        this.resetSelectedWallet();
        throw error;
      }
    },
    resetSelectedWallet(this: any): void {
      this.resetWalletAccountsSubscription();
      this.setSelectedWallet();
      this.setSelectedWalletLoading(false);
    },
    async loadAccountJson(this: any, password: string): Promise<KeyringPair$Json> {
      if (!this.accountLoginData || this.selectedWallet !== AppWallet.GoogleDrive) {
        throw new Error('polkadotjs.noAccount');
      }

      const json = await GDriveWallet.accounts.getAccount(this.accountLoginData.address, password);

      if (!json) throw new Error('polkadotjs.noAccount');

      this.handleAccountRestore({ json, password });

      return json;
    },
    async handleAccountLogin(this: any, password: string): Promise<void> {
      await this.withLoading(async () => {
        // hack: to render loading state before sync code execution, 250 - button transition
        await this.$nextTick();
        await delay(250);

        await this.withAppNotification(async () => {
          const { address, meta } = await this.loadAccountJson(password);

          await this.loginAccount({
            address,
            name: (meta.name as string) || '',
            source: this.selectedWallet as AppWallet,
          });
          this.resetStep();

          if (this.isSignTxDialogDisabled) {
            this.setAccountPassphrase({ address, password });
          }

          this.accountLoginVisibility = false;
          this.accountLoginData = null;
        });
      });
    },
    handleAccountExport(this: any, data: { address: string; password: string }): void {
      exportAccount(this.chainApi, data);
    },
    handleAccountDelete(this: any, address: string): void {
      deleteAccount(this.chainApi, address);
    },
    handleAccountRestore(this: any, data: RestoreAccountArgs): void {
      restoreAccount(this.chainApi, data);
    },
    handleBack(this: any): void {
      if (this.step === this.prevStep) {
        this.closeView();
      } else {
        this.step = this.prevStep;

        if (this.isExtensionsList) {
          this.resetSelectedWallet();
        }
      }
    },
    handleAccountLogout(this: any): void {
      this.switchFromMSTBeforeLogout();
      this.resetStep();
      this.logoutAccount();
    },
    resetStep(this: any): void {
      this.step = getPreviousLoginStep();
    },
  },
});
</script>
