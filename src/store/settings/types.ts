import type { BreakpointClass, MarketAlgorithms } from '@/consts';
import type { NodesConnection } from '@/utils/connection';

import type { Subscription } from 'rxjs';

export type Ad = {
  title: string;
  img: string;
  backgroundColor?: string;
  link: string;
};

export type FeatureFlags = {
  moonpay?: boolean;
  charts?: boolean;
  soraCard?: boolean;
  orderBook?: boolean;
  kensetsu?: boolean;
  assetOwner?: boolean;
  alt?: boolean;
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
  disclaimerVisibility: boolean;
  alertSettingsVisibility: boolean;
  browserNotifPopupVisibility: boolean;
  browserNotifPopupBlockedVisibility: boolean;
  isBrowserNotificationApiAvailable: boolean;
  browserNotifsPermission: NotificationPermission;
  blockNumber: number;
  blockNumberUpdates: Nullable<Subscription>;
  internetConnection: Nullable<boolean>;
  internetConnectionSpeed: Nullable<number>;
  screenBreakpointClass: BreakpointClass;
  windowWidth: number;
  adsArray: Array<Ad>;
};
