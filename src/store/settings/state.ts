import { DefaultMarketAlgorithm, DefaultSlippageTolerance, MarketAlgorithms } from '@/consts';
import { getLocale } from '@/lang';
import storage, { settingsStorage } from '@/utils/storage';
import type { Alert } from '@/types/alert';
import type { SettingsState } from './types';

function initialState(): SettingsState {
  const priceAlerts = settingsStorage.get('alerts');
  const alerts = priceAlerts && JSON.parse(priceAlerts);
  const node = settingsStorage.get('node');
  const customNodes = settingsStorage.get('customNodes');
  const disclaimerApprove = settingsStorage.get('disclaimerApprove');
  const allowTopUpAlerts = settingsStorage.get('allowTopUpAlerts');
  const сhartsEnabled = storage.get('сhartsEnabled');
  const isBrowserNotificationApiAvailable = 'Notification' in window;
  return {
    alerts: (alerts || []) as Array<Alert>,
    allowTopUpAlert: allowTopUpAlerts ? Boolean(JSON.parse(allowTopUpAlerts)) : false,
    featureFlags: {},
    slippageTolerance: storage.get('slippageTolerance') || DefaultSlippageTolerance,
    marketAlgorithm: (storage.get('marketAlgorithm') || DefaultMarketAlgorithm) as MarketAlgorithms,
    сhartsEnabled: сhartsEnabled ? Boolean(JSON.parse(сhartsEnabled)) : true,
    userDisclaimerApprove: disclaimerApprove ? JSON.parse(disclaimerApprove) : false,
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
