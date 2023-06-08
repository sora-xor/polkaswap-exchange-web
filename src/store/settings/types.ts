import type { Subscription } from 'rxjs';

import type { MarketAlgorithms } from '@/consts';
import type { Node } from '@/types/nodes';
import type { Indexer } from '@/types/indexers';

export type FeatureFlags = {
  moonpay?: boolean;
  charts?: boolean;
  soraCard?: boolean;
};

export type SettingsState = {
  featureFlags: FeatureFlags;
  slippageTolerance: string;
  marketAlgorithm: MarketAlgorithms;
  сhartsEnabled: boolean;
  userDisclaimerApprove: boolean;
  transactionDeadline: number;
  node: Partial<Node>;
  indexer: Partial<Indexer>;
  language: string;
  displayRegions: Nullable<Intl.DisplayNames>;
  defaultNodes: Array<Node>;
  customNodes: Array<Node>;
  defaultIndexers: Array<Indexer>;
  nodeAddressConnecting: string;
  nodeConnectionAllowance: boolean;
  chainGenesisHash: string;
  faucetUrl: string;
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
};

export type NodesHashTable = {
  [address: string]: Node;
};

export type IndexersHashTable = {
  [address: string]: Indexer;
};
