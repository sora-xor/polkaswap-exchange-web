import { defineModule } from 'direct-vuex';

import { localActionContext, localGetterContext } from '@/store/context';
import { Module } from '@/store/consts';
import pinia from '@/plugins/pinia';
import { useSettingsStore } from '@/stores/settings';

import type { FeatureFlags, SettingsState } from '@/stores/settings/types';
import type { Language, MarketAlgorithms } from '@/consts';
import type { Nullable } from '@/types/common';

const resolveConnectionDownlink = (): number => {
  if (typeof navigator === 'undefined') return 0;
  const connectionLike = (navigator as any)?.connection;
  return typeof connectionLike?.downlink === 'number' ? (connectionLike.downlink as number) : 0;
};

const settingsStore = useSettingsStore(pinia);

const state: SettingsState = { ...settingsStore.$state } as SettingsState;

settingsStore.$subscribe(
  (_mutation, nextState) => {
    Object.assign(state, nextState);
  },
  { detached: true }
);

const getters = {
  nodeIsConnected(storeState: SettingsState): boolean {
    return Boolean(storeState.appConnection?.nodeIsConnected);
  },
  liquiditySource(): unknown {
    return (settingsStore as any).liquiditySource;
  },
  moonpayEnabled(): boolean {
    return Boolean((settingsStore as any).moonpayEnabled);
  },
  orderBookEnabled(storeState: SettingsState): Nullable<boolean> {
    return (storeState.featureFlags as FeatureFlags | undefined)?.orderBook ?? null;
  },
  kensetsuEnabled(storeState: SettingsState): Nullable<boolean> {
    return (storeState.featureFlags as FeatureFlags | undefined)?.kensetsu ?? null;
  },
  assetOwnerEnabled(storeState: SettingsState): Nullable<boolean> {
    return (storeState.featureFlags as FeatureFlags | undefined)?.assetOwner ?? null;
  },
  debugEnabled(storeState: SettingsState): boolean {
    return Boolean((storeState.featureFlags as FeatureFlags | undefined)?.debug);
  },
  isInternetConnectionEnabled(): boolean {
    return Boolean((settingsStore as any).isInternetConnectionEnabled);
  },
  internetConnectionSpeedMb(): number {
    return Number((settingsStore as any).internetConnectionSpeedMb ?? 0);
  },
  isInternetConnectionStable(): boolean {
    return Boolean((settingsStore as any).isInternetConnectionStable);
  },
};

const mutations = {
  setMenuCollapsed(storeState: SettingsState, collapsed: boolean): void {
    const fn = (settingsStore as any).setMenuCollapsed;
    if (typeof fn === 'function') {
      fn.call(settingsStore, collapsed);
    } else {
      (settingsStore as any).menuCollapsed = collapsed;
    }
    storeState.menuCollapsed = collapsed;
  },
  setFaucetUrl(storeState: SettingsState, faucetUrl: string): void {
    const fn = (settingsStore as any).setFaucetUrl;
    if (typeof fn === 'function') {
      fn.call(settingsStore, faucetUrl);
    } else {
      (settingsStore as any).faucetUrl = faucetUrl;
    }
    storeState.faucetUrl = faucetUrl;
  },
  setFeatureFlags(storeState: SettingsState, featureFlags: FeatureFlags = {}): void {
    const fn = (settingsStore as any).setFeatureFlags;
    if (typeof fn === 'function') {
      fn.call(settingsStore, featureFlags);
    } else {
      (settingsStore as any).featureFlags = featureFlags;
    }
    storeState.featureFlags = featureFlags;
  },
  setScreenBreakpointClass(storeState: SettingsState, windowWidth: number): void {
    const fn = (settingsStore as any).setScreenBreakpointClass;
    if (typeof fn === 'function') {
      fn.call(settingsStore, windowWidth);
      Object.assign(storeState, settingsStore.$state);
      return;
    }

    // Fallback: keep width in sync even if breakpoint calculation lives elsewhere.
    (settingsStore as any).windowWidth = windowWidth;
    storeState.windowWidth = windowWidth;
  },
  setSlippageTolerance(storeState: SettingsState, slippageTolerance: string): void {
    const fn = (settingsStore as any).setSlippageTolerance;
    if (typeof fn === 'function') {
      fn.call(settingsStore, slippageTolerance);
    } else {
      (settingsStore as any).slippageTolerance = slippageTolerance;
    }
    storeState.slippageTolerance = slippageTolerance;
  },
  setTransactionDeadline(storeState: SettingsState, transactionDeadline: number): void {
    const fn = (settingsStore as any).setTransactionDeadline;
    if (typeof fn === 'function') {
      fn.call(settingsStore, transactionDeadline);
    } else {
      (settingsStore as any).transactionDeadline = transactionDeadline;
    }
    storeState.transactionDeadline = transactionDeadline;
  },
  setMarketAlgorithm(storeState: SettingsState, marketAlgorithm: MarketAlgorithms): void {
    const fn = (settingsStore as any).setMarketAlgorithm;
    if (typeof fn === 'function') {
      fn.call(settingsStore, marketAlgorithm);
    } else {
      (settingsStore as any).marketAlgorithm = marketAlgorithm;
    }
    storeState.marketAlgorithm = marketAlgorithm;
  },
  setSelectNodeDialogVisibility(storeState: SettingsState, flag: boolean): void {
    const fn = (settingsStore as any).setSelectNodeDialogVisibility;
    if (typeof fn === 'function') {
      fn.call(settingsStore, flag);
    } else {
      (settingsStore as any).selectNodeDialogVisibility = flag;
    }
    storeState.selectNodeDialogVisibility = flag;
  },
  setSelectIndexerDialogVisibility(storeState: SettingsState, flag: boolean): void {
    const fn = (settingsStore as any).setSelectIndexerDialogVisibility;
    if (typeof fn === 'function') {
      fn.call(settingsStore, flag);
    } else {
      (settingsStore as any).selectIndexerDialogVisibility = flag;
    }
    storeState.selectIndexerDialogVisibility = flag;
  },
  setSelectLanguageDialogVisibility(storeState: SettingsState, flag: boolean): void {
    const fn = (settingsStore as any).setSelectLanguageDialogVisibility;
    if (typeof fn === 'function') {
      fn.call(settingsStore, flag);
    } else {
      (settingsStore as any).selectLanguageDialogVisibility = flag;
    }
    storeState.selectLanguageDialogVisibility = flag;
  },
  setSelectCurrencyDialogVisibility(storeState: SettingsState, flag: boolean): void {
    const fn = (settingsStore as any).setSelectCurrencyDialogVisibility;
    if (typeof fn === 'function') {
      fn.call(settingsStore, flag);
    } else {
      (settingsStore as any).selectCurrencyDialogVisibility = flag;
    }
    storeState.selectCurrencyDialogVisibility = flag;
  },
  setAlertSettingsPopup(storeState: SettingsState, flag: boolean): void {
    const fn = (settingsStore as any).setAlertSettingsPopup;
    if (typeof fn === 'function') {
      fn.call(settingsStore, flag);
    } else {
      (settingsStore as any).alertSettingsVisibility = flag;
    }
    storeState.alertSettingsVisibility = flag;
  },
  toggleDisclaimerDialogVisibility(storeState: SettingsState): void {
    const fn = (settingsStore as any).toggleDisclaimerDialogVisibility;
    if (typeof fn === 'function') {
      fn.call(settingsStore);
      Object.assign(storeState, settingsStore.$state);
      return;
    }
    const next = !storeState.disclaimerVisibility;
    (settingsStore as any).disclaimerVisibility = next;
    storeState.disclaimerVisibility = next;
  },
  showOrientationWarning(storeState: SettingsState): void {
    const fn = (settingsStore as any).showOrientationWarning;
    if (typeof fn === 'function') {
      fn.call(settingsStore);
      Object.assign(storeState, settingsStore.$state);
      return;
    }
    (settingsStore as any).isOrientationWarningVisible = true;
    storeState.isOrientationWarningVisible = true;
  },
  hideOrientationWarning(storeState: SettingsState): void {
    const fn = (settingsStore as any).hideOrientationWarning;
    if (typeof fn === 'function') {
      fn.call(settingsStore);
      Object.assign(storeState, settingsStore.$state);
      return;
    }
    (settingsStore as any).isOrientationWarningVisible = false;
    storeState.isOrientationWarningVisible = false;
  },
  setBrowserNotifsPopupEnabled(storeState: SettingsState, flag: boolean): void {
    const fn = (settingsStore as any).setBrowserNotifsPopupEnabled;
    if (typeof fn === 'function') {
      fn.call(settingsStore, flag);
    } else {
      (settingsStore as any).browserNotifPopupVisibility = flag;
    }
    storeState.browserNotifPopupVisibility = flag;
  },
  setBrowserNotifsPopupBlocked(storeState: SettingsState, flag: boolean): void {
    const fn = (settingsStore as any).setBrowserNotifsPopupBlocked;
    if (typeof fn === 'function') {
      fn.call(settingsStore, flag);
    } else {
      (settingsStore as any).browserNotifPopupBlockedVisibility = flag;
    }
    storeState.browserNotifPopupBlockedVisibility = flag;
  },
  setInternetConnectionDisabled(storeState: SettingsState): void {
    const fn = (settingsStore as any).setInternetConnectionDisabled;
    if (typeof fn === 'function') {
      fn.call(settingsStore);
      Object.assign(storeState, settingsStore.$state);
      return;
    }
    (settingsStore as any).internetConnection = false;
    storeState.internetConnection = false;
  },
  setInternetConnectionEnabled(storeState: SettingsState): void {
    const fn = (settingsStore as any).setInternetConnectionEnabled;
    if (typeof fn === 'function') {
      fn.call(settingsStore);
      Object.assign(storeState, settingsStore.$state);
      return;
    }
    (settingsStore as any).internetConnection = true;
    storeState.internetConnection = true;
  },
  setInternetConnectionSpeed(storeState: SettingsState): void {
    const fn = (settingsStore as any).setInternetConnectionSpeed;
    if (typeof fn === 'function') {
      fn.call(settingsStore);
      Object.assign(storeState, settingsStore.$state);
      return;
    }
    const speed = resolveConnectionDownlink();
    (settingsStore as any).internetConnectionSpeed = speed;
    storeState.internetConnectionSpeed = speed;
  },
  enableTMA(storeState: SettingsState): void {
    const fn = (settingsStore as any).enableTMA;
    if (typeof fn === 'function') {
      fn.call(settingsStore);
      Object.assign(storeState, settingsStore.$state);
      return;
    }
    (settingsStore as any).isTMA = true;
    storeState.isTMA = true;
  },
  disableTMA(storeState: SettingsState): void {
    const fn = (settingsStore as any).disableTMA;
    if (typeof fn === 'function') {
      fn.call(settingsStore);
      Object.assign(storeState, settingsStore.$state);
      return;
    }
    (settingsStore as any).isTMA = false;
    storeState.isTMA = false;
  },
  setTelegramBotUrl(storeState: SettingsState, url: Nullable<string>): void {
    const fn = (settingsStore as any).setTelegramBotUrl;
    if (typeof fn === 'function') {
      fn.call(settingsStore, url);
    } else {
      (settingsStore as any).telegramBotUrl = url;
    }
    storeState.telegramBotUrl = url;
  },
  setAccessGranted(storeState: SettingsState, flag: boolean): void {
    const fn = (settingsStore as any).setAccessGranted;
    if (typeof fn === 'function') {
      fn.call(settingsStore, flag);
      Object.assign(storeState, settingsStore.$state);
      return;
    }
    (settingsStore as any).isAccessRotationListener = flag;
    storeState.isAccessRotationListener = flag;
  },
  setIsAccessAccelerometrEventDeclined(storeState: SettingsState, flag: boolean): void {
    const fn = (settingsStore as any).setIsAccessAccelerometrEventDeclined;
    if (typeof fn === 'function') {
      fn.call(settingsStore, flag);
    } else {
      (settingsStore as any).isAccessAccelerometrEventDeclined = flag;
    }
    storeState.isAccessAccelerometrEventDeclined = flag;
  },
  setIsRotatePhoneHideBalanceFeatureEnabled(storeState: SettingsState, flag: boolean): void {
    const fn = (settingsStore as any).setIsRotatePhoneHideBalanceFeatureEnabled;
    if (typeof fn === 'function') {
      fn.call(settingsStore, flag);
    } else {
      (settingsStore as any).isRotatePhoneHideBalanceFeatureEnabled = flag;
    }
    storeState.isRotatePhoneHideBalanceFeatureEnabled = flag;
  },
  setIsThemePreference(storeState: SettingsState, flag: boolean): void {
    const fn = (settingsStore as any).setIsThemePreference;
    if (typeof fn === 'function') {
      fn.call(settingsStore, flag);
    } else {
      (settingsStore as any).isThemePreference = flag;
    }
    storeState.isThemePreference = flag;
  },
  setWalletLoaded(): void {
    // Kept for compatibility with host apps that used the root settings module
    // as a signal for wallet init completion (see @wallet/internal initWallet).
  },
  setPermissions(): void {
    // Kept for compatibility with wallet init fallbacks.
  },
  setProductDialogVisibility(): void {
    // Deprecated: product popups are driven by component events.
  },
};

const actions = {
  async setLanguage(_context, language: Language): Promise<void> {
    const fn = (settingsStore as any).setLanguage;
    if (typeof fn === 'function') {
      await fn.call(settingsStore, language);
      Object.assign(state, settingsStore.$state);
      return;
    }
    (settingsStore as any).language = language;
    state.language = language as unknown as SettingsState['language'];
  },
  async fetchAdsArray(): Promise<void> {
    const fn = (settingsStore as any).fetchAdsArray;
    if (typeof fn === 'function') {
      await fn.call(settingsStore);
      Object.assign(state, settingsStore.$state);
    }
  },
};

const settings = defineModule({
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
});

const settingsGetterContext = (args: [any, any, any, any]) => localGetterContext(args, Module.Settings, settings);
const settingsActionContext = (context: any) => localActionContext(context, Module.Settings, settings);

export { settingsGetterContext, settingsActionContext };
export default settings;
