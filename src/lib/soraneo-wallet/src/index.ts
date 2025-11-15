/**
 * Entry point for the SORA wallet Vue plugin. This module wires together the
 * public API surface that host applications rely on: the plugin installer,
 * exported components, Vuex helpers, and utility functions.
 */
import { createPinia, type Pinia } from 'pinia';

import '@/compat/runtime-helpers';

import {
  SUBQUERY_TYPES,
  SUBSQUID_TYPES,
  AlertsApiService,
  INDEXER_TYPES,
  VUEX_TYPES,
  WC,
  accountUtils,
  addWcSubWalletLocally,
  api,
  beforeTransactionSign,
  connection,
  delay,
  en,
  formatAccountAddress,
  getAssetsSubset,
  getCurrentIndexer,
  getExplorerLinks,
  groupRewardsByAssetsList,
  historyElementsFilter,
  initializeWallets,
  runtimeStorage,
  settingsStorage,
  storage,
  validateAddress,
  vuex,
  WALLET_CONSTS,
  WALLET_TYPES,
} from './core';
import CameraPermissionMixin from './components/mixins/CameraPermissionMixin';
import CopyAddressMixin from './components/mixins/CopyAddressMixin';
import FormattedAmountMixin from './components/mixins/FormattedAmountMixin';
import LoadingMixin from './components/mixins/LoadingMixin';
import NetworkFeeWarningMixin from './components/mixins/NetworkFeeWarningMixin';
import NotificationMixin from './components/mixins/NotificationMixin';
import NumberFormatterMixin from './components/mixins/NumberFormatterMixin';
import PaginationSearchMixin from './components/mixins/PaginationSearchMixin';
import TransactionMixin from './components/mixins/TransactionMixin';
import TranslationMixin from './components/mixins/TranslationMixin';
import installWalletPlugins from './plugins';
import { addGDriveWalletLocally } from './services/google/wallet';
import { addSoraWalletLocally } from './services/sorawallet';
import { ScriptLoader } from './util/scriptLoader';
import internalStore from './store'; // `internalStore` is required for local usage

import type { WithKeyring } from '@sora-substrate/sdk';
import type { App, Plugin, defineAsyncComponent, type AsyncComponentLoader } from 'vue';

type Store = typeof internalStore;
type PluginOptions = {
  store: Store;
  pinia?: Pinia;
};

const lazyComponent = <T>(loader: AsyncComponentLoader<T>) =>
  defineAsyncComponent({
    loader,
    suspensible: false,
  });

const SoraWallet = lazyComponent(() => import('./SoraWallet.vue'));
const WalletAccount = lazyComponent(() => import('./components/Account/WalletAccount.vue'));
const WalletAvatar = lazyComponent(() => import('./components/Account/WalletAvatar.vue'));
const WalletBase = lazyComponent(() => import('./components/WalletBase.vue'));
const WalletFee = lazyComponent(() => import('./components/WalletFee.vue'));
const AccountCard = lazyComponent(() => import('./components/Account/AccountCard.vue'));
const AccountConfirmationOption = lazyComponent(() => import('./components/Account/Settings/ConfirmationOption.vue'));
const AddressBookInput = lazyComponent(() => import('./components/AddressBook/Input.vue'));
const AssetsFilter = lazyComponent(() => import('./components/shared/AssetsFilter.vue'));
const AssetList = lazyComponent(() => import('./components/AssetList.vue'));
const AssetListItem = lazyComponent(() => import('./components/AssetListItem.vue'));
const AddAssetDetailsCard = lazyComponent(() => import('./components/AddAsset/AddAssetDetailsCard.vue'));
const ConfirmDialog = lazyComponent(() => import('./components/ConfirmDialog.vue'));
const TokenAddress = lazyComponent(() => import('./components/TokenAddress.vue'));
const SearchInput = lazyComponent(() => import('./components/Input/SearchInput.vue'));
const InfoLine = lazyComponent(() => import('./components/InfoLine.vue'));
const FormattedAmount = lazyComponent(() => import('./components/FormattedAmount.vue'));
const FormattedAmountWithFiatValue = lazyComponent(() => import('./components/FormattedAmountWithFiatValue.vue'));
const FileUploader = lazyComponent(() => import('./components/FileUploader.vue'));
const TransactionHashView = lazyComponent(() => import('./components/TransactionHashView.vue'));
const NetworkFeeWarning = lazyComponent(() => import('./components/NetworkFeeWarning.vue'));
const TokenLogo = lazyComponent(() => import('./components/TokenLogo.vue'));
const NftDetails = lazyComponent(() => import('./components/NftDetails.vue'));
const HistoryPagination = lazyComponent(() => import('./components/HistoryPagination.vue'));
const DialogBase = lazyComponent(() => import('./components/DialogBase.vue'));
const NotificationEnablingPage = lazyComponent(() => import('./components/NotificationEnablingPage.vue'));
const SimpleNotification = lazyComponent(() => import('./components/SimpleNotification.vue'));
const ConnectionItems = lazyComponent(() => import('./components/Connection/List/ConnectionItems.vue'));
const SyntheticSwitcher = lazyComponent(() => import('./components/shared/SyntheticSwitcher.vue'));
const ExternalLink = lazyComponent(() => import('./components/shared/ExternalLink.vue'));
const FormattedAddress = lazyComponent(() => import('./components/shared/FormattedAddress.vue'));
const AccountConnectionList = lazyComponent(() => import('./components/Connection/List/Account.vue'));
const ExtensionConnectionList = lazyComponent(() => import('./components/Connection/List/Extension.vue'));
const ConnectionView = lazyComponent(() => import('./components/Connection/ConnectionView.vue'));
const PinIcon = lazyComponent(() => import('./components/PinIcon.vue'));

let store: Store;
let piniaInstance: Pinia | undefined;

export const getWalletPinia = (): Pinia | undefined => piniaInstance;

/**
 * Vue plugin definition that registers the wallet into the host application.
 * The plugin expects a Vuex store so it can connect the internal modules.
 */
const SoraWalletElements: Plugin<PluginOptions> = {
  install(app: App, options?: PluginOptions): void {
    if (!options || !options.store) {
      throw new Error('Please provide vuex store.');
    }
    store = options.store;
    piniaInstance = options.pinia ?? piniaInstance ?? createPinia();

    if (!app.config.globalProperties.$pinia && piniaInstance) {
      app.use(piniaInstance);
    }

    installWalletPlugins(app);
    app.component('SoraWallet', SoraWallet); // Root component
  },
};

/**
 * Initializes built-in wallet integrations and local storage depending on the
 * runtime environment (desktop vs web). The initialization is intentionally
 * side-effectful because the wallet modules depend on these registrations.
 */
const initAppWallets = (api: WithKeyring, isDesktop = false, appName?: string) => {
  const dAppName = appName ?? WALLET_CONSTS.TranslationConsts.Polkaswap;

  if (isDesktop) {
    addSoraWalletLocally(api, dAppName);
  } else {
    addGDriveWalletLocally(dAppName);
  }

  addWcSubWalletLocally(api, (source) => {
    store.dispatch.wallet.account.checkConnectedAccountSource(source);
    store.dispatch.wallet.account.updateAvailableWallets();
  });

  initializeWallets(dAppName);

  store.dispatch.wallet.account.updateAvailableWallets();
};

/**
 * Ensures the Vuex store instance is ready before running wallet logic. The
 * wallet can work with either an injected store from the host app or the
 * internal store used by standalone mode, so we wait until one is available.
 */
const waitForStore = async (withoutStore = false): Promise<void> => {
  if (!store) {
    if (withoutStore) {
      store = internalStore;
    } else {
      await delay(100);
      await waitForStore(withoutStore);
    }
  }
};

let walletCoreLoaded = false;

/**
 * Lazily bootstraps the wallet core by waiting for the store and keyring to
 * initialize, then fetching runtime data and applying permission overrides.
 * The function is idempotent so subsequent calls resolve immediately.
 */
const waitForCore = async ({
  withoutStore = false,
  permissions,
}: WALLET_CONSTS.WalletInitOptions = {}): Promise<void> => {
  if (!walletCoreLoaded) {
    await Promise.all([waitForStore(withoutStore), api.initKeyring(true)]);

    if (permissions) {
      store.commit.wallet.settings.setPermissions(permissions);
    }

    store.dispatch.wallet.account.getWhitelist();
    store.dispatch.wallet.account.getNftBlacklist();

    walletCoreLoaded = true;
  }
};

/**
 * Waits for an active blockchain connection before continuing. The helper
 * retries until the API instance is ready so that higher level flows can be
 * written without defensive checks at every stage.
 */
const waitForConnection = async (): Promise<void> => {
  if (connection.loading) {
    await delay(100);
    await waitForConnection();
  } else if (!connection.api) {
    await connection.open();
    console.info('Connected to blockchain', connection.endpoint);
  }
};

/**
 * Restores the last active account and refreshes all computed state that
 * depends on it. This includes route guards and wallet availability checks.
 */
const checkActiveAccount = async (): Promise<void> => {
  await api.restoreActiveAccount();
  await store.dispatch.wallet.account.checkWalletAvailability();
  await store.dispatch.wallet.router.checkCurrentRoute();
};

/**
 * Public initializer that brings the wallet online. Consumers should await
 * this function before interacting with any wallet services.
 */
async function initWallet(options: WALLET_CONSTS.WalletInitOptions = {}): Promise<void> {
  await Promise.all([waitForCore(options), waitForConnection()]);

  initAppWallets(api, store.state.wallet.account.isDesktop, options.appName);
  await checkActiveAccount();

  // don't wait for finalization of internal & external services subscriptions
  store.dispatch.wallet.subscriptions.activateInternalSubscriptions();
  store.dispatch.wallet.settings.selectIndexer();
  // wait for finalization of network subscriptions
  await Promise.all([api.initialize(false), store.dispatch.wallet.subscriptions.activateNetwokSubscriptions()]);
  store.commit.wallet.settings.setIsMstAvailable(
    store.state.wallet.account.source === WALLET_CONSTS.AppWallet.FearlessWallet
  );
  store.dispatch.wallet.account.initMultisigAddress();
  store.commit.wallet.settings.setWalletLoaded(true);
}

/**
 * Public registry of Vue components that can be consumed individually by the
 * host application when the full plugin is not desired.
 */
const components = {
  SoraWallet,
  WalletAccount,
  WalletAvatar,
  WalletBase,
  WalletFee,
  AccountCard,
  AccountConfirmationOption,
  AddressBookInput,
  AssetsFilter,
  AssetList,
  AssetListItem,
  AddAssetDetailsCard,
  ConfirmDialog,
  TokenAddress,
  SearchInput,
  InfoLine,
  FormattedAmount,
  FormattedAmountWithFiatValue,
  FileUploader,
  TransactionHashView,
  NetworkFeeWarning,
  TokenLogo,
  NftDetails,
  HistoryPagination,
  DialogBase,
  NotificationEnablingPage,
  SimpleNotification,
  ConnectionItems,
  SyntheticSwitcher,
  ExternalLink,
  FormattedAddress,
  AccountConnectionList,
  ExtensionConnectionList,
  ConnectionView,
  PinIcon,
};

/**
 * Convenience export for the core mixins. These are kept separate so host
 * applications can register only the behaviors they need.
 */
const mixins = {
  NetworkFeeWarningMixin,
  NumberFormatterMixin,
  FormattedAmountMixin,
  TransactionMixin,
  TranslationMixin,
  NotificationMixin,
  LoadingMixin,
  PaginationSearchMixin,
  CopyAddressMixin,
  CameraPermissionMixin,
};

/**
 * Exposes Vuex utilities that allow consumers to interact with the wallet
 * store using decorators or manual module registration.
 */
export {
  initWallet,
  waitForCore,
  en,
  api,
  connection,
  storage,
  runtimeStorage,
  settingsStorage,
  getExplorerLinks,
  groupRewardsByAssetsList,
  formatAccountAddress,
  validateAddress,
  beforeTransactionSign,
  getAssetsSubset,
  WALLET_CONSTS,
  WALLET_TYPES,
  components,
  mixins,
  accountUtils,
  ScriptLoader,
  historyElementsFilter,
  AlertsApiService,
  getCurrentIndexer,
  SUBQUERY_TYPES,
  SUBSQUID_TYPES,
  INDEXER_TYPES,
  VUEX_TYPES,
  WC,
  vuex,
};

export { useDialogVisibility } from './composables/useDialog';
export { useNotification } from './composables/useNotification';
export { useTranslation } from './composables/useTranslation';
export { useNotificationStore } from './stores/notification';

export type { PluginOptions };

export default SoraWalletElements;
