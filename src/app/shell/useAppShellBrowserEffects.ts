import { Breakpoint } from '@/consts/layout';
import { LOCAL_STORAGE_LIMIT_PERCENTAGE } from '@/consts/storage';
import { calculateStorageUsagePercentage } from '@/utils/storage';

import type { FnWithoutArgs } from '@/types/common';
import type { Ref } from 'vue';

type ShellSettingsStore = {
  setScreenBreakpointClass: (width: number) => void;
  showOrientationWarning: () => void;
  hideOrientationWarning: () => void;
};

type BrowserEffectsOptions = {
  settingsStore: ShellSettingsStore;
  showErrorLocalStorageExceed: Ref<boolean>;
  closeMenu: FnWithoutArgs;
};

/**
 * Owns browser-global listeners used by the shell so route/layout state remains
 * separate from low-level DOM subscription bookkeeping.
 */
export function createAppShellBrowserEffects({
  settingsStore,
  showErrorLocalStorageExceed,
  closeMenu,
}: BrowserEffectsOptions) {
  const handleLocalStorageChange = (): void => {
    const usagePercentage = calculateStorageUsagePercentage();
    if (usagePercentage >= LOCAL_STORAGE_LIMIT_PERCENTAGE) {
      showErrorLocalStorageExceed.value = true;
    }
  };

  const setResponsiveClass = (): void => {
    closeMenu();
    settingsStore.setScreenBreakpointClass(window.innerWidth);
  };

  const handleOrientationChange = (): void => {
    const isLandscape = screen.orientation
      ? screen.orientation.type.startsWith('landscape')
      : window.innerHeight < window.innerWidth;
    if (isLandscape) {
      settingsStore.showOrientationWarning();
    } else {
      settingsStore.hideOrientationWarning();
    }
  };

  const handleGlobalKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      closeMenu();
    }
  };

  const subscribeOnLocalStorage = (): void => {
    window.addEventListener('localStorageUpdated', handleLocalStorageChange);
  };

  const unsubscribeFromLocalStorage = (): void => {
    window.removeEventListener('localStorageUpdated', handleLocalStorageChange);
  };

  const subscribeOnScreenSize = (): void => {
    window.addEventListener('resize', setResponsiveClass);
  };

  const unsubscribeFromScreenSize = (): void => {
    window.removeEventListener('resize', setResponsiveClass);
  };

  const subscribeOnScreenOrientation = (): void => {
    if (window.innerWidth <= Breakpoint.LargeMobile) {
      if (screen.orientation) {
        screen.orientation.addEventListener('change', handleOrientationChange);
      } else {
        window.addEventListener('resize', handleOrientationChange);
      }
    }
  };

  const unsubscribeFromScreenOrientation = (): void => {
    if (screen.orientation) {
      screen.orientation.removeEventListener('change', handleOrientationChange);
    } else {
      window.removeEventListener('resize', handleOrientationChange);
    }
  };

  const subscribeOnKeyboard = (): void => {
    window.addEventListener('keydown', handleGlobalKeydown);
  };

  const unsubscribeFromKeyboard = (): void => {
    window.removeEventListener('keydown', handleGlobalKeydown);
  };

  return {
    setResponsiveClass,
    subscribeOnLocalStorage,
    unsubscribeFromLocalStorage,
    subscribeOnScreenSize,
    unsubscribeFromScreenSize,
    subscribeOnScreenOrientation,
    unsubscribeFromScreenOrientation,
    subscribeOnKeyboard,
    unsubscribeFromKeyboard,
  };
}
