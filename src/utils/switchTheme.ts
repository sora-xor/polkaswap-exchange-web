import Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';
import { setTheme } from '@soramitsu-ui/ui-vue2/lib/utils';

import store from '@/store';

import { tmaSdkService } from './telegram';

import { updatePipTheme } from '.';

let prefersDarkScheme: MediaQueryList | null = null;
let handleThemeChange: ((e: MediaQueryListEvent) => void) | null = null;
const isTMA = store.state.settings.isTMA;

export const applyTheme = (isDark: boolean): void => {
  console.info('we are in applytheme');
  console.info('we will set theme now');
  console.info(isDark);
  setTheme(isDark ? Theme.DARK : Theme.LIGHT);
  updatePipTheme();
  tmaSdkService.updateTheme();
};

export const detectSystemTheme = (): void => {
  console.info('we are in detectSystemTheme');
  console.info(isTMA);
  prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  handleThemeChange = (e: MediaQueryListEvent) => {
    applyTheme(e.matches);
  };

  prefersDarkScheme.addEventListener('change', handleThemeChange);

  const systemPrefersDark = prefersDarkScheme.matches;
  applyTheme(systemPrefersDark);

  if (isTMA) {
    console.info('we are in tma');
    const webApp = window.Telegram.WebApp;
    const colorScheme = webApp.colorScheme;
    console.info('color scheme');
    applyTheme(colorScheme === 'dark');

    tmaSdkService.listenForThemeChanges(applyTheme);
  }
};

export const removeThemeListeners = (): void => {
  if (prefersDarkScheme && handleThemeChange) {
    prefersDarkScheme.removeEventListener('change', handleThemeChange);
    prefersDarkScheme = null;
    handleThemeChange = null;
  }

  if (isTMA) {
    tmaSdkService.removeThemeListener();
  }
};
