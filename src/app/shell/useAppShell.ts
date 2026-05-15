import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref, shallowRef, watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';

import { appRouterLoading } from '@/app/navigation/loading';
import { useLoading } from '@/composables/useLoading';
import { useTranslation } from '@/composables/useTranslation';
import { TranslationConsts } from '@/consts/app';
import { BreakpointClass } from '@/consts/layout';
import { Language } from '@/consts/language';
import { PageNames } from '@/consts/navigation';
import { Theme } from '@/consts/theme';
import { WalletPermissions } from '@/consts/wallet';
import { getLocale } from '@/lang';
import router, { goTo as navigateTo } from '@/app/router';
import { IndexerType, SoraNetwork } from '@/lib/soraneo-wallet/src/consts';
import { useReferralsStore } from '@/stores/referrals';
import { useSettingsStore } from '@/stores/settings';
import { useWeb3Store } from '@/stores/web3';
import { useWalletStore } from '@/stores/wallet';
import { bootstrapRuntimeServices } from '@/utils/bootstrapRuntimeServices';
import { clearLocalStorage } from '@/utils/storage';
import { resolvePolkaswapIndexerEndpoint } from '@/utils/indexerEndpoint';
import { getEnvConfigCandidates } from '@/utils/staticAssets';
import { shouldLoadTelegramMiniApp } from '@/utils/telegramLaunch';
import { getBuildVariant, trackEvent } from '@/utils/telemetry';
import { getMobileCssClasses } from '@/utils/device';

import { closeVisibleDialog, syncRouteScopedDialogVisibility, type DialogVisibilityBinding } from './dialogVisibility';
import { buildRuntimeEnvConfigUrls, resolveRuntimeEnvConfigPayload, type RuntimeEnvConfig } from './runtimeEnvConfig';
import { resolveAppMainRouteClass } from './policies/resolveAppMainRouteClass';
import { resolveDisclaimerVisibilityOnRouteChange } from './policies/resolveDisclaimerVisibilityOnRouteChange';
import { resolveMenuVisibilityOnBreakpointChange } from './policies/resolveMenuVisibilityOnBreakpointChange';
import { resolveMenuVisibilityOnRouteChange } from './policies/resolveMenuVisibilityOnRouteChange';
import { resolveParentLoadingByConnection } from './policies/resolveParentLoadingByConnection';
import { resolveProductPopupKey } from './policies/resolveProductPopupKey';
import { resolveWalletOverlayVisibility } from './policies/resolveWalletOverlayVisibility';
import { createAppShellBrowserEffects } from './useAppShellBrowserEffects';
import { createDataPlaneTelemetry } from './useDataPlaneTelemetry';
import { createIpfsImageNormalizer } from './useIpfsImageNormalizer';

import { resolveRealtimeConnectionCap } from '@/utils/realtimeConnectionCap';

import type { FeatureFlags } from '@/stores/settings/types';
import type { EthBridgeSettings, SubNetworkApps } from '@/stores/web3/types';
import type { Nullable } from '@/types/common';
import type { HistoryItem } from '@sora-substrate/sdk';
import type { WhitelistArrayItem } from '@sora-substrate/sdk/build/assets/types';
import type { EvmNetwork } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';

type ApiModule = typeof import('@/api');
type AlertsServiceModule = typeof import('@/lib/soraneo-wallet/src/services/alerts');
type ConnectionModule = typeof import('@/utils/connection');
type NodeNotificationsModule = typeof import('@/composables/useNodeNotifications');
type RealtimeModule = typeof import('@/services/realtime');
type SwitchThemeModule = typeof import('@/utils/switchTheme');
type TelegramModule = typeof import('@/utils/telegram');
type TransactionModule = typeof import('@/composables/useTransaction');
type TransactionComposable = ReturnType<TransactionModule['useTransaction']>;
type WalletApiModule = typeof import('@/lib/soraneo-wallet/src/api');
type WalletBootstrapModule = typeof import('@/lib/soraneo-wallet/src/bootstrap');
type DataPlaneClient = ReturnType<RealtimeModule['getDataPlaneClient']>;

let apiModulePromise: Promise<ApiModule> | null = null;
let alertsServiceModulePromise: Promise<AlertsServiceModule> | null = null;
let connectionModulePromise: Promise<ConnectionModule> | null = null;
let nodeNotificationsModulePromise: Promise<NodeNotificationsModule> | null = null;
let realtimeModulePromise: Promise<RealtimeModule> | null = null;
let switchThemeModulePromise: Promise<SwitchThemeModule> | null = null;
let telegramModulePromise: Promise<TelegramModule> | null = null;
let transactionModulePromise: Promise<TransactionModule> | null = null;
let walletApiModulePromise: Promise<WalletApiModule> | null = null;
let walletBootstrapModulePromise: Promise<WalletBootstrapModule> | null = null;

const loadApiModule = (): Promise<ApiModule> => {
  apiModulePromise ??= import('@/api');
  return apiModulePromise;
};

/**
 * Loads browser notification alerts outside the initial shell bundle.
 */
const loadAlertsServiceModule = (): Promise<AlertsServiceModule> => {
  alertsServiceModulePromise ??= import('@/lib/soraneo-wallet/src/services/alerts');
  return alertsServiceModulePromise;
};

/**
 * Synchronizes the alert service route once the alert module is requested.
 */
const syncAlertsBaseRoute = async (): Promise<void> => {
  const [{ default: AlertsApiService }, { getFullBaseUrl }] = await Promise.all([
    loadAlertsServiceModule(),
    loadApiModule(),
  ]);
  AlertsApiService.baseRoute = getFullBaseUrl(router);
};

const loadConnectionModule = (): Promise<ConnectionModule> => {
  connectionModulePromise ??= import('@/utils/connection');
  return connectionModulePromise;
};

const loadNodeNotificationsModule = (): Promise<NodeNotificationsModule> => {
  nodeNotificationsModulePromise ??= import('@/composables/useNodeNotifications');
  return nodeNotificationsModulePromise;
};

const loadRealtimeModule = (): Promise<RealtimeModule> => {
  realtimeModulePromise ??= import('@/services/realtime');
  return realtimeModulePromise;
};

const loadSwitchThemeModule = (): Promise<SwitchThemeModule> => {
  switchThemeModulePromise ??= import('@/utils/switchTheme');
  return switchThemeModulePromise;
};

const loadTelegramModule = (): Promise<TelegramModule> => {
  telegramModulePromise ??= import('@/utils/telegram');
  return telegramModulePromise;
};

const loadTransactionModule = (): Promise<TransactionModule> => {
  transactionModulePromise ??= import('@/composables/useTransaction');
  return transactionModulePromise;
};

const loadWalletApiModule = (): Promise<WalletApiModule> => {
  walletApiModulePromise ??= import('@/lib/soraneo-wallet/src/api');
  return walletApiModulePromise;
};

const loadWalletBootstrapModule = (): Promise<WalletBootstrapModule> => {
  walletBootstrapModulePromise ??= import('@/lib/soraneo-wallet/src/bootstrap');
  return walletBootstrapModulePromise;
};

const startSystemThemePreference = (isTma: boolean): void => {
  void loadSwitchThemeModule()
    .then(({ detectSystemTheme }) => detectSystemTheme(isTma))
    .catch((error) => {
      console.warn('[bootstrap] system theme detection skipped', error);
    });
};

const stopSystemThemePreference = (isTma: boolean): void => {
  if (!switchThemeModulePromise) return;
  void loadSwitchThemeModule()
    .then(({ removeThemeListeners }) => removeThemeListeners(isTma))
    .catch((error) => {
      console.warn('[bootstrap] system theme teardown skipped', error);
    });
};

const initTelegramMiniApp = (botUrl?: string): void => {
  if (!shouldLoadTelegramMiniApp()) return;
  void loadTelegramModule()
    .then(({ tmaSdkService }) => tmaSdkService.init(botUrl))
    .catch((error) => {
      console.warn('[TMA]: initialization skipped', error);
    });
};

const destroyTelegramMiniApp = (): void => {
  if (!telegramModulePromise && !shouldLoadTelegramMiniApp()) return;
  void loadTelegramModule()
    .then(({ tmaSdkService }) => {
      tmaSdkService.destroy();
    })
    .catch((error) => {
      console.warn('[TMA]: teardown skipped', error);
    });
};

/**
 * Central app-shell state and effects. The shell layout and global overlays
 * consume this shared state through app-local composition instead of `App.vue`.
 */
export function useAppShell() {
  const { t } = useTranslation();
  const { loading, withLoading, withApi } = useLoading();

  const route = useRoute();
  const settingsStore = useSettingsStore();
  const referralsStore = useReferralsStore();
  const web3Store = useWeb3Store();
  const walletStore = useWalletStore();
  let dataPlaneClient: DataPlaneClient | null = null;
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
  const appConnection = computed(
    () => settingsStore.appConnection as InstanceType<ConnectionModule['NodesConnection']>
  );
  const browserNotifPopup = computed(() => Boolean(settingsStore.browserNotifPopupVisibility));
  const browserNotifPopupBlocked = computed(() => settingsStore.browserNotifPopupBlockedVisibility as boolean);
  const showAlertSettingsPopup = computed(() => Boolean(settingsStore.alertSettingsVisibility));
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
  const showSoraAccountDialog = computed(() => Boolean(web3Store.soraAccountDialogVisibility));
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

  const chainApi = shallowRef<unknown>(null);

  const productPopupRefs: Record<string, Ref<boolean>> = {
    showSoraMobilePopup,
  };

  let nodeConnectionGateTimer: Nullable<ReturnType<typeof setTimeout>> = null;
  let realtimeVisibilitySyncEnabled = false;
  let realtimeVisibilityListenerBound = false;
  let transactionComposable: TransactionComposable | null = null;
  const ipfsImageNormalizer = createIpfsImageNormalizer();
  const dataPlaneTelemetry = createDataPlaneTelemetry({ buildVariant, trackEvent });

  function getShellDialogBindings(): DialogVisibilityBinding[] {
    return [
      {
        isVisible: Boolean(web3Store.soraAccountDialogVisibility),
        setVisibility: web3Store.setSoraAccountDialogVisibility,
      },
      {
        isVisible: Boolean(web3Store.selectProviderDialogVisibility),
        setVisibility: web3Store.setSelectProviderDialogVisibility,
      },
      {
        isVisible: Boolean(web3Store.selectNetworkDialogVisibility),
        setVisibility: web3Store.setSelectNetworkDialogVisibility,
      },
      {
        isVisible: Boolean(web3Store.selectSubNodeDialogVisibility),
        setVisibility: web3Store.setSelectSubNodeDialogVisibility,
      },
      {
        isVisible: Boolean(web3Store.subAccountDialogVisibility),
        setVisibility: web3Store.setSubAccountDialogVisibility,
      },
      {
        isVisible: Boolean(settingsStore.selectNodeDialogVisibility),
        setVisibility: settingsStore.setSelectNodeDialogVisibility,
      },
      {
        isVisible: Boolean(settingsStore.selectIndexerDialogVisibility),
        setVisibility: settingsStore.setSelectIndexerDialogVisibility,
      },
    ];
  }

  async function getTransactionComposable(): Promise<TransactionComposable> {
    if (transactionComposable) return transactionComposable;
    const { useTransaction } = await loadTransactionModule();
    transactionComposable = useTransaction();
    return transactionComposable;
  }

  function getOrCreateDataPlaneClient(module: RealtimeModule): DataPlaneClient {
    dataPlaneClient ??= module.getDataPlaneClient();
    return dataPlaneClient;
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

  const browserEffects = createAppShellBrowserEffects({
    settingsStore,
    showErrorLocalStorageExceed,
    closeMenu,
  });

  function syncRealtimeVisibility(): void {
    if (typeof document === 'undefined') return;
    if (!realtimeVisibilitySyncEnabled) return;
    if (!dataPlaneClient) return;
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

    const [{ initWallet, waitForCore }, { useNodeNotifications }] = await Promise.all([
      loadWalletBootstrapModule(),
      loadNodeNotificationsModule(),
    ]);
    const { handleNodeError, handleNodeDisconnect, handleNodeConnect } = useNodeNotifications();

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
    const { default: axiosInstance } = await loadApiModule();
    const origin =
      typeof window !== 'undefined' && typeof window.location?.origin === 'string' ? window.location.origin : undefined;

    for (const candidate of candidates) {
      const envConfigUrls = buildRuntimeEnvConfigUrls(candidate, origin);

      for (const envConfigUrl of envConfigUrls) {
        try {
          const { data } = await axiosInstance.get(envConfigUrl);
          const payload = resolveRuntimeEnvConfigPayload(data);

          if (payload.ok) {
            return payload.config;
          }

          if (payload.isHtmlFallback) {
            console.warn('[bootstrap] Env config fallback returned HTML document:', candidate, envConfigUrl);
          } else {
            console.warn('[bootstrap] Invalid env config payload type:', candidate, payload.payloadType, envConfigUrl);
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
    ipfsImageNormalizer.stop();
    browserEffects.unsubscribeFromLocalStorage();
    browserEffects.unsubscribeFromScreenSize();
    browserEffects.unsubscribeFromScreenOrientation();
    browserEffects.unsubscribeFromKeyboard();
    realtimeVisibilitySyncEnabled = false;
    unsubscribeFromRealtimeVisibility();
    dataPlaneTelemetry.unsubscribe();
    stopSystemThemePreference(isTMA.value);
    destroyTelegramMiniApp();
    await walletStore.resetInternalSubscriptions();
    await walletStore.resetNetworkSubscriptions();
    referralsStore.unsubscribeFromInvitedUsers();
    if (dataPlaneClient) {
      await dataPlaneClient.stop();
    }
    const { connection } = await loadWalletApiModule();
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
      if (!value?.status) return;
      void getTransactionComposable()
        .then(({ handleChangeTransaction }) => handleChangeTransaction(value, oldValue))
        .catch((error) => {
          console.warn('[bootstrap] transaction notification skipped', error);
        });
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

      getShellDialogBindings().forEach((dialog) => syncRouteScopedDialogVisibility(dialog, prevPath, nextPath));
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

    getShellDialogBindings().forEach(closeVisibleDialog);
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
        startSystemThemePreference(isTMA.value);
      } else {
        stopSystemThemePreference(isTMA.value);
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

  watch(
    isSignTxDialogVisible,
    (visible) => {
      if (!visible || chainApi.value) return;
      void loadWalletApiModule()
        .then(({ api }) => {
          chainApi.value = api;
        })
        .catch((error) => {
          console.warn('[bootstrap] sign transaction API load skipped', error);
        });
    },
    { immediate: true }
  );

  onBeforeMount(async () => {
    browserEffects.setResponsiveClass();
    await settingsStore.setLanguage(getLocale() as Language);
    void loadApiModule()
      .then(({ updateBaseUrl }) => updateBaseUrl(router))
      .catch((error) => {
        console.warn('[bootstrap] API base route sync skipped', error);
      });
    void syncAlertsBaseRoute().catch((error) => {
      console.warn('[bootstrap] alert service route sync skipped', error);
    });
    let hasIndexerEndpoint = false;

    await withLoading(async () => {
      const data = await loadRuntimeEnvConfig();
      const networkType =
        typeof data.NETWORK_TYPE === 'string' && data.NETWORK_TYPE.length > 0 ? data.NETWORK_TYPE : SoraNetwork.Prod;

      if (!data.NETWORK_TYPE) {
        console.warn('[bootstrap] NETWORK_TYPE is not set. Falling back to default network:', networkType);
      }

      initTelegramMiniApp(data?.TG_BOT_URL);

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
        const { NodesConnection } = await loadConnectionModule();
        NodesConnection.enableBackoff = Boolean(data?.FEATURE_FLAGS?.wsBackoff);
        NodesConnection.enableParallelDial = Boolean(data?.FEATURE_FLAGS?.wsParallelDial);
        NodesConnection.maxActiveConnections = resolveRealtimeConnectionCap(data?.FEATURE_FLAGS?.wsConnectionCaps);
      } catch {
        // noop
      }

      if (data?.FEATURE_FLAGS?.wsWorkerDataPlane) {
        try {
          const realtimeModule = await loadRealtimeModule();
          const client = getOrCreateDataPlaneClient(realtimeModule);
          dataPlaneTelemetry.subscribe(client);
          const started = await client.start({
            preferSharedWorker: Boolean(data?.FEATURE_FLAGS?.wsSharedWorker),
            profile: realtimeModule.normalizeRealtimeProfile(data?.FEATURE_FLAGS?.wsProfile),
            maxConnections: resolveRealtimeConnectionCap(data?.FEATURE_FLAGS?.wsConnectionCaps),
          });

          realtimeVisibilitySyncEnabled = started;
          if (started) {
            subscribeOnRealtimeVisibility();
            syncRealtimeVisibility();
          } else {
            dataPlaneTelemetry.unsubscribe();
            unsubscribeFromRealtimeVisibility();
            await client.stop();
          }
        } catch (error) {
          realtimeVisibilitySyncEnabled = false;
          dataPlaneTelemetry.unsubscribe();
          unsubscribeFromRealtimeVisibility();
          if (dataPlaneClient) {
            await dataPlaneClient.stop();
          }
          console.warn('[bootstrap] realtime data-plane init skipped', error);
        }
      } else {
        realtimeVisibilitySyncEnabled = false;
        dataPlaneTelemetry.unsubscribe();
        unsubscribeFromRealtimeVisibility();
        if (dataPlaneClient) {
          await dataPlaneClient.stop();
        }
      }

      walletStore.setSoraNetwork(networkType);

      const evmNetworks = Array.isArray(data.EVM_NETWORKS_IDS) ? data.EVM_NETWORKS_IDS : [];
      web3Store.setEvmNetworksApp(evmNetworks as EvmNetwork[]);

      const subNetworks = data.SUB_NETWORKS && typeof data.SUB_NETWORKS === 'object' ? data.SUB_NETWORKS : {};
      web3Store.setSubNetworkApps(subNetworks as SubNetworkApps);

      const polkaswapIndexerEndpoint = resolvePolkaswapIndexerEndpoint(data.POLKASWAP_INDEXER_ENDPOINT);
      const hasPolkaswapIndexerEndpoint = polkaswapIndexerEndpoint.length > 0;
      hasIndexerEndpoint = hasPolkaswapIndexerEndpoint;

      walletStore.setIndexerEndpoint({
        indexer: IndexerType.POLKASWAP,
        endpoint: polkaswapIndexerEndpoint,
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

      void bootstrapRuntimeServices({
        connectToNode: runAppConnectionToNode,
        initializeIndexer:
          hasIndexerEndpoint && typeof settingsStore.selectIndexer === 'function'
            ? () => settingsStore.selectIndexer((settingsStore.indexerType ?? IndexerType.POLKASWAP) as IndexerType)
            : undefined,
        subscribeToIndexer: () => walletStore.subscribeOnExchangeRatesApi(),
        hasIndexerEndpoint,
      }).catch((error) => {
        console.warn('[bootstrap] runtime services skipped', error);
      });
    });

    if (!hasIndexerEndpoint) {
      console.warn('[bootstrap] Polkaswap indexer endpoint is not configured. Exchange-rate subscription skipped.');
    }
    void settingsStore.fetchAdsArray();
  });

  onMounted(() => {
    ipfsImageNormalizer.start();
    browserEffects.subscribeOnLocalStorage();
    browserEffects.subscribeOnScreenSize();
    browserEffects.subscribeOnScreenOrientation();
    browserEffects.subscribeOnKeyboard();
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
    showAlertSettingsPopup,
    showConfirmInviteUser,
    showErrorLocalStorageExceed,
    showNotifsDarkPage,
    showNotificationMST,
    showSoraMobilePopup,
    showSoraAccountDialog,
    showWalletOverlays,
    t,
    toggleMenu,
  };
}
