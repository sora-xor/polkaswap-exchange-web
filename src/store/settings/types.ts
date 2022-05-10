import type { Subscription } from '@polkadot/x-rxjs';

import type { MarketAlgorithms } from '@/consts';
import type { Node } from '@/types/nodes';

export type FeatureFlags = {
  moonpay?: boolean;
};

export type SettingsState = {
  featureFlags: FeatureFlags;
  slippageTolerance: string;
  marketAlgorithm: MarketAlgorithms;
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
};

export type NodesHashTable = {
  [address: string]: Node;
};
