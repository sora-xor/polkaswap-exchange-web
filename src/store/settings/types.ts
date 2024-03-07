import type { MarketAlgorithms } from '@/consts';
import type { BreakpointClass } from '@/consts/layout';
import type { Node } from '@/types/nodes';

import type { Subscription } from 'rxjs';

export type Ad = {
  title: string;
  img: string;
  backgroundColor?: string;
  link: string;
};

export type FeatureFlags = {
  moonpay?: boolean;
  x1ex?: boolean;
  charts?: boolean;
  soraCard?: boolean;
  orderBook?: boolean;
};

export type SettingsState = {
  featureFlags: FeatureFlags;
  slippageTolerance: string;
  marketAlgorithm: MarketAlgorithms;
  chartsEnabled: boolean;
  userDisclaimerApprove: boolean;
  transactionDeadline: number;
  node: Partial<Node>;
  language: string;
  displayRegions: Nullable<Intl.DisplayNames>;
  percentFormat: Nullable<Intl.NumberFormat>;
  defaultNodes: Array<Node>;
  customNodes: Array<Node>;
  nodeAddressConnecting: string;
  nodeConnectionAllowance: boolean;
  chainGenesisHash: string;
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
  adsArray: Array<Ad>;
};

export type NodesHashTable = {
  [address: string]: Node;
};
