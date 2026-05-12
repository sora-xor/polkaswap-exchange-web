import { defineStore } from 'pinia';
import { markRaw } from 'vue';

import axiosInstance from '@/api';
import {
  DefaultMarketAlgorithm,
  DefaultSlippageTolerance,
  LiquiditySourceForMarketAlgorithm,
  MarketAlgorithms,
  type WalletAssetFilters,
  Language,
  EditableAlertObject,
} from '@/consts';
import { Breakpoint, BreakpointClass } from '@/consts/layout';
import { Theme, type DesignSystem } from '@/consts/theme';
import { api, connection } from '@/lib/soraneo-wallet/src/api';
import type { IndexerType, SoraNetwork } from '@/lib/soraneo-wallet/src/consts';
import { getLocale, getSupportedLocale, setDayJsLocale, setI18nLocale } from '@/lang';
import { useWalletStore } from '@/stores/wallet';
import type { Nullable } from '@/types/common';
import { updateDocumentTitle } from '@/utils/documentTitle';
import { updateFpNumberLocale } from '@/utils/fp-locale';
import { NodesConnection } from '@/utils/connection';
import { toSafeExternalLink } from '@/utils/externalLinks';
import { resolveStaticAssetUrl } from '@/utils/staticAssets';
import storage, { settingsStorage } from '@/utils/storage';

import type { Ad, FeatureFlags, SettingsState } from './types';
import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import type { NetworkFeesObject } from '@sora-substrate/sdk';
import { FilterOptions, type Alert, type IndexerState } from '@/lib/soraneo-wallet/src/types/common';
import type { Currency, CurrencyFields, FiatExchangeRateObject } from '@/lib/soraneo-wallet/src/types/currency';

const detectNotificationApiAvailability = (): boolean => typeof Notification !== 'undefined';

const resolveNotificationPermission = (available: boolean): NotificationPermission =>
  available ? Notification.permission : 'default';

const resolveWindowWidth = (): number => (typeof window !== 'undefined' ? window.innerWidth : 0);

const resolveConnectionDownlink = (): number => {
  if (typeof navigator === 'undefined') return 0;

  const connectionLike = (navigator as any)?.connection;

  return typeof connectionLike?.downlink === 'number' ? (connectionLike.downlink as number) : 0;
};

const fallbackWalletFilters: WalletAssetFilters = {
  option: 'All' as WalletAssetFilters['option'],
  verifiedOnly: false,
  zeroBalance: false,
};

const buildInitialState = (): SettingsState => {
  const disclaimerApprove = settingsStorage.get('disclaimerApprove');
  const userDisclaimerApprove = disclaimerApprove ? JSON.parse(disclaimerApprove) : false;
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
    userDisclaimerApprove,
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
    // Keep disclaimer visible until user explicitly approves it.
    disclaimerVisibility: !userDisclaimerApprove,
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
      const walletStore = useWalletStore();
      return walletStore.moonpayApiKey;
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
      const walletStore = useWalletStore();
      return walletStore.theme ?? Theme.LIGHT;
    },
    libraryDesignSystem(): DesignSystem {
      return { theme: this.libraryTheme ?? Theme.LIGHT };
    },
    exchangeRate(): number {
      const walletStore = useWalletStore();
      return walletStore.exchangeRate;
    },
    currencySymbol(): string {
      const walletStore = useWalletStore();
      return walletStore.currencySymbol;
    },
    networkFees(): NetworkFeesObject {
      const walletStore = useWalletStore();
      return walletStore.networkFees;
    },
    blockNumber(): number {
      const walletStore = useWalletStore();
      return walletStore.blockNumber;
    },
    shouldBalanceBeHidden(): boolean {
      const walletStore = useWalletStore();
      return walletStore.shouldBalanceBeHidden;
    },
    isWalletLoaded(): boolean {
      const walletStore = useWalletStore();
      return walletStore.isWalletLoaded;
    },
    allowFeePopup(): boolean {
      const walletStore = useWalletStore();
      return walletStore.allowFeePopup;
    },
    soraNetwork(): Nullable<SoraNetwork> {
      const walletStore = useWalletStore();
      return walletStore.soraNetwork as Nullable<SoraNetwork>;
    },
    isMSTAvailable(): boolean {
      const walletStore = useWalletStore();
      return walletStore.isMSTAvailable;
    },
    currency(): Nullable<Currency> {
      const walletStore = useWalletStore();
      return walletStore.currency as Nullable<Currency>;
    },
    filters(): WalletAssetFilters {
      const walletStore = useWalletStore();
      return walletStore.filters ?? fallbackWalletFilters;
    },
    assetsFilter(): FilterOptions {
      const walletStore = useWalletStore();
      return (walletStore.assetsFilter as FilterOptions) ?? FilterOptions.All;
    },
    currencies(): CurrencyFields[] {
      const walletStore = useWalletStore();
      return walletStore.currencies as CurrencyFields[];
    },
    alerts(): Array<Alert> {
      const walletStore = useWalletStore();
      return walletStore.alerts as Array<Alert>;
    },
    allowTopUpAlert(): boolean {
      const walletStore = useWalletStore();
      return walletStore.allowTopUpAlert;
    },
    indexers(): Record<IndexerType, IndexerState> {
      const walletStore = useWalletStore();
      return walletStore.indexers as Record<IndexerType, IndexerState>;
    },
    indexerType(): Nullable<IndexerType> {
      const walletStore = useWalletStore();
      return walletStore.indexerType as Nullable<IndexerType>;
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
      this.faucetUrl = toSafeExternalLink(url, { allowHttpLocalhost: true });
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
    setDisclaimerDialogVisibility(value: boolean): void {
      this.disclaimerVisibility = value;
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
    addPriceAlert(alert: Alert): void {
      const walletStore = useWalletStore();
      walletStore.addPriceAlert(alert);
    },
    editPriceAlert(payload: EditableAlertObject): void {
      const walletStore = useWalletStore();
      walletStore.editPriceAlert(payload);
    },
    removePriceAlert(position: number): void {
      const walletStore = useWalletStore();
      walletStore.removePriceAlert(position);
    },
    setDepositNotifications(value: boolean): void {
      const walletStore = useWalletStore();
      walletStore.setDepositNotifications(value);
    },
    setFiatCurrency(value?: Currency): void {
      const walletStore = useWalletStore();
      walletStore.setFiatCurrency(value);
    },
    updateFiatExchangeRates(value?: FiatExchangeRateObject): void {
      const walletStore = useWalletStore();
      walletStore.updateFiatExchangeRates(value);
    },
    setAssetsFilter(value: FilterOptions): void {
      const walletStore = useWalletStore();
      walletStore.setAssetsFilter(value);
    },
    setFilterOptions(value: WalletAssetFilters): void {
      const walletStore = useWalletStore();
      walletStore.setFilterOptions(value);
    },
    async selectIndexer(type: IndexerType): Promise<void> {
      const walletStore = useWalletStore();
      await walletStore.selectIndexer(type);
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
      await updateDocumentTitle();
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
