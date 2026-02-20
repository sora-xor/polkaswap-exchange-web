<template>
  <s-design-system-provider
    :value="libraryDesignSystem"
    class="app sora-theme-provider"
    :class="dsProviderClasses"
    :data-theme="libraryTheme"
  >
    <app-header :loading="loading" @toggle-menu="toggleMenu"></app-header>
    <div :class="appClasses">
      <app-menu
        :visible="menuVisibility"
        :on-select="goTo"
        @open-product-dialog="openProductDialog"
        @click="handleAppMenuClick"
      >
        <app-logo-button slot="head" class="app-logo--menu" :theme="libraryTheme" @click="goToSwap"></app-logo-button>
      </app-menu>
      <div class="app-body">
        <s-scrollbar class="app-body-scrollbar" v-loading="pageLoading">
          <div class="app-content">
            <router-view :parent-loading="loading || !nodeIsConnected"></router-view>
            <app-disclaimer v-if="disclaimerVisibility"></app-disclaimer>
          </div>
        </s-scrollbar>
      </div>
    </div>
    <app-footer></app-footer>
    <referrals-confirm-invite-user
      v-if="showWalletOverlays"
      v-model:visible="showConfirmInviteUser"
    ></referrals-confirm-invite-user>
    <bridge-transfer-notification v-if="showWalletOverlays"></bridge-transfer-notification>
    <app-mobile-popup v-model:visible="showSoraMobilePopup"></app-mobile-popup>
    <app-browser-notifs-enable-dialog
      v-if="showWalletOverlays"
      v-model:visible="showBrowserNotifPopup"
      @set-dark-page="setDarkPage"
    ></app-browser-notifs-enable-dialog>
    <app-browser-notifs-blocked-dialog
      v-if="showWalletOverlays"
      v-model:visible="showBrowserNotifBlockedPopup"
    ></app-browser-notifs-blocked-dialog>
    <app-browser-notifs-blocked-rotate-phone
      v-if="showWalletOverlays"
      v-model:visible="orientationWarningVisible"
    ></app-browser-notifs-blocked-rotate-phone>
    <app-browser-mst-notification-trxs
      v-if="showWalletOverlays"
      v-model:visible="showNotificationMST"
    ></app-browser-mst-notification-trxs>
    <notification-enabling-page v-if="showNotifsDarkPage">
      {{ t('browserNotificationDialog.pointer') }}
    </notification-enabling-page>
    <alerts></alerts>
    <confirm-dialog
      :chain-api="chainApi"
      :account="account"
      :visibility="isSignTxDialogVisible"
      :set-visibility="setSignTxDialogVisibility"
    ></confirm-dialog>
    <select-sora-account-dialog></select-sora-account-dialog>
    <app-browser-notifs-local-storage-override
      v-if="showWalletOverlays"
      v-model:visible="showErrorLocalStorageExceed"
      @delete-data-local-storage="clearLocalStorage"
    >
    </app-browser-notifs-local-storage-override>
  </s-design-system-provider>
</template>

<script setup lang="ts">
import {
  api,
  connection,
  components,
  settingsStorage,
  WALLET_CONSTS,
  AlertsApiService,
  initWallet,
  waitForCore,
} from '@wallet';
import debounce from 'lodash/debounce';
import { computed, onBeforeMount, onMounted, onBeforeUnmount, ref, watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';

import axiosInstance, { updateBaseUrl, getFullBaseUrl } from '@/api';
import AppFooter from '@/components/App/Footer/AppFooter.vue';
import AppHeader from '@/components/App/Header/AppHeader.vue';
import AppMenu from '@/components/App/Menu/AppMenu.vue';
import { useNodeNotifications } from '@/composables/useNodeNotifications';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import { PageNames, Components, Language, WalletPermissions, LOCAL_STORAGE_LIMIT_PERCENTAGE } from '@/consts';
import { BreakpointClass, Breakpoint } from '@/consts/layout';
import { Theme, type DesignSystem } from '@/consts/theme';
import { getLocale } from '@/lang';
import router, { goTo as navigateTo, lazyComponent } from '@/router';
import store from '@/store';
import { useSettingsStore } from '@/stores/settings';
import { useWalletStore } from '@/stores/wallet';
import { getMobileCssClasses } from '@/utils';
import { NodesConnection } from '@/utils/connection';
import { toDwebLink } from '@/utils/ipfs';
import { calculateStorageUsagePercentage, clearLocalStorage } from '@/utils/storage';
import { getEnvConfigCandidates, resolveStaticAssetUrl } from '@/utils/staticAssets';
import { detectSystemTheme, removeThemeListeners } from '@/utils/switchTheme';
import { tmaSdkService } from '@/utils/telegram';

import type { FeatureFlags } from './store/settings/types';
import type { EthBridgeSettings, SubNetworkApps } from './store/web3/types';
import type { HistoryItem } from '@sora-substrate/sdk';
import type { WhitelistArrayItem } from '@sora-substrate/sdk/build/assets/types';
import type { EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';
import type { Nullable } from '@/types/common';

defineOptions({
  components: {
    AppHeader,
    AppFooter,
    AppMenu,
    Alerts: lazyComponent(Components.Alerts),
    AppMobilePopup: lazyComponent(Components.AppMobilePopup),
    AppLogoButton: lazyComponent(Components.AppLogoButton),
    AppDisclaimer: lazyComponent(Components.AppDisclaimer),
    AppBrowserNotifsEnableDialog: lazyComponent(Components.AppBrowserNotifsEnableDialog),
    AppBrowserNotifsBlockedDialog: lazyComponent(Components.AppBrowserNotifsBlockedDialog),
    AppBrowserNotifsLocalStorageOverride: lazyComponent(Components.AppBrowserNotifsLocalStorageOverride),
    AppBrowserNotifsBlockedRotatePhone: lazyComponent(Components.AppBrowserNotifsBlockedRotatePhone),
    AppBrowserMstNotificationTrxs: lazyComponent(Components.AppBrowserMstNotificationTrxs),
    ReferralsConfirmInviteUser: lazyComponent(Components.ReferralsConfirmInviteUser),
    BridgeTransferNotification: lazyComponent(Components.BridgeTransferNotification),
    SelectSoraAccountDialog: lazyComponent(Components.SelectSoraAccountDialog),
    NotificationEnablingPage: components.NotificationEnablingPage,
    ConfirmDialog: components.ConfirmDialog,
  },
});

const { t } = useTranslation();
const { loading, withLoading, withApi, handleChangeTransaction } = useTransaction();
const { handleNodeError, handleNodeDisconnect, handleNodeConnect } = useNodeNotifications();

const route = useRoute();
const settingsStore = useSettingsStore();
const walletStore = useWalletStore();

const showSoraMobilePopup = ref(false);
const menuVisibility = ref(false);
const showConfirmInviteUser = ref(false);
const showNotifsDarkPage = ref(false);
const showErrorLocalStorageExceed = ref(false);
const showNotificationMST = ref(false);
const isTearingDown = ref(false);

const responsiveClass = computed(() => store.state.settings.screenBreakpointClass as BreakpointClass);
const appConnection = computed(() => store.state.settings.appConnection as NodesConnection);
const browserNotifPopup = computed(() => Boolean(store.state.settings?.browserNotifPopupVisibility));
const browserNotifPopupBlocked = computed(() => store.state.settings?.browserNotifPopupBlockedVisibility as boolean);
const isThemePreference = computed(() => Boolean(store.state.settings?.isThemePreference));
const isTMA = computed(() => Boolean(store.state.settings?.isTMA));
const isMSTAvailable = computed(() => Boolean(store.state.wallet?.settings?.isMSTAvailable));
const assetsToNotifyQueue = computed(
  () => (store.state.wallet?.account?.assetsToNotifyQueue as WhitelistArrayItem[]) ?? []
);
const accountAddress = computed(() => (store.state.wallet?.account?.address as string) ?? '');
const pendingMstTransactions = computed(() => {
  const list = store.state.wallet?.transactions?.pendingMstTransactions as Nullable<HistoryItem[]>;
  return Array.isArray(list) ? list : [];
});
const storageReferrer = computed(() => (store.state.referrals?.storageReferrer as string) ?? '');
const referrer = computed(() => (store.state.referrals?.referrer as string) ?? '');
const disclaimerVisibility = computed(() => Boolean(settingsStore.disclaimerVisibility));
const pageLoading = computed(() => Boolean(store.state.router?.loading));
const nodeIsConnected = computed(() => Boolean(store.getters?.settings?.nodeIsConnected));
const firstReadyTransaction = computed(
  () => store.getters?.wallet?.transactions?.firstReadyTx as Nullable<HistoryItem>
);
const isLoggedIn = computed(() => Boolean(store.getters?.wallet?.account?.isLoggedIn));
const libraryTheme = computed(() => store.getters?.libraryTheme as Theme);
const libraryDesignSystem = computed(() => store.getters?.libraryDesignSystem as DesignSystem);
const account = computed(() => store.getters?.wallet?.account?.account);
const isSignTxDialogVisible = computed(() => Boolean(store.state.wallet?.transactions?.isSignTxDialogVisible));
const isWalletLoaded = computed(() => Boolean(store.state.wallet?.settings?.isWalletLoaded));
const orientationWarningVisible = computed({
  get: () => Boolean(store.state.settings.isOrientationWarningVisible),
  set: (flag: boolean) => {
    if (flag) {
      showOrientationWarning();
    } else {
      hideOrientationWarning();
    }
  },
});

const showBrowserNotifPopup = computed({
  get: () => Boolean(browserNotifPopup.value),
  set: (flag: boolean) => {
    store.commit?.settings?.setBrowserNotifsPopupEnabled?.(flag);
  },
});

const showBrowserNotifBlockedPopup = computed({
  get: () => Boolean(browserNotifPopupBlocked.value),
  set: (flag: boolean) => {
    store.commit?.settings?.setBrowserNotifsPopupBlocked?.(flag);
  },
});

const mobileCssClasses = computed(() => getMobileCssClasses());
const dsProviderClasses = computed(() => {
  const classes = mobileCssClasses.value;
  return classes?.length ? [...classes, responsiveClass.value] : responsiveClass.value;
});
const appClasses = computed(() => {
  const baseClass = 'app-main';
  const classes: string[] = [baseClass];
  if (route.name) {
    classes.push(`${baseClass}--${String(route.name).toLowerCase()}`);
  }
  return classes;
});

const chainApi = api;

const resolveCommit = (fn: unknown, type: string) => {
  if (typeof fn === 'function') {
    return fn as (...args: any[]) => unknown;
  }
  if (typeof store.original?.commit === 'function') {
    return (...args: any[]) => store.original.commit(type, ...args);
  }
  return undefined;
};

const resolveDispatch = (fn: unknown, type: string) => {
  if (typeof fn === 'function') {
    return fn as (...args: any[]) => unknown;
  }
  if (typeof store.original?.dispatch === 'function') {
    return (...args: any[]) => store.original.dispatch(type, ...args);
  }
  return undefined;
};

const setSoraNetwork = resolveCommit(store.commit?.wallet?.settings?.setSoraNetwork, 'wallet/settings/setSoraNetwork');
const setIndexerEndpoint = resolveCommit(
  store.commit?.wallet?.settings?.setIndexerEndpoint,
  'wallet/settings/setIndexerEndpoint'
);
const setFaucetUrl = resolveCommit(store.commit?.settings?.setFaucetUrl, 'settings/setFaucetUrl');
const setFeatureFlags = resolveCommit(store.commit?.settings?.setFeatureFlags, 'settings/setFeatureFlags');
const setScreenBreakpointClass = resolveCommit(
  store.commit?.settings?.setScreenBreakpointClass,
  'settings/setScreenBreakpointClass'
);
const showOrientationWarning =
  resolveCommit(store.commit?.settings?.showOrientationWarning, 'settings/showOrientationWarning') ?? (() => {});
const hideOrientationWarning =
  resolveCommit(store.commit?.settings?.hideOrientationWarning, 'settings/hideOrientationWarning') ?? (() => {});
const unsubscribeFromInvitedUsers =
  resolveCommit(store.commit?.referrals?.unsubscribeFromInvitedUsers, 'referrals/unsubscribeFromInvitedUsers') ??
  (() => {});
const setEvmNetworksApp = resolveCommit(store.commit?.web3?.setEvmNetworksApp, 'web3/setEvmNetworksApp');
const setSubNetworkApps = resolveCommit(store.commit?.web3?.setSubNetworkApps, 'web3/setSubNetworkApps');
const setEthBridgeSettings = resolveCommit(store.commit?.web3?.setEthBridgeSettings, 'web3/setEthBridgeSettings');
const resetStorageReferrer =
  resolveCommit(store.commit?.referrals?.resetStorageReferrer, 'referrals/resetStorageReferrer') ?? (() => {});
const setSignTxDialogVisibility =
  resolveCommit(
    store.commit?.wallet?.transactions?.setSignTxDialogVisibility,
    'wallet/transactions/setSignTxDialogVisibility'
  ) ?? (() => {});
const toggleDisclaimerDialogVisibility = resolveCommit(
  store.commit?.settings?.toggleDisclaimerDialogVisibility,
  'settings/toggleDisclaimerDialogVisibility'
);

const setApiKeys = walletStore.setApiKeys;
const subscribeOnExchangeRatesApi = walletStore.subscribeOnExchangeRatesApi;
const resetNetworkSubscriptions = walletStore.resetNetworkSubscriptions;
const resetInternalSubscriptions = walletStore.resetInternalSubscriptions;
const activateNetworkSubscriptions = walletStore.activateNetworkSubscriptions;
const setLanguage = resolveDispatch(store.dispatch?.settings?.setLanguage, 'settings/setLanguage');
const fetchAdsArray = resolveDispatch(store.dispatch?.settings?.fetchAdsArray, 'settings/fetchAdsArray');
const getReferrer = resolveDispatch(store.dispatch?.referrals?.getReferrer, 'referrals/getReferrer');
const notifyOnDeposit = walletStore.notifyOnDeposit;

const productPopupRefs: Record<string, Ref<boolean>> = {
  showSoraMobilePopup,
};

let ipfsObserver: MutationObserver | undefined;

function setDarkPage(value: boolean): void {
  showNotifsDarkPage.value = value;
}

function goToSwap(): void {
  navigateTo(PageNames.Swap);
}

function goTo(name: PageNames): void {
  if (name === PageNames.Rewards) {
    navigateTo(PageNames.PointSystemWrapper);
  } else {
    navigateTo(name);
  }
  closeMenu();
}

function toggleMenu(): void {
  menuVisibility.value = !menuVisibility.value;
}

function closeMenu(): void {
  menuVisibility.value = false;
}

function handleAppMenuClick(event: Event): void {
  const target = event.target as HTMLElement | null;
  const insideSidebar = target?.closest('.app-sidebar');
  if (!insideSidebar) {
    closeMenu();
  }
}

function openProductDialog(product: string): void {
  const key = `show${product.charAt(0).toUpperCase()}${product.slice(1)}Popup`;
  const popup = productPopupRefs[key];
  if (popup) {
    popup.value = true;
  }
}

function showDisclaimer(): void {
  const disclaimerApprove = settingsStorage.get('disclaimerApprove');
  if (!disclaimerApprove && typeof toggleDisclaimerDialogVisibility === 'function') {
    setTimeout(() => toggleDisclaimerDialogVisibility(), 5_000);
  }
}

function normalizeImage(el: HTMLImageElement): void {
  try {
    const current = el.getAttribute('src') || '';
    const normalized = toDwebLink(current);
    if (normalized && normalized !== current) {
      el.setAttribute('src', normalized);
    }
  } catch {
    // noop
  }
}

function scanAndNormalizeImages(root: ParentNode | Document = document): void {
  try {
    const images = root.querySelectorAll ? root.querySelectorAll('img[src]') : [];
    images.forEach((img) => normalizeImage(img as HTMLImageElement));
  } catch {
    // noop
  }
}

function startIpfsObserver(): void {
  try {
    scanAndNormalizeImages();
    ipfsObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          mutation.target instanceof HTMLImageElement &&
          mutation.attributeName === 'src'
        ) {
          normalizeImage(mutation.target);
        } else if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLImageElement) {
              normalizeImage(node);
            } else if ((node as ParentNode).querySelectorAll) {
              scanAndNormalizeImages(node as ParentNode);
            }
          });
        }
      }
    });
    ipfsObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['src'],
      childList: true,
      subtree: true,
    });
  } catch {
    // noop
  }
}

function stopIpfsObserver(): void {
  try {
    ipfsObserver?.disconnect();
    ipfsObserver = undefined;
  } catch {
    // noop
  }
}

function handleLocalStorageChange(): void {
  const usagePercentage = calculateStorageUsagePercentage();
  if (usagePercentage >= LOCAL_STORAGE_LIMIT_PERCENTAGE) {
    showErrorLocalStorageExceed.value = true;
  }
}

function subscribeOnLocalStorage(): void {
  window.addEventListener('localStorageUpdated', handleLocalStorageChange);
}

function unsubscribeFromLocalStorage(): void {
  window.removeEventListener('localStorageUpdated', handleLocalStorageChange);
}

function setResponsiveClass(): void {
  if (typeof setScreenBreakpointClass === 'function') {
    setScreenBreakpointClass(window.innerWidth);
  }
}

const setResponsiveClassDebounced = debounce(setResponsiveClass, 250);

function subscribeOnScreenSize(): void {
  window.addEventListener('resize', setResponsiveClassDebounced);
}

function unsubscribeFromScreenSize(): void {
  window.removeEventListener('resize', setResponsiveClassDebounced);
}

function handleOrientationChange(): void {
  const isLandscape = screen.orientation
    ? screen.orientation.type.startsWith('landscape')
    : window.innerHeight < window.innerWidth;
  if (isLandscape) {
    showOrientationWarning();
  } else {
    hideOrientationWarning();
  }
}

function subscribeOnScreenOrientation(): void {
  if (window.innerWidth <= Breakpoint.LargeMobile) {
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    } else {
      window.addEventListener('resize', handleOrientationChange);
    }
  }
}

function unsubscribeFromScreenOrientation(): void {
  if (screen.orientation) {
    screen.orientation.removeEventListener('change', handleOrientationChange);
  } else {
    window.removeEventListener('resize', handleOrientationChange);
  }
}

async function runAppConnectionToNode(): Promise<void> {
  const walletOptions = {
    permissions: WalletPermissions,
    appName: WALLET_CONSTS.TranslationConsts.Polkaswap,
  };

  try {
    const connectionInstance = appConnection.value;
    if (!Array.isArray(connectionInstance.nodeList) || connectionInstance.nodeList.length === 0) {
      console.warn('[bootstrap] No node endpoints configured. Initial node connection skipped.');
      return;
    }

    await Promise.all([
      waitForCore(walletOptions),
      connectionInstance.connect({
        onError: handleNodeError,
        onDisconnect: handleNodeDisconnect,
        onReconnect: handleNodeConnect,
      }),
    ]);
  } catch {
    // handled via callbacks
  } finally {
    if (!isWalletLoaded.value) {
      await initWallet(walletOptions);
    }
  }
}

type RuntimeEnvConfig = Partial<{
  NETWORK_TYPE: string;
  TG_BOT_URL: string;
  API_KEYS: Record<string, string>;
  ETH_BRIDGE: EthBridgeSettings;
  FEATURE_FLAGS: FeatureFlags;
  EVM_NETWORKS_IDS: EvmNetwork[];
  SUB_NETWORKS: SubNetworkApps;
  SUBQUERY_ENDPOINT: string;
  SUBSQUID_ENDPOINT: string;
  FAUCET_URL: string;
  DEFAULT_NETWORKS: any;
  CHAIN_GENESIS_HASH: string;
}>;

async function loadRuntimeEnvConfig(): Promise<RuntimeEnvConfig> {
  const candidates = getEnvConfigCandidates();

  for (const candidate of candidates) {
    const envConfigUrl = resolveStaticAssetUrl(candidate);

    try {
      const { data } = await axiosInstance.get(envConfigUrl);

      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return data as RuntimeEnvConfig;
      }

      console.warn('[bootstrap] Invalid env config payload:', candidate, data);
    } catch (error) {
      console.warn('[bootstrap] Failed to load env config:', candidate, error);
    }
  }

  return {};
}

async function confirmInvitation(): Promise<void> {
  await withApi(async () => {
    await getReferrer();
    if (!storageReferrer.value) return;

    const accountValue = account.value;
    if (accountValue && storageReferrer.value === accountValue.address) {
      resetStorageReferrer();
    } else if (!referrer.value) {
      showConfirmInviteUser.value = true;
    }
  });
}

async function teardown(): Promise<void> {
  if (isTearingDown.value) return;
  isTearingDown.value = true;

  stopIpfsObserver();
  unsubscribeFromLocalStorage();
  unsubscribeFromScreenSize();
  unsubscribeFromScreenOrientation();
  removeThemeListeners(isTMA.value);
  tmaSdkService.destroy();
  await resetInternalSubscriptions();
  await resetNetworkSubscriptions();
  unsubscribeFromInvitedUsers();
  await connection.close();
}

watch(assetsToNotifyQueue, (queue) => {
  if (!queue?.length) return;
  void notifyOnDeposit({ asset: queue[0], message: t('assetDeposit') });
});

watch(
  firstReadyTransaction,
  (value, oldValue) => {
    handleChangeTransaction(value, oldValue);
  },
  { deep: true }
);

watch(nodeIsConnected, (connected) => {
  if (connected) {
    if (isWalletLoaded.value) {
      void activateNetworkSubscriptions();
    }
  } else {
    void resetNetworkSubscriptions();
  }
});

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    void confirmInvitation();
  }
});

watch(
  storageReferrer,
  (value) => {
    if (isLoggedIn.value && value) {
      void confirmInvitation();
    }
  },
  { immediate: true }
);

watch(
  isThemePreference,
  (preference) => {
    if (preference) {
      detectSystemTheme(isTMA.value);
    } else {
      removeThemeListeners(isTMA.value);
    }
  },
  { immediate: true }
);

watch(
  () => pendingMstTransactions.value.length,
  (length) => {
    if (length > 0 && isMSTAvailable.value) {
      showNotificationMST.value = true;
    }
  },
  { immediate: true }
);

watch(accountAddress, (newAddress, oldAddress) => {
  if (newAddress !== oldAddress) {
    showNotificationMST.value = false;
  }
});

onBeforeMount(async () => {
  setResponsiveClass();
  if (typeof setLanguage === 'function') {
    await setLanguage(getLocale() as Language);
  }
  updateBaseUrl(router);
  AlertsApiService.baseRoute = getFullBaseUrl(router);
  let hasIndexerEndpoint = false;

  await withLoading(async () => {
    const data = await loadRuntimeEnvConfig();
    const networkType =
      typeof data.NETWORK_TYPE === 'string' && data.NETWORK_TYPE.length > 0
        ? data.NETWORK_TYPE
        : WALLET_CONSTS.SoraNetwork.Prod;

    if (!data.NETWORK_TYPE) {
      console.warn('[bootstrap] NETWORK_TYPE is not set. Falling back to default network:', networkType);
    }

    tmaSdkService.init(data?.TG_BOT_URL);

    if (typeof setApiKeys === 'function') {
      try {
        await setApiKeys(data?.API_KEYS);
      } catch (error) {
        console.warn('[bootstrap] failed to set API keys', error);
      }
    }
    if (typeof setEthBridgeSettings === 'function' && data.ETH_BRIDGE) {
      setEthBridgeSettings(data.ETH_BRIDGE as EthBridgeSettings);
    }
    if (typeof setFeatureFlags === 'function') {
      setFeatureFlags((data?.FEATURE_FLAGS ?? {}) as FeatureFlags);
    }

    try {
      NodesConnection.enableBackoff = Boolean(data?.FEATURE_FLAGS?.wsBackoff);
      NodesConnection.enableParallelDial = Boolean(data?.FEATURE_FLAGS?.wsParallelDial);
    } catch {
      // noop
    }

    if (typeof setSoraNetwork === 'function') {
      setSoraNetwork(networkType);
    }
    if (typeof setEvmNetworksApp === 'function') {
      const evmNetworks = Array.isArray(data.EVM_NETWORKS_IDS) ? data.EVM_NETWORKS_IDS : [];
      setEvmNetworksApp(evmNetworks as EvmNetwork[]);
    }
    if (typeof setSubNetworkApps === 'function') {
      const subNetworks = data.SUB_NETWORKS && typeof data.SUB_NETWORKS === 'object' ? data.SUB_NETWORKS : {};
      setSubNetworkApps(subNetworks as SubNetworkApps);
    }

    const hasSubqueryEndpoint = typeof data.SUBQUERY_ENDPOINT === 'string' && data.SUBQUERY_ENDPOINT.length > 0;
    const hasSubsquidEndpoint = typeof data.SUBSQUID_ENDPOINT === 'string' && data.SUBSQUID_ENDPOINT.length > 0;
    hasIndexerEndpoint = hasSubqueryEndpoint || hasSubsquidEndpoint;

    if (typeof setIndexerEndpoint === 'function') {
      if (hasSubqueryEndpoint) {
        setIndexerEndpoint({ indexer: WALLET_CONSTS.IndexerType.SUBQUERY, endpoint: data.SUBQUERY_ENDPOINT });
      }
      if (hasSubsquidEndpoint) {
        setIndexerEndpoint({ indexer: WALLET_CONSTS.IndexerType.SUBSQUID, endpoint: data.SUBSQUID_ENDPOINT });
      }
    }

    if (data.FAUCET_URL && typeof setFaucetUrl === 'function') {
      setFaucetUrl(data.FAUCET_URL);
    }

    const connectionInstance = appConnection.value;
    if (connectionInstance && typeof connectionInstance.setDefaultNodes === 'function') {
      const defaultNetworks = Array.isArray(data.DEFAULT_NETWORKS) ? data.DEFAULT_NETWORKS : [];
      connectionInstance.setDefaultNodes(defaultNetworks);
    }
    if (connectionInstance && typeof connectionInstance.setNetworkChainGenesisHash === 'function') {
      connectionInstance.setNetworkChainGenesisHash(data?.CHAIN_GENESIS_HASH);
    }

    if (typeof runAppConnectionToNode === 'function') {
      await runAppConnectionToNode();
    }
  });

  if (typeof subscribeOnExchangeRatesApi === 'function' && hasIndexerEndpoint) {
    try {
      await subscribeOnExchangeRatesApi();
    } catch (error) {
      console.warn('[bootstrap] subscribeOnExchangeRatesApi skipped', error);
    }
  } else if (!hasIndexerEndpoint) {
    console.warn('[bootstrap] Indexer endpoints are not configured. Exchange-rate subscription skipped.');
  }
  showDisclaimer();
  void fetchAdsArray();
});

onMounted(() => {
  startIpfsObserver();
  subscribeOnLocalStorage();
  subscribeOnScreenSize();
  subscribeOnScreenOrientation();
});

onBeforeUnmount(() => {
  void teardown();
});
</script>

<style lang="scss">
html {
  overflow-y: hidden;
  font-size: var(--s-font-size-small);
  line-height: var(--s-line-height-base);
  letter-spacing: var(--s-letter-spacing-small);
  background-color: var(--s-color-utility-body);
  scrollbar-color: transparent transparent;
}

ul ul {
  list-style-type: none;
}

#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: 'Sora', sans-serif;
  height: 100dvh;
  color: var(--s-color-base-content-primary);
  background-color: var(--s-color-utility-body);
  transition: background-color 500ms linear;
}

.app {
  &-main.app-main {
    &--rewards,
    &--referral {
      .app-content {
        width: 100%;
      }
    }
  }

  &-body-scrollbar {
    flex: 1;

    @include scrollbar;
  }
}

.mobile.ios {
  .el-scrollbar__bar,
  .asset-list .scrollbar {
    opacity: 0.01 !important; // Fix iOS double tap issues
  }
}

.el-notification.sora {
  background: var(--s-color-brand-day);
  box-shadow: var(--s-shadow-tooltip);
  border-radius: calc(var(--s-border-radius-mini) / 2);
  border: none;
  align-items: center;
  position: absolute;
  width: 405px;
  .el-notification {
    &__icon {
      position: relative;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--s-color-utility-surface);
      flex-shrink: 0;
      &:before {
        position: absolute;
        top: -2px;
        left: -2px;
      }

      &.el-icon-success {
        &,
        &:hover {
          color: var(--s-color-status-success);
        }
      }
    }
    &__content {
      margin-top: 0;
      color: var(--s-color-utility-surface);
      text-align: left;
    }
    &__closeBtn {
      top: $inner-spacing-medium;
      color: var(--s-color-utility-surface);
      &:hover {
        color: var(--s-color-utility-surface);
      }
    }
  }
  .loader {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    background: var(--s-color-utility-surface);
    // If duration will be change we should create css variable for it
    animation: runloader 4.5s linear infinite;
    @keyframes runloader {
      0% {
        width: 100%;
      }
      100% {
        width: 0;
      }
    }
  }
  &:hover .loader {
    width: 0;
    animation: none;
  }
  @include mobile(true) {
    width: 300px;
  }
}

.el-form--actions {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.el-message-box {
  border-radius: var(--s-border-radius-small) !important;

  &__message {
    white-space: pre-line;
  }
}

.container {
  @include container-styles;
  .el-loading-mask {
    border-radius: var(--s-border-radius-medium);
  }
}

.link {
  color: var(--s-color-base-content-primary);
}

// Disabled button large typography
.s-typography-button--large.is-disabled {
  font-size: var(--s-font-size-medium) !important;
}

// Icons colors
.el-tooltip[class*=' s-icon-'],
.el-button.el-tooltip i[class*=' s-icon-'] {
  @include icon-styles(true);
}
i.icon-divider {
  @include icon-styles;
}

.app-main--orderbook {
  @include large-mobile {
    .app-menu {
      // TODO: [Rustem] fix shadow issues between menu and orderbook
      position: absolute;
      right: initial;
    }
  }

  .app-content {
    display: flex;
    justify-content: center;
  }
}

@include desktop {
  .app-main--swap,
  .app-main--vaults,
  .app-main--vaultdetails,
  .app-main--assetowner,
  .app-main--assetownerdetails {
    &.app-main {
      .app-menu {
        &:not(.collapsed) {
          position: relative;
        }
        &.collapsed {
          & + .app-body {
            margin-left: 74px;
          }
        }
      }
    }
  }
}
</style>

<style lang="scss" scoped>
.app {
  &-main {
    display: flex;
    align-items: stretch;
    height: calc(100dvh - #{$header-height} - #{$footer-height});
    position: relative;
  }

  &-body {
    position: relative;
    display: flex;
    flex: 1;
    flex-flow: column nowrap;
    max-width: 100%;
  }

  &-content {
    flex: 1;
    padding: $inner-spacing-medium;
  }

  &-footer {
    display: flex;
    flex-direction: column-reverse;
    justify-content: flex-end;
    padding: $basic-spacing-medium;
  }
}

.app-logo--menu {
  margin-bottom: $inner-spacing-big;

  @include large-mobile {
    display: none;
  }
}
</style>
