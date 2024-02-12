import { BreakpointClass, DefaultMarketAlgorithm, DefaultSlippageTolerance, MarketAlgorithms } from '@/consts';
import { getLocale } from '@/lang';
import storage, { settingsStorage } from '@/utils/storage';

import type { SettingsState } from './types';

function initialState(): SettingsState {
  const node = settingsStorage.get('node');
  const customNodes = settingsStorage.get('customNodes');
  const disclaimerApprove = settingsStorage.get('disclaimerApprove');
  const chartsEnabled = storage.get('сhartsEnabled');
  const isBrowserNotificationApiAvailable = 'Notification' in window;
  return {
    featureFlags: {},
    slippageTolerance: storage.get('slippageTolerance') || DefaultSlippageTolerance,
    marketAlgorithm: (storage.get('marketAlgorithm') || DefaultMarketAlgorithm) as MarketAlgorithms,
    chartsEnabled: chartsEnabled ? Boolean(JSON.parse(chartsEnabled)) : true,
    userDisclaimerApprove: disclaimerApprove ? JSON.parse(disclaimerApprove) : false,
    transactionDeadline: Number(storage.get('transactionDeadline')) || 20,
    isBrowserNotificationApiAvailable,
    browserNotifsPermission: isBrowserNotificationApiAvailable ? Notification.permission : 'default',
    node: node ? JSON.parse(node) : {},
    language: getLocale(),
    displayRegions: undefined,
    percentFormat: undefined,
    defaultNodes: [],
    customNodes: customNodes ? JSON.parse(customNodes) : [],
    nodeAddressConnecting: '',
    nodeConnectionAllowance: true,
    chainGenesisHash: '',
    faucetUrl: '',
    menuCollapsed: false,
    selectNodeDialogVisibility: false,
    selectIndexerDialogVisibility: false,
    selectLanguageDialogVisibility: false,
    disclaimerVisibility: false,
    alertSettingsVisibility: false,
    browserNotifPopupVisibility: false,
    browserNotifPopupBlockedVisibility: false,
    blockNumber: 0,
    blockNumberUpdates: undefined,
    internetConnection: undefined,
    internetConnectionSpeed: undefined,
    screenBreakpointClass: BreakpointClass.LargeDesktop,
    adsArray: [],
  };
}

const state = initialState();

export default state;
