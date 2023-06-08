import { defineMutations } from 'direct-vuex';
import type { Subscription } from 'rxjs';

import storage, { settingsStorage } from '@/utils/storage';
import { MarketAlgorithms } from '@/consts';
import type { Node } from '@/types/nodes';
import type { Indexer } from '@/types/indexers';
import type { Language } from '@/consts';
import type { FeatureFlags, SettingsState } from './types';

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
    if (!state.node) return;
    const defaultNode = state.defaultNodes.find((item) => item.address === state.node.address);
    if (!defaultNode) return;
    // If node from default nodes list - keep this node from localstorage up to date
    state.node = { ...defaultNode };
    settingsStorage.set('node', JSON.stringify(state.node));
  },
  setCustomNodes(state, nodes: Array<Node>): void {
    state.customNodes = [...nodes];
    settingsStorage.set('customNodes', JSON.stringify(nodes));
  },
  setIndexer(state, indexer: Indexer): void {
    state.indexer = { ...indexer };
    settingsStorage.set('indexer', JSON.stringify(indexer));
  },
  setDefaultIndexers(state, indexers: Array<Indexer>): void {
    state.defaultIndexers = [...indexers];
    if (!state.indexer) return;
    const defaultIndexer = state.defaultIndexers.find((item) => item.address === state.indexer.address);
    if (!defaultIndexer) return;
    // If indexer from default indexers list - keep this indexer from localstorage up to date
    state.indexer = { ...defaultIndexer };
    settingsStorage.set('indexer', JSON.stringify(state.indexer));
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
  setSelectIndexerDialogVisibility(state, value: boolean): void {
    state.selectIndexerDialogVisibility = value;
  },
  setSelectLanguageDialogVisibility(state, value: boolean): void {
    state.selectLanguageDialogVisibility = value;
  },
  toggleDisclaimerDialogVisibility(state): void {
    state.disclaimerVisibility = !state.disclaimerVisibility;
  },
  setAlertSettingsPopup(state, value: boolean): void {
    state.alertSettingsVisibility = value;
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
  setUserDisclaimerApprove(state): void {
    state.userDisclaimerApprove = true;
    settingsStorage.set('disclaimerApprove', true);
  },
  updateDisplayRegions(state): void {
    try {
      state.displayRegions = new Intl.DisplayNames([state.language], { type: 'region' });
    } catch (error) {
      console.warn('Intl.DisplayNames issue', error);
      state.displayRegions = null;
    }
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
  setInternetConnectionEnabled(state): void {
    state.internetConnection = true;
  },
  setInternetConnectionDisabled(state): void {
    state.internetConnection = false;
  },
  setInternetConnectionSpeed(state): void {
    state.internetConnectionSpeed = ((navigator as any)?.connection?.downlink as number) ?? 0;
  },
});

export default mutations;
