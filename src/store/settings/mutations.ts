import { defineMutations } from 'direct-vuex';

import type { Language } from '@/consts';
import { Breakpoint, BreakpointClass } from '@/consts/layout';
import { settingsStorage } from '@/utils/storage';

import type { SettingsState } from './types';

const mutations = defineMutations<SettingsState>()({
  setSelectNodeDialogVisibility(state, value: boolean): void {
    state.selectNodeDialogVisibility = value;
  },
  setSelectIndexerDialogVisibility(state, value: boolean): void {
    state.selectIndexerDialogVisibility = value;
  },
  setSelectLanguageDialogVisibility(state, value: boolean): void {
    state.selectLanguageDialogVisibility = value;
  },
  setSelectCurrencyDialogVisibility(state, value: boolean): void {
    state.selectCurrencyDialogVisibility = value;
  },
  setRotatePhoneDialogVisibility(state, value: boolean): void {
    state.rotatePhoneDialogVisibility = value;
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
  updateIntlUtils(state): void {
    try {
      state.displayRegions = new Intl.DisplayNames([state.language], { type: 'region' });
      state.percentFormat = new Intl.NumberFormat([state.language], { style: 'percent', maximumFractionDigits: 2 });
    } catch (error) {
      console.warn('Intl is not supported!', error);
      state.displayRegions = null;
      state.percentFormat = null;
    }
  },
  setMenuCollapsed(state, collapsed: boolean): void {
    state.menuCollapsed = collapsed;
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
  setScreenBreakpointClass(state, width: number): void {
    let newClass = state.screenBreakpointClass;
    state.windowWidth = width;

    if (width >= Breakpoint.HugeDesktop) {
      newClass = BreakpointClass.HugeDesktop;
    } else if (width >= Breakpoint.LargeDesktop) {
      newClass = BreakpointClass.LargeDesktop;
    } else if (width >= Breakpoint.Desktop) {
      newClass = BreakpointClass.Desktop;
    } else if (width >= Breakpoint.Tablet) {
      newClass = BreakpointClass.Tablet;
    } else if (width >= Breakpoint.LargeMobile) {
      newClass = BreakpointClass.LargeMobile;
    } else if (width < Breakpoint.LargeMobile) {
      newClass = BreakpointClass.Mobile;
    }

    if (newClass !== state.screenBreakpointClass) {
      state.screenBreakpointClass = newClass;
    }
  },
  enableTMA(state): void {
    state.isTMA = true;
  },
  disableTMA(state): void {
    state.isTMA = false;
  },
  setTelegramBotUrl(state, url: Nullable<string>): void {
    state.telegramBotUrl = url;
  },
  setIsRotatePhoneHideBalanceFeatureEnabled(state, value: boolean): void {
    state.isRotatePhoneHideBalanceFeatureEnabled = value;
    settingsStorage.set('isRotatePhoneHideBalanceFeatureEnabled', value);
  },
  setAccessGranted(state, value: boolean): void {
    state.isAccessRotationListener = value;
    settingsStorage.set('isAccessRotationListener', value);
  },
  setIsAccessAccelerometrEventDeclined(state, value: boolean): void {
    state.isAccessAccelerometrEventDeclined = value;
    settingsStorage.set('isAccessAccelerometrEventDeclined', value);
  },
  showOrientationWarning(state): void {
    state.isOrientationWarningVisible = true;
  },
  hideOrientationWarning(state): void {
    state.isOrientationWarningVisible = false;
  },
  setIsThemePreference(state, value: boolean): void {
    state.isThemePreference = value;
    settingsStorage.set('isThemePreference', value);
  },
});

export default mutations;
