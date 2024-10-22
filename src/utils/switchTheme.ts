import Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';
import { setTheme } from '@soramitsu-ui/ui-vue2/lib/utils';

import { tmaSdkService } from './telegram';

import { updatePipTheme } from '.';

let prefersDarkScheme: MediaQueryList | null = null;
let handleThemeChange: ((e: MediaQueryListEvent) => void) | null = null;

export const applyTheme = (isDark: boolean): void => {
  setTheme(isDark ? Theme.DARK : Theme.LIGHT);
  updatePipTheme();
  tmaSdkService.updateTheme();
};

export const detectSystemTheme = (isTMA: boolean): void => {
  prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  handleThemeChange = (e: MediaQueryListEvent) => {
    applyTheme(e.matches);
  };

  prefersDarkScheme.addEventListener('change', handleThemeChange);

  const systemPrefersDark = prefersDarkScheme.matches;
  applyTheme(systemPrefersDark);

  if (isTMA) {
    const webApp = window.Telegram.WebApp;
    const colorScheme = webApp.colorScheme;
    applyTheme(colorScheme === 'dark');

    tmaSdkService.listenForThemeChanges(applyTheme);
  }
};

export const removeThemeListeners = (isTMA: boolean): void => {
  if (prefersDarkScheme && handleThemeChange) {
    prefersDarkScheme.removeEventListener('change', handleThemeChange);
    prefersDarkScheme = null;
    handleThemeChange = null;
  }

  if (isTMA) {
    tmaSdkService.removeThemeListener();
  }
};
