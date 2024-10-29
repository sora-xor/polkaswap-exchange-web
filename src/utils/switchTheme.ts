import Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';
import { setTheme } from '@soramitsu-ui/ui-vue2/lib/utils';

import { tmaSdkService } from './telegram';

import { updatePipTheme } from '.';

let prefersDarkScheme: MediaQueryList | null = null;

const handleThemeChange = (e: MediaQueryListEvent): void => {
  console.info('[SYSTEM THEME] we are in handleThemeChange');
  applyTheme(e.matches);
};

export const applyTheme = (isDark: boolean): void => {
  console.info('[SYSTEM THEME] we are in applyTheme, theme to switch, isDark', isDark);
  setTheme(isDark ? Theme.DARK : Theme.LIGHT);
  updatePipTheme();
  tmaSdkService.updateTheme();
};

export const detectSystemTheme = (isTMA: boolean): void => {
  console.info('[SYSTEM THEME] we are in detectSystemTheme');

  if (!prefersDarkScheme) {
    prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    console.info('[SYSTEM THEME] here is prefersDarkScheme');
    prefersDarkScheme.addEventListener('change', handleThemeChange);
  }

  const systemPrefersDark = prefersDarkScheme.matches;
  console.info('[SYSTEM THEME] initial systemPrefersDark', systemPrefersDark);
  applyTheme(systemPrefersDark);

  if (isTMA) {
    const webApp = window.Telegram.WebApp;
    const colorScheme = webApp.colorScheme;
    applyTheme(colorScheme === 'dark');

    tmaSdkService.listenForThemeChanges(applyTheme);
  }
};

export const removeThemeListeners = (isTMA: boolean): void => {
  if (prefersDarkScheme) {
    prefersDarkScheme.removeEventListener('change', handleThemeChange);
    prefersDarkScheme = null;
  }

  if (isTMA) {
    tmaSdkService.removeThemeListener();
  }
};
