import type { Subscription } from 'rxjs';

import type { MarketAlgorithms } from '@/consts';
import type { Node } from '@/types/nodes';

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
  transactionDeadline: number;
  node: Partial<Node>;
  language: string;
  defaultNodes: Array<Node>;
  customNodes: Array<Node>;
  nodeAddressConnecting: string;
  nodeConnectionAllowance: boolean;
  chainGenesisHash: string;
  faucetUrl: string;
  selectNodeDialogVisibility: boolean;
  selectLanguageDialogVisibility: boolean;
  browserNotifPopupVisibility: boolean;
  browserNotifPopupBlockedVisibility: boolean;
  isBrowserNotificationApiAvailable: boolean;
  browserNotifsPermission: NotificationPermission;
  blockNumber: number;
  blockNumberUpdates: Nullable<Subscription>;
};

export type NodesHashTable = {
  [address: string]: Node;
};
