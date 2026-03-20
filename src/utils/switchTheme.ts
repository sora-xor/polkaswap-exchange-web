import { Theme } from '@/consts/theme';
import { requireAppStore } from '@/utils/app-store';
import { tmaSdkService } from './telegram';
import { updatePipTheme } from '.';

let prefersDarkScheme: MediaQueryList | null = null;

const getAppStore = () => requireAppStore() as any;

const handleThemeChange = (e: MediaQueryListEvent): void => {
  applyTheme(e.matches);
};

export const applyTheme = (isDark: boolean): void => {
  const nextTheme = isDark ? Theme.DARK : Theme.LIGHT;
  const store = getAppStore();
  store?.commit?.wallet?.settings?.setTheme?.(nextTheme);
  updatePipTheme();
  tmaSdkService.updateTheme();
};

export const detectSystemTheme = (isTMA: boolean): void => {
  if (!prefersDarkScheme) {
    prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    prefersDarkScheme.addEventListener('change', handleThemeChange);
  }

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
  if (prefersDarkScheme) {
    prefersDarkScheme.removeEventListener('change', handleThemeChange);
    prefersDarkScheme = null;
  }

  if (isTMA) {
    tmaSdkService.removeThemeListener();
  }
};
