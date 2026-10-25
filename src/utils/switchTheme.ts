import { Theme } from '@/consts/theme';
import pinia from '@/plugins/pinia';
import { useWalletStore } from '@/stores/wallet';
import { updatePipTheme } from './pipTheme';
import { shouldLoadTelegramMiniApp } from './telegramLaunch';

type TelegramModule = typeof import('./telegram');

let prefersDarkScheme: MediaQueryList | null = null;
let telegramModulePromise: Promise<TelegramModule> | null = null;

const loadTelegramModule = (): Promise<TelegramModule> => {
  telegramModulePromise ??= import('./telegram');
  return telegramModulePromise;
};

const withTelegramModule = (callback: (module: TelegramModule) => void): void => {
  if (!shouldLoadTelegramMiniApp()) return;
  void loadTelegramModule()
    .then(callback)
    .catch((error) => {
      console.warn('[TMA]: Telegram theme sync skipped', error);
    });
};

const handleThemeChange = (e: MediaQueryListEvent): void => {
  applyTheme(e.matches);
};

export const applyTheme = (isDark: boolean): void => {
  const nextTheme = isDark ? Theme.DARK : Theme.LIGHT;
  const walletStore = useWalletStore(pinia);
  void walletStore.setTheme(nextTheme);
  updatePipTheme();
  withTelegramModule(({ tmaSdkService }) => {
    tmaSdkService.updateTheme();
  });
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

    withTelegramModule(({ tmaSdkService }) => {
      tmaSdkService.listenForThemeChanges(applyTheme);
    });
  }
};

export const removeThemeListeners = (isTMA: boolean): void => {
  if (prefersDarkScheme) {
    prefersDarkScheme.removeEventListener('change', handleThemeChange);
    prefersDarkScheme = null;
  }

  if (isTMA) {
    withTelegramModule(({ tmaSdkService }) => {
      tmaSdkService.removeThemeListener();
    });
  }
};
