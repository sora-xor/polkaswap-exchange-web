export const TELEGRAM_WEB_APP_SCRIPT_SRC = 'https://telegram.org/js/telegram-web-app.js';

const TELEGRAM_LAUNCH_PARAM_MARKERS = ['tgWebAppData=', 'tgWebAppVersion=', 'tgWebAppPlatform='] as const;

let telegramScriptLoadPromise: Promise<void> | null = null;

export function hasTelegramWebApp(): boolean {
  return Boolean((window as any).Telegram?.WebApp);
}

export function hasTelegramLaunchParams(): boolean {
  const href = window.location?.href ?? '';
  return TELEGRAM_LAUNCH_PARAM_MARKERS.some((marker) => href.includes(marker));
}

export function shouldLoadTelegramMiniApp(): boolean {
  return hasTelegramWebApp() || hasTelegramLaunchParams();
}

/**
 * Loads the Telegram Mini App SDK only for Telegram launch URLs.
 */
export function loadTelegramWebAppScript(): Promise<void> {
  if (hasTelegramWebApp() || !hasTelegramLaunchParams()) {
    return Promise.resolve();
  }

  telegramScriptLoadPromise ??= new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${TELEGRAM_WEB_APP_SCRIPT_SRC}"]`
    );
    const script = existingScript ?? document.createElement('script');

    script.src = TELEGRAM_WEB_APP_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => {
      telegramScriptLoadPromise = null;
      reject(new Error('[TMA]: Failed to load Telegram WebApp SDK'));
    };

    if (script.dataset.loaded === 'true') {
      resolve();
      return;
    }

    if (!existingScript) {
      document.head.appendChild(script);
    }
  });

  return telegramScriptLoadPromise;
}
