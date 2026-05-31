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
      <s-button type="action" :tooltip="t('logoutText')" :aria-label="t('logoutText')" @click="handleAccountLogout">
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue';

import { useLoading } from '../../composables/useLoading';
import { useNotification } from '../../composables/useNotification';
import { useWalletStore } from '@/stores/wallet';

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
import WalletBase from '../WalletBase.vue';

import AccountListStep from './Step/AccountList.vue';
import CreateAccountStep from './Step/CreateAccount.vue';
import ExtensionListStep from './Step/ExtensionList.vue';
import ImportAccountStep from './Step/ImportAccount.vue';

import type { Wallet } from '../../services/wallet/types';
import type { CreateAccountArgs, RestoreAccountArgs } from '@/stores/wallet/account/types';
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

export default {
  components: {
    WalletBase,
    AccountConfirmDialog,
    AccountListStep,
    CreateAccountStep,
    ExtensionListStep,
    ImportAccountStep,
  },
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
  setup(props) {
    const walletStore = useWalletStore();
    const { t, withAppNotification, withAppAlert } = useNotification();
    const { loading, withLoading, withChainApi } = useLoading();

    const step = ref<LoginStep>(LoginStep.AccountList);
    const accountLoginVisibility = ref(false);
    const accountLoginData = ref<Nullable<PolkadotJsAccount>>(null);
    const selectedWallet = ref<Nullable<AppWallet>>(null);
    const selectedWalletLoading = ref(false);
    const accounts = ref<PolkadotJsAccount[]>([]);
    const accountsSubscription = ref<Nullable<VoidFunction>>(null);
    const wcName = ref('');
    const recommendedWallets = RecommendedWallets;

    const availableWallets = computed(() => walletStore.availableWallets ?? []);
    const isMST = computed(() => Boolean(walletStore.isMST));
    const isSignTxDialogDisabled = computed(() => Boolean(walletStore.isSignTxDialogDisabled));
    const isMSTAvailable = computed(() => Boolean(walletStore.isMSTAvailable));
    const chainGenesisHash = computed((): string => {
      try {
        return props.chainApi.api.genesisHash.toString();
      } catch {
        return '';
      }
    });
    const connectedAccount = computed(() => props.account?.address ?? '');
    const connectedWallet = computed(() => (props.account?.source ?? '') as AppWallet);
    const isInternal = computed(() => !!selectedWallet.value && isInternalSource(selectedWallet.value));
    const isAppStored = computed(() => !!selectedWallet.value && isAppStorageSource(selectedWallet.value));
    const wallets = computed<{ internal: Wallet[]; external: Wallet[] }>(() => {
      const groupedWallets = {
        internal: [] as Wallet[],
        external: [] as Wallet[],
      };

      return availableWallets.value.reduce((buffer: typeof groupedWallets, wallet: Wallet) => {
        if (wcName.value && isWcWallet(wallet) && wallet.extensionName !== wcName.value) {
          return buffer;
        }

        if (isInternalWallet(wallet)) {
          buffer.internal.push(wallet);
        } else {
          buffer.external.push(wallet);
        }

        return buffer;
      }, groupedWallets);
    });
    const selectedWalletTitle = computed(() => {
      if (!selectedWallet.value) return '';

      const wallet = availableWallets.value.find((wallet: Wallet) => wallet.extensionName === selectedWallet.value);

      return wallet ? wallet.title : selectedWallet.value;
    });
    const isCreateFlow = computed(() => AccountCreateFlow.includes(step.value));
    const isImportFlow = computed(() => AccountImportFlow.includes(step.value));
    const isAccountList = computed(() => step.value === LoginStep.AccountList);
    const isExtensionsList = computed(() => step.value === LoginStep.ExtensionList);
    const viewTitle = computed(() => {
      if (isAccountList.value && selectedWalletTitle.value) {
        return t('connection.internalTitle', { wallet: selectedWalletTitle.value });
      }
      if (isCreateFlow.value) {
        switch (step.value) {
          case LoginStep.SeedPhrase:
            return t('desktop.heading.seedPhraseTitle');
          case LoginStep.ConfirmSeedPhrase:
            return t('desktop.heading.confirmSeedTitle');
          case LoginStep.CreateCredentials:
            return t('desktop.heading.accountDetailsTitle');
          default:
            return '';
        }
      }
      if (isImportFlow.value) {
        switch (step.value) {
          case LoginStep.Import:
            return t('desktop.heading.importTitle');
          case LoginStep.ImportCredentials:
            return t('desktop.heading.accountDetailsTitle');
          default:
            return '';
        }
      }

      return t('account.accountTitle');
    });
    const hasAccounts = computed(() => !!accounts.value.length);
    const accountListText = computed(() => {
      if (isInternal.value) {
        return t('connection.internalText', { wallet: selectedWalletTitle.value });
      }

      return hasAccounts.value ? t('connection.selectAccount') : t('desktop.welcome.text');
    });
    const isLoggedIn = computed(() => !!connectedAccount.value);
    const logoutButtonVisibility = computed(() => isLoggedIn.value && !isCreateFlow.value && !isImportFlow.value);
    const prevStep = computed(() => getPreviousLoginStep(step.value));
    const hasPrevStep = computed(() => step.value !== prevStep.value);
    const hasBackBtn = computed(() => hasPrevStep.value || isLoggedIn.value);

    const setIsMstAvailable = (flag: boolean): void => {
      walletStore.setIsMstAvailable(flag);
    };

    const initMultisigAddress = (): void => {
      walletStore.initMultisigAddress();
    };

    const updateAvailableWallets = (): Promise<void> => {
      return walletStore.updateAvailableWallets();
    };

    const setAccountPassphrase = (payload: { address: string; password: string }): void => {
      walletStore.setAccountPassphrase(payload);
    };

    const resetWalletAccountsSubscription = (): void => {
      accountsSubscription.value?.();
      accountsSubscription.value = null;
    };

    const updateWcWallet = async (): Promise<void> => {
      await withChainApi(props.chainApi, async () => {
        void props.checkConnectedAccountSource(wcName.value);

        wcName.value = addWcSubWalletLocally(props.chainApi, (source) => {
          void props.checkConnectedAccountSource(source);
          void updateAvailableWallets();
        });
      });
    };

    let googleDrivePreparePromise: Nullable<Promise<void>> = null;

    const prepareGoogleDriveWallet = async (): Promise<void> => {
      const wallet = availableWallets.value.find((wallet: Wallet) => wallet.extensionName === AppWallet.GoogleDrive);

      if (!wallet?.installed) return;
      if (googleDrivePreparePromise) return googleDrivePreparePromise;

      googleDrivePreparePromise = GDriveWallet.prepare()
        .catch((error) => {
          console.warn('[GoogleDriveWallet] OAuth preload failed', error);
        })
        .finally(() => {
          googleDrivePreparePromise = null;
        });

      await googleDrivePreparePromise;
    };

    const updateWallets = async (): Promise<void> => {
      await updateWcWallet();
      await updateAvailableWallets();
      void prepareGoogleDriveWallet();
    };

    const navigateToCreateAccount = (): void => {
      step.value = LoginStep.SeedPhrase;
    };

    const navigateToImportAccount = (): void => {
      step.value = LoginStep.Import;
    };

    const navigateToAccountList = (): void => {
      step.value = LoginStep.AccountList;
    };

    const switchFromMSTBeforeLogout = (): void => {
      if (isMST.value && isMSTAvailable.value) {
        api.mst.switchAccount(false);
      }
    };

    const handleAccountRestore = (data: RestoreAccountArgs): void => {
      restoreAccount(props.chainApi, data);
    };

    const handleAccountImport = async (data: RestoreAccountArgs): Promise<void> => {
      await withLoading(async () => {
        await nextTick();
        await delay(250);

        await withAppNotification(async () => {
          const { json, password } = data;
          const verified = verifyAccountJson(props.chainApi, json, password);

          if (selectedWallet.value === AppWallet.GoogleDrive) {
            await GDriveWallet.accounts.add(verified, password);
          } else if (selectedWallet.value === AppWallet.Sora) {
            handleAccountRestore(data);
          }

          navigateToAccountList();
        });
      });
    };

    const handleAccountCreate = async (data: CreateAccountArgs): Promise<void> => {
      await withLoading(async () => {
        await nextTick();
        await delay(250);

        await withAppNotification(async () => {
          if (selectedWallet.value === AppWallet.GoogleDrive) {
            const accountJson = createAccount(props.chainApi, { ...data });
            await GDriveWallet.accounts.add(accountJson, data.password, data.seed);
          } else if (selectedWallet.value === AppWallet.Sora) {
            createAccount(props.chainApi, { ...data, saveAccount: true });
          }

          navigateToAccountList();
        });
      });
    };

    const resetStep = (): void => {
      step.value = getPreviousLoginStep();
    };

    const handleAccountSelect = async (account: PolkadotJsAccount, isConnected: boolean): Promise<void> => {
      switchFromMSTBeforeLogout();
      setIsMstAvailable(account.source === AppWallet.FearlessWallet);

      if (isConnected) {
        props.closeView();
      } else if (isInternal.value && !isAppStorageSource(account.source)) {
        accountLoginData.value = account;
        accountLoginVisibility.value = true;
      } else {
        await withLoading(async () => {
          await withAppAlert(async () => {
            await checkExternalAccount(account);
            await props.loginAccount(account);
            initMultisigAddress();
            resetStep();
            props.closeView();
          });
        });
      }
    };

    const subscribeToWalletAccountsFn = async (): Promise<void> => {
      if (!selectedWallet.value) return;

      accountsSubscription.value = await subscribeToWalletAccounts(props.chainApi, selectedWallet.value, (items) => {
        accounts.value = items;
      });
    };

    const setSelectedWallet = (wallet: Nullable<AppWallet> = null): void => {
      selectedWallet.value = wallet;
    };

    const setSelectedWalletLoading = (flag: boolean): void => {
      selectedWalletLoading.value = flag;
    };

    const selectWallet = async (wallet: AppWallet): Promise<void> => {
      try {
        resetWalletAccountsSubscription();
        setSelectedWallet(wallet);
        setSelectedWalletLoading(true);

        await getWallet(wallet);
        await subscribeToWalletAccountsFn();
      } catch (error) {
        console.error(error);
        resetSelectedWallet();
        throw error;
      } finally {
        setSelectedWalletLoading(false);
      }
    };

    const handleWalletSelect = async (wallet: Wallet): Promise<void> => {
      if (!wallet.installed) return;

      await withAppAlert(async () => {
        await selectWallet(wallet.extensionName as AppWallet);
        navigateToAccountList();
      });
    };

    const handleWalletDisconnect = async (wallet: Wallet): Promise<void> => {
      if (!wallet.provider) return;

      await wallet.provider.disconnect();
    };

    const resetSelectedWallet = (): void => {
      resetWalletAccountsSubscription();
      setSelectedWallet();
      setSelectedWalletLoading(false);
    };

    const loadAccountJson = async (password: string): Promise<KeyringPair$Json> => {
      if (!accountLoginData.value || selectedWallet.value !== AppWallet.GoogleDrive) {
        throw new Error('polkadotjs.noAccount');
      }

      const json = await GDriveWallet.accounts.getAccount(accountLoginData.value.address, password);

      if (!json) throw new Error('polkadotjs.noAccount');

      handleAccountRestore({ json, password });

      return json;
    };

    const handleAccountLogin = async (password: string): Promise<void> => {
      await withLoading(async () => {
        await nextTick();
        await delay(250);

        await withAppNotification(async () => {
          const { address, meta } = await loadAccountJson(password);

          await props.loginAccount({
            address,
            name: (meta.name as string) || '',
            source: selectedWallet.value as AppWallet,
          });
          initMultisigAddress();
          resetStep();

          if (isSignTxDialogDisabled.value) {
            setAccountPassphrase({ address, password });
          }

          accountLoginVisibility.value = false;
          accountLoginData.value = null;
          props.closeView();
        });
      });
    };

    const handleAccountExport = (data: { address: string; password: string }): void => {
      exportAccount(props.chainApi, data);
    };

    const handleAccountDelete = (address: string): void => {
      deleteAccount(props.chainApi, address);
    };

    const handleBack = (): void => {
      if (step.value === prevStep.value) {
        props.closeView();
      } else {
        step.value = prevStep.value;

        if (isExtensionsList.value) {
          resetSelectedWallet();
        }
      }
    };

    const handleAccountLogout = (): void => {
      switchFromMSTBeforeLogout();
      resetStep();
      void props.logoutAccount();
    };

    watch(chainGenesisHash, (curr, prev) => {
      if (curr !== prev) {
        void updateWallets();
      }
    });

    onMounted(() => {
      resetStep();
      void updateWallets();
    });

    onBeforeUnmount(() => {
      resetSelectedWallet();
    });

    return {
      t,
      loading,
      step,
      accountLoginVisibility,
      accountLoginData,
      selectedWallet,
      selectedWalletLoading,
      accounts,
      recommendedWallets,
      connectedAccount,
      connectedWallet,
      isInternal,
      isAppStored,
      wallets,
      selectedWalletTitle,
      viewTitle,
      accountListText,
      logoutButtonVisibility,
      isCreateFlow,
      isImportFlow,
      isAccountList,
      isExtensionsList,
      hasBackBtn,
      handleAccountImport,
      handleAccountCreate,
      handleAccountSelect,
      handleWalletSelect,
      handleWalletDisconnect,
      handleAccountLogin,
      handleAccountExport,
      handleAccountDelete,
      handleBack,
      handleAccountLogout,
      navigateToCreateAccount,
      navigateToImportAccount,
    };
  },
};
</script>
