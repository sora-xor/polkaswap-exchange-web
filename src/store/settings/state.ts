import { createAppConnection } from '@/api';
import { BreakpointClass } from '@/consts/layout';
import { getLocale } from '@/lang';
import { settingsStorage } from '@/utils/storage';

import type { SettingsState } from './types';

function initialState(): SettingsState {
  const disclaimerApprove = settingsStorage.get('disclaimerApprove');
  const isRotatePhoneHideBalanceFeatureEnabled =
    settingsStorage.get('isRotatePhoneHideBalanceFeatureEnabled') === 'true';
  const isAccessAccelerometrEventDeclined = settingsStorage.get('isAccessAccelerometrEventDeclined') === 'true';
  const isAccessRotationListener = settingsStorage.get('isAccessRotationListener') === 'true';
  const isThemePreference = settingsStorage.get('isThemePreference') === 'true';
  const isBrowserNotificationApiAvailable = 'Notification' in window;

  return {
    appConnection: createAppConnection(),
    userDisclaimerApprove: disclaimerApprove ? JSON.parse(disclaimerApprove) : false,
    isBrowserNotificationApiAvailable,
    browserNotifsPermission: isBrowserNotificationApiAvailable ? Notification.permission : 'default',
    language: getLocale(),
    displayRegions: undefined,
    percentFormat: undefined,
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
    internetConnection: undefined,
    internetConnectionSpeed: undefined,
    screenBreakpointClass: BreakpointClass.LargeDesktop,
    windowWidth: window?.innerWidth ?? 0,
    isTMA: false,
    telegramBotUrl: undefined,
    isRotatePhoneHideBalanceFeatureEnabled,
    isOrientationWarningVisible: false,
    isAccessAccelerometrEventDeclined,
    isAccessRotationListener,
    isThemePreference,
  };
}

const state = initialState();

export default state;
