import { DefaultMarketAlgorithm, DefaultSlippageTolerance, MarketAlgorithms } from '@/consts';
import { getLocale } from '@/lang';
import storage, { settingsStorage } from '@/utils/storage';
import type { SettingsState } from './types';

function initialState(): SettingsState {
  const node = settingsStorage.get('node');
  const indexer = settingsStorage.get('indexer');
  const customNodes = settingsStorage.get('customNodes');
  const disclaimerApprove = settingsStorage.get('disclaimerApprove');
  const сhartsEnabled = storage.get('сhartsEnabled');
  const isBrowserNotificationApiAvailable = 'Notification' in window;
  return {
    featureFlags: {},
    slippageTolerance: storage.get('slippageTolerance') || DefaultSlippageTolerance,
    marketAlgorithm: (storage.get('marketAlgorithm') || DefaultMarketAlgorithm) as MarketAlgorithms,
    сhartsEnabled: сhartsEnabled ? Boolean(JSON.parse(сhartsEnabled)) : true,
    userDisclaimerApprove: disclaimerApprove ? JSON.parse(disclaimerApprove) : false,
    transactionDeadline: Number(storage.get('transactionDeadline')) || 20,
    isBrowserNotificationApiAvailable,
    browserNotifsPermission: isBrowserNotificationApiAvailable ? Notification.permission : 'default',
    node: node ? JSON.parse(node) : {},
    indexer: indexer ? JSON.parse(indexer) : {},
    language: getLocale(),
    displayRegions: undefined,
    defaultNodes: [],
    customNodes: customNodes ? JSON.parse(customNodes) : [],
    defaultIndexers: [],
    nodeAddressConnecting: '',
    nodeConnectionAllowance: true,
    chainGenesisHash: '',
    faucetUrl: '',
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
  };
}

const state = initialState();

export default state;
