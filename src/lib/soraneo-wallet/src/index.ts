/**
 * Entry point for the SORA wallet Vue plugin. This module wires together the
 * public API surface that host applications rely on: the plugin installer,
 * exported components, store/module helpers, and utility functions.
 */
import type { Pinia } from 'pinia';

import { registerGlobalPinia, resolveGlobalPinia } from '@/plugins/pinia';
import {
  SUBQUERY_TYPES,
  SUBSQUID_TYPES,
  AlertsApiService,
  INDEXER_TYPES,
  WC,
  accountUtils,
  api,
  beforeTransactionSign,
  connection,
  en,
  formatAccountAddress,
  getAssetsSubset,
  getCurrentIndexer,
  getExplorerLinks,
  groupRewardsByAssetsList,
  historyElementsFilter,
  runtimeStorage,
  settingsStorage,
  storage,
  validateAddress,
  WALLET_CONSTS,
  WALLET_TYPES,
} from './core';
import { initWallet, waitForCore } from './bootstrap';
import { SoraWallet, components } from './components/registry';
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
import { ScriptLoader } from './util/scriptLoader';

import { type App, type Plugin } from 'vue';

type PluginOptions = {
  pinia?: Pinia;
};

/**
 * Vue plugin definition that registers the wallet into the host application.
 * Pinia is the wallet runtime contract for both the host app and standalone
 * wallet-local development.
 */
const SoraWalletElements: Plugin<PluginOptions> = {
  install(app: App, options?: PluginOptions): void {
    const pinia = registerGlobalPinia(
      (options?.pinia ?? app.config.globalProperties.$pinia ?? resolveGlobalPinia()) as Pinia
    );

    if (!app.config.globalProperties.$pinia) {
      app.use(pinia);
    }

    installWalletPlugins(app);
    app.component('SoraWallet', SoraWallet); // Root component
  },
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
 * Exposes wallet utilities plus the legacy module registry consumed by the
 * host app while its root store still runs through the bridge layer.
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
  WC,
};

export { useDialogVisibility } from './composables/useDialog';
export { useNotification } from './composables/useNotification';
export { useTranslation } from './composables/useTranslation';
export { useNotificationStore } from './stores/notification';

export type { PluginOptions };
export type { TransactionSignVisibilityController, TransactionSignVisibilityTarget } from './util';

export default SoraWalletElements;
