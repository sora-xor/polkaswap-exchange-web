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
import SoraWallet from './SoraWallet.vue';
import { useAccountActions } from './composables/useAccountActions';
import { useAddAsset } from './composables/useAddAsset';
import { useCameraPermission } from './composables/useCameraPermission';
import { useCopyAddress } from './composables/useCopyAddress';
import { useDialogVisibility } from './composables/useDialog';
import { useEthBridgeTransaction } from './composables/useEthBridgeTransaction';
import { useFormattedAmount } from './composables/useFormattedAmount';
import { useInputFocus } from './composables/useInputFocus';
import { useLoading } from './composables/useLoading';
import { useNetworkFeeWarning } from './composables/useNetworkFeeWarning';
import { useNotification } from './composables/useNotification';
import { useNumberFormatter } from './composables/useNumberFormatter';
import { useOperations } from './composables/useOperations';
import { usePaginationSearch } from './composables/usePaginationSearch';
import { useQrCodeParser } from './composables/useQrCodeParser';
import { useTransaction } from './composables/useTransaction';
import { useTranslation } from './composables/useTranslation';
import { useWalletTranslation } from './composables/useWalletTranslation';
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
 * Composition helpers exposed for host applications that embed the wallet and
 * need access to the wallet-specific behaviors outside of the bundled views.
 */
const composables = {
  useAccountActions,
  useAddAsset,
  useCameraPermission,
  useCopyAddress,
  useDialogVisibility,
  useEthBridgeTransaction,
  useFormattedAmount,
  useInputFocus,
  useLoading,
  useNetworkFeeWarning,
  useNotification,
  useNumberFormatter,
  useOperations,
  usePaginationSearch,
  useQrCodeParser,
  useTransaction,
  useTranslation,
  useWalletTranslation,
};

/**
 * Exposes wallet utilities consumed by the host app while its root store
 * continues to run through the wallet bridge layer.
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
  composables,
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

export {
  useAccountActions,
  useAddAsset,
  useCameraPermission,
  useCopyAddress,
  useDialogVisibility,
  useEthBridgeTransaction,
  useFormattedAmount,
  useInputFocus,
  useLoading,
  useNetworkFeeWarning,
  useNotification,
  useNumberFormatter,
  useOperations,
  usePaginationSearch,
  useQrCodeParser,
  useTransaction,
  useTranslation,
  useWalletTranslation,
};
export { useNotificationStore } from './stores/notification';

export type { PluginOptions };
export type { TransactionSignVisibilityController, TransactionSignVisibilityTarget } from './util';

export default SoraWalletElements;
