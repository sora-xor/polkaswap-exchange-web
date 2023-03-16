import { DefaultMarketAlgorithm, DefaultSlippageTolerance, MarketAlgorithms } from '@/consts';
import { getLocale } from '@/lang';
import storage, { settingsStorage } from '@/utils/storage';
import type { SettingsState } from './types';

function initialState(): SettingsState {
  const node = settingsStorage.get('node');
  const customNodes = settingsStorage.get('customNodes');
  const сhartsEnabled = storage.get('сhartsEnabled');
  const isBrowserNotificationApiAvailable = 'Notification' in window;
  return {
    featureFlags: {},
    slippageTolerance: storage.get('slippageTolerance') || DefaultSlippageTolerance,
    marketAlgorithm: (storage.get('marketAlgorithm') || DefaultMarketAlgorithm) as MarketAlgorithms,
    сhartsEnabled: сhartsEnabled ? Boolean(JSON.parse(сhartsEnabled)) : true,
    transactionDeadline: Number(storage.get('transactionDeadline')) || 20,
    isBrowserNotificationApiAvailable,
    browserNotifsPermission: isBrowserNotificationApiAvailable ? Notification.permission : 'default',
    node: node ? JSON.parse(node) : {},
    language: getLocale(),
    displayRegions: undefined,
    defaultNodes: [],
    customNodes: customNodes ? JSON.parse(customNodes) : [],
    nodeAddressConnecting: '',
    nodeConnectionAllowance: true,
    chainGenesisHash: '',
    faucetUrl: '',
    selectNodeDialogVisibility: false,
    selectLanguageDialogVisibility: false,
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
