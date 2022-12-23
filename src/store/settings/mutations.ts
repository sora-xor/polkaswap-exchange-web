import { defineMutations } from 'direct-vuex';
import type { Subscription } from 'rxjs';

import storage, { settingsStorage } from '@/utils/storage';
import type { Node } from '@/types/nodes';
import type { FeatureFlags, SettingsState } from './types';
import { Language, MarketAlgorithms } from '@/consts';

const mutations = defineMutations<SettingsState>()({
  setNodeRequest(state, { node, isReconnection = false }: { node?: Nullable<Node>; isReconnection?: boolean }): void {
    state.nodeAddressConnecting = node?.address ?? '';
    state.nodeConnectionAllowance = isReconnection;
  },
  setNodeSuccess(state, node: Nullable<Node> = {} as Node): void {
    state.node = { ...node };
    state.nodeAddressConnecting = '';
    state.nodeConnectionAllowance = true;
    settingsStorage.set('node', JSON.stringify(node));
  },
  setNodeFailure(state): void {
    state.nodeAddressConnecting = '';
    state.nodeConnectionAllowance = true;
  },
  setDefaultNodes(state, nodes: Array<Node>): void {
    state.defaultNodes = [...nodes];
  },
  setCustomNodes(state, nodes: Array<Node>): void {
    state.customNodes = [...nodes];
    settingsStorage.set('customNodes', JSON.stringify(nodes));
  },
  resetNode(state): void {
    state.node = {};
    settingsStorage.remove('node');
  },
  setNetworkChainGenesisHash(state, hash?: string): void {
    state.chainGenesisHash = hash || '';
  },
  setSlippageTolerance(state, value: string): void {
    state.slippageTolerance = value;
    storage.set('slippageTolerance', value);
  },
  /** Set market algorithm, `MarketAlgorithms.SMART` is set by default */
  setMarketAlgorithm(state, value: MarketAlgorithms = MarketAlgorithms.SMART): void {
    state.marketAlgorithm = value;
    storage.set('marketAlgorithm', value);
  },
  setChartsEnabled(state, value: boolean): void {
    state.сhartsEnabled = value;
    storage.set('сhartsEnabled', value);
  },
  setTransactionDeadline(state, value: number): void {
    state.transactionDeadline = value;
    storage.set('transactionDeadline', value);
  },
  setFaucetUrl(state, url: string): void {
    state.faucetUrl = url;
  },
  setSelectNodeDialogVisibility(state, value: boolean): void {
    state.selectNodeDialogVisibility = value;
  },
  setSelectLanguageDialogVisibility(state, value: boolean): void {
    state.selectLanguageDialogVisibility = value;
  },
  setBrowserNotifsPopupEnabled(state, value: boolean): void {
    state.browserNotifPopupVisibility = value;
  },
  setBrowserNotifsPopupBlocked(state, value: boolean): void {
    state.browserNotifPopupBlockedVisibility = value;
  },
  setBrowserNotifsAgreement(state, value: NotificationPermission): void {
    state.browserNotifsPermission = value;
  },
  setLanguage(state, value: Language): void {
    state.language = value;
    settingsStorage.set('language', value);
  },
  setFeatureFlags(state, featureFlags: FeatureFlags = {}): void {
    state.featureFlags = { ...state.featureFlags, ...featureFlags };
  },
  setBlockNumber(state, value: number): void {
    state.blockNumber = value || 0;
  },
  setBlockNumberUpdates(state, subscription: Subscription): void {
    state.blockNumberUpdates = subscription;
  },
  resetBlockNumberSubscription(state): void {
    state.blockNumberUpdates?.unsubscribe();
    state.blockNumberUpdates = null;
  },
  setKYCData(state, data) {
    state.kycData = { ...data };
    // storage.set('kyc', JSON.stringify(state.kycData));
  },
});

export default mutations;
