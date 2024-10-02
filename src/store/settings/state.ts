import { connection } from '@soramitsu/soraneo-wallet-web';

import { DefaultMarketAlgorithm, DefaultSlippageTolerance, MarketAlgorithms } from '@/consts';
import { BreakpointClass } from '@/consts/layout';
import { getLocale } from '@/lang';
import { NodesConnection } from '@/utils/connection';
import storage, { settingsStorage } from '@/utils/storage';

import type { SettingsState } from './types';

function initialState(): SettingsState {
  const disclaimerApprove = settingsStorage.get('disclaimerApprove');
  const isTBankFeatureEnabled = settingsStorage.get('isTBankFeatureEnabled') === 'true';
  const isAccessRotationListener = settingsStorage.get('isAccessRotationListener') === 'true';
  console.info(isTBankFeatureEnabled);
  console.info(isAccessRotationListener);
  const isBrowserNotificationApiAvailable = 'Notification' in window;
  const appConnection = new NodesConnection(settingsStorage, connection);

  return {
    appConnection,
    featureFlags: {},
    slippageTolerance: storage.get('slippageTolerance') || DefaultSlippageTolerance,
    marketAlgorithm: (storage.get('marketAlgorithm') || DefaultMarketAlgorithm) as MarketAlgorithms,
    userDisclaimerApprove: disclaimerApprove ? JSON.parse(disclaimerApprove) : false,
    transactionDeadline: Number(storage.get('transactionDeadline')) || 20,
    isBrowserNotificationApiAvailable,
    browserNotifsPermission: isBrowserNotificationApiAvailable ? Notification.permission : 'default',
    language: getLocale(),
    displayRegions: undefined,
    percentFormat: undefined,
    faucetUrl: '',
    menuCollapsed: false,
    selectNodeDialogVisibility: false,
    selectIndexerDialogVisibility: false,
    selectLanguageDialogVisibility: false,
    selectCurrencyDialogVisibility: false,
    rotatePhoneDialogVisibility: false,
    disclaimerVisibility: false,
    alertSettingsVisibility: false,
    browserNotifPopupVisibility: false,
    browserNotifPopupBlockedVisibility: false,
    blockNumber: 0,
    blockNumberUpdates: undefined,
    internetConnection: undefined,
    internetConnectionSpeed: undefined,
    screenBreakpointClass: BreakpointClass.LargeDesktop,
    windowWidth: window?.innerWidth ?? 0,
    adsArray: [],
    isTMA: false,
    telegramBotUrl: undefined,
    isTBankFeatureEnabled, // todo change to from settingsStorage
    isOrientationWarningVisible: false,
    isAccessMotionEventDeclined: false,
    isAccessRotationListener, // todo change to from settingsStorage
  };
}

const state = initialState();

export default state;
