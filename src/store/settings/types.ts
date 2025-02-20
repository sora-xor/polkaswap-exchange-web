import type { MarketAlgorithms } from '@/consts';
import type { BreakpointClass } from '@/consts/layout';
import type { NodesConnection } from '@/utils/connection';

export type Ad = {
  title: string;
  img: string;
  link: string;
  backgroundColor?: string;
  right?: string;
};

export type FeatureFlags = {
  moonpay?: boolean;
  soraCard?: boolean;
  orderBook?: boolean;
  kensetsu?: boolean;
  assetOwner?: boolean;
  alt?: boolean;
  debug?: boolean;
  pointSystemV2?: boolean;
};

export type SettingsState = {
  appConnection: NodesConnection;
  featureFlags: FeatureFlags;
  slippageTolerance: string;
  marketAlgorithm: MarketAlgorithms;
  userDisclaimerApprove: boolean;
  transactionDeadline: number;
  language: string;
  displayRegions: Nullable<Intl.DisplayNames>;
  percentFormat: Nullable<Intl.NumberFormat>;
  faucetUrl: string;
  menuCollapsed: boolean;
  selectNodeDialogVisibility: boolean;
  selectIndexerDialogVisibility: boolean;
  selectLanguageDialogVisibility: boolean;
  selectCurrencyDialogVisibility: boolean;
  rotatePhoneDialogVisibility: boolean;
  disclaimerVisibility: boolean;
  alertSettingsVisibility: boolean;
  browserNotifPopupVisibility: boolean;
  browserNotifPopupBlockedVisibility: boolean;
  isBrowserNotificationApiAvailable: boolean;
  browserNotifsPermission: NotificationPermission;
  internetConnection: Nullable<boolean>;
  internetConnectionSpeed: Nullable<number>;
  screenBreakpointClass: BreakpointClass;
  windowWidth: number;
  adsArray: Array<Ad>;
  isTMA: boolean;
  telegramBotUrl: Nullable<string>;
  isRotatePhoneHideBalanceFeatureEnabled: boolean;
  isOrientationWarningVisible: boolean;
  isAccessAccelerometrEventDeclined: boolean;
  isAccessRotationListener: boolean;
  isThemePreference: boolean;
};
