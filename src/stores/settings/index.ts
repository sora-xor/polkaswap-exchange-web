import { defineStore } from 'pinia';
import { markRaw } from 'vue';

import axiosInstance from '@/api';
import {
  DefaultMarketAlgorithm,
  DefaultSlippageTolerance,
  LiquiditySourceForMarketAlgorithm,
  MarketAlgorithms,
} from '@/consts';
import type { Language } from '@/consts';
import { Breakpoint, BreakpointClass } from '@/consts/layout';
import { Theme } from '@/consts/theme';
import { getLocale, getSupportedLocale, setDayJsLocale, setI18nLocale } from '@/lang';
import type { Nullable } from '@/types/common';
import { updateDocumentTitle, updateFpNumberLocale } from '@/utils';
import { NodesConnection } from '@/utils/connection';
import { resolveStaticAssetUrl } from '@/utils/staticAssets';
import storage, { settingsStorage } from '@/utils/storage';
import { requireLegacyStore } from '@/utils/legacy-store';

import type { Ad, FeatureFlags, SettingsState } from './types';
import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import type { NetworkFeesObject } from '@sora-substrate/sdk';
import type { Alert } from '@wallet/lib/types/common';
import type { Currency, CurrencyFields } from '@wallet/lib/types/currency';
import { loadWalletCore } from '@/utils/walletCore';
const { api, connection, WALLET_CONSTS, WALLET_TYPES } = await loadWalletCore();

const detectNotificationApiAvailability = (): boolean => typeof Notification !== 'undefined';

const resolveNotificationPermission = (available: boolean): NotificationPermission =>
  available ? Notification.permission : 'default';

const resolveWindowWidth = (): number => (typeof window !== 'undefined' ? window.innerWidth : 0);

const resolveConnectionDownlink = (): number => {
  if (typeof navigator === 'undefined') return 0;

  const connectionLike = (navigator as any)?.connection;

  return typeof connectionLike?.downlink === 'number' ? (connectionLike.downlink as number) : 0;
};

const getLegacyStore = requireLegacyStore;

const buildInitialState = (): SettingsState => {
  const disclaimerApprove = settingsStorage.get('disclaimerApprove');
  const isRotatePhoneHideBalanceFeatureEnabled =
    settingsStorage.get('isRotatePhoneHideBalanceFeatureEnabled') === 'true';
  const isAccessAccelerometrEventDeclined = settingsStorage.get('isAccessAccelerometrEventDeclined') === 'true';
  const isAccessRotationListener = settingsStorage.get('isAccessRotationListener') === 'true';
  const isThemePreference = settingsStorage.get('isThemePreference') === 'true';
  const isBrowserNotificationApiAvailable = detectNotificationApiAvailability();
  const appConnection = new NodesConnection(settingsStorage, markRaw(connection));

  const state: SettingsState = {
    appConnection,
    featureFlags: {},
    slippageTolerance: storage.get('slippageTolerance') || DefaultSlippageTolerance,
    marketAlgorithm: (storage.get('marketAlgorithm') || DefaultMarketAlgorithm) as MarketAlgorithms,
    userDisclaimerApprove: disclaimerApprove ? JSON.parse(disclaimerApprove) : false,
    transactionDeadline: Number(storage.get('transactionDeadline')) || 20,
    isBrowserNotificationApiAvailable,
    browserNotifsPermission: resolveNotificationPermission(isBrowserNotificationApiAvailable),
    language: getLocale(),
    displayRegions: undefined,
    percentFormat: undefined,
    faucetUrl: '',
    menuCollapsed: false,
    selectNodeDialogVisibility: false,
    selectIndexerDialogVisibility: false,
    selectLanguageDialogVisibility: false,
    selectCurrencyDialogVisibility: false,
    rotatePhoneDialogVisibility: false,
    disclaimerVisibility: false,
    alertSettingsVisibility: false,
    browserNotifPopupVisibility: false,
    browserNotifPopupBlockedVisibility: false,
    internetConnection: undefined,
    internetConnectionSpeed: undefined,
    screenBreakpointClass: BreakpointClass.LargeDesktop,
    windowWidth: resolveWindowWidth(),
    adsArray: [],
    isTMA: false,
    telegramBotUrl: undefined,
    isRotatePhoneHideBalanceFeatureEnabled,
    isOrientationWarningVisible: false,
    isAccessAccelerometrEventDeclined,
    isAccessRotationListener,
    isThemePreference,
  };

  updateIntlArtifacts(state);

  return state;
};

const updateIntlArtifacts = (state: SettingsState): void => {
  const locale = state.language;

  try {
    state.displayRegions = new Intl.DisplayNames([locale], { type: 'region' });
    state.percentFormat = new Intl.NumberFormat([locale], { style: 'percent', maximumFractionDigits: 2 });
  } catch (error) {
    console.warn('Intl is not supported!', error);
    state.displayRegions = null;
    state.percentFormat = null;
  }
};

/**
 * Pinia store that replaces the legacy Vuex-powered settings module.
 * It is responsible for runtime configuration, persisted UI preferences,
 * and feature-flag toggles that are consumed across the application.
 */
export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => buildInitialState(),
  getters: {
    nodeIsConnected(state): boolean {
      return state.appConnection.nodeIsConnected;
    },
    liquiditySource(state): LiquiditySourceTypes {
      return LiquiditySourceForMarketAlgorithm[state.marketAlgorithm];
    },
    moonpayApiKey(): string {
      return getLegacyStore().state.wallet.settings.apiKeys.moonpay;
    },
    moonpayEnabled(): boolean {
      return Boolean(this.moonpayApiKey) && Boolean(this.featureFlags.moonpay);
    },
    orderBookEnabled(state): Nullable<boolean> {
      return state.featureFlags.orderBook;
    },
    kensetsuEnabled(state): Nullable<boolean> {
      return state.featureFlags.kensetsu;
    },
    assetOwnerEnabled(state): Nullable<boolean> {
      return state.featureFlags.assetOwner;
    },
    debugEnabled(state): boolean {
      return Boolean(state.featureFlags.debug);
    },
    pointSystemV2(state): Nullable<boolean> {
      return state.featureFlags.pointSystemV2;
    },
    notificationActivated(state): boolean {
      return state.browserNotifsPermission === 'granted';
    },
    isInternetConnectionEnabled(state): boolean {
      return state.internetConnection ?? (typeof navigator !== 'undefined' ? navigator.onLine : false);
    },
    internetConnectionSpeedMb(state): number {
      return state.internetConnectionSpeed ?? resolveConnectionDownlink();
    },
    isInternetConnectionStable(): boolean {
      const speed = this.internetConnectionSpeedMb;
      return speed >= 1 || !speed;
    },
    libraryTheme(): Nullable<Theme> {
      return getLegacyStore().getters.libraryTheme as Nullable<Theme>;
    },
    exchangeRate(): number {
      return (getLegacyStore().state.wallet.settings.exchangeRate as number) ?? 0;
    },
    currencySymbol(): string {
      return (getLegacyStore().state.wallet.settings.currencySymbol as string) ?? 'USD';
    },
    networkFees(): NetworkFeesObject {
      return getLegacyStore().state.wallet.settings.networkFees as NetworkFeesObject;
    },
    blockNumber(): number {
      return getLegacyStore().state.wallet.settings.blockNumber as number;
    },
    shouldBalanceBeHidden(): boolean {
      return Boolean(getLegacyStore().state.wallet.settings.shouldBalanceBeHidden);
    },
    isWalletLoaded(): boolean {
      return Boolean(getLegacyStore().state.wallet.settings.isWalletLoaded);
    },
    allowFeePopup(): boolean {
      return Boolean(getLegacyStore().state.wallet.settings.allowFeePopup);
    },
    soraNetwork(): Nullable<WALLET_CONSTS.SoraNetwork> {
      return getLegacyStore().state.wallet.settings.soraNetwork as Nullable<WALLET_CONSTS.SoraNetwork>;
    },
    isMSTAvailable(): boolean {
      return Boolean(getLegacyStore().state.wallet.settings.isMSTAvailable);
    },
    currency(): Nullable<Currency> {
      return getLegacyStore().state.wallet.settings.currency as Nullable<Currency>;
    },
    assetsFilter(): WALLET_TYPES.FilterOptions {
      return getLegacyStore().state.wallet.settings.assetsFilter as WALLET_TYPES.FilterOptions;
    },
    currencies(): CurrencyFields[] {
      return (getLegacyStore().state.wallet.settings.currencies as CurrencyFields[]) ?? [];
    },
    alerts(): Array<Alert> {
      return (getLegacyStore().state.wallet.settings.alerts as Array<Alert>) ?? [];
    },
    allowTopUpAlert(): boolean {
      return Boolean(getLegacyStore().state.wallet.settings.allowTopUpAlert);
    },
    indexers(): Record<WALLET_CONSTS.IndexerType, WALLET_TYPES.IndexerState> {
      return getLegacyStore().state.wallet.settings.indexers as Record<
        WALLET_CONSTS.IndexerType,
        WALLET_TYPES.IndexerState
      >;
    },
    indexerType(): Nullable<WALLET_CONSTS.IndexerType> {
      return getLegacyStore().state.wallet.settings.indexerType as Nullable<WALLET_CONSTS.IndexerType>;
    },
  },
  actions: {
    reset(): void {
      this.$patch(buildInitialState());
      updateIntlArtifacts(this.$state);
      updateFpNumberLocale(this.language as Language);
    },
    setSlippageTolerance(value: string): void {
      this.slippageTolerance = value;
      storage.set('slippageTolerance', value);
    },
    setMarketAlgorithm(value: MarketAlgorithms = MarketAlgorithms.SMART): void {
      this.marketAlgorithm = value;
      storage.set('marketAlgorithm', value);
    },
    setTransactionDeadline(value: number): void {
      this.transactionDeadline = value;
      storage.set('transactionDeadline', value);
    },
    setFaucetUrl(url: string): void {
      this.faucetUrl = url;
    },
    setSelectNodeDialogVisibility(value: boolean): void {
      this.selectNodeDialogVisibility = value;
    },
    setSelectIndexerDialogVisibility(value: boolean): void {
      this.selectIndexerDialogVisibility = value;
    },
    setSelectLanguageDialogVisibility(value: boolean): void {
      this.selectLanguageDialogVisibility = value;
    },
    setSelectCurrencyDialogVisibility(value: boolean): void {
      this.selectCurrencyDialogVisibility = value;
    },
    setRotatePhoneDialogVisibility(value: boolean): void {
      this.rotatePhoneDialogVisibility = value;
    },
    toggleDisclaimerDialogVisibility(): void {
      this.disclaimerVisibility = !this.disclaimerVisibility;
    },
    setAlertSettingsPopup(value: boolean): void {
      this.alertSettingsVisibility = value;
    },
    setBrowserNotifsPopupEnabled(value: boolean): void {
      this.browserNotifPopupVisibility = value;
    },
    setBrowserNotifsPopupBlocked(value: boolean): void {
      this.browserNotifPopupBlockedVisibility = value;
    },
    setBrowserNotifsAgreement(value: NotificationPermission): void {
      this.browserNotifsPermission = value;
    },
    setLanguageState(value: Language): void {
      this.language = value;
      settingsStorage.set('language', value);
      updateIntlArtifacts(this.$state);
    },
    setUserDisclaimerApprove(): void {
      this.userDisclaimerApprove = true;
      settingsStorage.set('disclaimerApprove', true);
    },
    setFeatureFlags(featureFlags: FeatureFlags = {}): void {
      this.featureFlags = { ...this.featureFlags, ...featureFlags };

      if (this.featureFlags.alt) {
        api.swap.isALT = true;
      }
    },
    setMenuCollapsed(collapsed: boolean): void {
      this.menuCollapsed = collapsed;
    },
    setInternetConnectionEnabled(): void {
      this.internetConnection = true;
    },
    setInternetConnectionDisabled(): void {
      this.internetConnection = false;
    },
    setInternetConnectionSpeed(): void {
      this.internetConnectionSpeed = resolveConnectionDownlink();
    },
    setScreenBreakpointClass(width: number): void {
      this.windowWidth = width;

      let newClass = this.screenBreakpointClass;

      if (width >= Breakpoint.HugeDesktop) {
        newClass = BreakpointClass.HugeDesktop;
      } else if (width >= Breakpoint.LargeDesktop) {
        newClass = BreakpointClass.LargeDesktop;
      } else if (width >= Breakpoint.Desktop) {
        newClass = BreakpointClass.Desktop;
      } else if (width >= Breakpoint.Tablet) {
        newClass = BreakpointClass.Tablet;
      } else if (width >= Breakpoint.LargeMobile) {
        newClass = BreakpointClass.LargeMobile;
      } else {
        newClass = BreakpointClass.Mobile;
      }

      if (newClass !== this.screenBreakpointClass) {
        this.screenBreakpointClass = newClass;
      }
    },
    setAdsArray(arr: SettingsState['adsArray']): void {
      this.adsArray = arr;
    },
    enableTMA(): void {
      this.isTMA = true;
    },
    disableTMA(): void {
      this.isTMA = false;
    },
    setTelegramBotUrl(url: Nullable<string>): void {
      this.telegramBotUrl = url;
    },
    setIsRotatePhoneHideBalanceFeatureEnabled(value: boolean): void {
      this.isRotatePhoneHideBalanceFeatureEnabled = value;
      settingsStorage.set('isRotatePhoneHideBalanceFeatureEnabled', value);
    },
    setAccessGranted(value: boolean): void {
      this.isAccessRotationListener = value;
      settingsStorage.set('isAccessRotationListener', value);
    },
    setIsAccessAccelerometrEventDeclined(value: boolean): void {
      this.isAccessAccelerometrEventDeclined = value;
      settingsStorage.set('isAccessAccelerometrEventDeclined', value);
    },
    showOrientationWarning(): void {
      this.isOrientationWarningVisible = true;
    },
    hideOrientationWarning(): void {
      this.isOrientationWarningVisible = false;
    },
    setIsThemePreference(value: boolean): void {
      this.isThemePreference = value;
      settingsStorage.set('isThemePreference', value);
    },
    async setLanguage(lang: Language): Promise<void> {
      const locale = getSupportedLocale(lang) as Language;

      await setDayJsLocale(locale);
      await setI18nLocale(locale);
      updateDocumentTitle();
      updateFpNumberLocale(locale);

      this.setLanguageState(locale);
    },
    async fetchAdsArray(): Promise<void> {
      try {
        const marketingConfigUrl = resolveStaticAssetUrl('marketing.json');
        const { data } = await axiosInstance.get<Array<Ad>>(marketingConfigUrl);
        const normalizedAds = Array.isArray(data)
          ? data.map((ad) => {
              const normalized = { ...ad };

              if (ad?.img) {
                normalized.img = resolveStaticAssetUrl(ad.img);
              }

              if (typeof ad?.link === 'string') {
                if (/^\/#\//.test(ad.link)) {
                  normalized.link = `#${ad.link.slice(2)}`;
                } else if (/^#\//.test(ad.link)) {
                  normalized.link = ad.link;
                } else if (/^\/(?!\/)/.test(ad.link)) {
                  normalized.link = resolveStaticAssetUrl(ad.link);
                }
              }

              return normalized;
            })
          : [];

        this.setAdsArray(normalizedAds);
      } catch {
        this.setAdsArray([]);
      }
    },
  },
});
