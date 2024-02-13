import { defineMutations } from 'direct-vuex';

import { MarketAlgorithms } from '@/consts';
import type { BreakpointClass, Language } from '@/consts';
import type { Node } from '@/types/nodes';
import storage, { settingsStorage } from '@/utils/storage';

import type { Ad, FeatureFlags, SettingsState } from './types';
import type { Subscription } from 'rxjs';

const mutations = defineMutations<SettingsState>()({
  setNodeRequest(state, node: Nullable<Node>): void {
    state.nodeAddressConnecting = node?.address ?? '';
  },
  setNodeSuccess(state, node: Nullable<Node> = {} as Node): void {
    state.node = { ...node };
    state.nodeAddressConnecting = '';
    settingsStorage.set('node', JSON.stringify(node));
  },
  setNodeFailure(state): void {
    state.nodeAddressConnecting = '';
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
    state.chartsEnabled = value;
    storage.set('сhartsEnabled', value); // TODO: replace Cyrillic character
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
  setMenuCollapsed(state, collapsed: boolean): void {
    state.menuCollapsed = collapsed;
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
  setScreenBreakpointClass(state, breakpoint: BreakpointClass): void {
    state.screenBreakpointClass = breakpoint;
  },
  setAdsArray(state, arr: Array<Ad>): void {
    state.adsArray = arr;
  },
});

export default mutations;
