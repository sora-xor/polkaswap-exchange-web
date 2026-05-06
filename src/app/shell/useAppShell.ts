import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';

import axiosInstance, { getFullBaseUrl, updateBaseUrl } from '@/api';
import { appRouterLoading } from '@/app/navigation/loading';
import { useNodeNotifications } from '@/composables/useNodeNotifications';
import { useTransaction } from '@/composables/useTransaction';
import { useTranslation } from '@/composables/useTranslation';
import {
  IndexerType,
  Language,
  LOCAL_STORAGE_LIMIT_PERCENTAGE,
  PageNames,
  SoraNetwork,
  TranslationConsts,
  WalletPermissions,
} from '@/consts';
import { Breakpoint, BreakpointClass } from '@/consts/layout';
import { Theme } from '@/consts/theme';
import { getLocale } from '@/lang';
import router, { goTo as navigateTo } from '@/app/router';
import { getDataPlaneClient, normalizeRealtimeProfile } from '@/services/realtime';
import { api, connection } from '@/lib/soraneo-wallet/src/api';
import AlertsApiService from '@/lib/soraneo-wallet/src/services/alerts';
import { initWallet, waitForCore } from '@/lib/soraneo-wallet/src/bootstrap';
import { useReferralsStore } from '@/stores/referrals';
import { useSettingsStore } from '@/stores/settings';
import { useWeb3Store } from '@/stores/web3';
import { useWalletStore } from '@/stores/wallet';
import { bootstrapRuntimeServices } from '@/utils/bootstrapRuntimeServices';
import { NodesConnection } from '@/utils/connection';
import { toDwebLink } from '@/utils/ipfs';
import { calculateStorageUsagePercentage, clearLocalStorage } from '@/utils/storage';
import { getEnvConfigCandidates, resolveStaticAssetUrl } from '@/utils/staticAssets';
import { detectSystemTheme, removeThemeListeners } from '@/utils/switchTheme';
import { tmaSdkService } from '@/utils/telegram';
import { getBuildVariant, trackEvent } from '@/utils/telemetry';
import { getMobileCssClasses } from '@/utils';

import { resolveAppMainRouteClass } from './policies/resolveAppMainRouteClass';
import { resolveDialogVisibilityOnRouteChange } from './policies/resolveDialogVisibilityOnRouteChange';
import { resolveDisclaimerVisibilityOnRouteChange } from './policies/resolveDisclaimerVisibilityOnRouteChange';
import { resolveMenuVisibilityOnBreakpointChange } from './policies/resolveMenuVisibilityOnBreakpointChange';
import { resolveMenuVisibilityOnRouteChange } from './policies/resolveMenuVisibilityOnRouteChange';
import { resolveParentLoadingByConnection } from './policies/resolveParentLoadingByConnection';
import { resolveProductPopupKey } from './policies/resolveProductPopupKey';
import { resolveWalletOverlayVisibility } from './policies/resolveWalletOverlayVisibility';

import type { FeatureFlags } from '@/stores/settings/types';
import type { EthBridgeSettings, SubNetworkApps } from '@/stores/web3/types';
import type { Nullable } from '@/types/common';
import type { HistoryItem } from '@sora-substrate/sdk';
import type { WhitelistArrayItem } from '@sora-substrate/sdk/build/assets/types';
import type { EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';

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

/**
 * Central app-shell state and effects. The shell layout and global overlays
 * consume this shared state through app-local composition instead of `App.vue`.
 */
export function useAppShell() {
  const { t } = useTranslation();
  const { loading, withLoading, withApi, handleChangeTransaction } = useTransaction();
  const { handleNodeError, handleNodeDisconnect, handleNodeConnect } = useNodeNotifications();

  const route = useRoute();
  const settingsStore = useSettingsStore();
  const referralsStore = useReferralsStore();
  const web3Store = useWeb3Store();
  const walletStore = useWalletStore();
  const dataPlaneClient = getDataPlaneClient();
  const buildVariant = getBuildVariant();
  const NODE_CONNECTION_LOADING_TIMEOUT_MS = 12_000;

  const showSoraMobilePopup = ref(false);
  const menuVisibility = ref(false);
  const showConfirmInviteUser = ref(false);
  const showNotifsDarkPage = ref(false);
  const showErrorLocalStorageExceed = ref(false);
  const showNotificationMST = ref(false);
  const isTearingDown = ref(false);
  const nodeConnectionGateExpired = ref(false);

  const responsiveClass = computed(() => settingsStore.screenBreakpointClass as BreakpointClass);
  const appConnection = computed(() => settingsStore.appConnection as NodesConnection);
  const browserNotifPopup = computed(() => Boolean(settingsStore.browserNotifPopupVisibility));
  const browserNotifPopupBlocked = computed(() => settingsStore.browserNotifPopupBlockedVisibility as boolean);
  const isThemePreference = computed(() => Boolean(settingsStore.isThemePreference));
  const isTMA = computed(() => Boolean(settingsStore.isTMA));
  const isMSTAvailable = computed(() => Boolean(settingsStore.isMSTAvailable));
  const assetsToNotifyQueue = computed(() => (walletStore.assetsToNotifyQueue as WhitelistArrayItem[]) ?? []);
  const accountAddress = computed(() => walletStore.address as string);
  const pendingMstTransactions = computed(() => {
    const list = walletStore.pendingMstTransactions as Nullable<HistoryItem[]>;
    return Array.isArray(list) ? list : [];
  });
  const storageReferrer = computed(() => referralsStore.storageReferrer as string);
  const referrer = computed(() => referralsStore.referrer as string);
  const disclaimerVisibility = computed(() => Boolean(settingsStore.disclaimerVisibility));
  const effectiveDisclaimerVisibility = computed(() =>
    resolveDisclaimerVisibilityOnRouteChange(
      disclaimerVisibility.value,
      Boolean(settingsStore.userDisclaimerApprove),
      route.name
    )
  );
  const pageLoading = computed(() => Boolean(appRouterLoading.value));
  const nodeIsConnected = computed(() => Boolean(settingsStore.nodeIsConnected));
  const firstReadyTransaction = computed(() => walletStore.firstReadyTransaction as Nullable<HistoryItem>);
  const isLoggedIn = computed(() => Boolean(walletStore.isLoggedIn));
  const libraryTheme = computed(() => settingsStore.libraryTheme as Theme);
  const account = computed(() => walletStore.account);
  const isSignTxDialogVisible = computed(() => Boolean(walletStore.isSignTxDialogVisible));
  const isWalletLoaded = computed(() => Boolean(settingsStore.isWalletLoaded));
  const showWalletOverlays = computed(() => resolveWalletOverlayVisibility(isWalletLoaded.value, isTearingDown.value));
  const orientationWarningVisible = computed({
    get: () => Boolean(settingsStore.isOrientationWarningVisible),
    set: (flag: boolean) => {
      if (flag) {
        settingsStore.showOrientationWarning();
      } else {
        settingsStore.hideOrientationWarning();
      }
    },
  });
  const showBrowserNotifPopup = computed({
    get: () => Boolean(browserNotifPopup.value),
    set: (flag: boolean) => {
      settingsStore.setBrowserNotifsPopupEnabled(flag);
    },
  });
  const showBrowserNotifBlockedPopup = computed({
    get: () => Boolean(browserNotifPopupBlocked.value),
    set: (flag: boolean) => {
      settingsStore.setBrowserNotifsPopupBlocked(flag);
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
    const routeClass = resolveAppMainRouteClass(route.name);

    if (routeClass) {
      classes.push(`${baseClass}--${routeClass}`);
    }

    return classes;
  });
  const hasNodeConfiguration = computed(() => {
    const nodes = appConnection.value?.nodeList;
    return Array.isArray(nodes) && nodes.length > 0;
  });
  const routeParentLoading = computed(() =>
    resolveParentLoadingByConnection({
      transactionLoading: loading.value,
      nodeConnected: nodeIsConnected.value,
      nodeGateExpired: nodeConnectionGateExpired.value,
      hasNodeConfiguration: hasNodeConfiguration.value,
    })
  );

  const chainApi = api;

  const productPopupRefs: Record<string, Ref<boolean>> = {
    showSoraMobilePopup,
  };

  let ipfsObserver: MutationObserver | undefined;
  let teardownDataPlaneMetricsTelemetry: Nullable<FnWithoutArgs> = null;
  let teardownDataPlaneStatusTelemetry: Nullable<FnWithoutArgs> = null;
  let lastDataPlaneMetricsKey = '';
  let lastDataPlanePressureKey = '';
  let nodeConnectionGateTimer: Nullable<ReturnType<typeof setTimeout>> = null;
  let lastDataPlanePressureTs = 0;
  let realtimeVisibilitySyncEnabled = false;
  let realtimeVisibilityListenerBound = false;
  const dataPlaneStatusByConnection = new Map<string, string>();
  const DATAPLANE_PRESSURE_PENDING_RPC_THRESHOLD = 40;
  const DATAPLANE_PRESSURE_OPEN_CONNECTIONS_THRESHOLD = 8;
  const DATAPLANE_PRESSURE_MIN_INTERVAL_MS = 60_000;

  function resolveWsConnectionCap(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }

    if (value === true) {
      return 4;
    }

    return Number.POSITIVE_INFINITY;
  }

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

  function openProductDialog(product = 'soraMobile'): void {
    closeMenu();
    const key = resolveProductPopupKey(product);
    const popup = productPopupRefs[key];
    if (popup) {
      popup.value = true;
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
    closeMenu();
    settingsStore.setScreenBreakpointClass(window.innerWidth);
  }

  function subscribeOnScreenSize(): void {
    window.addEventListener('resize', setResponsiveClass);
  }

  function unsubscribeFromScreenSize(): void {
    window.removeEventListener('resize', setResponsiveClass);
  }

  function handleOrientationChange(): void {
    const isLandscape = screen.orientation
      ? screen.orientation.type.startsWith('landscape')
      : window.innerHeight < window.innerWidth;
    if (isLandscape) {
      settingsStore.showOrientationWarning();
    } else {
      settingsStore.hideOrientationWarning();
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

  function handleGlobalKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      closeMenu();
    }
  }

  function subscribeOnKeyboard(): void {
    window.addEventListener('keydown', handleGlobalKeydown);
  }

  function unsubscribeFromKeyboard(): void {
    window.removeEventListener('keydown', handleGlobalKeydown);
  }

  function syncRealtimeVisibility(): void {
    if (typeof document === 'undefined') return;
    if (!realtimeVisibilitySyncEnabled) return;
    void dataPlaneClient.setVisibility(document.visibilityState === 'visible');
  }

  function subscribeOnRealtimeVisibility(): void {
    if (typeof document === 'undefined') return;
    if (!realtimeVisibilitySyncEnabled) return;
    if (realtimeVisibilityListenerBound) return;
    document.addEventListener('visibilitychange', syncRealtimeVisibility);
    realtimeVisibilityListenerBound = true;
  }

  function unsubscribeFromRealtimeVisibility(): void {
    if (typeof document === 'undefined') return;
    if (!realtimeVisibilityListenerBound) return;
    document.removeEventListener('visibilitychange', syncRealtimeVisibility);
    realtimeVisibilityListenerBound = false;
  }

  function subscribeToDataPlaneTelemetry(): void {
    if (teardownDataPlaneMetricsTelemetry || teardownDataPlaneStatusTelemetry) {
      return;
    }

    teardownDataPlaneMetricsTelemetry = dataPlaneClient.onMetrics(({ metrics }) => {
      const dedupeKey = `${metrics.openConnections}:${metrics.activeSubscriptions}:${metrics.pendingRpcRequests}:${metrics.connectedClients}:${metrics.visible}:${metrics.profile}`;
      if (dedupeKey === lastDataPlaneMetricsKey) return;

      lastDataPlaneMetricsKey = dedupeKey;
      trackEvent('realtime_dataplane_metrics', {
        ...metrics,
        buildVariant,
      });

      const isPressure =
        metrics.pendingRpcRequests >= DATAPLANE_PRESSURE_PENDING_RPC_THRESHOLD ||
        metrics.openConnections >= DATAPLANE_PRESSURE_OPEN_CONNECTIONS_THRESHOLD;

      if (!isPressure) return;

      const pressureKey = `${metrics.openConnections}:${metrics.pendingRpcRequests}:${metrics.profile}`;
      const now = Date.now();
      const canEmitByTime = now - lastDataPlanePressureTs >= DATAPLANE_PRESSURE_MIN_INTERVAL_MS;
      if (pressureKey === lastDataPlanePressureKey && !canEmitByTime) return;

      lastDataPlanePressureKey = pressureKey;
      lastDataPlanePressureTs = now;
      trackEvent('realtime_dataplane_pressure', {
        ...metrics,
        buildVariant,
        pendingRpcThreshold: DATAPLANE_PRESSURE_PENDING_RPC_THRESHOLD,
        openConnectionsThreshold: DATAPLANE_PRESSURE_OPEN_CONNECTIONS_THRESHOLD,
      });
    });

    teardownDataPlaneStatusTelemetry = dataPlaneClient.onStatus(({ connectionId, status, details }) => {
      const previous = dataPlaneStatusByConnection.get(connectionId);
      if (previous === status) return;

      dataPlaneStatusByConnection.set(connectionId, status);
      trackEvent('realtime_dataplane_status', {
        connectionId,
        status,
        ...(details ? { details } : {}),
        buildVariant,
      });
    });
  }

  function unsubscribeFromDataPlaneTelemetry(): void {
    teardownDataPlaneMetricsTelemetry?.();
    teardownDataPlaneStatusTelemetry?.();
    teardownDataPlaneMetricsTelemetry = null;
    teardownDataPlaneStatusTelemetry = null;
    lastDataPlaneMetricsKey = '';
    lastDataPlanePressureKey = '';
    lastDataPlanePressureTs = 0;
    dataPlaneStatusByConnection.clear();
  }

  function startNodeConnectionGate(): void {
    nodeConnectionGateExpired.value = false;
    if (nodeConnectionGateTimer) {
      clearTimeout(nodeConnectionGateTimer);
    }
    nodeConnectionGateTimer = setTimeout(() => {
      nodeConnectionGateExpired.value = true;
      nodeConnectionGateTimer = null;
    }, NODE_CONNECTION_LOADING_TIMEOUT_MS);
  }

  function releaseNodeConnectionGate(): void {
    nodeConnectionGateExpired.value = true;
    if (nodeConnectionGateTimer) {
      clearTimeout(nodeConnectionGateTimer);
      nodeConnectionGateTimer = null;
    }
  }

  async function runAppConnectionToNode(): Promise<void> {
    const walletOptions = {
      permissions: WalletPermissions,
      appName: TranslationConsts.Polkaswap,
    };

    startNodeConnectionGate();
    void initWallet(walletOptions);

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
      releaseNodeConnectionGate();
    }
  }

  async function loadRuntimeEnvConfig(): Promise<RuntimeEnvConfig> {
    const candidates = getEnvConfigCandidates();

    for (const candidate of candidates) {
      const envConfigUrls = [resolveStaticAssetUrl(candidate)];
      const normalizedCandidate = candidate.replace(/^\/+/g, '');

      if (typeof window !== 'undefined' && typeof window.location?.origin === 'string') {
        try {
          const rootConfigUrl = new URL(normalizedCandidate, `${window.location.origin}/`).toString();
          if (!envConfigUrls.includes(rootConfigUrl)) {
            envConfigUrls.push(rootConfigUrl);
          }
        } catch {
          // Ignore malformed runtime location values and continue with resolved URLs.
        }
      }

      for (const envConfigUrl of envConfigUrls) {
        try {
          const { data } = await axiosInstance.get(envConfigUrl);

          if (data && typeof data === 'object' && !Array.isArray(data)) {
            return data as RuntimeEnvConfig;
          }

          const payloadType = Array.isArray(data) ? 'array' : typeof data;
          const payloadPreview = typeof data === 'string' ? data.trim().slice(0, 32).toLowerCase() : undefined;
          const isHtmlFallback = payloadType === 'string' && payloadPreview?.startsWith('<!doctype html');

          if (isHtmlFallback) {
            console.warn('[bootstrap] Env config fallback returned HTML document:', candidate, envConfigUrl);
          } else {
            console.warn('[bootstrap] Invalid env config payload type:', candidate, payloadType, envConfigUrl);
          }
        } catch (error) {
          console.warn('[bootstrap] Failed to load env config:', candidate, envConfigUrl, error);
        }
      }
    }

    return {};
  }

  async function confirmInvitation(): Promise<void> {
    await withApi(async () => {
      await referralsStore.getReferrer();
      if (!storageReferrer.value) return;

      const accountValue = account.value;
      if (accountValue && storageReferrer.value === accountValue.address) {
        referralsStore.resetStorageReferrer();
      } else if (!referrer.value) {
        showConfirmInviteUser.value = true;
      }
    });
  }

  async function teardown(): Promise<void> {
    if (isTearingDown.value) return;
    isTearingDown.value = true;

    releaseNodeConnectionGate();
    stopIpfsObserver();
    unsubscribeFromLocalStorage();
    unsubscribeFromScreenSize();
    unsubscribeFromScreenOrientation();
    unsubscribeFromKeyboard();
    realtimeVisibilitySyncEnabled = false;
    unsubscribeFromRealtimeVisibility();
    unsubscribeFromDataPlaneTelemetry();
    removeThemeListeners(isTMA.value);
    tmaSdkService.destroy();
    await walletStore.resetInternalSubscriptions();
    await walletStore.resetNetworkSubscriptions();
    referralsStore.unsubscribeFromInvitedUsers();
    await dataPlaneClient.stop();
    await connection.close();
  }

  const syncRootTheme = (theme: Theme): void => {
    if (typeof document === 'undefined') return;
    const nextTheme = theme === Theme.DARK ? Theme.DARK : Theme.LIGHT;
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.documentElement.setAttribute('design-system-theme', nextTheme);

    const provider = document.querySelector('.sora-theme-provider');
    provider?.setAttribute('data-theme', nextTheme);
    provider?.setAttribute('design-system-theme', nextTheme);
  };

  watch(
    libraryTheme,
    (theme) => {
      syncRootTheme(theme);
    },
    { immediate: true }
  );

  watch(assetsToNotifyQueue, (queue) => {
    if (!queue?.length) return;
    void walletStore.notifyOnDeposit({ asset: queue[0], message: t('assetDeposit') });
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
        void walletStore.activateNetworkSubscriptions();
      }
    } else {
      void walletStore.resetNetworkSubscriptions();
    }
  });

  watch(isLoggedIn, (loggedIn) => {
    if (loggedIn) {
      void confirmInvitation();
    }
  });

  watch(
    () => route.fullPath,
    (nextPath, prevPath) => {
      menuVisibility.value = resolveMenuVisibilityOnRouteChange(menuVisibility.value, prevPath, nextPath);

      const syncRouteScopedDialog = (isVisible: boolean, setter: unknown): void => {
        const nextVisibility = resolveDialogVisibilityOnRouteChange(isVisible, prevPath, nextPath);
        if (nextVisibility !== isVisible && typeof setter === 'function') {
          setter(nextVisibility);
        }
      };

      syncRouteScopedDialog(Boolean(web3Store.soraAccountDialogVisibility), web3Store.setSoraAccountDialogVisibility);
      syncRouteScopedDialog(
        Boolean(web3Store.selectProviderDialogVisibility),
        web3Store.setSelectProviderDialogVisibility
      );
      syncRouteScopedDialog(
        Boolean(web3Store.selectNetworkDialogVisibility),
        web3Store.setSelectNetworkDialogVisibility
      );
      syncRouteScopedDialog(
        Boolean(web3Store.selectSubNodeDialogVisibility),
        web3Store.setSelectSubNodeDialogVisibility
      );
      syncRouteScopedDialog(Boolean(web3Store.subAccountDialogVisibility), web3Store.setSubAccountDialogVisibility);
      syncRouteScopedDialog(
        Boolean(settingsStore.selectNodeDialogVisibility),
        settingsStore.setSelectNodeDialogVisibility
      );
      syncRouteScopedDialog(
        Boolean(settingsStore.selectIndexerDialogVisibility),
        settingsStore.setSelectIndexerDialogVisibility
      );
    }
  );

  watch(
    [() => route.name, () => settingsStore.userDisclaimerApprove],
    ([routeName, userDisclaimerApproved]) => {
      const nextVisibility = resolveDisclaimerVisibilityOnRouteChange(
        disclaimerVisibility.value,
        Boolean(userDisclaimerApproved),
        routeName
      );

      if (nextVisibility !== disclaimerVisibility.value) {
        settingsStore.setDisclaimerDialogVisibility(nextVisibility);
      }
    },
    { immediate: true }
  );

  watch(responsiveClass, (nextClass, prevClass) => {
    menuVisibility.value = resolveMenuVisibilityOnBreakpointChange(menuVisibility.value, prevClass, nextClass);

    if (nextClass === prevClass) return;

    const closeVisibleDialog = (isVisible: boolean, setter: unknown): void => {
      if (isVisible && typeof setter === 'function') {
        setter(false);
      }
    };

    closeVisibleDialog(Boolean(web3Store.soraAccountDialogVisibility), web3Store.setSoraAccountDialogVisibility);
    closeVisibleDialog(Boolean(web3Store.selectProviderDialogVisibility), web3Store.setSelectProviderDialogVisibility);
    closeVisibleDialog(Boolean(web3Store.selectNetworkDialogVisibility), web3Store.setSelectNetworkDialogVisibility);
    closeVisibleDialog(Boolean(web3Store.selectSubNodeDialogVisibility), web3Store.setSelectSubNodeDialogVisibility);
    closeVisibleDialog(Boolean(web3Store.subAccountDialogVisibility), web3Store.setSubAccountDialogVisibility);
    closeVisibleDialog(Boolean(settingsStore.selectNodeDialogVisibility), settingsStore.setSelectNodeDialogVisibility);
    closeVisibleDialog(
      Boolean(settingsStore.selectIndexerDialogVisibility),
      settingsStore.setSelectIndexerDialogVisibility
    );
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
    await settingsStore.setLanguage(getLocale() as Language);
    updateBaseUrl(router);
    AlertsApiService.baseRoute = getFullBaseUrl(router);
    let hasIndexerEndpoint = false;

    await withLoading(async () => {
      const data = await loadRuntimeEnvConfig();
      const networkType =
        typeof data.NETWORK_TYPE === 'string' && data.NETWORK_TYPE.length > 0 ? data.NETWORK_TYPE : SoraNetwork.Prod;

      if (!data.NETWORK_TYPE) {
        console.warn('[bootstrap] NETWORK_TYPE is not set. Falling back to default network:', networkType);
      }

      tmaSdkService.init(data?.TG_BOT_URL);

      try {
        await walletStore.setApiKeys(data?.API_KEYS);
      } catch (error) {
        console.warn('[bootstrap] failed to set API keys', error);
      }

      if (data.ETH_BRIDGE) {
        web3Store.setEthBridgeSettings(data.ETH_BRIDGE as EthBridgeSettings);
      }

      settingsStore.setFeatureFlags((data?.FEATURE_FLAGS ?? {}) as FeatureFlags);

      try {
        NodesConnection.enableBackoff = Boolean(data?.FEATURE_FLAGS?.wsBackoff);
        NodesConnection.enableParallelDial = Boolean(data?.FEATURE_FLAGS?.wsParallelDial);
        NodesConnection.maxActiveConnections = resolveWsConnectionCap(data?.FEATURE_FLAGS?.wsConnectionCaps);
      } catch {
        // noop
      }

      if (data?.FEATURE_FLAGS?.wsWorkerDataPlane) {
        try {
          subscribeToDataPlaneTelemetry();
          const started = await dataPlaneClient.start({
            preferSharedWorker: Boolean(data?.FEATURE_FLAGS?.wsSharedWorker),
            profile: normalizeRealtimeProfile(data?.FEATURE_FLAGS?.wsProfile),
            maxConnections: resolveWsConnectionCap(data?.FEATURE_FLAGS?.wsConnectionCaps),
          });

          realtimeVisibilitySyncEnabled = started;
          if (started) {
            subscribeOnRealtimeVisibility();
            syncRealtimeVisibility();
          } else {
            unsubscribeFromDataPlaneTelemetry();
            unsubscribeFromRealtimeVisibility();
            await dataPlaneClient.stop();
          }
        } catch (error) {
          realtimeVisibilitySyncEnabled = false;
          unsubscribeFromDataPlaneTelemetry();
          unsubscribeFromRealtimeVisibility();
          await dataPlaneClient.stop();
          console.warn('[bootstrap] realtime data-plane init skipped', error);
        }
      } else {
        realtimeVisibilitySyncEnabled = false;
        unsubscribeFromDataPlaneTelemetry();
        unsubscribeFromRealtimeVisibility();
        await dataPlaneClient.stop();
      }

      walletStore.setSoraNetwork(networkType);

      const evmNetworks = Array.isArray(data.EVM_NETWORKS_IDS) ? data.EVM_NETWORKS_IDS : [];
      web3Store.setEvmNetworksApp(evmNetworks as EvmNetwork[]);

      const subNetworks = data.SUB_NETWORKS && typeof data.SUB_NETWORKS === 'object' ? data.SUB_NETWORKS : {};
      web3Store.setSubNetworkApps(subNetworks as SubNetworkApps);

      const hasSubqueryEndpoint = typeof data.SUBQUERY_ENDPOINT === 'string' && data.SUBQUERY_ENDPOINT.length > 0;
      const hasSubsquidEndpoint = typeof data.SUBSQUID_ENDPOINT === 'string' && data.SUBSQUID_ENDPOINT.length > 0;
      hasIndexerEndpoint = hasSubqueryEndpoint || hasSubsquidEndpoint;

      walletStore.setIndexerEndpoint({
        indexer: IndexerType.SUBQUERY,
        endpoint: hasSubqueryEndpoint ? data.SUBQUERY_ENDPOINT : '',
      });
      walletStore.setIndexerEndpoint({
        indexer: IndexerType.SUBSQUID,
        endpoint: hasSubsquidEndpoint ? data.SUBSQUID_ENDPOINT : '',
      });

      if (data.FAUCET_URL) {
        settingsStore.setFaucetUrl(data.FAUCET_URL);
      }

      const connectionInstance = appConnection.value;
      if (connectionInstance && typeof connectionInstance.setDefaultNodes === 'function') {
        const defaultNetworks = Array.isArray(data.DEFAULT_NETWORKS) ? data.DEFAULT_NETWORKS : [];
        connectionInstance.setDefaultNodes(defaultNetworks);
      }
      if (connectionInstance && typeof connectionInstance.setNetworkChainGenesisHash === 'function') {
        connectionInstance.setNetworkChainGenesisHash(data?.CHAIN_GENESIS_HASH);
      }

      await bootstrapRuntimeServices({
        connectToNode: runAppConnectionToNode,
        initializeIndexer:
          hasIndexerEndpoint && typeof settingsStore.selectIndexer === 'function'
            ? () => settingsStore.selectIndexer((settingsStore.indexerType ?? IndexerType.SUBQUERY) as IndexerType)
            : undefined,
        subscribeToIndexer: () => walletStore.subscribeOnExchangeRatesApi(),
        hasIndexerEndpoint,
      });
    });

    if (!hasIndexerEndpoint) {
      console.warn('[bootstrap] Indexer endpoints are not configured. Exchange-rate subscription skipped.');
    }
    void settingsStore.fetchAdsArray();
  });

  onMounted(() => {
    startIpfsObserver();
    subscribeOnLocalStorage();
    subscribeOnScreenSize();
    subscribeOnScreenOrientation();
    subscribeOnKeyboard();
    subscribeOnRealtimeVisibility();
  });

  onBeforeUnmount(() => {
    void teardown();
  });

  return {
    account,
    appClasses,
    chainApi,
    clearLocalStorage,
    dsProviderClasses,
    effectiveDisclaimerVisibility,
    goTo,
    goToSwap,
    handleAppMenuClick,
    isSignTxDialogVisible,
    libraryTheme,
    loading,
    menuVisibility,
    openProductDialog,
    orientationWarningVisible,
    pageLoading,
    routeParentLoading,
    setDarkPage,
    setSignTxDialogVisibility: walletStore.setSignTxDialogVisibility,
    showBrowserNotifBlockedPopup,
    showBrowserNotifPopup,
    showConfirmInviteUser,
    showErrorLocalStorageExceed,
    showNotifsDarkPage,
    showNotificationMST,
    showSoraMobilePopup,
    showWalletOverlays,
    t,
    toggleMenu,
  };
}
